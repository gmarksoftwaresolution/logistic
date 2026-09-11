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

export const TransporterDrivingDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [profileData, setProfileData] = useState<any>(route.params?.profileData || {});
  const drivingDetails = profileData?.drivingDetails || {};

  // View / Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [licenseNumber, setLicenseNumber] = useState(drivingDetails?.licenseNumber || '');
  const [expiryDate, setExpiryDate] = useState<string>(() => {
    if (drivingDetails?.expiryDate) {
      const d = new Date(drivingDetails.expiryDate);
      if (!isNaN(d.getTime())) {
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    return '';
  });
  const [experienceYears, setExperienceYears] = useState(
    drivingDetails?.experienceYears ? String(drivingDetails.experienceYears) : ''
  );
  const [licensePhoto, setLicensePhoto] = useState<string | null>(drivingDetails?.licensePhoto || null);

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
    const dDetails = data?.drivingDetails || {};
    setLicenseNumber(dDetails?.licenseNumber || '');
    if (dDetails?.expiryDate) {
      const d = new Date(dDetails.expiryDate);
      if (!isNaN(d.getTime())) {
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        setExpiryDate(`${day}/${month}/${year}`);
      } else {
        setExpiryDate('');
      }
    } else {
      setExpiryDate('');
    }
    setExperienceYears(dDetails?.experienceYears ? String(dDetails.experienceYears) : '');
    setLicensePhoto(dDetails?.licensePhoto || null);
  };

  const handlePickPhoto = async () => {
    if (!isEditing) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is required to select a license photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLicensePhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error picking license image:', e);
    }
  };

  const handleCancel = () => {
    resetForm(profileData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert('Validation Error', getLabel('errors.license_required', 'License number is required.'));
      return;
    }

    try {
      setSaving(true);
      let photoUrl = licensePhoto;

      if (
        photoUrl &&
        (photoUrl.startsWith('file://') || photoUrl.startsWith('content://') || !photoUrl.startsWith('/uploads/'))
      ) {
        try {
          const uploadRes = await uploadFile(photoUrl);
          if (uploadRes?.data?.url) {
            photoUrl = uploadRes.data.url;
          }
        } catch (uploadErr) {
          console.warn('Preemptive license photo upload error, continuing save:', uploadErr);
        }
      }

      let formattedDate: string | undefined = undefined;
      if (expiryDate.includes('/')) {
        const parts = expiryDate.split('/');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      } else if (expiryDate.trim()) {
        formattedDate = expiryDate.trim();
      }

      const payload = {
        licenseNumber: licenseNumber.trim(),
        licensePhoto: photoUrl || undefined,
        expiryDate: formattedDate,
        experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
      };

      await api.post('/registration/step2', payload);

      const updatedProfileData = {
        ...profileData,
        drivingDetails: {
          ...drivingDetails,
          licenseNumber: licenseNumber.trim(),
          licensePhoto: photoUrl,
          expiryDate: formattedDate || drivingDetails?.expiryDate,
          experienceYears: experienceYears ? parseInt(experienceYears) : drivingDetails?.experienceYears,
        },
      };

      setProfileData(updatedProfileData);
      await AsyncStorage.setItem('cached-profile-data', JSON.stringify(updatedProfileData));

      setIsEditing(false);
      Alert.alert('Success', getLabel('profile.updated_success', 'Driving details updated successfully.'));
    } catch (err: any) {
      console.error('Error saving driving details:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update driving details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const licensePhotoUrl = getFullPhotoUrl(licensePhoto);

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
            {getLabel('signup.driving_details', 'Driving Details')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getLabel('profile.subtitle', 'View and manage your driving license details')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailsCard}>
          {/* 1. License Number */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.license_number', 'DRIVING LICENSE NUMBER')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder={getLabel('signup.license_placeholder', 'e.g. MH1420110012345')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
              ) : (
                <Text style={styles.inputValue}>{licenseNumber || '-'}</Text>
              )}
            </View>
          </View>

          {/* 2. Expiry Date */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.expiry_date', 'EXPIRY DATE (DD/MM/YYYY)')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.inputValue}>{expiryDate || '-'}</Text>
              )}
            </View>
          </View>

          {/* 3. Driving Experience */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.driving_experience', 'DRIVING EXPERIENCE (YEARS)')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  placeholder="e.g. 5"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.inputValue}>
                  {experienceYears ? `${experienceYears} ${getLabel('common.years', 'Years')}` : '-'}
                </Text>
              )}
            </View>
          </View>

          {/* 4. License Photo Preview / Upload */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.license_photo', 'LICENSE PHOTO')}
            </Text>
            <TouchableOpacity
              style={styles.documentPreviewContainer}
              onPress={handlePickPhoto}
              activeOpacity={isEditing ? 0.8 : 1}
            >
              {licensePhotoUrl ? (
                <Image
                  source={{ uri: licensePhotoUrl }}
                  style={styles.documentImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Text style={styles.placeholderText}>
                    {isEditing ? 'Tap to upload license photo' : 'No photo uploaded'}
                  </Text>
                </View>
              )}
              {isEditing && (
                <View style={styles.cameraOverlay}>
                  <Camera size={scale(18)} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

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
  documentPreviewContainer: {
    position: 'relative',
    borderRadius: scale(14),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginTop: verticalScale(4),
  },
  documentImage: {
    width: '100%',
    height: verticalScale(160),
  },
  documentPlaceholder: {
    width: '100%',
    height: verticalScale(120),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  placeholderText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: '#94A3B8',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: scale(10),
    right: scale(10),
    backgroundColor: '#073318',
    padding: scale(8),
    borderRadius: scale(20),
    elevation: 3,
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

export default TransporterDrivingDetailsScreen;
