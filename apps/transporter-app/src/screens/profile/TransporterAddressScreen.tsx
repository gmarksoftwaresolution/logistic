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

export const TransporterAddressScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [profileData, setProfileData] = useState<any>(route.params?.profileData || {});
  const personalDetails = profileData?.personalDetails || {};

  // View / Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State - 6 Address Fields
  const [pinCode, setPinCode] = useState(personalDetails?.pinCode || '');
  const [village, setVillage] = useState(personalDetails?.village || '');
  const [taluka, setTaluka] = useState(personalDetails?.taluka || '');
  const [district, setDistrict] = useState(personalDetails?.district || '');
  const [state, setState] = useState(personalDetails?.state || '');
  const [residentialAddress, setResidentialAddress] = useState(personalDetails?.residentialAddress || '');

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
    const pDetails = data?.personalDetails || {};
    setPinCode(pDetails?.pinCode || '');
    setVillage(pDetails?.village || '');
    setTaluka(pDetails?.taluka || '');
    setDistrict(pDetails?.district || '');
    setState(pDetails?.state || '');
    setResidentialAddress(pDetails?.residentialAddress || '');
  };

  const handleCancel = () => {
    resetForm(profileData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!pinCode.trim()) {
      Alert.alert('Validation Error', getLabel('errors.pincode_required', 'Pincode is required.'));
      return;
    }

    try {
      setSaving(true);
      const payload = {
        firstName: personalDetails?.firstName || '',
        lastName: personalDetails?.lastName || '',
        email: personalDetails?.email || undefined,
        profilePhoto: personalDetails?.profilePhoto || undefined,
        state: state.trim(),
        district: district.trim(),
        taluka: taluka.trim(),
        village: village.trim(),
        postOffice: personalDetails?.postOffice || village.trim(),
        residentialAddress: residentialAddress.trim(),
        pinCode: pinCode.trim(),
      };

      await api.post('/registration/step1', payload);

      const updatedProfileData = {
        ...profileData,
        personalDetails: {
          ...personalDetails,
          state: state.trim(),
          district: district.trim(),
          taluka: taluka.trim(),
          village: village.trim(),
          residentialAddress: residentialAddress.trim(),
          pinCode: pinCode.trim(),
        },
      };

      setProfileData(updatedProfileData);
      await AsyncStorage.setItem('cached-profile-data', JSON.stringify(updatedProfileData));

      setIsEditing(false);
      Alert.alert('Success', getLabel('profile.address_updated_success', 'Address details updated successfully.'));
    } catch (err: any) {
      console.error('Error saving address details:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update address details. Please try again.');
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
            {getLabel('profile.my_address', 'My Address')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getLabel('profile.address_subtitle', 'View and manage your residential address')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailsCard}>
          {/* 1. Pincode */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.pincode', 'PINCODE')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={pinCode}
                  onChangeText={setPinCode}
                  placeholder={getLabel('signup.enter_pincode', 'Enter pincode')}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.inputValue}>{pinCode || '-'}</Text>
              )}
            </View>
          </View>

          {/* 2. Village */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.village', 'VILLAGE')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={village}
                  onChangeText={setVillage}
                  placeholder={getLabel('signup.enter_village', 'Enter village')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.inputValue}>{village || '-'}</Text>
              )}
            </View>
          </View>

          {/* 3. Taluka */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.taluka', 'TALUKA')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={taluka}
                  onChangeText={setTaluka}
                  placeholder={getLabel('signup.enter_taluka', 'Enter taluka')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.inputValue}>{taluka || '-'}</Text>
              )}
            </View>
          </View>

          {/* 4. District */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.district', 'DISTRICT')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={district}
                  onChangeText={setDistrict}
                  placeholder={getLabel('signup.enter_district', 'Enter district')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.inputValue}>{district || '-'}</Text>
              )}
            </View>
          </View>

          {/* 5. State */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.state', 'STATE')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={state}
                  onChangeText={setState}
                  placeholder={getLabel('signup.enter_state', 'Enter state')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.inputValue}>{state || '-'}</Text>
              )}
            </View>
          </View>

          {/* 6. Residential Address */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.address', 'RESIDENTIAL ADDRESS')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={[styles.textInput, { minHeight: verticalScale(60), textAlignVertical: 'top' }]}
                  value={residentialAddress}
                  onChangeText={setResidentialAddress}
                  placeholder={getLabel('signup.enter_address', 'Enter residential address')}
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  autoCapitalize="sentences"
                />
              ) : (
                <Text style={styles.inputValue}>{residentialAddress || '-'}</Text>
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

export default TransporterAddressScreen;
