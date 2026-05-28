import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, TouchableWithoutFeedback, FlatList, Dimensions, Image } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { User, Settings, LogOut, ArrowLeft, ChevronLeft, HelpCircle, X, Bell, Package, MapPin, CheckCircle, Wallet, Truck, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { BASE_URL } from '../services/api';

import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import WalkthroughElement from './WalkthroughElement';
import { useOnboarding } from '../context/OnboardingContext';

const getNotificationIcon = (unread: boolean) => {
  const color = unread ? '#073318' : '#9CA3AF';
  const size = scale(18);
  return <Bell size={size} color={color} />;
};

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showProfile?: boolean;
  showHelp?: boolean;
  helpContent?: string;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  showProfile = true,
  showHelp = false,
  helpContent
}) => {
  const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { startOnboarding } = useOnboarding();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!showProfile) return;
    const loadProfilePhoto = async () => {
      try {
        const cached = await AsyncStorage.getItem('cached-profile-data');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.personalDetails?.profilePhoto) {
            setProfilePhoto(parsed.personalDetails.profilePhoto);
          }
        }
        
        const response = await api.get('/registration/me');
        if (response.data?.personalDetails?.profilePhoto) {
          setProfilePhoto(response.data.personalDetails.profilePhoto);
          await AsyncStorage.setItem('cached-profile-data', JSON.stringify(response.data));
        }
      } catch (err) {
        console.log('Failed to load profile photo in ScreenHeader:', err);
      }
    };
    loadProfilePhoto();
  }, [showProfile]);

  const screenWidth = Dimensions.get('window').width;

  const [bellLayout, setBellLayout] = useState({ pageX: 0, pageY: 0, width: 0, height: 0 });
  const bellRef = useRef<View>(null);

  const toggleNotificationsPopup = () => {
    if (!showNotificationsPopup) {
      if (bellRef.current) {
        bellRef.current.measure((x, y, width, height, pageX, pageY) => {
          if (pageX || pageY) {
            setBellLayout({ pageX, pageY, width, height });
          }
          setShowNotificationsPopup(true);
        });
      } else {
        setShowNotificationsPopup(true);
      }
    } else {
      setShowNotificationsPopup(false);
    }
  };

  // Notifications State
  const initialNotifications = [
    { id: '1', titleKey: 'notifications.order_rejected', messageKey: 'notifications.order_rejected_desc', time: '10 mins ago', unread: true },
    { id: '2', titleKey: 'notifications.earnings_updated', messageKey: 'notifications.earnings_updated_desc', time: '1 hour ago', unread: true },
    { id: '3', titleKey: 'notifications.route_completed', messageKey: 'notifications.route_completed_desc', time: '2 hours ago', unread: false },
  ];
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter(n => n.unread).length;

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Home screen has no back button, other screens do.
  // Use showBackButton to trigger a more compact mode for secondary screens.
  const isCompact = showBackButton;
  const headerHeight = verticalScale(isCompact ? 64 : 75);
  const greetingFontSize = moderateScale(isCompact ? 16 : 19);
  const subGreetingFontSize = moderateScale(isCompact ? 11 : 12.5);

  return (
    <>
      <View style={[styles.headerContainer, { marginTop: verticalScale(5) }]}>
        {showBackButton && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.standaloneBackButton, isCompact && { width: scale(42), height: scale(42), borderRadius: scale(21) }]}
            activeOpacity={0.8}
          >
            <ChevronLeft size={scale(24)} color={Colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        <LinearGradient
          colors={['#FFFFFF', '#F0FDF4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.navbar, { height: headerHeight, flex: 1 }]}
        >
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.greetingText, { fontSize: greetingFontSize }]}>{title}</Text>
              {subtitle && <Text style={[styles.subGreetingText, { fontSize: subGreetingFontSize }]}>{subtitle}</Text>}
            </View>

            <View style={styles.headerRight}>
              {showHelp && (
                <View style={{ position: 'relative' }} ref={bellRef} collapsable={false}>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={toggleNotificationsPopup}
                    activeOpacity={0.7}
                  >
                    <Bell size={scale(24)} color={Colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </View>
              )}
              {showProfile && (
                <TouchableOpacity
                  style={[styles.profileButton, isCompact && { width: scale(38), height: scale(38), borderRadius: scale(19) }]}
                  onPress={() => navigation.navigate('Profile')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarWrapper, { overflow: 'hidden' }]}>
                    {profilePhoto ? (
                      <Image
                        source={{ uri: profilePhoto.startsWith('http') ? profilePhoto : `${BASE_URL}${profilePhoto}` }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <User size={scale(18)} color="#FFFFFF" strokeWidth={2.5} />
                    )}
                  </View>
                  <View style={[styles.onlineBadge, isCompact && { width: scale(10), height: scale(10) }]} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Profile Dropdown Menu with Overlay */}




      {/* Notifications Modal */}
      {showHelp && (
        <Modal
          visible={showNotificationsPopup}
          transparent={true}
          animationType="fade"
          onRequestClose={toggleNotificationsPopup}
        >
          <TouchableWithoutFeedback onPress={toggleNotificationsPopup}>
            <BlurView intensity={15} tint="dark" style={styles.notificationOverlay}>
              <TouchableWithoutFeedback>
                <View style={[
                  styles.notificationDropdownContainer,
                  {
                    position: 'absolute',
                    top: bellLayout.pageY ? (bellLayout.pageY + bellLayout.height + verticalScale(10)) : (Platform.OS === 'ios' ? verticalScale(105) : verticalScale(82)),
                    right: scale(16),
                  }
                ]}>
                  <View style={[
                    styles.pointerArrow,
                    {
                      position: 'absolute',
                      top: -scale(11),
                      right: bellLayout.pageX ? (screenWidth - scale(16) - (bellLayout.pageX + bellLayout.width / 2) - scale(10)) : scale(28),
                    }
                  ]} />
                  <View style={styles.notificationPopup}>
                    <View style={styles.notificationPopupInner}>
                      <View style={styles.notificationPopupHeader}>
                        <Text style={styles.notificationPopupTitle}>{t('notifications.title')}</Text>
                        <TouchableOpacity onPress={toggleNotificationsPopup} style={styles.notificationCloseBtn} hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}>
                          <X size={scale(24)} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.notificationListContainer}>
                        {notifications.length === 0 ? (
                          <View style={styles.emptyNotifications}>
                            <Bell size={scale(32)} color="#D1D5DB" />
                            <Text style={styles.emptyNotificationsText}>{t('notifications.no_notifications')}</Text>
                          </View>
                        ) : (
                          <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.notificationListContent}
                            bounces={true}
                            renderItem={({ item: notif }) => (
                              <TouchableOpacity 
                                style={[
                                  styles.notificationItem, 
                                  notif.unread ? styles.notificationItemUnread : styles.notificationItemRead
                                ]}
                                activeOpacity={0.7}
                                onPress={() => {
                                  if (notif.unread) {
                                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
                                  }
                                  // Simulate navigating to a related screen
                                  toggleNotificationsPopup();
                                }}
                              >
                                {notif.unread && <View style={styles.unreadIndicatorLine} />}
                                <View style={styles.notificationIconWrapper}>
                                  {getNotificationIcon(notif.unread)}
                                </View>
                                <View style={styles.notificationContent}>
                                  <Text style={[styles.notificationTitle, notif.unread && styles.notificationTitleUnread]}>{t(notif.titleKey)}</Text>
                                  <Text style={styles.notificationMessage} numberOfLines={2}>{t(notif.messageKey)}</Text>
                                  {notif.time ? <Text style={styles.notificationTime}>{notif.time}</Text> : null}
                                </View>
                                <View style={styles.notificationChevron}>
                                  <ChevronRight size={scale(16)} color="#D1D5DB" />
                                </View>
                              </TouchableOpacity>
                            )}
                          />
                        )}
                      </View>

                      {notifications.length > 0 && (
                        <View style={styles.notificationFooter}>
                          <TouchableOpacity onPress={clearAllNotifications} style={styles.clearAllBtn} hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}>
                            <Text style={styles.clearAllText}>{t('notifications.clear_all')}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </BlurView>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(16),
    zIndex: 1000,
  },
  navbarContainer: {
    zIndex: 1000,
  },
  navbar: {
    paddingHorizontal: scale(12),
    justifyContent: 'center',
    borderRadius: moderateScale(20),
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: verticalScale(10) },
        shadowOpacity: 0.08,
        shadowRadius: scale(15),
      },
      android: {
        elevation: moderateScale(8),
      },
    }),
  },
  standaloneBackButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: verticalScale(10) },
        shadowOpacity: 0.08,
        shadowRadius: scale(15),
      },
      android: {
        elevation: moderateScale(8),
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerLeft: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    padding: scale(4),
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: scale(8),
  },
  greetingText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(19),
    color: Colors.textPrimary,
    letterSpacing: moderateScale(-0.4),
    textAlign: 'left',
  },
  subGreetingText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(12.5),
    color: Colors.primary,
    marginTop: verticalScale(1),
    textAlign: 'left',
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  helpButton: {
    marginRight: scale(8),
    padding: scale(2),
  },
  profileButton: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#10B981', // Emerald-500
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: scale(20),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownOverlay: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? verticalScale(125) : verticalScale(75),
    paddingRight: scale(24),
    alignItems: 'flex-end',
  },
  dropdownContainer: {
    alignItems: 'flex-end',
  },
  dropdownMenu: {
    width: scale(220),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(20),
    padding: scale(16),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(12) },
        shadowOpacity: 0.1,
        shadowRadius: scale(15),
      },
      android: {
        elevation: moderateScale(12),
      },
    }),
    borderWidth: moderateScale(1),
    borderColor: '#F3F4F6',
  },
  dropdownHeader: {
    marginBottom: verticalScale(12),
  },
  dropdownName: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  dropdownEmail: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: verticalScale(8),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
  },
  dropdownLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    marginLeft: scale(10),
  },
  notificationBadge: {
    position: 'absolute',
    top: -scale(4),
    right: scale(2),
    backgroundColor: '#EF4444',
    minWidth: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    paddingHorizontal: scale(2),
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontFamily: Fonts.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  notificationOverlay: {
    flex: 1,
  },
  notificationDropdownContainer: {
    width: scale(330),
    maxHeight: '55%',
    zIndex: 100,
  },
  pointerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: scale(10),
    borderRightWidth: scale(10),
    borderBottomWidth: scale(12),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    zIndex: 2,
  },
  notificationPopup: {
    width: '100%',
    flexShrink: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    marginTop: -scale(1),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 1,
  },
  notificationPopupInner: {
    borderRadius: moderateScale(24),
    overflow: 'hidden',
    flexShrink: 1,
  },
  notificationPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(18),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  notificationPopupTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    color: '#111827',
  },
  notificationCloseBtn: {
    padding: scale(4),
    marginRight: scale(-4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationListContainer: {
    flexShrink: 1,
    backgroundColor: '#FFFFFF',
  },
  notificationListContent: {
    paddingHorizontal: scale(10),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(2),
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(10),
    alignItems: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
  },
  notificationItemUnread: {
    backgroundColor: '#ECFDF3',
  },
  notificationItemRead: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  unreadIndicatorLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(4),
    backgroundColor: '#073318',
  },
  notificationIconWrapper: {
    marginRight: scale(12),
    marginTop: verticalScale(2),
  },
  notificationContent: {
    flex: 1,
  },
  notificationChevron: {
    marginLeft: scale(8),
    alignSelf: 'center',
  },
  notificationTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#111827',
    marginBottom: verticalScale(2),
  },
  notificationTitleUnread: {
    fontFamily: Fonts.bold,
  },
  notificationMessage: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: '#6B7280',
    marginBottom: verticalScale(4),
    lineHeight: moderateScale(18),
  },
  notificationTime: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#9CA3AF',
  },
  notificationFooter: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
  },
  clearAllBtn: {
    padding: scale(4),
  },
  clearAllText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(13),
    color: '#EF4444',
  },
  emptyNotifications: {
    paddingVertical: verticalScale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotificationsText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: '#9CA3AF',
    marginTop: verticalScale(8),
  },
});

export default ScreenHeader;
