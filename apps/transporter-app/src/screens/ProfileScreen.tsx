import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  ChevronRight,
  Globe,
  HelpCircle,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Truck,
  Eye,
  FileText,
  BadgeAlert,
  Headphones,
  MessageSquare,
  PhoneCall,
} from 'lucide-react-native';

import { Colors, Fonts } from '../constants/Colors';
import ScreenHeader from '../components/ScreenHeader';
import { scale, verticalScale, moderateScale, SCREEN_WIDTH } from '../utils/responsive';
import api, { BASE_URL } from '../services/api';
import { useOnboarding } from '../context/OnboardingContext';

const { width } = Dimensions.get('window');

const parseLocations = (locationsVal: any): string[] => {
  if (!locationsVal || locationsVal === '-' || locationsVal === '[]') {
    return [];
  }
  if (Array.isArray(locationsVal)) {
    return locationsVal;
  }
  if (typeof locationsVal === 'string') {
    try {
      const parsed = JSON.parse(locationsVal);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      if (locationsVal.includes(',')) {
        return locationsVal.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [locationsVal];
    }
  }
  return [];
};

const renderConnectingDots = (locations: string[], themeColor: string = Colors.primary) => {
  if (!locations || locations.length === 0) {
    return <Text style={styles.detailValue}>-</Text>;
  }

  return (
    <View style={styles.timelineContainer}>
      {locations.map((loc, index) => {
        const isLast = index === locations.length - 1;
        return (
          <View key={index} style={styles.timelineItem}>
            {/* Left Column: Dot and line */}
            <View style={styles.timelineLeftCol}>
              <View style={[styles.timelineDotOuter, { backgroundColor: themeColor + '20' }]}>
                <View style={[styles.timelineDotInner, { backgroundColor: themeColor }]} />
              </View>
              {!isLast && <View style={[styles.timelineLine, { backgroundColor: themeColor + '30' }]} />}
            </View>
            
            {/* Right Column: Content */}
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineText}>{loc}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const ProfileScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { startOnboarding } = useOnboarding();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Custom Alert Modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActionText, setAlertActionText] = useState('');
  const [alertIcon, setAlertIcon] = useState<'phone' | 'mail' | 'whatsapp' | 'logout'>('phone');
  const [onAlertAction, setOnAlertAction] = useState<any>(null);

  const triggerCustomAlert = (
    title: string,
    message: string,
    actionText: string,
    iconType: 'phone' | 'mail' | 'whatsapp' | 'logout',
    actionCallback: () => void
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertActionText(actionText);
    setAlertIcon(iconType);
    setOnAlertAction(() => actionCallback);
    setAlertVisible(true);
  };

  // Active section toggles for accordion behavior
  const [activeSection, setActiveSection] = useState<string | null>('personal');

  const handleSelectLanguage = async (lng: string) => {
    try {
      if (i18n && typeof i18n.changeLanguage === 'function') {
        await i18n.changeLanguage(lng);
        await AsyncStorage.setItem('user-language', lng);
      }
      
      const languageMap: Record<string, string> = {
        'en': 'English',
        'hi': 'Hindi',
        'mr': 'Marathi'
      };
      
      // Synchronize selection with backend in the background
      api.post('/registration/select-language', {
        language: languageMap[lng] || 'English'
      })
      .then(response => {
        console.log('Language selection synchronized with backend:', response.data);
      })
      .catch(error => {
        console.error('Failed to send language selection to backend:', error);
      });
    } catch (err) {
      console.error('Error changing language:', err);
    } finally {
      setShowLanguageModal(false);
    }
  };

  const fetchProfile = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      }
      setError(null);
      const response = await api.get('/registration/me');
      setProfileData(response.data);
      await AsyncStorage.setItem('cached-profile-data', JSON.stringify(response.data));
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      if (!profileData) {
        setError(t('errors.internet_lost') || 'Failed to load profile details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCachedProfile = async () => {
      try {
        const cached = await AsyncStorage.getItem('cached-profile-data');
        if (cached) {
          const parsed = JSON.parse(cached);
          setProfileData(parsed);
          setLoading(false);
          // Refresh data in background without blocking screen transition
          fetchProfile(false);
        } else {
          // Full blocking request on first load
          fetchProfile(true);
        }
      } catch (err) {
        console.error('Error loading cached profile:', err);
        fetchProfile(true);
      }
    };

    loadCachedProfile();
  }, []);

  const handleLogout = () => {
    triggerCustomAlert(
      t('profile.logout') || 'Logout',
      t('profile.logout_confirm') || 'Are you sure you want to logout?',
      t('profile.logout') || 'Logout',
      'logout',
      async () => {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_phone_number');
        await AsyncStorage.removeItem('cached-profile-data');
        await AsyncStorage.removeItem('completed_drop_pickups');
        await AsyncStorage.removeItem('transporter_activities');
        await AsyncStorage.removeItem('rejected_batches');
        await AsyncStorage.removeItem('completed_batches');
        await AsyncStorage.removeItem('captured_photos');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    );
  };

  const getFullPhotoUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
      return path;
    }
    return `${BASE_URL}${path}`;
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const renderSectionHeader = (title: string, icon: React.ReactNode, sectionKey: string) => {
    const isActive = activeSection === sectionKey;
    return (
      <TouchableOpacity
        style={[styles.sectionHeader, isActive && styles.sectionHeaderActive]}
        onPress={() => toggleSection(sectionKey)}
        activeOpacity={0.8}
      >
        <View style={styles.sectionHeaderLeft}>
          {icon}
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
        </View>
        <ChevronRight
          size={scale(18)}
          color={Colors.iconSecondary}
          style={{ transform: [{ rotate: isActive ? '90deg' : '0deg' }] }}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading') || 'Loading Profile...'}</Text>
      </SafeAreaView>
    );
  }

  if (error || !profileData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <AlertTriangle size={scale(48)} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Something went wrong.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchProfile(true)} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { personalDetails, drivingDetails, bankDetails, vehicleDetails, routeDetails, milkVanDetails, isVerified, applicationStatus, uniqueCode } = profileData;

  const isStatusVerified = isVerified || applicationStatus === 'APPROVED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={t('profile.my_profile')}
        subtitle={t('profile.subtitle')}
        showBackButton={true}
        showProfile={false}
        showHelp={false}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <LinearGradient
          colors={[Colors.primary, '#0b4a24']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeaderCard}
        >
          <View style={styles.profileMetaRow}>
            {/* Avatar wrapper */}
            <View style={styles.avatarContainer}>
              {personalDetails?.profilePhoto ? (
                <Image
                  source={{ uri: getFullPhotoUrl(personalDetails.profilePhoto) }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={scale(36)} color="#FFFFFF" strokeWidth={2} />
                </View>
              )}
              {isStatusVerified && (
                <View style={styles.verifiedBadgeMini}>
                  <CheckCircle2 size={scale(16)} color="#FFFFFF" fill={Colors.success} />
                </View>
              )}
            </View>

            {/* Meta text */}
            <View style={styles.metaTextContainer}>
              <Text style={styles.profileName} numberOfLines={1}>
                {personalDetails?.firstName ? `${personalDetails.firstName} ${personalDetails.lastName}`.trim() : t('profile.name')}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {personalDetails?.email || t('profile.email')}
              </Text>
              
              <View style={styles.statusBadgeRow}>
                <View style={[styles.statusBadge, isStatusVerified ? styles.statusBadgeVerified : styles.statusBadgePending]}>
                  {isStatusVerified ? (
                    <CheckCircle2 size={scale(12)} color="#FFFFFF" style={{ marginRight: scale(4) }} />
                  ) : (
                    <Clock size={scale(12)} color="#FFFFFF" style={{ marginRight: scale(4) }} />
                  )}
                  <Text style={styles.statusBadgeText}>
                    {isStatusVerified ? (t('orders.completed') || 'Verified') : (t('signup.approval_pending') || 'Under Review')}
                  </Text>
                </View>

                {uniqueCode && (
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeBadgeText}>{uniqueCode}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Section - Personal details */}
        <View style={styles.accordionCard}>
          {renderSectionHeader(
            t('signup.personal_details') || 'Personal Details',
            <User size={scale(20)} color={Colors.primary} />,
            'personal'
          )}
          {activeSection === 'personal' && (
            <View style={styles.sectionBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.first_name')}</Text>
                <Text style={styles.detailValue}>{personalDetails?.firstName || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.last_name')}</Text>
                <Text style={styles.detailValue}>{personalDetails?.lastName || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.email')}</Text>
                <Text style={styles.detailValue}>{personalDetails?.email || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.address')}</Text>
                <Text style={styles.detailValue}>{personalDetails?.residentialAddress || '-'}</Text>
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.detailLabel}>{t('signup.operating_area') || 'Taluka'}</Text>
                  <Text style={styles.detailValue}>{personalDetails?.taluka || '-'}</Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.detailLabel}>{t('signup.operating_area') || 'District'}</Text>
                  <Text style={styles.detailValue}>{personalDetails?.district || '-'}</Text>
                </View>
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.detailLabel}>{t('signup.operating_area') || 'State'}</Text>
                  <Text style={styles.detailValue}>{personalDetails?.state || '-'}</Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.detailLabel}>{t('signup.pincode')}</Text>
                  <Text style={styles.detailValue}>{personalDetails?.pinCode || '-'}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Section - Driving license */}
        <View style={styles.accordionCard}>
          {renderSectionHeader(
            t('signup.driving_details') || 'Driving Details',
            <Shield size={scale(20)} color={Colors.primary} />,
            'driving'
          )}
          {activeSection === 'driving' && (
            <View style={styles.sectionBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.license_number')}</Text>
                <Text style={styles.detailValue}>{drivingDetails?.licenseNumber || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.expiry_date')}</Text>
                <Text style={styles.detailValue}>
                  {drivingDetails?.expiryDate ? new Date(drivingDetails.expiryDate).toLocaleDateString() : '-'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.driving_experience')}</Text>
                <Text style={styles.detailValue}>
                  {drivingDetails?.experienceYears ? `${drivingDetails.experienceYears} ${t('common.years') || 'Years'}` : '-'}
                </Text>
              </View>
              
              {drivingDetails?.licensePhoto && (
                <View style={styles.documentPreviewContainer}>
                  <Text style={styles.detailLabel}>{t('signup.license_photo')}</Text>
                  <Image
                    source={{ uri: getFullPhotoUrl(drivingDetails.licensePhoto) }}
                    style={styles.documentImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section - Vehicle Details */}
        <View style={styles.accordionCard}>
          {renderSectionHeader(
            t('signup.vehicle_details') || 'Vehicle Details',
            <Truck size={scale(20)} color={Colors.primary} />,
            'vehicle'
          )}
          {activeSection === 'vehicle' && (
            <View style={styles.sectionBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.vehicle_category')}</Text>
                <Text style={[styles.detailValue, { fontWeight: '700', color: Colors.primary }]}>
                  {profileData.vehicleCategory === 'MILK_VAN' ? t('signup.milk_van') : t('signup.personal_vehicle')}
                </Text>
              </View>

              {vehicleDetails ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.vehicle_number')}</Text>
                    <Text style={styles.detailValue}>{vehicleDetails.registrationNumber || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.vehicle_make')}</Text>
                    <Text style={styles.detailValue}>{vehicleDetails.vehicleName || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.vehicle_type')}</Text>
                    <Text style={styles.detailValue}>{vehicleDetails.vehicleType || '-'}</Text>
                  </View>

                  <View style={styles.documentGrid}>
                    {vehicleDetails.rcUrl && (
                      <View style={styles.documentCol}>
                        <Text style={styles.detailLabel}>{t('signup.rc_upload')}</Text>
                        <Image
                          source={{ uri: getFullPhotoUrl(vehicleDetails.rcUrl) }}
                          style={styles.documentGridImage}
                        />
                      </View>
                    )}
                    {vehicleDetails.insuranceUrl && (
                      <View style={styles.documentCol}>
                        <Text style={styles.detailLabel}>{t('signup.insurance_upload')}</Text>
                        <Image
                          source={{ uri: getFullPhotoUrl(vehicleDetails.insuranceUrl) }}
                          style={styles.documentGridImage}
                        />
                      </View>
                    )}
                  </View>
                </>
              ) : milkVanDetails ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.sangathan_name')}</Text>
                    <Text style={styles.detailValue}>{milkVanDetails.sangathanName || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.milk_center_name')}</Text>
                    <Text style={styles.detailValue}>{milkVanDetails.centerName || '-'}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>No vehicle details recorded.</Text>
              )}
            </View>
          )}
        </View>

        {/* Section - Bank Details */}
        <View style={styles.accordionCard}>
          {renderSectionHeader(
            t('signup.bank_details') || 'Bank Details',
            <CreditCard size={scale(20)} color={Colors.primary} />,
            'bank'
          )}
          {activeSection === 'bank' && (
            <View style={styles.sectionBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.account_holder')}</Text>
                <Text style={styles.detailValue}>{bankDetails?.accountHolderName || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.bank_name')}</Text>
                <Text style={styles.detailValue}>{bankDetails?.bankName || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.account_number')}</Text>
                <Text style={styles.detailValue}>
                  {bankDetails?.accountNumber
                    ? `•••• •••• •••• ${bankDetails.accountNumber.slice(-4)}`
                    : '-'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('signup.ifsc_code')}</Text>
                <Text style={styles.detailValue}>{bankDetails?.ifscCode || '-'}</Text>
              </View>
              {bankDetails?.branchName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('signup.branch_name')}</Text>
                  <Text style={styles.detailValue}>{bankDetails.branchName}</Text>
                </View>
              )}
              {bankDetails?.upiId && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('signup.upi_id')}</Text>
                  <Text style={styles.detailValue}>{bankDetails.upiId}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section - Route & Schedules */}
        <View style={styles.accordionCard}>
          {renderSectionHeader(
            t('orders.route_details') || 'Route Details',
            <Calendar size={scale(20)} color={Colors.primary} />,
            'route'
          )}
          {activeSection === 'route' && (() => {
            const isMilkVan = profileData.vehicleCategory === 'MILK_VAN';
            
            // Format working days array/string
            const days = routeDetails?.workingDays;
            let formattedDays = '-';
            if (Array.isArray(days)) {
              formattedDays = days.join(', ');
            } else if (typeof days === 'string') {
              try {
                if (days.startsWith('[')) {
                  formattedDays = JSON.parse(days).join(', ');
                } else {
                  formattedDays = days;
                }
              } catch (e) {
                formattedDays = days;
              }
            }

            if (isMilkVan) {
              const villages = parseLocations(milkVanDetails?.assignedVillages);

              return (
                <View style={styles.sectionBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.assigned_villages') || 'Assigned Villages'}</Text>
                    {renderConnectingDots(villages, '#10B981')}
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.milk_center_name') || 'Milk Center'}</Text>
                    <Text style={styles.detailValue}>{milkVanDetails?.centerName || '-'}</Text>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <Text style={styles.detailLabel}>{t('signup.morning_shift') || 'Morning Shift'}</Text>
                      <Text style={styles.detailValue}>{milkVanDetails?.morningShiftTime || '-'}</Text>
                    </View>
                    <View style={styles.gridCol}>
                      <Text style={styles.detailLabel}>{t('signup.evening_shift') || 'Evening Shift'}</Text>
                      <Text style={styles.detailValue}>{milkVanDetails?.eveningShiftTime || '-'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.days_available') || 'Days Available'}</Text>
                    <Text style={styles.detailValue}>{formattedDays}</Text>
                  </View>
                </View>
              );
            } else {
              const pickupLocs = parseLocations(routeDetails?.pickupLocations);
              const dropLocs = parseLocations(routeDetails?.dropLocations);

              return (
                <View style={styles.sectionBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.route_from') || 'Route From'}</Text>
                    {renderConnectingDots(pickupLocs, '#10B981')}
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.route_to') || 'Route To'}</Text>
                    {renderConnectingDots(dropLocs, '#F59E0B')}
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.operating_area') || 'Operating Area'}</Text>
                    <Text style={styles.detailValue}>{routeDetails?.operatingArea || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('signup.days_available') || 'Days Available'}</Text>
                    <Text style={styles.detailValue}>{formattedDays}</Text>
                  </View>
                </View>
              );
            }
          })()}
        </View>

        {/* Settings & App Quick actions */}
        <Text style={styles.settingsLabelGroup}>{t('profile.menu.settings') || 'Settings'}</Text>
        <View style={styles.settingsCard}>
          {/* Language Selection */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Globe size={scale(18)} color={Colors.primary} />
              </View>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsItemTitle}>{t('profile.language') || 'Language'}</Text>
                <Text style={styles.settingsItemSub}>
                  {i18n.language === 'mr' ? 'मराठी' : i18n.language === 'hi' ? 'हिंदी' : 'English'}
                </Text>
              </View>
            </View>
            <ChevronRight size={scale(18)} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          {/* Guide Walkthrough */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => {
              navigation.navigate('Main');
              setTimeout(() => {
                startOnboarding();
              }, 400);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIconBg, { backgroundColor: '#F0FDF4' }]}>
                <HelpCircle size={scale(18)} color={Colors.primary} />
              </View>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsItemTitle}>{t('profile.app_walkthrough') || 'App Walkthrough'}</Text>
                <Text style={styles.settingsItemSub}>{t('profile.app_walkthrough_sub')}</Text>
              </View>
            </View>
            <ChevronRight size={scale(18)} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Help & Support Group */}
        <Text style={styles.settingsLabelGroup}>{t('profile.help_support') || 'Help & Support'}</Text>
        <View style={styles.settingsCard}>
          {/* Call Support */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => 
              triggerCustomAlert(
                t('profile.call_support_modal_title'),
                t('profile.call_support_modal_desc'),
                t('profile.call_now'),
                'phone',
                () => {
                  Linking.openURL('tel:+919876543210').catch(() => {
                    Alert.alert('Error', 'Unable to initiate call on this device.');
                  });
                }
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIconBg, { backgroundColor: '#ECFDF5' }]}>
                <PhoneCall size={scale(18)} color={Colors.primary} />
              </View>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsItemTitle}>{t('profile.call_support')}</Text>
                <Text style={styles.settingsItemSub}>{t('profile.call_support_sub')}</Text>
              </View>
            </View>
            <ChevronRight size={scale(18)} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          {/* Email Support */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => 
              triggerCustomAlert(
                t('profile.email_support_modal_title'),
                t('profile.email_support_modal_desc'),
                t('profile.send_email'),
                'mail',
                () => {
                  Linking.openURL('mailto:support@gramunnati.com').catch(() => {
                    Alert.alert('Error', 'Unable to open email client.');
                  });
                }
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Mail size={scale(18)} color="#2563EB" />
              </View>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsItemTitle}>{t('profile.email_support')}</Text>
                <Text style={styles.settingsItemSub}>{t('profile.email_support_sub')}</Text>
              </View>
            </View>
            <ChevronRight size={scale(18)} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          {/* WhatsApp Support */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => 
              triggerCustomAlert(
                t('profile.whatsapp_modal_title'),
                t('profile.whatsapp_modal_desc'),
                t('profile.open_whatsapp'),
                'whatsapp',
                () => {
                  Linking.openURL('whatsapp://send?phone=+919876543210&text=Hello,%20I%20need%20assistance.').catch(() => {
                    Linking.openURL('https://wa.me/919876543210').catch(() => {
                      Alert.alert('Error', 'Unable to open WhatsApp.');
                    });
                  });
                }
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIconBg, { backgroundColor: '#F0FDF4' }]}>
                <MessageSquare size={scale(18)} color="#16A34A" />
              </View>
              <View style={styles.settingsTextCol}>
                <Text style={styles.settingsItemTitle}>{t('profile.whatsapp_chat')}</Text>
                <Text style={styles.settingsItemSub}>{t('profile.whatsapp_chat_sub')}</Text>
              </View>
            </View>
            <ChevronRight size={scale(18)} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Logout Button (Simple Pill Button) */}
        <TouchableOpacity
          style={styles.simpleLogoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.simpleLogoutButtonText}>{t('profile.logout') || 'Logout'}</Text>
        </TouchableOpacity>

        {/* Footer info */}
        <View style={styles.footerContainer}>
          <Text style={styles.appVersionText}>Transporter App v1.2.0</Text>
          <Text style={styles.copyrightText}>© 2026 Gmark Soft Pvt Ltd. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language_selection.title')}</Text>
              <Text style={styles.modalSubtitle}>{t('language_selection.subtitle')}</Text>
            </View>

            <View style={styles.modalDivider} />

            {[
              { code: 'en', label: 'English', native: 'English' },
              { code: 'mr', label: 'मराठी', native: 'Marathi' },
              { code: 'hi', label: 'हिंदी', native: 'Hindi' }
            ].map((option) => {
              const isSelected = i18n.language === option.code;
              return (
                <TouchableOpacity
                  key={option.code}
                  style={[
                    styles.languageOptionRow,
                    isSelected && styles.languageOptionRowSelected
                  ]}
                  onPress={() => handleSelectLanguage(option.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionRowLeft}>
                    <View style={[
                      styles.langLetterContainer,
                      isSelected && styles.langLetterContainerSelected
                    ]}>
                      <Text style={[
                        styles.langLetter,
                        isSelected && styles.langLetterSelected
                      ]}>
                        {option.code === 'en' ? 'E' : option.code === 'mr' ? 'म' : 'हि'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.langLabelText}>{option.label}</Text>
                      <Text style={styles.langNativeText}>{option.native}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.langRadioCircle,
                    isSelected && styles.langRadioCircleSelected
                  ]}>
                    {isSelected && <View style={styles.langRadioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setShowLanguageModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Theme Alert Modal */}
      <Modal
        visible={alertVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setAlertVisible(false)}
        >
          <View style={styles.customAlertContainer}>
            <View style={styles.customAlertHeader}>
              <View style={[
                styles.customAlertIconBg,
                alertIcon === 'mail' && { backgroundColor: '#EFF6FF' },
                alertIcon === 'whatsapp' && { backgroundColor: '#F0FDF4' },
                alertIcon === 'logout' && { backgroundColor: '#FEF2F2' },
              ]}>
                {alertIcon === 'phone' ? (
                  <PhoneCall size={scale(24)} color={Colors.primary} />
                ) : alertIcon === 'mail' ? (
                  <Mail size={scale(24)} color="#2563EB" />
                ) : alertIcon === 'whatsapp' ? (
                  <MessageSquare size={scale(24)} color="#16A34A" />
                ) : (
                  <LogOut size={scale(24)} color="#EF4444" />
                )}
              </View>
              <Text style={styles.customAlertTitle}>{alertTitle}</Text>
              <Text style={styles.customAlertMessage}>{alertMessage}</Text>
            </View>

            <View style={styles.customAlertActions}>
              <TouchableOpacity 
                style={styles.customAlertCancelBtn} 
                onPress={() => setAlertVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.customAlertCancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.customAlertActionBtn,
                  alertIcon === 'logout' && { backgroundColor: '#EF4444' }
                ]} 
                onPress={() => {
                  setAlertVisible(false);
                  if (onAlertAction) onAlertAction();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.customAlertActionBtnText}>{alertActionText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(32),
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginTop: verticalScale(12),
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  errorText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(20),
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(28),
    borderRadius: scale(12),
  },
  retryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  profileHeaderCard: {
    borderRadius: moderateScale(24),
    padding: scale(20),
    marginBottom: verticalScale(24),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
  },
  avatarContainer: {
    position: 'relative',
    width: scale(80),
    height: scale(80),
  },
  avatarImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  verifiedBadgeMini: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: scale(10),
    width: scale(20),
    height: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metaTextContainer: {
    flex: 1,
  },
  profileName: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(20),
    color: '#FFFFFF',
  },
  profileEmail: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.8)',
    marginTop: verticalScale(2),
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(8),
  },
  statusBadgeVerified: {
    backgroundColor: Colors.success,
  },
  statusBadgePending: {
    backgroundColor: Colors.warning,
  },
  statusBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },
  codeBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(8),
  },
  codeBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },
  accordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(14),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(18),
  },
  sectionHeaderActive: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  sectionHeaderTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  sectionBody: {
    padding: scale(18),
    backgroundColor: '#FAFCFF',
  },
  detailRow: {
    marginBottom: verticalScale(12),
  },
  detailLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginBottom: verticalScale(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(12),
    gap: scale(16),
  },
  gridCol: {
    flex: 1,
  },
  documentPreviewContainer: {
    marginTop: verticalScale(8),
  },
  documentImage: {
    width: '100%',
    height: verticalScale(160),
    borderRadius: scale(12),
    marginTop: verticalScale(4),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  documentGrid: {
    flexDirection: 'row',
    gap: scale(16),
    marginTop: verticalScale(8),
  },
  documentCol: {
    flex: 1,
  },
  documentGridImage: {
    width: '100%',
    height: verticalScale(100),
    borderRadius: scale(8),
    marginTop: verticalScale(4),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsLabelGroup: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  settingsIconBg: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTextCol: {
    justifyContent: 'center',
  },
  settingsItemTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  settingsItemSub: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: scale(16),
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: verticalScale(32),
    marginBottom: verticalScale(12),
  },
  appVersionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  copyrightText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(10),
    color: '#94A3B8',
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: verticalScale(12),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageModalContainer: {
    backgroundColor: '#FFFFFF',
    width: width * 0.85,
    borderRadius: moderateScale(24),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  modalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: verticalScale(14),
  },
  languageOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: verticalScale(10),
  },
  languageOptionRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#ECFDF5',
  },
  optionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  langLetterContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langLetterContainerSelected: {
    backgroundColor: Colors.primary,
  },
  langLetter: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  langLetterSelected: {
    color: '#FFFFFF',
  },
  langLabelText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  langNativeText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginTop: verticalScale(1),
  },
  langRadioCircle: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langRadioCircleSelected: {
    borderColor: Colors.primary,
  },
  langRadioInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: Colors.primary,
  },
  cancelBtn: {
    marginTop: verticalScale(10),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
  },

  simpleLogoutButton: {
    alignSelf: 'center',
    width: '100%',
    height: verticalScale(48),
    borderRadius: moderateScale(24),
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(28),
    marginBottom: verticalScale(16),
  },
  simpleLogoutButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#EF4444',
  },

  // Custom Alert Modal Styles
  customAlertContainer: {
    backgroundColor: '#FFFFFF',
    width: width * 0.85,
    borderRadius: moderateScale(24),
    padding: scale(20),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  customAlertHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  customAlertIconBg: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  customAlertTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  customAlertMessage: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: verticalScale(18),
    paddingHorizontal: scale(10),
  },
  customAlertActions: {
    flexDirection: 'row',
    width: '100%',
    gap: scale(12),
  },
  customAlertCancelBtn: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  customAlertCancelBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
  },
  customAlertActionBtn: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(16),
    backgroundColor: Colors.primary,
  },
  customAlertActionBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  timelineContainer: {
    marginTop: verticalScale(8),
    paddingLeft: scale(4),
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: scale(16),
    marginRight: scale(12),
  },
  timelineDotOuter: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(3),
  },
  timelineDotInner: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  timelineLine: {
    width: scale(2),
    position: 'absolute',
    top: verticalScale(20),
    bottom: 0,
  },
  timelineRightCol: {
    flex: 1,
    paddingBottom: verticalScale(14),
    justifyContent: 'center',
  },
  timelineText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    lineHeight: moderateScale(18),
  },
});

export default ProfileScreen;
