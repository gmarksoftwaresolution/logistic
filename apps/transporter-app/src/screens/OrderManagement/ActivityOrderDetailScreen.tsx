import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  DeviceEventEmitter,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { Colors, Fonts } from '../../constants/Colors';
import { useOrderManagement, HUB_CONTACT } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale, cleanPersonName } from '../../utils/responsive';
import { X, Package, ClipboardList, AlertCircle, ArrowRight, MapPin, Phone, User, ExternalLink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const ActivityOrderDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { batchId, type = 'pickup' } = route.params;
  const { batches, acceptBatch } = useOrderManagement();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    // Hide the bottom tabs when details details modal opens
    DeviceEventEmitter.emit('hide-tabbar');
    return () => {
      // Show the bottom tabs when details modal closes
      DeviceEventEmitter.emit('show-tabbar');
    };
  }, []);

  const batch = batches.find((b) => b.id === batchId);



  if (!batch) {
    return (
      <View style={styles.backdropContainer}>
        <TouchableOpacity style={styles.backdropPressable} activeOpacity={1} onPress={() => navigation.goBack()} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandleBar} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('orders.activity_details', { defaultValue: 'Activity Details' })}</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <X size={scale(18)} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.notFoundBox}>
            <Text style={styles.notFoundText}>{t('orders.batch_not_found', { defaultValue: 'Order Batch Not Found' })}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Resolve Pickup Contact details
  const isPickupHub = batch.pickupPointName === 'Gadhinglaj Hub' || batch.pickupPointName === 'Central Hub GMU';
  const pickupContact = isPickupHub ? HUB_CONTACT : batch.shgContact;

  // Resolve Drop-off Contact details
  const isDropHub = batch.dropPointName === 'Gadhinglaj Hub' || batch.dropPointName === 'Central Hub GMU';
  const dropContact = isDropHub ? HUB_CONTACT : batch.shgContact;

  // Determine dynamic badge colors based on batch status
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'NEW_ORDER':
        return { bg: '#EFF6FF', text: '#2563EB', label: t('orders.status_new_order', { defaultValue: 'New Order' }) };
      case 'ACCEPTED_PICKUP':
        return { bg: '#F5F3FF', text: '#7C3AED', label: t('orders.status_accepted_pickup', { defaultValue: 'Accepted Pickup' }) };
      case 'PICKUP_COMPLETED':
        return { bg: '#EFF6FF', text: '#1D4ED8', label: t('orders.status_pickup_completed', { defaultValue: 'Pickup Completed' }) };
      case 'DROP_COMPLETED':
        return { bg: '#ECFDF5', text: '#059669', label: t('orders.status_drop_completed', { defaultValue: 'Drop Completed' }) };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#EF4444', label: t('orders.rejected', { defaultValue: 'Rejected' }) };
      default:
        return { bg: '#F1F5F9', text: '#64748B', label: status };
    }
  };

  const badgeStyle = getStatusBadgeStyle(batch.status);

  return (
    <View style={styles.backdropContainer}>
      {/* Semi-transparent Backdrop: dismisses bottom sheet when tapped */}
      <TouchableOpacity style={styles.backdropPressable} activeOpacity={1} onPress={() => navigation.goBack()} />

      {/* Half-Screen Sheet Container */}
      <View style={styles.sheetContainer}>
        {/* Visual Sheet Drag Handle */}
        <View style={styles.sheetHandleBar} />

        {/* Premium Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t('orders.activity_details', { defaultValue: 'Activity Details' })}</Text>
            <Text style={styles.headerSubtitle}>{batch.id}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <X size={scale(18)} color={Colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Dynamic Status Card */}
          <LinearGradient
            colors={batch.status === 'rejected' ? ['#EF4444', '#B91C1C'] : [Colors.primary, '#065F46']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryRow}>
              <View style={styles.iconContainer}>
                <Package size={scale(18)} color="#FFFFFF" />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.batchIdText} numberOfLines={1} adjustsFontSizeToFit>{batch.id}</Text>
                <Text style={styles.areaTagText}>
                  {batch.areaName} • {batch.flowType === 'gmu_to_shg' ? t('orders.drop_orders', { defaultValue: 'Drop' }).toUpperCase() : t('orders.pickup_orders', { defaultValue: 'Pickup' }).toUpperCase()}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <Text style={styles.statusBadgeText} numberOfLines={1} adjustsFontSizeToFit>
                  {badgeStyle.label.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.routeRow}>
              <View style={styles.routeCol}>
                <Text style={styles.routeLabel}>{t('orders.from', { defaultValue: 'FROM' })}</Text>
                <Text style={styles.routeValue} numberOfLines={1}>{batch.pickupPointName}</Text>
              </View>
              <View style={styles.routeArrowBox}>
                <View style={styles.dotLine} />
              </View>
              <View style={styles.routeCol}>
                <Text style={styles.routeLabel}>{t('orders.to', { defaultValue: 'TO' })}</Text>
                <Text style={styles.routeValue} numberOfLines={1}>{batch.dropPointName}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Section: Overview Metrics */}
          <View style={styles.metricsBox}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{batch.totalQty}</Text>
              <Text style={styles.metricLabel}>{t('orders.items_label')}</Text>
            </View>
            <View style={styles.metricLine} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{batch.totalWeight}</Text>
              <Text style={styles.metricLabel}>{t('orders.weight_label')}</Text>
            </View>
            <View style={styles.metricLine} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{batch.timestamp || t('orders.just_now')}</Text>
              <Text style={styles.metricLabel}>{t('orders.timestamp', { defaultValue: 'Time' })}</Text>
            </View>
          </View>
          {/* Section: Pickup Location & Contact Details */}
          <View style={styles.contactCardContainer}>
            <View style={styles.contactCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <MapPin size={scale(18)} color="#3B82F6" strokeWidth={2.5} />
                <Text style={styles.contactCardTitle}>
                  {t('orders.pickup_details_title', { defaultValue: 'Pickup Location & Contact' })}
                </Text>
              </View>
              {pickupContact?.phone && (
                <TouchableOpacity style={styles.contactCallBtn} onPress={() => Linking.openURL(`tel:${pickupContact.phone}`)} activeOpacity={0.7}>
                  <Phone size={scale(13)} color={Colors.primary} />
                  <Text style={styles.contactCallBtnText}>{t('orders.call', { defaultValue: 'Call' })}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.contactCardBody}>
              <View style={styles.contactInfoGrid}>
                {/* Person Item */}
                <View style={styles.contactInfoRow}>
                  <View style={styles.contactIconBg}>
                    <User size={scale(14)} color={Colors.primary} />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactTextLabel}>{t('orders.contact_person', { defaultValue: 'Contact Person' })}</Text>
                    <Text style={styles.contactTextValue}>{cleanPersonName(pickupContact?.name) || 'Seller'}</Text>
                  </View>
                </View>

                {/* Phone Item */}
                <View style={styles.contactInfoRow}>
                  <View style={styles.contactIconBg}>
                    <Phone size={scale(14)} color={Colors.primary} />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactTextLabel}>{t('orders.phone_number', { defaultValue: 'Phone Number' })}</Text>
                    <Text style={styles.contactTextValue}>{pickupContact?.phone || ''}</Text>
                  </View>
                </View>

                {/* Village Item */}
                <View style={styles.contactInfoRow}>
                  <View style={styles.contactIconBg}>
                    <MapPin size={scale(14)} color={Colors.primary} />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactTextLabel}>{t('orders.village', { defaultValue: 'Village' })}</Text>
                    <Text style={styles.contactTextValue}>{pickupContact?.village || batch.pickupPointName || 'Nesari'}</Text>
                  </View>
                </View>

                {/* Pincode Item */}
                <View style={styles.contactInfoRow}>
                  <View style={styles.contactIconBg}>
                    <MapPin size={scale(14)} color={Colors.primary} />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactTextLabel}>{t('orders.pincode', { defaultValue: 'Pincode' })}</Text>
                    <Text style={styles.contactTextValue}>{pickupContact?.pincode || '416504'}</Text>
                  </View>
                </View>
              </View>

              {/* Full Address Block */}
              <View style={styles.addressBlock}>
                <View style={styles.contactIconBg}>
                  <MapPin size={scale(14)} color={Colors.primary} />
                </View>
                <View style={{ flex: 1, marginRight: scale(4) }}>
                  <Text style={styles.contactTextLabel}>{t('orders.full_address', { defaultValue: 'Full Address' })}</Text>
                  <Text style={styles.addressTextValue}>{pickupContact?.address || ''}</Text>
                </View>
                {pickupContact?.address && (
                  <TouchableOpacity 
                    style={styles.navBtn} 
                    onPress={() => {
                      const query = [pickupContact.address, pickupContact.village, pickupContact.pincode, 'Maharashtra', 'India'].filter(Boolean).join(', ');
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
                    }} 
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={scale(12)} color={Colors.primary} />
                    <Text style={styles.navBtnText}>{t('orders.navigate', { defaultValue: 'Navigate' })}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Section: Drop-off Location & Contact Details */}
          <View style={styles.contactCardContainer}>
            <View style={styles.contactCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <MapPin size={scale(18)} color="#10B981" strokeWidth={2.5} />
                <Text style={styles.contactCardTitle}>
                  {t('orders.drop_details_title', { defaultValue: 'Drop-off Location & Contact' })}
                </Text>
              </View>
              {dropContact?.phone && (
                <TouchableOpacity style={styles.contactCallBtn} onPress={() => Linking.openURL(`tel:${dropContact.phone}`)} activeOpacity={0.7}>
                  <Phone size={scale(13)} color={Colors.primary} />
                  <Text style={styles.contactCallBtnText}>{t('orders.call', { defaultValue: 'Call' })}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.contactCardBody}>
              <View style={styles.contactInfoGrid}>
                {/* Person Item */}
                <View style={styles.contactInfoRow}>
                  <View style={styles.contactIconBg}>
                    <User size={scale(14)} color={Colors.primary} />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactTextLabel}>{t('orders.contact_person', { defaultValue: 'Contact Person' })}</Text>
                    <Text style={styles.contactTextValue}>{cleanPersonName(dropContact?.name) || 'Buyer'}</Text>
                  </View>
                </View>

                {/* Phone Item */}
                <View style={styles.contactInfoRow}>
                  <View style={styles.contactIconBg}>
                    <Phone size={scale(14)} color={Colors.primary} />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactTextLabel}>{t('orders.phone_number', { defaultValue: 'Phone Number' })}</Text>
                    <Text style={styles.contactTextValue}>{dropContact?.phone || ''}</Text>
                  </View>
                </View>

                {/* Village Item */}
                <View style={styles.contactInfoRow}>
                  <View style={styles.contactIconBg}>
                    <MapPin size={scale(14)} color={Colors.primary} />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactTextLabel}>{t('orders.village', { defaultValue: 'Village' })}</Text>
                    <Text style={styles.contactTextValue}>{dropContact?.village || batch.dropPointName || 'Nesari'}</Text>
                  </View>
                </View>

                {/* Pincode Item */}
                <View style={styles.contactInfoRow}>
                  <View style={styles.contactIconBg}>
                    <MapPin size={scale(14)} color={Colors.primary} />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactTextLabel}>{t('orders.pincode', { defaultValue: 'Pincode' })}</Text>
                    <Text style={styles.contactTextValue}>{dropContact?.pincode || '416504'}</Text>
                  </View>
                </View>
              </View>

              {/* Full Address Block */}
              <View style={styles.addressBlock}>
                <View style={styles.contactIconBg}>
                  <MapPin size={scale(14)} color={Colors.primary} />
                </View>
                <View style={{ flex: 1, marginRight: scale(4) }}>
                  <Text style={styles.contactTextLabel}>{t('orders.full_address', { defaultValue: 'Full Address' })}</Text>
                  <Text style={styles.addressTextValue}>{dropContact?.address || ''}</Text>
                </View>
                {dropContact?.address && (
                  <TouchableOpacity 
                    style={styles.navBtn} 
                    onPress={() => {
                      const query = [dropContact.address, dropContact.village, dropContact.pincode, 'Maharashtra', 'India'].filter(Boolean).join(', ');
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
                    }} 
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={scale(12)} color={Colors.primary} />
                    <Text style={styles.navBtnText}>{t('orders.navigate', { defaultValue: 'Navigate' })}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Section: Products Handled */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={scale(16)} color={Colors.primary} strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>{t('orders.associated_shipment_products', { defaultValue: 'Associated Shipment Products' })}</Text>
            </View>

            <View style={styles.productsList}>
              {batch.products.map((product) => {
                const hasPhoto = product.pickupPhoto || product.dropPhoto;
                
                // Get dynamic border & accent styles based on product status
                const getProductCardStyles = (status: string) => {
                  switch (status) {
                    case 'rejected':
                      return { accent: '#EF4444', border: '#FEE2E2' };
                    case 'picked':
                      return { accent: '#2563EB', border: '#EFF6FF' };
                    case 'completed':
                      return { accent: '#059669', border: '#ECFDF5' };
                    default:
                      return { accent: '#94A3B8', border: '#F1F5F9' };
                  }
                };

                const cardStyle = getProductCardStyles(product.status);

                return (
                  <View 
                    key={product.id} 
                    style={[
                      styles.productCard, 
                      { borderColor: cardStyle.border, paddingLeft: scale(14) }
                    ]}
                  >
                    {/* Left Side Accent Line */}
                    <View style={[styles.productSideAccent, { backgroundColor: cardStyle.accent }]} />

                    <View style={styles.productInfoCol}>
                      <View style={styles.productHeaderRow}>
                        <Text style={styles.productId}>#{product.id.split('-').pop()}</Text>
                        
                        {/* Product Status Badge */}
                        {product.status === 'rejected' ? (
                          <View style={[styles.productLegBadge, { backgroundColor: '#FEF2F2' }]}>
                            <Text style={[styles.productLegBadgeText, { color: '#DC2626' }]}>
                              {t('orders.rejected', { defaultValue: 'Rejected' })}
                            </Text>
                          </View>
                        ) : product.status === 'picked' ? (
                          <View style={[styles.productLegBadge, { backgroundColor: '#EFF6FF' }]}>
                            <Text style={[styles.productLegBadgeText, { color: '#2563EB' }]}>
                              {t('orders.picked', { defaultValue: 'Picked' })}
                            </Text>
                          </View>
                        ) : product.status === 'completed' ? (
                          <View style={[styles.productLegBadge, { backgroundColor: '#ECFDF5' }]}>
                            <Text style={[styles.productLegBadgeText, { color: '#059669' }]}>
                              {t('orders.delivered', { defaultValue: 'Delivered' })}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.productLegBadge, product.legType === 'drop' ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#F5F3FF' }]}>
                            <Text style={[styles.productLegBadgeText, product.legType === 'drop' ? { color: '#D97706' } : { color: '#7C3AED' }]}>
                              {product.legType === 'drop' ? t('orders.drop_orders', { defaultValue: 'Drop Order' }) : t('orders.pickup_orders', { defaultValue: 'Pickup Order' })}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productMeta}>
                        {product.qty} {t('orders.items')} • {product.weight}
                      </Text>

                      {product.rejectReason && (
                        <View style={styles.rejectContainer}>
                          <AlertCircle size={scale(12)} color="#DC2626" />
                          <Text style={styles.rejectReasonText}>{product.rejectReason}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.productPhotoCol}>
                      {hasPhoto ? (
                        <Image
                          source={{ uri: product.pickupPhoto || product.dropPhoto }}
                          style={styles.productPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.noPhotoBox}>
                          <Package size={scale(16)} color="#94A3B8" />
                          <Text style={styles.noPhotoText}>{t('orders.no_proof', { defaultValue: 'No Proof' })}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Sticky Action Redirection Button */}
        {(() => {
          const isPickupLeg = batch.status === 'NEW_ORDER' || batch.status === 'ACCEPTED_PICKUP';
          const isDropLeg = batch.status === 'PICKUP_COMPLETED';
          const isActionable = batch.status !== 'DROP_COMPLETED' && batch.status !== 'rejected';

          if (!isActionable) return null;

          if (batch.status === 'NEW_ORDER') {
            return (
              <View style={[
                styles.bottomStickyBar,
                { paddingBottom: insets.bottom > 0 ? insets.bottom + verticalScale(16) : verticalScale(28) }
              ]}>
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={[styles.actionBtnHalf, styles.acceptBtnNew]}
                    activeOpacity={0.8}
                    onPress={async () => {
                      try {
                        await acceptBatch(batch.id);
                        navigation.goBack();
                        navigation.navigate('AcceptedOrders', { activeTab: 'pickup' });
                      } catch (err) {
                        console.error('Failed to accept batch in detail view:', err);
                      }
                    }}
                  >
                    <Text style={styles.acceptBtnText}>{t('orders.accept', { defaultValue: 'Accept' }).toUpperCase()}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtnHalf, styles.rejectBtnNew]}
                    activeOpacity={0.8}
                    onPress={() => {
                      navigation.navigate('CategoryOrders', { 
                        category: 'new', 
                        triggerRejectBatchId: batch.id 
                      });
                    }}
                  >
                    <Text style={styles.rejectBtnText}>{t('orders.reject', { defaultValue: 'Reject' }).toUpperCase()}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={[
              styles.bottomStickyBar,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + verticalScale(16) : verticalScale(28) }
            ]}>
              <TouchableOpacity
                style={styles.stickyActionBtn}
                activeOpacity={0.85}
                onPress={() => {
                  navigation.goBack();
                  navigation.navigate('OrderBatchPickupDetail', {
                    batchId: batch.id,
                    type: isDropLeg ? 'drop' : 'pickup',
                  });
                }}
              >
                <View style={styles.btnContent}>
                  <Text style={styles.stickyActionBtnText}>
                    {isDropLeg 
                      ? t('orders.proceed_to_drop', { defaultValue: 'PROCEED TO DROP-OFF' }) 
                      : t('orders.proceed_to_pickup', { defaultValue: 'PROCEED TO PICKUP' })}
                  </Text>
                  <ArrowRight size={scale(18)} color="#FFFFFF" strokeWidth={3} style={styles.btnIcon} />
                </View>
              </TouchableOpacity>
            </View>
          );
        })()}


      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Premium dark glass backdrop
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    height: '75%', // 75% of full screen height
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  sheetHandleBar: {
    width: scale(36),
    height: verticalScale(4.5),
    borderRadius: scale(3),
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16.5),
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  closeButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: scale(20),
    gap: verticalScale(16),
    paddingBottom: verticalScale(90),
  },
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(24),
  },
  notFoundText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPlaceholder,
  },
  summaryCard: {
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  iconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextContainer: {
    flex: 1,
  },
  batchIdText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(12.5),
    color: '#FFFFFF',
  },
  areaTagText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: verticalScale(1),
  },
  statusBadge: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(5),
    maxWidth: scale(105),
  },
  statusBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(8),
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: verticalScale(12),
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeCol: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(8.5),
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: verticalScale(2),
  },
  routeValue: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  routeArrowBox: {
    width: scale(24),
    alignItems: 'center',
  },
  dotLine: {
    width: scale(12),
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  metricsBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(12),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9.5),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  metricLine: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  sectionContainer: {
    gap: verticalScale(10),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  sectionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  productsList: {
    gap: verticalScale(10),
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(10),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  productSideAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(4),
  },
  productHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(2),
  },
  productLegBadge: {
    paddingHorizontal: scale(5),
    paddingVertical: verticalScale(1.5),
    borderRadius: scale(4),
  },
  productLegBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(7.5),
    textTransform: 'uppercase',
  },
  productInfoCol: {
    flex: 1,
    marginRight: scale(10),
  },
  productId: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(11.5),
    color: Colors.primary,
  },
  productName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13.5),
    color: Colors.textPrimary,
    marginBottom: verticalScale(3),
  },
  productMeta: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
  },
  rejectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: verticalScale(6),
    backgroundColor: '#FEF2F2',
    padding: scale(4),
    borderRadius: scale(4),
  },
  rejectReasonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9.5),
    color: '#DC2626',
  },
  productPhotoCol: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(10),
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productPhoto: {
    width: '100%',
    height: '100%',
  },
  noPhotoBox: {
    alignItems: 'center',
    gap: verticalScale(2),
  },
  noPhotoText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(8.5),
    color: '#94A3B8',
  },
  bottomStickyBar: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(14),
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1.5,
    borderTopColor: '#F1F5F9',
  },
  stickyActionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: scale(16),
    height: verticalScale(54),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
  },
  stickyActionBtnText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  btnIcon: {
    marginLeft: scale(2),
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  actionBtnHalf: {
    flex: 1,
    height: verticalScale(54),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  acceptBtnNew: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.2,
      },
    }),
  },
  rejectBtnNew: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    shadowColor: '#EF4444',
  },
  acceptBtnText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13.5),
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  rejectBtnText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13.5),
    color: Colors.error,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(8) },
    shadowOpacity: 0.12,
    shadowRadius: moderateScale(24),
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  modalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(20),
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: scale(4),
  },
  modalSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginBottom: verticalScale(20),
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: verticalScale(16),
  },
  reasonChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  reasonChipText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  reasonChipTextSelected: {
    fontFamily: Fonts.bold,
    color: '#DC2626',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(14),
    padding: scale(12),
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: verticalScale(24),
  },
  confirmRejectBtn: {
    backgroundColor: '#EF4444',
    height: verticalScale(50),
    borderRadius: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  confirmRejectText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  contactCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    padding: scale(14),
    marginVertical: verticalScale(6),
    gap: verticalScale(12),
  },
  contactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: verticalScale(8),
  },
  contactCardTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13.5),
    color: Colors.textPrimary,
  },
  contactCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  contactCallBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11.5),
    color: Colors.primary,
  },
  contactCardBody: {
    gap: verticalScale(10),
  },
  contactInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: verticalScale(10),
    columnGap: scale(8),
  },
  contactInfoRow: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconBg: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contactTextCol: {
    marginLeft: scale(8),
    flex: 1,
  },
  contactTextLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: Colors.textSecondary,
    marginBottom: verticalScale(1),
  },
  contactTextValue: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(11.5),
    color: Colors.textPrimary,
  },
  addressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(10),
    padding: scale(10),
    gap: scale(8),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressTextValue: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: Colors.textPrimary,
    lineHeight: 14,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  navBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: Colors.primary,
  },
});

export default ActivityOrderDetailScreen;
