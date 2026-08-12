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

  // Pickup SHG Assigned & Accepted
  'pickup shg assigned & accepted': 'Pickup SHG Assigned & Accepted',
  'shg accepted': 'Pickup SHG Assigned & Accepted',
  'order assigned': 'Pickup SHG Assigned & Accepted',
  'accepted': 'Pickup SHG Assigned & Accepted',
  'assigned': 'Pickup SHG Assigned & Accepted',
  'shg_accepted': 'Pickup SHG Assigned & Accepted',
  'pickup_shg_accepted': 'Pickup SHG Assigned & Accepted',

  // Collected & Scanned by SHG
  'collected & scanned by shg': 'Collected & Scanned by SHG',
  'shg pickup': 'Collected & Scanned by SHG',
  'shg scan': 'Collected & Scanned by SHG',
  'shg_pickup': 'Collected & Scanned by SHG',
  'collected': 'Collected & Scanned by SHG',
  'picked': 'Collected & Scanned by SHG',
  'pickedup': 'Collected & Scanned by SHG',
  'parcel_at_shg': 'Collected & Scanned by SHG',
  'parcel_picked': 'Collected & Scanned by SHG',

  // Picked up by Transporter
  'picked up by transporter': 'Picked up by Transporter',
  'handover to transporter': 'Picked up by Transporter',
  'transporter pickup': 'Picked up by Transporter',
  'transporter_accepted': 'Picked up by Transporter',
  'transporter_picked': 'Picked up by Transporter',
  'shg_transporter_deliver': 'Picked up by Transporter',
  'transporter_pickup_action': 'Picked up by Transporter',
  'in_transit': 'Picked up by Transporter',
  'in_transit_to_hub': 'Picked up by Transporter',
  'parcel_at_transporter': 'Picked up by Transporter',
  'parcel_with_transporter': 'Picked up by Transporter',

  // Hub Intake
  'received & quality checked at gmu hub': 'Received & Quality Checked at GMU Hub',
  'hub intake': 'Received & Quality Checked at GMU Hub',
  'hub_intake': 'Received & Quality Checked at GMU Hub',
  'at_gmu': 'Received & Quality Checked at GMU Hub',
  'stored': 'Received & Quality Checked at GMU Hub',

  // Dispatched from Hub
  'dispatched from hub': 'Dispatched from Hub',
  'gmu hub dispatched': 'Dispatched from Hub',
  'hub_dispatch': 'Dispatched from Hub',
  'dispatched': 'Dispatched from Hub',
  'ready_for_dispatch': 'Dispatched from Hub',
  'out_for_delivery': 'Dispatched from Hub',
  'in_transit_to_buyer': 'Dispatched from Hub',

  // Transporter Picked Up from Hub
  'transporter picked up from hub': 'Transporter Picked Up from Hub',
  'transporter drop pickup': 'Transporter Picked Up from Hub',
  'transporter_drop_pickup': 'Transporter Picked Up from Hub',
  'drop_transporter_picked': 'Transporter Picked Up from Hub',

  // Received at Destination SHG Center
  'received at destination shg center': 'Received at Destination SHG Center',
  'shg pickup from transporter': 'Received at Destination SHG Center',
  'drop shg pickup': 'Received at Destination SHG Center',
  'shg_drop_pickup': 'Received at Destination SHG Center',
  'at_buyer_shg': 'Received at Destination SHG Center',
  'parcel_at_drop_shg': 'Received at Destination SHG Center',
  'parcel_with_drop_shg': 'Received at Destination SHG Center',

  // Delivered & Handed Over to Buyer
  'delivered & handed over to buyer': 'Delivered & Handed Over to Buyer',
  'delivery to buyer': 'Delivered & Handed Over to Buyer',
  'final_delivery': 'Delivered & Handed Over to Buyer',
  'delivered': 'Delivered & Handed Over to Buyer',
  'completed': 'Delivered & Handed Over to Buyer',
  'dropped': 'Delivered & Handed Over to Buyer',
};

const STAGE_ORDER: Record<string, number> = {
  'Order Placed & Registered': 1,
  'Pickup SHG Assigned & Accepted': 2,
  'Collected & Scanned by SHG': 3,
  'Picked up by Transporter': 4,
  'Received & Quality Checked at GMU Hub': 5,
  'Dispatched from Hub': 6,
  'Transporter Picked Up from Hub': 7,
  'Received at Destination SHG Center': 8,
  'Delivered & Handed Over to Buyer': 9,
};

const formatISTDateTime = (dateInput?: any) => {
  if (!dateInput) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    return { time, date };
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
      const dateMatch = String(dateInput).match(/\b(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\b/);
      const timeMatch = String(dateInput).match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/);
      return {
        time: timeMatch ? timeMatch[1].toUpperCase() : '10:00 AM',
        date: dateMatch ? dateMatch[1] : '11 Aug 2026',
      };
    }

    const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    const date = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    return { time, date };
  } catch (e) {
    return { time: '10:00 AM', date: '11 Aug 2026' };
  }
};

export const TrackingHistoryModal: React.FC<TrackingHistoryModalProps> = ({
  visible,
  onClose,
  order,
  role = 'SHG',
}) => {
  if (!order) return null;

  const displayOrderId = order.orderId || order.pickupOrderNumber || order.dropOrderNumber || (order.id ? `ORD-${order.id}` : 'Order');

  const eventsMap = new Map<string, any>();
  const defaultTimestamp = order.createdAt || order.created_at || order.orderDate || order.date || new Date().toISOString();

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
        remarks: remarks || 'Stage update completed',
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
  const products = Array.isArray(order.products) ? order.products : (Array.isArray(order.parcels) ? order.parcels : []);
  products.forEach((p: any) => {
    if (Array.isArray(p.scanHistories)) {
      p.scanHistories.forEach((sh: any) => {
        const rawAction = sh.action || sh.currentStage || sh.status || 'Parcel Scanned';
        const ts = sh.createdAt || sh.scanTime || sh.timestamp;
        addEvent(rawAction, ts, sh.remarks || `Location: ${sh.location || 'Hub'}`);
      });
    }
  });

  // 3. Strict Stage Level Synthesis based on order status
  const statusUpper = String(order.mainStatus || order.status || '').toUpperCase();
  const pickupShgStatusUpper = String(order.pickupShgStatus || '').toUpperCase();
  const pickupTransporterStatusUpper = String(order.pickupTransporterStatus || '').toUpperCase();
  const dropTransporterStatusUpper = String(order.dropTransporterStatus || '').toUpperCase();
  const dropShgStatusUpper = String(order.dropShgStatus || '').toUpperCase();

  const isDropCompleted = order.dropCompleted || statusUpper === 'DROP_COMPLETED' || statusUpper === 'COMPLETED' || statusUpper === 'DELIVERED';
  const isPickupCompleted = order.pickupCompleted || statusUpper === 'PICKUP_COMPLETED' || isDropCompleted;

  let stageLevel = 1; // Stage 1: Order Placed & Registered

  // Stage 2: Pickup SHG Assigned & Accepted
  if (
    ['ACCEPTED', 'SHG_ACCEPTED', 'ASSIGNED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'ACCEPTED_PICKUP', 'PARCEL_PICKED', 'IN_TRANSIT', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'AT_GMU', 'STORED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
    pickupShgStatusUpper.includes('ACCEPT') ||
    isPickupCompleted || isDropCompleted
  ) {
    stageLevel = Math.max(stageLevel, 2);
  }

  // Stage 3: Collected & Scanned by SHG
  if (
    ['PARCEL_AT_SHG', 'PARCEL_PICKED', 'IN_TRANSIT', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'AT_GMU', 'STORED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
    pickupShgStatusUpper.includes('PICK') ||
    isPickupCompleted || isDropCompleted
  ) {
    stageLevel = Math.max(stageLevel, 3);
  }

  // Stage 4: Picked up by Transporter
  if (
    ['PARCEL_PICKED', 'IN_TRANSIT', 'IN_TRANSIT_TO_HUB', 'PICKUP_COMPLETED', 'AT_GMU', 'STORED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
    pickupTransporterStatusUpper.includes('PICK') ||
    isPickupCompleted || isDropCompleted
  ) {
    stageLevel = Math.max(stageLevel, 4);
  }

  // Stage 5: Dispatched from Hub
  if (
    ['DISPATCHED', 'OUT_FOR_DELIVERY', 'AT_BUYER_SHG', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
    dropTransporterStatusUpper.includes('PICK') ||
    isDropCompleted
  ) {
    stageLevel = Math.max(stageLevel, 5);
  }

  // Stage 6: Transporter Picked Up from Hub
  if (
    ['OUT_FOR_DELIVERY', 'AT_BUYER_SHG', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
    dropTransporterStatusUpper.includes('PICK') ||
    isDropCompleted
  ) {
    stageLevel = Math.max(stageLevel, 6);
  }

  // Stage 7: Received at Destination SHG Center
  if (
    ['AT_BUYER_SHG', 'DELIVERED', 'COMPLETED'].includes(statusUpper) ||
    dropShgStatusUpper.includes('ACCEPT') || dropShgStatusUpper.includes('RECV') ||
    isDropCompleted
  ) {
    stageLevel = Math.max(stageLevel, 7);
  }

  // Stage 8: Delivered & Handed Over to Buyer
  if (['DELIVERED', 'COMPLETED'].includes(statusUpper) || isDropCompleted) {
    stageLevel = Math.max(stageLevel, 8);
  }

  const createdAt = order.createdAt || order.orderDate || order.created_at || order.date;
  const acceptedAt = order.acceptedAt || order.shgAcceptedAt || order.pickupShgAcceptedAt || createdAt;
  const pickedUpAt = order.collectedAt || order.shgPickedUpAt || order.pickedUpAt || (statusUpper === 'PARCEL_AT_SHG' ? (order.updatedAt || acceptedAt) : acceptedAt);
  const transporterPickedAt = order.transporterPickedUpAt || order.transporterAcceptedAt || pickedUpAt;
  const dispatchedAt = order.dispatchedAt || order.hubDispatchedAt || transporterPickedAt;
  const dropTransporterPickedAt = order.dropTransporterPickedUpAt || dispatchedAt;
  const dropShgReceivedAt = order.dropShgReceivedAt || order.dropShgAcceptedAt || dropTransporterPickedAt;
  const deliveredAt = order.deliveredAt || order.completedAt || (statusUpper === 'DELIVERED' || statusUpper === 'COMPLETED' ? (order.updatedAt || dropShgReceivedAt) : dropShgReceivedAt);

  if (stageLevel >= 1) addEvent('Order Placed & Registered', createdAt, 'Order registered in system');
  if (stageLevel >= 2) addEvent('Pickup SHG Assigned & Accepted', acceptedAt, 'Assigned to pickup SHG');
  if (stageLevel >= 3) addEvent('Collected & Scanned by SHG', pickedUpAt, 'Picked up & scanned from seller');
  if (stageLevel >= 4) addEvent('Picked up by Transporter', transporterPickedAt, 'Transferred to Transporter');
  if (stageLevel >= 5) addEvent('Dispatched from Hub', dispatchedAt, 'Dispatched for buyer delivery');
  if (stageLevel >= 6) addEvent('Transporter Picked Up from Hub', dropTransporterPickedAt, 'Loaded by drop transporter');
  if (stageLevel >= 7) addEvent('Received at Destination SHG Center', dropShgReceivedAt, 'Received at buyer SHG center');
  if (stageLevel >= 8) addEvent('Delivered & Handed Over to Buyer', deliveredAt, 'Final doorstep delivery completed');

  // Sort timeline list by stage order integer
  const timelineList = Array.from(eventsMap.values())
    .sort((a, b) => (a.orderIdx || 99) - (b.orderIdx || 99));

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={18} color="#16A34A" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Order Tracking History</Text>
                  <Text style={styles.headerSubtitle}>#{displayOrderId}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Timeline Content */}
            <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeader}>SHG Audit Timeline</Text>

              {timelineList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tracking events logged yet.</Text>
                </View>
              ) : (
                <View style={styles.timelineCard}>
                  {timelineList.map((item, idx) => {
                    const timeObj = formatISTDateTime(item.timestamp);
                    const isLast = idx === timelineList.length - 1;

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
                          {item.remarks ? (
                            <Text style={styles.remarksText}>{item.remarks}</Text>
                          ) : null}
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
