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

export const TransporterBankDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [profileData, setProfileData] = useState<any>(route.params?.profileData || {});
  const bankDetails = profileData?.bankDetails || {};

  // View / Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [accountHolderName, setAccountHolderName] = useState(bankDetails?.accountHolderName || '');
  const [bankName, setBankName] = useState(bankDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(bankDetails?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(bankDetails?.ifscCode || '');
  const [branchName, setBranchName] = useState(bankDetails?.branchName || '');
  const [upiId, setUpiId] = useState(bankDetails?.upiId || '');

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
    const bDetails = data?.bankDetails || {};
    setAccountHolderName(bDetails?.accountHolderName || '');
    setBankName(bDetails?.bankName || '');
    setAccountNumber(bDetails?.accountNumber || '');
    setIfscCode(bDetails?.ifscCode || '');
    setBranchName(bDetails?.branchName || '');
    setUpiId(bDetails?.upiId || '');
  };

  const handleCancel = () => {
    resetForm(profileData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!accountHolderName.trim()) {
      Alert.alert('Validation Error', 'Account Holder Name is required.');
      return;
    }
    if (!bankName.trim()) {
      Alert.alert('Validation Error', 'Bank Name is required.');
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert('Validation Error', 'Account Number is required.');
      return;
    }
    if (!ifscCode.trim()) {
      Alert.alert('Validation Error', 'IFSC Code is required.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        branchName: branchName.trim() || undefined,
        upiId: upiId.trim() || undefined,
      };

      await api.post('/registration/step3', payload);

      const updatedProfileData = {
        ...profileData,
        bankDetails: {
          ...bankDetails,
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          branchName: branchName.trim(),
          upiId: upiId.trim(),
        },
      };

      setProfileData(updatedProfileData);
      await AsyncStorage.setItem('cached-profile-data', JSON.stringify(updatedProfileData));

      setIsEditing(false);
      Alert.alert('Success', getLabel('profile.updated_success', 'Bank details updated successfully.'));
    } catch (err: any) {
      console.error('Error saving bank details:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update bank details. Please try again.');
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
            {getLabel('signup.bank_details', 'Bank Details')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getLabel('profile.subtitle', 'View and manage payout account details')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailsCard}>
          {/* 1. Account Holder Name */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.account_holder', 'ACCOUNT HOLDER NAME')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  placeholder="Enter Account Holder Name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.inputValue}>{accountHolderName || '-'}</Text>
              )}
            </View>
          </View>

          {/* 2. Bank Name */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.bank_name', 'BANK NAME')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Enter Bank Name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.inputValue}>{bankName || '-'}</Text>
              )}
            </View>
          </View>

          {/* 3. Account Number */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.account_number', 'ACCOUNT NUMBER')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter Account Number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.inputValue}>
                  {accountNumber
                    ? accountNumber.length > 4
                      ? `•••• •••• •••• ${accountNumber.slice(-4)}`
                      : accountNumber
                    : '-'}
                </Text>
              )}
            </View>
          </View>

          {/* 4. IFSC Code */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.ifsc_code', 'IFSC CODE')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={ifscCode}
                  onChangeText={setIfscCode}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
              ) : (
                <Text style={styles.inputValue}>{ifscCode || '-'}</Text>
              )}
            </View>
          </View>

          {/* 5. Branch Name */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.branch_name', 'BRANCH NAME')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={branchName}
                  onChangeText={setBranchName}
                  placeholder="Enter Branch Name (optional)"
                  placeholderTextColor="#94A3B8"
                />
              ) : (
                <Text style={styles.inputValue}>{branchName || '-'}</Text>
              )}
            </View>
          </View>

          {/* 6. UPI ID */}
          <View style={styles.fieldBoxGroup}>
            <Text style={styles.fieldLabel}>
              {getLabel('signup.upi_id', 'UPI ID')}
            </Text>
            <View style={[styles.inputContainer, isEditing && styles.inputContainerEditing]}>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="Enter UPI ID (optional)"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.inputValue}>{upiId || '-'}</Text>
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

export default TransporterBankDetailsScreen;
