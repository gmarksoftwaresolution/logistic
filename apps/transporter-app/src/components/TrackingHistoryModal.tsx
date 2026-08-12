import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrackingHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  order: any;
  role?: 'SHG' | 'TRANSPORTER';
}

const CANONICAL_MAP: Record<string, string> = {
  // Order Placed
  'order placed': 'Order Placed & Registered',
  'order placed & registered': 'Order Placed & Registered',
  'pending': 'Order Placed & Registered',
  'created': 'Order Placed & Registered',
  'order_placed': 'Order Placed & Registered',
  'registered': 'Order Placed & Registered',
  'new_order': 'Order Placed & Registered',
  'new order': 'Order Placed & Registered',

  // Collected & Scanned by SHG
  'collected & scanned by shg': 'Collected & Scanned by SHG',
  'shg pickup from seller': 'Collected & Scanned by SHG',
  'shg pickup': 'Collected & Scanned by SHG',
  'shg_pickup': 'Collected & Scanned by SHG',
  'collected': 'Collected & Scanned by SHG',
  'picked': 'Collected & Scanned by SHG',
  'pickedup': 'Collected & Scanned by SHG',
  'parcel_at_shg': 'Collected & Scanned by SHG',
  'parcel_picked': 'Collected & Scanned by SHG',
  'shg scan': 'Collected & Scanned by SHG',

  // Transporter Route Assigned & Accepted
  'transporter route assigned & accepted': 'Transporter Route Assigned & Accepted',
  'route assignment': 'Transporter Route Assigned & Accepted',
  'transporter accepted': 'Transporter Route Assigned & Accepted',
  'accepted': 'Transporter Route Assigned & Accepted',
  'accepted_pickup': 'Transporter Route Assigned & Accepted',
  'assigned': 'Transporter Route Assigned & Accepted',
  'transporter_accepted': 'Transporter Route Assigned & Accepted',
  'pickup_shg_accepted': 'Transporter Route Assigned & Accepted',

  // Picked up by Transporter
  'picked up by transporter': 'Picked up by Transporter',
  'pickup from shg': 'Picked up by Transporter',
  'transporter pickup': 'Picked up by Transporter',
  'transporter_picked': 'Picked up by Transporter',
  'pickup_completed': 'Picked up by Transporter',
  'in_transit': 'Picked up by Transporter',
  'in_transit_to_hub': 'Picked up by Transporter',
  'parcel_at_transporter': 'Picked up by Transporter',
  'parcel_with_transporter': 'Picked up by Transporter',

  // Received & Quality Checked at GMU Hub
  'received & quality checked at gmu hub': 'Received & Quality Checked at GMU Hub',
  'hub intake': 'Received & Quality Checked at GMU Hub',
  'at_gmu': 'Received & Quality Checked at GMU Hub',
  'parcel_at_gmu': 'Received & Quality Checked at GMU Hub',
  'parcel_at_hub': 'Received & Quality Checked at GMU Hub',
  'hub_received': 'Received & Quality Checked at GMU Hub',
  'delivered_to_hub': 'Received & Quality Checked at GMU Hub',
  'stored': 'Received & Quality Checked at GMU Hub',
  'stored in hub inventory': 'Received & Quality Checked at GMU Hub',

  // Dispatched from Hub
  'dispatched from hub': 'Dispatched from Hub',
  'hub dispatch': 'Dispatched from Hub',
  'gmu hub dispatched': 'Dispatched from Hub',
  'dispatched': 'Dispatched from Hub',
  'ready_for_dispatch': 'Dispatched from Hub',
  'out_for_delivery': 'Dispatched from Hub',
  'return_dispatched': 'Dispatched from Hub',

  // Transporter Picked Up from Hub
  'transporter picked up from hub': 'Transporter Picked Up from Hub',
  'transporter drop pickup': 'Transporter Picked Up from Hub',
  'transporter_drop_pickup': 'Transporter Picked Up from Hub',
  'drop_transporter_picked': 'Transporter Picked Up from Hub',
  'in_transit_to_buyer': 'Transporter Picked Up from Hub',

  // Received at Destination SHG Center / Delivered
  'received at destination shg center': 'Received at Destination SHG Center',
  'drop to shg': 'Received at Destination SHG Center',
  'at_buyer_shg': 'Received at Destination SHG Center',
  'shg drop pickup': 'Received at Destination SHG Center',
  'drop_completed': 'Received at Destination SHG Center',
  'parcel_at_drop_shg': 'Received at Destination SHG Center',
  'parcel_with_drop_shg': 'Received at Destination SHG Center',
  'delivered & handed over to buyer': 'Delivered & Handed Over to Buyer',
  'delivery to buyer': 'Delivered & Handed Over to Buyer',
  'delivered': 'Delivered & Handed Over to Buyer',
  'completed': 'Delivered & Handed Over to Buyer',
  'dropped': 'Delivered & Handed Over to Buyer',
};

const STAGE_ORDER: Record<string, number> = {
  'Order Placed & Registered': 1,
  'Order Ready for Dispatch at GMU Hub': 1,
  'Collected & Scanned by SHG': 2,
  'Transporter Drop Route Assigned & Accepted': 2,
  'Transporter Route Assigned & Accepted': 3,
  'Transporter Picked Up from GMU Hub': 3,
  'Picked up by Transporter': 4,
  'In Transit to Destination SHG': 4,
  'Received & Quality Checked at GMU Hub': 5,
  'Received & Handed Over at Destination SHG Center': 5,
  'Dispatched from Hub': 6,
  'Transporter Picked Up from Hub': 7,
  'Received at Destination SHG Center': 8,
};

const formatISTDateTime = (dateInput?: any): { time: string; date: string } => {
  if (!dateInput) {
    const now = new Date();
    return {
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
    };
  }

  try {
    let dt: Date;
    if (dateInput instanceof Date) {
      dt = dateInput;
    } else if (typeof dateInput === 'number') {
      dt = new Date(dateInput);
    } else {
      const str = String(dateInput).trim();
      dt = new Date(str);
      if (isNaN(dt.getTime())) {
        const cleanedStr = str.replace(' ', 'T');
        dt = new Date(cleanedStr);
      }
    }

    if (isNaN(dt.getTime())) {
      const now = new Date();
      return {
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
        date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      };
    }

    const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    const date = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    return { time, date };
  } catch (e) {
    const now = new Date();
    return {
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
    };
  }
};

export const TrackingHistoryModal: React.FC<TrackingHistoryModalProps> = ({
  visible,
  onClose,
  order,
  role = 'TRANSPORTER',
}) => {
  if (!order) return null;

  const displayOrderId = order.orderId || order.pickupOrderNumber || order.dropOrderNumber || order.displayId || (order.id ? `ORD-${order.id}` : 'Order');

  const eventsMap = new Map<string, any>();
  const defaultTimestamp = order.createdAt || order.created_at || order.orderDate || order.timestamp || order.date || new Date().toISOString();

  const addEvent = (rawTitle: string, timestamp?: any, remarks?: string) => {
    if (!rawTitle) return;
    const validTimestamp = timestamp || defaultTimestamp;
    const lower = String(rawTitle).toLowerCase().trim();
    const canonical = CANONICAL_MAP[lower] || rawTitle;
    const orderIdx = STAGE_ORDER[canonical] !== undefined ? STAGE_ORDER[canonical] : 99;

    if (!eventsMap.has(canonical)) {
      eventsMap.set(canonical, {
        title: canonical,
        timestamp: validTimestamp,
        remarks: remarks || '',
        orderIdx,
      });
    } else if (timestamp) {
      const existing = eventsMap.get(canonical);
      eventsMap.set(canonical, {
        ...existing,
        timestamp: validTimestamp,
        remarks: remarks || existing.remarks,
      });
    }
  };

  // 1. Process server tracking array if available
  if (order.tracking && Array.isArray(order.tracking) && order.tracking.length > 0) {
    order.tracking.forEach((t: any) => {
      const rawTitle = t.status || t.action || t.title || '';
      const ts = t.timestamp || t.scanTime || t.createdAt || t.updatedAt;
      addEvent(rawTitle, ts, t.remarks);
    });
  }

  // 2. Process product scan histories if available
  const scanHistoriesList: any[] = [];
  if (Array.isArray(order.products)) {
    order.products.forEach((p: any) => {
      if (Array.isArray(p.scanHistories)) {
        p.scanHistories.forEach((sh: any) => {
          scanHistoriesList.push(sh);
          addEvent(sh.status || sh.location || 'Parcel Scanned', sh.scanTime || sh.createdAt, sh.remarks);
        });
      }
    });
  }

  // 3. Detect Phase 1 (Pickup Leg: Seller ➔ Hub) vs Phase 2 (Drop Leg: Hub ➔ Destination SHG) vs Master Journey
  const isExplicitPickup = 
    order.type === 'pickup' || 
    order.legType === 'pickup' || 
    order.flowType === 'shg_to_gmu' || 
    String(order.id || '').startsWith('pickup-') || 
    String(displayOrderId).toUpperCase().includes('PICK');

  const isExplicitDrop = 
    order.type === 'drop' || 
    order.legType === 'drop' || 
    order.flowType === 'gmu_to_shg' || 
    String(order.id || '').startsWith('drop-') || 
    String(displayOrderId).toUpperCase().includes('DROP');

  const isConsolidatedMaster = !!(order.pickupBatchId && order.dropBatchId) || !!order.masterOrderId;

  const isPickupOnly = isExplicitPickup && !isConsolidatedMaster;
  const isDropOnly = isExplicitDrop && !isConsolidatedMaster;

  const statusUpper = String(order.mainStatus || order.status || order.batchStatus || '').toUpperCase();
  const pickupShgStatusUpper = String(order.pickupShgStatus || '').toUpperCase();
  const pickupTransporterStatusUpper = String(order.pickupTransporterStatus || '').toUpperCase();
  const dropTransporterStatusUpper = String(order.dropTransporterStatus || '').toUpperCase();
  const dropShgStatusUpper = String(order.dropShgStatus || '').toUpperCase();

  const products = Array.isArray(order.products) ? order.products : [];
  const isAnyProductPicked = products.some((p: any) => p.status === 'picked' || p.status === 'completed');
  const isAnyProductCompleted = products.some((p: any) => p.status === 'completed');

  const rawCreatedAt = order.createdAt || order.orderDate || order.created_at || order.timestamp || order.date;
  const baseDate = rawCreatedAt ? new Date(rawCreatedAt) : new Date();
  const latestDate = order.deliveredAt ? new Date(order.deliveredAt) : (order.updatedAt ? new Date(order.updatedAt) : new Date());

  const baseMs = !isNaN(baseDate.getTime()) ? baseDate.getTime() : Date.now();
  const latestMs = !isNaN(latestDate.getTime()) ? latestDate.getTime() : Date.now();

  const getStepTime = (explicitTime: any, stepIndex: number, totalActiveSteps: number) => {
    if (explicitTime) return explicitTime;
    if (stepIndex === 0) return new Date(baseMs).toISOString();
    if (stepIndex === totalActiveSteps - 1 && latestMs > baseMs) return new Date(latestMs).toISOString();
    const diff = Math.max(0, latestMs - baseMs);
    if (diff > 0 && totalActiveSteps > 1) {
      const stepMs = baseMs + Math.round((diff * stepIndex) / (totalActiveSteps - 1));
      return new Date(stepMs).toISOString();
    }
    const offsetMs = baseMs + (stepIndex * 5 * 60 * 1000);
    return new Date(Math.min(offsetMs, Date.now())).toISOString();
  };

  const shgScanTime = scanHistoriesList.find((s: any) => String(s.action || '').toUpperCase().includes('SHG_PICKUP'))?.scanTime;
  const transScanTime = scanHistoriesList.find((s: any) => String(s.action || '').toUpperCase().includes('TRANSPORTER_PICKUP'))?.scanTime;
  const hubScanTime = scanHistoriesList.find((s: any) => String(s.action || '').toUpperCase().includes('WAREHOUSE_INTAKE'))?.scanTime;
  const dropTransScanTime = scanHistoriesList.find((s: any) => String(s.action || '').toUpperCase().includes('TRANSPORTER_DROP'))?.scanTime;
  const dropShgScanTime = scanHistoriesList.find((s: any) => String(s.action || '').toUpperCase().includes('SHG_DROP'))?.scanTime;
  const deliveryScanTime = scanHistoriesList.find((s: any) => String(s.action || '').toUpperCase().includes('FINAL_DELIVERY'))?.scanTime;

  // -------------------------------------------------------------
  // A. PHASE 1: PICKUP ORDERS (Seller SHG ➔ GMU Hub Receive)
  // -------------------------------------------------------------
  if (isPickupOnly) {
    let stageLevel = 1;

    // Stage 2: SHG Scanned
    if (
      ['PARCEL_AT_SHG', 'RETURN_PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'ACCEPTED_PICKUP', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'COMPLETED'].includes(statusUpper) ||
      pickupShgStatusUpper.includes('PICK') || pickupShgStatusUpper.includes('ACCEPT') ||
      order.pickupCompleted
    ) {
      stageLevel = Math.max(stageLevel, 2);
    }

    // Stage 3: Transporter Accepted
    if (
      ['TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'ACCEPTED_PICKUP', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'COMPLETED'].includes(statusUpper) ||
      pickupTransporterStatusUpper.includes('ACCEPT') ||
      order.isAccepted ||
      order.pickupCompleted
    ) {
      stageLevel = Math.max(stageLevel, 3);
    }

    // Stage 4: Picked up by Transporter
    if (
      ['PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'COMPLETED'].includes(statusUpper) ||
      pickupTransporterStatusUpper.includes('PICK') ||
      isAnyProductPicked ||
      order.pickupCompleted
    ) {
      stageLevel = Math.max(stageLevel, 4);
    }

    // Stage 5: Received & Quality Checked at GMU Hub (FINAL PHASE 1 END STEP)
    if (
      ['HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'COMPLETED', 'PICKUP_COMPLETED'].includes(statusUpper) ||
      order.pickupCompleted ||
      isAnyProductCompleted
    ) {
      stageLevel = Math.max(stageLevel, 5);
    }

    const p1CreatedAt = rawCreatedAt;
    const p1ShgPickedAt = shgScanTime || order.shgPickedUpAt || order.collectedAt || order.pickedUpAt || getStepTime(null, 1, stageLevel);
    const p1TransAcceptedAt = order.acceptedAt || order.transporterAcceptedAt || getStepTime(null, 2, stageLevel);
    const p1TransPickedAt = transScanTime || order.transporterPickedUpAt || getStepTime(null, 3, stageLevel);
    const p1HubReceivedAt = hubScanTime || order.warehouseReceivedAt || order.storedAt || order.atGmuAt || getStepTime(null, 4, stageLevel);

    if (stageLevel >= 1) addEvent('Order Placed & Registered', p1CreatedAt);
    if (stageLevel >= 2) addEvent('Collected & Scanned by SHG', p1ShgPickedAt);
    if (stageLevel >= 3) addEvent('Transporter Route Assigned & Accepted', p1TransAcceptedAt);
    if (stageLevel >= 4) addEvent('Picked up by Transporter', p1TransPickedAt);
    if (stageLevel >= 5) addEvent('Received & Quality Checked at GMU Hub', p1HubReceivedAt);
  }

  // -------------------------------------------------------------
  // B. PHASE 2: DROP ORDERS (GMU Hub ➔ Destination SHG Center)
  // -------------------------------------------------------------
  else if (isDropOnly) {
    let stageLevel = 1;

    // Stage 2: Transporter Drop Accepted
    if (
      ['ACCEPTED_DROP', 'DROP_ACCEPTED', 'OUT_FOR_DELIVERY', 'AT_BUYER_SHG', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      dropTransporterStatusUpper.includes('ACCEPT') ||
      order.isAccepted ||
      order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 2);
    }

    // Stage 3: Picked Up from Hub
    if (
      ['OUT_FOR_DELIVERY', 'AT_BUYER_SHG', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      dropTransporterStatusUpper.includes('PICK') ||
      order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 3);
    }

    // Stage 4: In Transit
    if (
      ['OUT_FOR_DELIVERY', 'AT_BUYER_SHG', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 4);
    }

    // Stage 5: Received at Destination SHG (FINAL PHASE 2 END STEP)
    if (
      ['AT_BUYER_SHG', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      dropShgStatusUpper.includes('ACCEPT') || dropShgStatusUpper.includes('RECV') ||
      order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 5);
    }

    const p2DispatchedAt = order.dispatchedAt || order.hubDispatchedAt || rawCreatedAt;
    const p2TransAcceptedAt = order.acceptedAt || order.dropTransporterAcceptedAt || getStepTime(null, 1, stageLevel);
    const p2TransPickedAt = dropTransScanTime || order.dropTransporterPickedUpAt || getStepTime(null, 2, stageLevel);
    const p2InTransitAt = getStepTime(null, 3, stageLevel);
    const p2DropShgReceivedAt = dropShgScanTime || order.dropShgReceivedAt || order.dropShgAcceptedAt || getStepTime(null, 4, stageLevel);

    if (stageLevel >= 1) addEvent('Order Ready for Dispatch at GMU Hub', p2DispatchedAt);
    if (stageLevel >= 2) addEvent('Transporter Drop Route Assigned & Accepted', p2TransAcceptedAt);
    if (stageLevel >= 3) addEvent('Transporter Picked Up from GMU Hub', p2TransPickedAt);
    if (stageLevel >= 4) addEvent('In Transit to Destination SHG', p2InTransitAt);
    if (stageLevel >= 5) addEvent('Received & Handed Over at Destination SHG Center', p2DropShgReceivedAt);
  }

  // -------------------------------------------------------------
  // C. CONSOLIDATED MASTER JOURNEY (Full End-to-End Transfer)
  // -------------------------------------------------------------
  else {
    let stageLevel = 1;

    if (
      ['PARCEL_AT_SHG', 'RETURN_PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'ACCEPTED_PICKUP', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      pickupShgStatusUpper.includes('PICK') || pickupShgStatusUpper.includes('ACCEPT') ||
      order.pickupCompleted || order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 2);
    }

    if (
      ['TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'ACCEPTED_PICKUP', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      pickupTransporterStatusUpper.includes('ACCEPT') ||
      order.isAccepted ||
      order.pickupCompleted || order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 3);
    }

    if (
      ['PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      pickupTransporterStatusUpper.includes('PICK') ||
      isAnyProductPicked ||
      order.pickupCompleted || order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 4);
    }

    if (
      ['HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      order.dropCompleted ||
      isAnyProductCompleted
    ) {
      stageLevel = Math.max(stageLevel, 5);
    }

    if (
      ['DISPATCHED', 'OUT_FOR_DELIVERY', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      dropTransporterStatusUpper.includes('PICK') ||
      order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 6);
    }

    if (
      ['OUT_FOR_DELIVERY', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      dropTransporterStatusUpper.includes('PICK') ||
      order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 7);
    }

    if (
      ['AT_BUYER_SHG', 'DROP_COMPLETED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
      dropShgStatusUpper.includes('ACCEPT') || dropShgStatusUpper.includes('RECV') ||
      order.dropCompleted
    ) {
      stageLevel = Math.max(stageLevel, 8);
    }

    const mCreatedAt = rawCreatedAt;
    const mShgPickedAt = shgScanTime || order.shgPickedUpAt || order.collectedAt || order.pickedUpAt || getStepTime(null, 1, stageLevel);
    const mTransAcceptedAt = order.acceptedAt || order.transporterAcceptedAt || getStepTime(null, 2, stageLevel);
    const mTransPickedAt = transScanTime || order.transporterPickedUpAt || getStepTime(null, 3, stageLevel);
    const mHubReceivedAt = hubScanTime || order.warehouseReceivedAt || order.storedAt || order.atGmuAt || getStepTime(null, 4, stageLevel);
    const mDispatchedAt = order.dispatchedAt || order.hubDispatchedAt || getStepTime(null, 5, stageLevel);
    const mDropTransPickedAt = dropTransScanTime || order.dropTransporterPickedUpAt || getStepTime(null, 6, stageLevel);
    const mDropShgReceivedAt = dropShgScanTime || order.dropShgReceivedAt || order.dropShgAcceptedAt || getStepTime(null, 7, stageLevel);

    if (stageLevel >= 1) addEvent('Order Placed & Registered', mCreatedAt);
    if (stageLevel >= 2) addEvent('Collected & Scanned by SHG', mShgPickedAt);
    if (stageLevel >= 3) addEvent('Transporter Route Assigned & Accepted', mTransAcceptedAt);
    if (stageLevel >= 4) addEvent('Picked up by Transporter', mTransPickedAt);
    if (stageLevel >= 5) addEvent('Received & Quality Checked at GMU Hub', mHubReceivedAt);
    if (stageLevel >= 6) addEvent('Dispatched from Hub', mDispatchedAt);
    if (stageLevel >= 7) addEvent('Transporter Picked Up from Hub', mDropTransPickedAt);
    if (stageLevel >= 8) addEvent('Received at Destination SHG Center', mDropShgReceivedAt);
  }

  // Sort timeline list by stage order integer
  const timelineList = Array.from(eventsMap.values())
    .sort((a, b) => (a.orderIdx || 99) - (b.orderIdx || 99));

  // Secondary filter for Phase 1 vs Phase 2
  const filteredTimeline = timelineList.filter((item) => {
    if (isPickupOnly) {
      return !['Dispatched from Hub', 'Transporter Picked Up from Hub', 'Received at Destination SHG Center', 'Delivered & Handed Over to Buyer'].includes(item.title);
    }
    if (isDropOnly) {
      return !['Order Placed & Registered', 'Collected & Scanned by SHG', 'Picked up by Transporter'].includes(item.title);
    }
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="bus-outline" size={18} color="#16A34A" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {isPickupOnly ? 'Pickup Leg Tracking (Phase 1)' : isDropOnly ? 'Drop Leg Tracking (Phase 2)' : 'Transporter Tracking History'}
                  </Text>
                  <Text style={styles.headerSubtitle}>#{displayOrderId}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Timeline Content */}
            <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeader}>
                {isPickupOnly ? 'Phase 1: Seller SHG → GMU Hub' : isDropOnly ? 'Phase 2: GMU Hub → Destination SHG' : 'Transporter Audit Timeline'}
              </Text>

              {filteredTimeline.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tracking events logged yet for this trip.</Text>
                </View>
              ) : (
                <View style={styles.timelineCard}>
                  {filteredTimeline.map((item, idx) => {
                    const timeObj = formatISTDateTime(item.timestamp);
                    const isLast = idx === filteredTimeline.length - 1;

                    return (
                      <View key={idx} style={styles.timelineItem}>
                        {/* Left dot & line */}
                        <View style={styles.dotColumn}>
                          <View style={styles.greenDot} />
                          {!isLast && <View style={styles.verticalLine} />}
                        </View>

                        {/* Right Content */}
                        <View style={styles.itemContent}>
                          <View style={styles.timeTagRow}>
                            <View style={styles.dateBadge}>
                              <Ionicons name="calendar-outline" size={11} color="#16A34A" style={{ marginRight: 3 }} />
                              <Text style={styles.dateText}>{timeObj.date}</Text>
                            </View>
                            <View style={styles.timeBadge}>
                              <Ionicons name="time-outline" size={11} color="#475569" style={{ marginRight: 3 }} />
                              <Text style={styles.timeText}>{timeObj.time}</Text>
                            </View>
                          </View>
                          <Text style={styles.titleText}>{item.title}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
                <Text style={styles.closeFooterBtnText}>Close Tracking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    justifyContent: 'flex-end',
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    flexDirection: 'column',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5EC',
    borderWidth: 1,
    borderColor: '#D5EFE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  body: {
    paddingTop: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#16A34A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  emptyContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontStyle: 'italic',
  },
  timelineCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dotColumn: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    marginTop: 3,
    zIndex: 2,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  verticalLine: {
    position: 'absolute',
    top: 15,
    bottom: -20,
    width: 2,
    backgroundColor: '#86EFAC',
    left: 11,
    zIndex: 1,
  },
  itemContent: {
    flex: 1,
    paddingLeft: 12,
  },
  timeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D5EFE0',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 6,
    lineHeight: 20,
  },
  remarksText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  closeFooterBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  closeFooterBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
