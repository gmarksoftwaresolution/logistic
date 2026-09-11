import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts } from '../../constants/Colors';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import api from '../../services/api';

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
    return <Text style={styles.inputValue}>-</Text>;
  }

  return (
    <View style={styles.timelineContainer}>
      {locations.map((loc, index) => {
        const isLast = index === locations.length - 1;
        return (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineLeftCol}>
              <View style={[styles.timelineDotOuter, { backgroundColor: themeColor + '20' }]}>
                <View style={[styles.timelineDotInner, { backgroundColor: themeColor }]} />
              </View>
              {!isLast && <View style={[styles.timelineLine, { backgroundColor: themeColor + '30' }]} />}
            </View>
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineText}>{loc}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export const TransporterRouteDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [profileData, setProfileData] = useState<any>(route.params?.profileData || {});
  const routeDetails = profileData?.routeDetails || {};
  const milkVanDetails = profileData?.milkVanDetails || {};
  const isMilkVan = profileData?.vehicleCategory === 'MILK_VAN';

  // View / Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Format initial working days
  const formatDaysString = (days: any): string => {
    if (Array.isArray(days)) {
      return days.join(', ');
    } else if (typeof days === 'string') {
      try {
        if (days.startsWith('[')) {
          return JSON.parse(days).join(', ');
        }
      } catch (e) {}
      return days;
    }
    return '';
  };

  // Personal Vehicle Form State
  const [pickupLocations, setPickupLocations] = useState(routeDetails?.pickupLocations || '');
  const [dropLocations, setDropLocations] = useState(routeDetails?.dropLocations || '');
  const [operatingArea, setOperatingArea] = useState(routeDetails?.operatingArea || '');

  // Milk Van Form State
  const [assignedVillages, setAssignedVillages] = useState(milkVanDetails?.assignedVillages || '');
  const [centerName, setCenterName] = useState(milkVanDetails?.centerName || '');
  const [morningShiftTime, setMorningShiftTime] = useState(milkVanDetails?.morningShiftTime || '');
  const [eveningShiftTime, setEveningShiftTime] = useState(milkVanDetails?.eveningShiftTime || '');

  // Common Form State
  const [daysAvailable, setDaysAvailable] = useState(formatDaysString(routeDetails?.workingDays));

  const getLabel = (key: string, fallback: string) => {
    const val = t(key);
    if (!val || val === key || val.includes('.')) {
      return fallback;
    }
    return val;
  };

  useEffect(() => {
    const loadCachedData = async () => {
      try {
        if (!route.params?.profileData) {
          const cached = await AsyncStorage.getItem('cached-profile-data');
          if (cached) {
            const parsed = JSON.parse(cached);
            setProfileData(parsed);
            resetForm(parsed);
          }
        }
      } catch (e) {
        console.error('Error loading cached profile data:', e);
      }
    };
    loadCachedData();
  }, []);

  const resetForm = (data: any) => {
    const rDetails = data?.routeDetails || {};
    const mDetails = data?.milkVanDetails || {};
    setPickupLocations(rDetails?.pickupLocations || '');
    setDropLocations(rDetails?.dropLocations || '');
    setOperatingArea(rDetails?.operatingArea || '');
    setAssignedVillages(mDetails?.assignedVillages || '');
    setCenterName(mDetails?.centerName || '');
    setMorningShiftTime(mDetails?.morningShiftTime || '');
    setEveningShiftTime(mDetails?.eveningShiftTime || '');
    setDaysAvailable(formatDaysString(rDetails?.workingDays));
  };

  const handleCancel = () => {
    resetForm(profileData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const workingDaysArr = daysAvailable
        ? daysAvailable.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (isMilkVan) {
        const villagesArr = Array.isArray(assignedVillages)
          ? assignedVillages
          : parseLocations(assignedVillages);

        const payload = {
          assignedVillages: villagesArr.length > 0 ? villagesArr : [assignedVillages],
          morningShiftTime: morningShiftTime.trim() || undefined,
          eveningShiftTime: eveningShiftTime.trim() || undefined,
          daysAvailable: daysAvailable.trim() || undefined,
          workingDays: workingDaysArr,
        };

        await api.post('/registration/step6-milk-van', payload);

        const updatedProfileData = {
          ...profileData,
          milkVanDetails: {
            ...milkVanDetails,
            centerName: centerName.trim() || milkVanDetails?.centerName,
            assignedVillages: villagesArr.length > 0 ? villagesArr : assignedVillages,
            morningShiftTime: morningShiftTime.trim(),
            eveningShiftTime: eveningShiftTime.trim(),
          },
          routeDetails: {
            ...routeDetails,
            workingDays: workingDaysArr,
          },
        };

        setProfileData(updatedProfileData);
        await AsyncStorage.setItem('cached-profile-data', JSON.stringify(updatedProfileData));
      } else {
        const payload = {
          operatingArea: operatingArea.trim() || 'Chandgad',
          pickupLocations: pickupLocations.trim() || undefined,
          dropLocations: dropLocations.trim() || undefined,
          workingDays: workingDaysArr,
        };

        await api.post('/registration/step6-personal', payload);

        const updatedProfileData = {
          ...profileData,
          routeDetails: {
            ...routeDetails,
            pickupLocations: pickupLocations.trim(),
            dropLocations: dropLocations.trim(),
            operatingArea: operatingArea.trim(),
            workingDays: workingDaysArr,
          },
        };

        setProfileData(updatedProfileData);
        await AsyncStorage.setItem('cached-profile-data', JSON.stringify(updatedProfileData));
      }

      setIsEditing(false);
      Alert.alert('Success', getLabel('profile.updated_success', 'Route details updated successfully.'));
    } catch (err: any) {
      console.error('Error saving route details:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update route details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={scale(22)} color="#073318" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>
            {getLabel('orders.route_details', 'Route Details')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getLabel('profile.subtitle', 'View and manage operational route details')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailsCard}>
          {isMilkVan ? (
            <>
              {/* Assigned Villages */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.assigned_villages', 'ASSIGNED VILLAGES')}
                </Text>
                {isEditing ? (
                  <View style={[styles.inputContainer, styles.inputContainerEditing]}>
                    <TextInput
                      style={styles.textInput}
                      value={typeof assignedVillages === 'string' ? assignedVillages : parseLocations(assignedVillages).join(', ')}
                      onChangeText={setAssignedVillages}
                      placeholder="Enter assigned villages (comma separated)"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                ) : (
                  renderConnectingDots(parseLocations(assignedVillages), '#10B981')
                )}
              </View>

              {/* Milk Center */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.milk_center_name', 'MILK CENTER')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={centerName}
                      onChangeText={setCenterName}
                      placeholder="Enter milk center name"
                      placeholderTextColor="#94A3B8"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{centerName || milkVanDetails?.centerName || '-'}</Text>
                  )}
                </View>
              </View>

              {/* Morning Shift & Evening Shift */}
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.fieldLabel}>
                    {getLabel('signup.morning_shift', 'MORNING SHIFT')}
                  </Text>
                  <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                    {isEditing ? (
                      <TextInput
                        style={styles.textInput}
                        value={morningShiftTime}
                        onChangeText={setMorningShiftTime}
                        placeholder="e.g. 06:00 AM"
                        placeholderTextColor="#94A3B8"
                      />
                    ) : (
                      <Text style={styles.inputValue}>{morningShiftTime || '-'}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.fieldLabel}>
                    {getLabel('signup.evening_shift', 'EVENING SHIFT')}
                  </Text>
                  <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                    {isEditing ? (
                      <TextInput
                        style={styles.textInput}
                        value={eveningShiftTime}
                        onChangeText={setEveningShiftTime}
                        placeholder="e.g. 05:00 PM"
                        placeholderTextColor="#94A3B8"
                      />
                    ) : (
                      <Text style={styles.inputValue}>{eveningShiftTime || '-'}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Days Available */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.days_available', 'DAYS AVAILABLE')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={daysAvailable}
                      onChangeText={setDaysAvailable}
                      placeholder="e.g. Mon, Tue, Wed, Thu, Fri, Sat, Sun"
                      placeholderTextColor="#94A3B8"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{daysAvailable || '-'}</Text>
                  )}
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Route From / Pickup Locations */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.route_from', 'ROUTE FROM')}
                </Text>
                {isEditing ? (
                  <View style={[styles.inputContainer, styles.inputContainerEditing]}>
                    <TextInput
                      style={styles.textInput}
                      value={pickupLocations}
                      onChangeText={setPickupLocations}
                      placeholder="Enter pickup locations (comma separated)"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                ) : (
                  renderConnectingDots(parseLocations(pickupLocations), '#10B981')
                )}
              </View>

              {/* Route To / Drop Locations */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.route_to', 'ROUTE TO')}
                </Text>
                {isEditing ? (
                  <View style={[styles.inputContainer, styles.inputContainerEditing]}>
                    <TextInput
                      style={styles.textInput}
                      value={dropLocations}
                      onChangeText={setDropLocations}
                      placeholder="Enter drop locations (comma separated)"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                ) : (
                  renderConnectingDots(parseLocations(dropLocations), '#F59E0B')
                )}
              </View>

              {/* Operating Area */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.operating_area', 'OPERATING AREA')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={operatingArea}
                      onChangeText={setOperatingArea}
                      placeholder="Enter operating area"
                      placeholderTextColor="#94A3B8"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{operatingArea || '-'}</Text>
                  )}
                </View>
              </View>

              {/* Days Available */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.days_available', 'DAYS AVAILABLE')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={daysAvailable}
                      onChangeText={setDaysAvailable}
                      placeholder="e.g. Mon, Tue, Wed, Thu, Fri, Sat, Sun"
                      placeholderTextColor="#94A3B8"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{daysAvailable || '-'}</Text>
                  )}
                </View>
              </View>
            </>
          )}

          {/* Bottom Action Buttons */}
          <View style={styles.bottomActionsRow}>
            {!isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.backActionButton}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text
                    style={styles.backActionButtonText}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.75}
                  >
                    {getLabel('common.back', 'Back')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editActionButton}
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={styles.editActionButtonText}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.75}
                  >
                    {getLabel('common.edit', 'Edit')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.backActionButton}
                  onPress={handleCancel}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text
                    style={styles.backActionButtonText}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.75}
                  >
                    {getLabel('common.cancel', 'Cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editActionButton}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={styles.editActionButtonText}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.75}
                    >
                      {getLabel('common.save_changes', 'Save Changes')}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: scale(14),
    padding: scale(4),
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    color: '#0F172A',
  },
  headerSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#64748B',
    marginTop: verticalScale(2),
  },
  scrollContainer: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(32),
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    padding: scale(20),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  fieldBoxGroup: {
    marginBottom: verticalScale(14),
  },
  fieldLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: verticalScale(6),
    marginLeft: scale(2),
    textTransform: 'uppercase',
  },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    justifyContent: 'center',
  },
  inputContainerEditing: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.primary,
  },
  inputValue: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#334155',
  },
  textInput: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#0F172A',
    padding: 0,
    margin: 0,
  },
  gridRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(14),
  },
  gridCol: {
    flex: 1,
  },
  timelineContainer: {
    marginTop: verticalScale(4),
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
  bottomActionsRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: verticalScale(16),
    alignItems: 'center',
  },
  backActionButton: {
    flex: 1,
    height: verticalScale(48),
    backgroundColor: '#F1F5F9',
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(10),
  },
  backActionButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#1E293B',
    textAlign: 'center',
  },
  editActionButton: {
    flex: 1,
    height: verticalScale(48),
    backgroundColor: Colors.primary,
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(10),
    elevation: 2,
  },
  editActionButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default TransporterRouteDetailsScreen;
