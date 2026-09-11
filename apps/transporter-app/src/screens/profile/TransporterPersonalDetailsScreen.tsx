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

export const TransporterPersonalDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [profileData, setProfileData] = useState<any>(route.params?.profileData || {});
  const personalDetails = profileData?.personalDetails || {};

  // View / Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState(personalDetails?.firstName || '');
  const [lastName, setLastName] = useState(personalDetails?.lastName || '');
  const [mobileNumber, setMobileNumber] = useState(
    profileData?.phoneNumber ||
      profileData?.mobileNumber ||
      personalDetails?.phoneNumber ||
      personalDetails?.mobileNumber ||
      ''
  );
  const [email, setEmail] = useState(personalDetails?.email || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(personalDetails?.profilePhoto || null);

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
        const phone = await AsyncStorage.getItem('user_phone_number');
        if (phone && !mobileNumber) {
          setMobileNumber(phone);
        }
      } catch (e) {
        console.error('Error loading cached profile data:', e);
      }
    };
    loadCachedData();
  }, []);

  const resetForm = (data: any) => {
    const pDetails = data?.personalDetails || {};
    setFirstName(pDetails?.firstName || '');
    setLastName(pDetails?.lastName || '');
    setMobileNumber(
      data?.phoneNumber ||
        data?.mobileNumber ||
        pDetails?.phoneNumber ||
        pDetails?.mobileNumber ||
        mobileNumber ||
        ''
    );
    setEmail(pDetails?.email || '');
    setProfilePhoto(pDetails?.profilePhoto || null);
  };

  const handlePickPhoto = async () => {
    if (!isEditing) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is required to select a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProfilePhoto(asset.uri);
      }
    } catch (e) {
      console.error('Error picking image:', e);
    }
  };

  const handleCancel = () => {
    resetForm(profileData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', getLabel('errors.first_name_required', 'First name is required.'));
      return;
    }

    try {
      setSaving(true);
      let photoUrl = profilePhoto;

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
          console.warn('Preemptive photo upload error, continuing save:', uploadErr);
        }
      }

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        profilePhoto: photoUrl || undefined,
        state: personalDetails?.state || undefined,
        district: personalDetails?.district || undefined,
        taluka: personalDetails?.taluka || undefined,
        village: personalDetails?.village || undefined,
        postOffice: personalDetails?.postOffice || personalDetails?.village || undefined,
        residentialAddress: personalDetails?.residentialAddress || undefined,
        pinCode: personalDetails?.pinCode || undefined,
      };

      await api.post('/registration/step1', payload);

      const updatedProfileData = {
        ...profileData,
        personalDetails: {
          ...personalDetails,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          profilePhoto: photoUrl,
        },
        phoneNumber: mobileNumber,
      };

      setProfileData(updatedProfileData);
      await AsyncStorage.setItem('cached-profile-data', JSON.stringify(updatedProfileData));

      setIsEditing(false);
      Alert.alert('Success', getLabel('profile.updated_success', 'Personal details updated successfully.'));
    } catch (err: any) {
      console.error('Error saving personal details:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update personal details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const photoUri = getFullPhotoUrl(profilePhoto);

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
            {getLabel('signup.personal_details', 'Personal Details')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getLabel('profile.subtitle', 'View and manage your account details')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo Avatar Section */}
        <View style={styles.avatarSection}>
          <Text style={styles.photoLabel}>
            {getLabel('signup.profile_photo', 'PROFILE PHOTO')}
          </Text>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickPhoto}
            activeOpacity={isEditing ? 0.8 : 1}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {firstName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            {isEditing && (
              <View style={styles.cameraBadge}>
                <Camera size={scale(12)} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Card Container with 5 Fields */}
        <View style={styles.detailsCard}>
          {/* 1. First Name */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.first_name', 'FIRST NAME')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={getLabel('signup.enter_first_name', 'Enter first name')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.inputValue}>{firstName || '-'}</Text>
              )}
            </View>
          </View>

          {/* 2. Last Name */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.last_name', 'LAST NAME')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={getLabel('signup.enter_last_name', 'Enter last name')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.inputValue}>{lastName || '-'}</Text>
              )}
            </View>
          </View>

          {/* 3. Mobile Number */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('login.mobile_label', 'MOBILE NUMBER')}
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputValue}>
                {mobileNumber ? (mobileNumber.startsWith('+91') ? mobileNumber : `+91 ${mobileNumber}`) : '-'}
              </Text>
            </View>
          </View>

          {/* 4. Email Address (Optional) */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.email', 'EMAIL ADDRESS')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={getLabel('signup.enter_email', 'Enter email address (optional)')}
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.inputValue}>{email || '-'}</Text>
              )}
            </View>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  photoLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: verticalScale(6),
  },
  avatarWrapper: {
    position: 'relative',
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: scale(40),
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: '#073318',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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

export default TransporterPersonalDetailsScreen;
