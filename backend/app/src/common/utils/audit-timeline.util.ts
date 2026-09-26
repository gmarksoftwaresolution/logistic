import { PrismaClient } from '@prisma/client';

export async function enrichOrdersWithAuditTimeline(orders: any[], prisma: any) {
  if (!orders || orders.length === 0) return orders;

  const dropOrderIds = orders
    .map((o: any) => o.orderId || o.id)
    .filter(Boolean);

  const relatedPickupOrders = dropOrderIds.length > 0
    ? await prisma.order.findMany({
      where: {
        OR: [
          { orderId: { in: dropOrderIds }, phase: 'PICKUP' },
          { id: { in: dropOrderIds }, phase: 'PICKUP' }
        ]
      },
      include: {
        assignments: true,
        seller: true,
        parcels: { include: { scanHistories: true } }
      }
    })
    : [];

  const pickupOrderMap = new Map<string, any>(relatedPickupOrders.map((p: any) => [p.orderId || p.id, p]));

  const userIds = new Set<number>();

  orders.forEach((o: any) => {
    const pOrder: any = pickupOrderMap.get(o.orderId || o.id);
    const allAssigns = [...(o.assignments || []), ...(pOrder?.assignments || [])];

    const pShg = o.pickupShgId || pOrder?.pickupShgId || allAssigns.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'SHG')?.assigneeId;
    const dShg = o.dropShgId || pOrder?.dropShgId || allAssigns.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;
    const pTrans = o.pickupTransporterId || pOrder?.pickupTransporterId || allAssigns.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'TRANSPORTER')?.assigneeId;
    const dTrans = o.dropTransporterId || pOrder?.dropTransporterId || allAssigns.find((a: any) => a.role === 'DROP' && a.assigneeType === 'TRANSPORTER')?.assigneeId;

    [pShg, dShg, pTrans, dTrans].forEach(rawId => {
      if (rawId) {
        const id = parseInt(rawId, 10);
        if (!isNaN(id)) userIds.add(id);
      }
    });
  });

  const userList = userIds.size > 0
    ? await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      include: { address: true, shgDetail: true, transporterDetail: true }
    })
    : [];

  const userMap = new Map<string, any>(userList.map(u => [String(u.id), u]));

  return orders.map((o: any) => {
    const pOrder: any = pickupOrderMap.get(o.orderId || o.id);
    const effectiveAssignments = [...(o.assignments || []), ...(pOrder?.assignments || [])];
    const orderPlacedTime = pOrder?.createdAt || o.createdAt;

    const allScans: any[] = [];
    const combinedParcels = [
      ...(Array.isArray(o.parcels) ? o.parcels : []),
      ...(Array.isArray(pOrder?.parcels) ? pOrder.parcels : [])
    ];

    combinedParcels.forEach((p: any) => {
      if (Array.isArray(p.scanHistories)) {
        p.scanHistories.forEach((sh: any) => {
          allScans.push({
            status: sh.action,
            action: sh.action,
            userRole: sh.userRole,
            userId: sh.userId,
            currentHolder: sh.currentHolder,
            currentStage: sh.currentStage,
            scanResult: sh.scanResult,
            remarks: sh.remarks,
            latitude: sh.latitude,
            longitude: sh.longitude,
            scanTime: sh.scanTime,
            updatedAt: sh.scanTime,
            createdAt: sh.scanTime,
            productName: sh.productName,
            parcelId: sh.parcelId,
          });
        });
      }
    });

    allScans.sort((a, b) => new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime());

    const findScanTime = (actions: string[]) => {
      const match = allScans.find(s => actions.some(act => s.action === act || s.status === act));
      return match ? match.scanTime : null;
    };

    const pickupShgAssign = effectiveAssignments.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'SHG' && (a.status === 'ACCEPTED' || a.status === 'COMPLETED'));
    const pickupShgAcceptedAt = pickupShgAssign?.updatedAt || pickupShgAssign?.createdAt || o.pickupShgDetails?.acceptedAt || (pOrder as any)?.pickupShgDetails?.acceptedAt || (['PICKED', 'DROPPED', 'COMPLETED'].includes(o.pickupShgStatus || pOrder?.pickupShgStatus) ? orderPlacedTime : null);
    const pickupShgPickedAt = findScanTime(['SHG_PICKUP', 'PARCEL_AT_SHG']) || (['PICKED', 'DROPPED', 'COMPLETED'].includes(o.pickupShgStatus || pOrder?.pickupShgStatus) ? (pickupShgAssign?.updatedAt || pOrder?.updatedAt || o.updatedAt) : null);

    const pickupTransAssign = effectiveAssignments.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'TRANSPORTER' && (a.status === 'ACCEPTED' || a.status === 'COMPLETED'));
    const pickupTransporterAcceptedAt = pickupTransAssign?.updatedAt || pickupTransAssign?.createdAt || o.pickupTransporterDetails?.acceptedAt || (pOrder as any)?.pickupTransporterDetails?.acceptedAt || null;
    const pickupTransporterPickedAt = findScanTime(['TRANSPORTER_PICKUP', 'IN_TRANSIT_TO_HUB']) || (['PICKED', 'DROPPED', 'COMPLETED'].includes(o.pickupTransporterStatus || pOrder?.pickupTransporterStatus) ? (pickupTransAssign?.updatedAt || pOrder?.updatedAt || o.updatedAt) : null);

    const gmuHubIntakeAt = o.warehouseReceivedAt || pOrder?.warehouseReceivedAt || findScanTime(['HUB_RECEIVE', 'WAREHOUSE_RECEIVED']) || (['STORED', 'DISPATCHED', 'COMPLETED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG'].includes(o.mainStatus) ? (o.storedAt || o.updatedAt) : null);
    const gmuHubStoredAt = o.storedAt || pOrder?.storedAt || findScanTime(['STORE', 'STORED']) || (['STORED', 'DISPATCHED', 'COMPLETED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG'].includes(o.mainStatus) ? (o.storedAt || o.updatedAt) : null);

    const dropTransAssign = effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'TRANSPORTER' && (a.status === 'ACCEPTED' || a.status === 'COMPLETED'));
    const dropTransporterAcceptedAt = dropTransAssign?.updatedAt || dropTransAssign?.createdAt || o.dropTransporterDetails?.acceptedAt || null;
    const dropTransporterPickedAt = findScanTime(['TRANSPORTER_DROP_PICKUP', 'DISPATCHED', 'IN_TRANSIT_TO_BUYER']) || o.dispatchedAt || (['PICKED', 'DROPPED', 'COMPLETED'].includes(o.dropTransporterStatus) ? (dropTransAssign?.updatedAt || o.updatedAt) : null);

    const dropShgAssign = effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG' && (a.status === 'ACCEPTED' || a.status === 'COMPLETED'));
    const dropShgAcceptedAt = dropShgAssign?.updatedAt || dropShgAssign?.createdAt || o.dropShgDetails?.acceptedAt || null;
    const dropShgPickedAt = findScanTime(['SHG_DROP_PICKUP', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG']) || (['PICKED', 'PICKED_UP', 'DROPPED', 'COMPLETED'].includes(o.dropShgStatus) ? (dropShgAssign?.updatedAt || o.updatedAt) : null);

    const buyerDeliveredAt = o.deliveredAt || findScanTime(['FINAL_DELIVERY', 'DELIVERED', 'COMPLETED']) || (o.mainStatus === 'COMPLETED' ? o.updatedAt : null);

    const pShgId = o.pickupShgId || pOrder?.pickupShgId || effectiveAssignments.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'SHG')?.assigneeId;
    const pShgUser = pShgId ? userMap.get(String(pShgId)) : null;

    const pTransId = o.pickupTransporterId || pOrder?.pickupTransporterId || effectiveAssignments.find((a: any) => a.role === 'PICKUP' && a.assigneeType === 'TRANSPORTER' && a.status === 'ACCEPTED')?.assigneeId;
    const pTransUser = pTransId ? userMap.get(String(pTransId)) : null;

    const dShgId = o.dropShgId || pOrder?.dropShgId || effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;
    const dShgUser = dShgId ? userMap.get(String(dShgId)) : null;

    const dTransId = o.dropTransporterId || pOrder?.dropTransporterId || effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'TRANSPORTER' && (a.status === 'ACCEPTED' || a.status === 'PICKED' || a.status === 'IN_TRANSIT'))?.assigneeId || effectiveAssignments.find((a: any) => a.role === 'DROP' && a.assigneeType === 'TRANSPORTER')?.assigneeId;
    const dTransUser = dTransId ? userMap.get(String(dTransId)) : null;

    const formatAddr = (u: any) => {
      if (!u?.address) return u?.shgDetail?.village || '';
      return [
        u.address.houseNo || u.address.landmark,
        u.address.village,
        u.address.taluka,
        u.address.district,
        u.address.pincode
      ].filter(Boolean).join(', ');
    };

    const pickupShgDetails = pShgUser ? {
      id: pShgUser.id,
      name: pShgUser.fullName || pShgUser.shgDetail?.crpName || pShgUser.shgDetail?.shgName || 'Pickup SHG Member',
      mobile: pShgUser.phoneNumber || pShgUser.shgDetail?.crpMobile || '',
      address: formatAddr(pShgUser) || pShgUser.address?.village || 'N/A',
      shgName: pShgUser.shgDetail?.shgName || '',
      acceptedAt: pickupShgAcceptedAt,
      pickedAt: pickupShgPickedAt,
    } : (o.pickupShgDetails ? { ...o.pickupShgDetails, acceptedAt: pickupShgAcceptedAt, pickedAt: pickupShgPickedAt } : null);

    const pickupTransporterDetails = pTransUser ? {
      id: pTransUser.id,
      name: pTransUser.fullName || 'Transporter',
      mobile: pTransUser.phoneNumber || '',
      address: formatAddr(pTransUser) || 'Service Route',
      vehicle: pTransUser.transporterDetail?.vehicleNumber || (pTransUser.transporterDetail as any)?.registrationNumber || '',
      acceptedAt: pickupTransporterAcceptedAt,
      pickedAt: pickupTransporterPickedAt,
    } : (o.pickupTransporterDetails ? { ...o.pickupTransporterDetails, acceptedAt: pickupTransporterAcceptedAt, pickedAt: pickupTransporterPickedAt } : null);

    const dropShgDetails = dShgUser ? {
      id: dShgUser.id,
      name: dShgUser.fullName || dShgUser.shgDetail?.crpName || dShgUser.shgDetail?.shgName || 'Drop SHG Member',
      mobile: dShgUser.phoneNumber || dShgUser.shgDetail?.crpMobile || '',
      address: formatAddr(dShgUser) || dShgUser.address?.village || 'Mahagaon',
      shgName: dShgUser.shgDetail?.shgName || '',
      acceptedAt: dropShgAcceptedAt,
      pickedAt: dropShgPickedAt,
    } : (o.dropShgDetails ? { ...o.dropShgDetails, acceptedAt: dropShgAcceptedAt, pickedAt: dropShgPickedAt } : null);

    const dropTransporterDetails = dTransUser ? {
      id: dTransUser.id,
      name: dTransUser.fullName || 'Transporter',
      mobile: dTransUser.phoneNumber || '',
      address: formatAddr(dTransUser) || 'Service Route',
      vehicle: dTransUser.transporterDetail?.vehicleNumber || (dTransUser.transporterDetail as any)?.registrationNumber || '',
      acceptedAt: dropTransporterAcceptedAt,
      pickedAt: dropTransporterPickedAt,
    } : (o.dropTransporterDetails ? { ...o.dropTransporterDetails, acceptedAt: dropTransporterAcceptedAt, pickedAt: dropTransporterPickedAt } : null);

    const auditTimeline: any[] = [];
    const isDirectFlow = o.flowType === 'DIRECT_SHG_TO_SHG' || o.flowType === 'shg_to_shg' || String(o.flowType || '').toUpperCase() === 'DIRECT_SHG_TO_SHG';

    if (o.createdAt) {
      auditTimeline.push({
        timestamp: o.createdAt,
        stage: 'ORDER PLACED',
        status: 'Order Placed & Registered',
        statusType: 'COMPLETED',
        actorName: o.seller?.sellerName || 'Seller',
        actorRole: 'SELLER',
        location: o.seller?.village ? `${o.seller.village} (${o.seller.pincode || ''})` : 'Seller Center',
        remarks: `Total ${o.productCount || 1} Products (${o.totalWeight || 0} KG) registered`,
      });
    }

    if (pickupShgAcceptedAt || isDirectFlow) {
      auditTimeline.push({
        timestamp: pickupShgAcceptedAt || o.createdAt,
        stage: 'PHASE 1: PICKUP',
        status: 'Pickup SHG Assigned & Accepted',
        statusType: 'COMPLETED',
        actorName: pickupShgDetails?.name || 'Pickup SHG Member',
        actorRole: 'SHG',
        location: pickupShgDetails?.address || o.seller?.village || 'Pickup Center',
        remarks: 'SHG Member accepted pickup request from seller',
      });
    }

    if (pickupShgPickedAt) {
      auditTimeline.push({
        timestamp: pickupShgPickedAt,
        stage: 'PHASE 1: PICKUP',
        status: 'Collected & Scanned by SHG',
        statusType: 'COMPLETED',
        actorName: pickupShgDetails?.name || 'Pickup SHG Member',
        actorRole: 'SHG',
        location: o.seller?.village || 'Seller Location',
        remarks: 'Parcels collected and verified from seller',
      });
    }

    if (pickupTransporterAcceptedAt) {
      auditTimeline.push({
        timestamp: pickupTransporterAcceptedAt,
        stage: isDirectFlow ? 'DIRECT TRANSIT' : 'PHASE 1: PICKUP',
        status: 'Transporter Route Assigned & Accepted',
        statusType: 'COMPLETED',
        actorName: pickupTransporterDetails?.name || 'Transporter',
        actorRole: 'TRANSPORTER',
        location: pickupTransporterDetails?.address || 'Service Route',
        remarks: pickupTransporterDetails?.vehicle ? `Vehicle: ${pickupTransporterDetails.vehicle}` : 'Pickup route confirmed',
      });
    }

    if (pickupTransporterPickedAt) {
      auditTimeline.push({
        timestamp: pickupTransporterPickedAt,
        stage: isDirectFlow ? 'DIRECT TRANSIT' : 'PHASE 1: PICKUP',
        status: isDirectFlow ? 'Picked up by Transporter (In Direct Transit to Drop SHG)' : 'Picked up by Transporter (In Transit to Hub)',
        statusType: 'COMPLETED',
        actorName: pickupTransporterDetails?.name || 'Transporter',
        actorRole: 'TRANSPORTER',
        location: o.seller?.village || 'Collection Point',
        remarks: isDirectFlow ? 'Parcels in direct transit to Destination SHG Center' : 'Parcels in transit to GMU Central Hub',
      });
    }

    if (!isDirectFlow) {
      if (gmuHubIntakeAt) {
        auditTimeline.push({
          timestamp: gmuHubIntakeAt,
          stage: 'GMU HUB WAREHOUSE',
          status: 'Received & Quality Checked at GMU Hub',
          statusType: 'COMPLETED',
          actorName: 'GMU Hub Intake Dock',
          actorRole: 'HUB_COORDINATOR',
          location: 'GMU Central Hub',
          remarks: 'Intake verification completed & barcode validated',
        });
      }

      if (gmuHubStoredAt) {
        auditTimeline.push({
          timestamp: gmuHubStoredAt,
          stage: 'GMU HUB WAREHOUSE',
          status: 'Stored in Hub Inventory',
          statusType: 'COMPLETED',
          actorName: 'GMU Hub Inventory',
          actorRole: 'HUB_COORDINATOR',
          location: 'GMU Central Warehouse',
          remarks: 'Ready for outbound route dispatch',
        });
      }

      if (dropTransporterPickedAt || o.dispatchedAt) {
        auditTimeline.push({
          timestamp: dropTransporterPickedAt || o.dispatchedAt,
          stage: 'PHASE 2: DROP',
          status: 'Dispatched from Hub (In Transit to Drop Center)',
          statusType: 'COMPLETED',
          actorName: dropTransporterDetails?.name || 'Drop Transporter',
          actorRole: 'TRANSPORTER',
          location: 'GMU Central Hub Outbound',
          remarks: dropTransporterDetails?.vehicle ? `Vehicle: ${dropTransporterDetails.vehicle}` : 'Outbound transport started',
        });
      }
    }

    if (dropShgPickedAt || dropShgAcceptedAt) {
      auditTimeline.push({
        timestamp: dropShgPickedAt || dropShgAcceptedAt,
        stage: 'PHASE 2: DROP',
        status: 'Received at Destination SHG Center',
        statusType: 'COMPLETED',
        actorName: dropShgDetails?.name || 'Drop SHG Member',
        actorRole: 'SHG',
        location: dropShgDetails?.address || o.buyer?.village || 'Drop Village Center',
        remarks: 'Parcels received by destination SHG for buyer handover',
      });
    }

    if (buyerDeliveredAt) {
      auditTimeline.push({
        timestamp: buyerDeliveredAt,
        stage: 'COMPLETED',
        status: 'Delivered & Handed Over to Buyer',
        statusType: 'COMPLETED',
        actorName: o.buyer?.buyerName || 'Buyer',
        actorRole: 'BUYER',
        location: o.buyer?.village ? `${o.buyer.village} (${o.buyer.pincode || ''})` : 'Buyer Address',
        remarks: 'Final delivery completed and verified',
      });
    }

    const CANONICAL_STATUS_MAP: Record<string, string> = {
      'order placed & registered': 'Order Placed & Registered',
      'order placed': 'Order Placed & Registered',
      'pickup shg assigned & accepted': 'Pickup SHG Assigned & Accepted',
      'shg accepted': 'Pickup SHG Assigned & Accepted',
      'collected & scanned by shg': 'Collected & Scanned by SHG',
      'shg pickup': 'Collected & Scanned by SHG',
      'shg_pickup': 'Collected & Scanned by SHG',
      'transporter route assigned & accepted': 'Transporter Route Assigned & Accepted',
      'transporter accepted': 'Transporter Route Assigned & Accepted',
      'picked up by transporter (in transit to hub)': 'Picked up by Transporter (In Transit to Hub)',
      'picked up by transporter (in direct transit to drop shg)': 'Picked up by Transporter (In Direct Transit to Drop SHG)',
      'transporter pickup': 'Picked up by Transporter (In Transit to Hub)',
      'transporter_pickup': 'Picked up by Transporter (In Transit to Hub)',
      'received & quality checked at gmu hub': 'Received & Quality Checked at GMU Hub',
      'hub intake': 'Received & Quality Checked at GMU Hub',
      'hub_received': 'Received & Quality Checked at GMU Hub',
      'stored in hub inventory': 'Stored in Hub Inventory',
      'stored_in_hub': 'Stored in Hub Inventory',
      'drop shg assigned & accepted': 'Drop SHG Assigned & Accepted',
      'drop shg accepted': 'Drop SHG Assigned & Accepted',
      'drop transporter route assigned & accepted': 'Drop Transporter Route Assigned & Accepted',
      'drop transporter accepted': 'Drop Transporter Route Assigned & Accepted',
      'dispatched from hub (in transit to drop center)': 'Dispatched from Hub (In Transit to Drop Center)',
      'drop transporter pickup': 'Dispatched from Hub (In Transit to Drop Center)',
      'transporter drop pickup': 'Dispatched from Hub (In Transit to Drop Center)',
      'transporter_drop_pickup': 'Dispatched from Hub (In Transit to Drop Center)',
      'received at destination shg center': 'Received at Destination SHG Center',
      'drop shg pickup': 'Received at Destination SHG Center',
      'shg drop pickup': 'Received at Destination SHG Center',
      'shg_drop_pickup': 'Received at Destination SHG Center',
      'delivered & handed over to buyer': 'Delivered & Handed Over to Buyer',
      'delivered': 'Delivered & Handed Over to Buyer',
    };

    const STAGE_ORDER: Record<string, number> = {
      'Order Placed & Registered': 1,
      'Pickup SHG Assigned & Accepted': 2,
      'Collected & Scanned by SHG': 3,
      'Transporter Route Assigned & Accepted': 4,
      'Picked up by Transporter (In Transit to Hub)': 5,
      'Picked up by Transporter (In Direct Transit to Drop SHG)': 5,
      'Received & Quality Checked at GMU Hub': 6,
      'Stored in Hub Inventory': 7,
      'Drop SHG Assigned & Accepted': 8,
      'Drop Transporter Route Assigned & Accepted': 9,
      'Dispatched from Hub (In Transit to Drop Center)': 10,
      'Received at Destination SHG Center': 11,
      'Delivered & Handed Over to Buyer': 12,
    };

    const uniqueAuditMap = new Map();
    auditTimeline.forEach((t) => {
      const rawTitle = String(t.status || t.action || '').toLowerCase().trim();
      const canonicalTitle = CANONICAL_STATUS_MAP[rawTitle] || t.status || t.action;
      if (canonicalTitle) {
        const key = canonicalTitle.toLowerCase().trim();
        if (!uniqueAuditMap.has(key)) {
          uniqueAuditMap.set(key, { ...t, status: canonicalTitle });
        }
      }
    });

    const cleanAuditTimeline = Array.from(uniqueAuditMap.values()).sort((a: any, b: any) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      const rankA = STAGE_ORDER[a.status] || 99;
      const rankB = STAGE_ORDER[b.status] || 99;
      return rankA - rankB;
    });

    const rejectScan = allScans.find((s: any) => s.action === 'REJECT_DROP' || s.action === 'REJECT_PICKUP' || s.action === 'DECLINE_PRE_PICKUP' || s.scanResult === 'REJECTED' || s.scanResult === 'DECLINED');
    const rejectAssign = effectiveAssignments.find((a: any) => a.status === 'REJECTED');

    const isRegistrationStr = (str?: string | null) => !str || str.toLowerCase().includes('registered') || str.toLowerCase().includes('synchronized');
    const actualRejectReason =
      (!isRegistrationStr(o.rejectReason) ? o.rejectReason : null) ||
      (!isRegistrationStr(rejectScan?.remarks) ? rejectScan?.remarks : null) ||
      (!isRegistrationStr(pOrder?.rejectReason) ? pOrder?.rejectReason : null) ||
      (!isRegistrationStr(rejectAssign?.remarks) ? rejectAssign?.remarks : null) ||
      (!isRegistrationStr(o.remarks) ? o.remarks : null) ||
      (!isRegistrationStr(pOrder?.remarks) ? pOrder?.remarks : null) ||
      null;

    return {
      ...o,
      rejectReason: actualRejectReason || o.rejectReason,
      remarks: actualRejectReason || o.remarks,
      pickupShgDetails,
      pickupTransporterDetails,
      dropShgDetails,
      dropTransporterDetails,
      pickupShgAcceptedAt,
      pickupShgPickedAt,
      pickupTransporterAcceptedAt,
      pickupTransporterPickedAt,
      gmuHubIntakeAt,
      gmuHubStoredAt,
      dropTransporterAcceptedAt,
      dropTransporterPickedAt,
      dropShgAcceptedAt,
      dropShgPickedAt,
      buyerDeliveredAt,
      tracking: cleanAuditTimeline,
    };
  });
}
