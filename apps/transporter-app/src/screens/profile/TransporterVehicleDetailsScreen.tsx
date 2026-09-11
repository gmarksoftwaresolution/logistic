import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts } from '../../constants/Colors';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import api, { IMAGE_BASE_URL, uploadFile } from '../../services/api';

const getFullPhotoUrl = (path: string | null): string | undefined => {
  if (!path) return undefined;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('file://') ||
    path.startsWith('content://')
  ) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${IMAGE_BASE_URL}${path}`;
  }
  return `${IMAGE_BASE_URL}/${path}`;
};

export const TransporterVehicleDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [profileData, setProfileData] = useState<any>(route.params?.profileData || {});
  const vehicleDetails = profileData?.vehicleDetails;
  const milkVanDetails = profileData?.milkVanDetails;
  const isMilkVan = profileData?.vehicleCategory === 'MILK_VAN';

  // View / Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Personal Vehicle Form State
  const [registrationNumber, setRegistrationNumber] = useState(vehicleDetails?.registrationNumber || '');
  const [vehicleName, setVehicleName] = useState(vehicleDetails?.vehicleName || '');
  const [vehicleType, setVehicleType] = useState(vehicleDetails?.vehicleType || '');
  const [wheeler, setWheeler] = useState(vehicleDetails?.wheeler || '');
  const [rcUrl, setRcUrl] = useState<string | null>(vehicleDetails?.rcUrl || null);
  const [insuranceUrl, setInsuranceUrl] = useState<string | null>(vehicleDetails?.insuranceUrl || null);

  // Milk Van Form State
  const [sangathanName, setSangathanName] = useState(milkVanDetails?.sangathanName || '');
  const [centerName, setCenterName] = useState(milkVanDetails?.centerName || '');

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
    const vDetails = data?.vehicleDetails || {};
    const mDetails = data?.milkVanDetails || {};
    setRegistrationNumber(vDetails?.registrationNumber || '');
    setVehicleName(vDetails?.vehicleName || '');
    setVehicleType(vDetails?.vehicleType || '');
    setWheeler(vDetails?.wheeler || '');
    setRcUrl(vDetails?.rcUrl || null);
    setInsuranceUrl(vDetails?.insuranceUrl || null);
    setSangathanName(mDetails?.sangathanName || '');
    setCenterName(mDetails?.centerName || '');
  };

  const handlePickDocument = async (docType: 'rc' | 'insurance') => {
    if (!isEditing) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is required to select document photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (docType === 'rc') {
          setRcUrl(uri);
        } else {
          setInsuranceUrl(uri);
        }
      }
    } catch (e) {
      console.error(`Error picking ${docType} image:`, e);
    }
  };

  const handleCancel = () => {
    resetForm(profileData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (isMilkVan) {
        if (!sangathanName.trim() || !centerName.trim()) {
          Alert.alert('Validation Error', 'Sangathan Name and Center Name are required.');
          return;
        }

        const payload = {
          sangathanName: sangathanName.trim(),
          centerName: centerName.trim(),
        };

        await api.post('/registration/step5-milk-van', payload);

        const updatedProfileData = {
          ...profileData,
          milkVanDetails: {
            ...milkVanDetails,
            sangathanName: sangathanName.trim(),
            centerName: centerName.trim(),
          },
        };

        setProfileData(updatedProfileData);
        await AsyncStorage.setItem('cached-profile-data', JSON.stringify(updatedProfileData));
      } else {
        if (!registrationNumber.trim()) {
          Alert.alert('Validation Error', 'Vehicle Number is required.');
          return;
        }

        let uploadedRcUrl = rcUrl;
        let uploadedInsuranceUrl = insuranceUrl;

        if (
          uploadedRcUrl &&
          (uploadedRcUrl.startsWith('file://') || uploadedRcUrl.startsWith('content://') || !uploadedRcUrl.startsWith('/uploads/'))
        ) {
          try {
            const res = await uploadFile(uploadedRcUrl);
            if (res?.data?.url) uploadedRcUrl = res.data.url;
          } catch (e) {
            console.warn('RC Upload fail, continuing save:', e);
          }
        }

        if (
          uploadedInsuranceUrl &&
          (uploadedInsuranceUrl.startsWith('file://') || uploadedInsuranceUrl.startsWith('content://') || !uploadedInsuranceUrl.startsWith('/uploads/'))
        ) {
          try {
            const res = await uploadFile(uploadedInsuranceUrl);
            if (res?.data?.url) uploadedInsuranceUrl = res.data.url;
          } catch (e) {
            console.warn('Insurance Upload fail, continuing save:', e);
          }
        }

        const payload = {
          wheeler: wheeler.trim() || vehicleDetails?.wheeler || undefined,
          type: vehicleType.trim() || vehicleDetails?.vehicleType || undefined,
          make: vehicleName.trim() || vehicleDetails?.vehicleName || undefined,
          number: registrationNumber.trim(),
          rcUpload: uploadedRcUrl || undefined,
          insuranceUpload: uploadedInsuranceUrl || undefined,
        };

        await api.post('/registration/step5-personal', payload);

        const updatedProfileData = {
          ...profileData,
          vehicleDetails: {
            ...vehicleDetails,
            registrationNumber: registrationNumber.trim(),
            vehicleName: vehicleName.trim(),
            vehicleType: vehicleType.trim(),
            wheeler: wheeler.trim(),
            rcUrl: uploadedRcUrl,
            insuranceUrl: uploadedInsuranceUrl,
          },
        };

        setProfileData(updatedProfileData);
        await AsyncStorage.setItem('cached-profile-data', JSON.stringify(updatedProfileData));
      }

      setIsEditing(false);
      Alert.alert('Success', getLabel('profile.updated_success', 'Vehicle details updated successfully.'));
    } catch (err: any) {
      console.error('Error saving vehicle details:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update vehicle details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const rcPhotoUri = getFullPhotoUrl(rcUrl);
  const insurancePhotoUri = getFullPhotoUrl(insuranceUrl);

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
            {getLabel('signup.vehicle_details', 'Vehicle Details')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getLabel('profile.subtitle', 'View and manage registered vehicle details')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailsCard}>
          {/* Vehicle Category */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.vehicle_category', 'VEHICLE CATEGORY')}
            </Text>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputValue, { fontWeight: '700', color: Colors.primary }]}>
                {isMilkVan
                  ? getLabel('signup.milk_van', 'Milk Van')
                  : getLabel('signup.personal_vehicle', 'Personal Vehicle')}
              </Text>
            </View>
          </View>

          {!isMilkVan ? (
            <>
              {/* Vehicle Number */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.vehicle_number', 'VEHICLE NUMBER')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={registrationNumber}
                      onChangeText={setRegistrationNumber}
                      placeholder="e.g. MH 12 AB 1234"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{registrationNumber || '-'}</Text>
                  )}
                </View>
              </View>

              {/* Vehicle Make */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.vehicle_make', 'VEHICLE MAKE')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={vehicleName}
                      onChangeText={setVehicleName}
                      placeholder="e.g. Mahindra / Tata"
                      placeholderTextColor="#94A3B8"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{vehicleName || '-'}</Text>
                  )}
                </View>
              </View>

              {/* Vehicle Type */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.vehicle_type', 'VEHICLE TYPE')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={vehicleType}
                      onChangeText={setVehicleType}
                      placeholder="e.g. Pickup Truck"
                      placeholderTextColor="#94A3B8"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{vehicleType || '-'}</Text>
                  )}
                </View>
              </View>

              {/* Wheeler */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.vehicle_wheeler', 'WHEELER')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={wheeler}
                      onChangeText={setWheeler}
                      placeholder="e.g. 4"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{wheeler || '-'}</Text>
                  )}
                </View>
              </View>

              {/* Documents Grid */}
              <View style={styles.documentGrid}>
                {/* RC Upload */}
                <View style={styles.documentCol}>
                  <Text style={styles.fieldLabel}>
                    {getLabel('signup.rc_upload', 'RC UPLOAD')}
                  </Text>
                  <TouchableOpacity
                    style={styles.documentGridCard}
                    onPress={() => handlePickDocument('rc')}
                    activeOpacity={isEditing ? 0.8 : 1}
                  >
                    {rcPhotoUri ? (
                      <Image source={{ uri: rcPhotoUri }} style={styles.documentGridImage} />
                    ) : (
                      <View style={styles.documentPlaceholder}>
                        <Text style={styles.placeholderText}>
                          {isEditing ? 'Upload RC' : 'No RC Uploaded'}
                        </Text>
                      </View>
                    )}
                    {isEditing && (
                      <View style={styles.cameraOverlayMini}>
                        <Camera size={scale(14)} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Insurance Upload */}
                <View style={styles.documentCol}>
                  <Text style={styles.fieldLabel}>
                    {getLabel('signup.insurance_upload', 'INSURANCE UPLOAD')}
                  </Text>
                  <TouchableOpacity
                    style={styles.documentGridCard}
                    onPress={() => handlePickDocument('insurance')}
                    activeOpacity={isEditing ? 0.8 : 1}
                  >
                    {insurancePhotoUri ? (
                      <Image source={{ uri: insurancePhotoUri }} style={styles.documentGridImage} />
                    ) : (
                      <View style={styles.documentPlaceholder}>
                        <Text style={styles.placeholderText}>
                          {isEditing ? 'Upload Insurance' : 'No Insurance Uploaded'}
                        </Text>
                      </View>
                    )}
                    {isEditing && (
                      <View style={styles.cameraOverlayMini}>
                        <Camera size={scale(14)} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Sangathan Name */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.sangathan_name', 'SANGATHAN NAME')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={sangathanName}
                      onChangeText={setSangathanName}
                      placeholder="Enter Sangathan Name"
                      placeholderTextColor="#94A3B8"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{sangathanName || '-'}</Text>
                  )}
                </View>
              </View>

              {/* Milk Center Name */}
              <View style={styles.fieldBoxGroup}>
                <Text style={styles.fieldLabel}>
                  {getLabel('signup.milk_center_name', 'MILK CENTER NAME')}
                </Text>
                <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={centerName}
                      onChangeText={setCenterName}
                      placeholder="Enter Center Name"
                      placeholderTextColor="#94A3B8"
                    />
                  ) : (
                    <Text style={styles.inputValue}>{centerName || '-'}</Text>
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
  documentGrid: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(14),
  },
  documentCol: {
    flex: 1,
  },
  documentGridCard: {
    position: 'relative',
    borderRadius: scale(14),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  documentGridImage: {
    width: '100%',
    height: verticalScale(120),
  },
  documentPlaceholder: {
    width: '100%',
    height: verticalScale(100),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  placeholderText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: scale(4),
  },
  cameraOverlayMini: {
    position: 'absolute',
    bottom: scale(6),
    right: scale(6),
    backgroundColor: '#073318',
    padding: scale(6),
    borderRadius: scale(14),
    elevation: 2,
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

export default TransporterVehicleDetailsScreen;
