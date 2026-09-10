import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'BankDetails'>;

export default function BankDetailsScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  const { user, updateUser } = useUser();

  if (!context || !user) return null;
  const { t } = context;

  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Extract bank details from user object or nested bankDetails array
  const bankData = Array.isArray(user?.bankDetails) && user.bankDetails.length > 0
    ? user.bankDetails[0]
    : user?.bankDetails || {};

  const getInitialForm = () => ({
    accountName: user?.accountName || bankData.accountName || bankData.accountHolderName || bankData.name || user?.name || '',
    ifscCode: user?.ifscCode || bankData.ifscCode || bankData.ifsc || '',
    bankName: user?.bankName || bankData.bankName || '',
    branchName: user?.branchName || bankData.branchName || bankData.branch || '',
    accountNumber: user?.accountNumber || bankData.accountNumber || '',
    upiId: user?.upiId || bankData.upiId || bankData.upi || '',
  });

  const [formData, setFormData] = useState(getInitialForm());

  useEffect(() => {
    setFormData(getInitialForm());
  }, [user]);

  const hasChanges = () => {
    const initial = getInitialForm();
    return (
      formData.accountName !== initial.accountName ||
      formData.ifscCode !== initial.ifscCode ||
      formData.bankName !== initial.bankName ||
      formData.branchName !== initial.branchName ||
      formData.accountNumber !== initial.accountNumber ||
      formData.upiId !== initial.upiId
    );
  };

  const handleCancelEdit = () => {
    setFormData(getInitialForm());
    setGeneralError('');
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!hasChanges()) {
      setIsEditing(false);
      setGeneralError('');
      return;
    }
    setGeneralError('');
    const updatedBankObj = {
      accountName: formData.accountName,
      accountHolderName: formData.accountName,
      ifscCode: formData.ifscCode,
      bankName: formData.bankName,
      branchName: formData.branchName,
      accountNumber: formData.accountNumber,
      upiId: formData.upiId,
    };

    updateUser({
      ...formData,
      bankDetails: Array.isArray(user?.bankDetails) ? [updatedBankObj] : updatedBankObj,
    });

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setIsEditing(false);
    }, 1500);
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default"
  }: {
    label: string;
    value: string;
    onChangeText: (val: string) => void;
    placeholder: string;
    keyboardType?: any;
  }) => (
    <View className="w-full mb-3">
      <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{label}</Text>
      <View className={`flex-row items-center py-2.5 px-4 rounded-xl border ${isEditing ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
        <TextInput
          value={value}
          editable={isEditing}
          onChangeText={val => {
            onChangeText(val);
            setGeneralError('');
          }}
          className={`flex-1 font-semibold text-sm ${isEditing ? 'text-textPrimary' : 'text-gray-700'}`}
          placeholder={placeholder}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 bg-white border-b border-gray-50 flex-row items-center mt-2">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#073318" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-textPrimary tracking-tight">{t('su_bank_details_231') || "Bank Details"}</Text>
          <Text className="text-textSecondary text-xs font-medium mt-0.5">{t('su_where_should_we_send_232') || "Where should we send your earnings?"}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={80}
        extraHeight={80}
        enableAutomaticScroll={true}
      >
        <View className="px-5 pt-4">
          <View className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-50 mb-6">
            <InputField
              label={t('su_account_holder_name_235') || "Account Holder Name"}
              value={formData.accountName}
              onChangeText={(val) => setFormData({ ...formData, accountName: val })}
              placeholder="Enter account holder name"
            />
            <InputField
              label={t('su_ifsc_code_233') || "IFSC Code"}
              value={formData.ifscCode}
              onChangeText={(val) => setFormData({ ...formData, ifscCode: val })}
              placeholder="Enter IFSC code"
            />
            <InputField
              label={t('su_bank_name_or_auto_f_249') || "Bank Name"}
              value={formData.bankName}
              onChangeText={(val) => setFormData({ ...formData, bankName: val })}
              placeholder="Enter bank name"
            />
            <InputField
              label={t('su_branch_name_241') || "Branch Name"}
              value={formData.branchName}
              onChangeText={(val) => setFormData({ ...formData, branchName: val })}
              placeholder="Enter branch name"
            />
            <InputField
              label={t('su_account_number_237') || "Account Number"}
              value={formData.accountNumber}
              onChangeText={(val) => setFormData({ ...formData, accountNumber: val })}
              placeholder="Enter account number"
              keyboardType="numeric"
            />
            <InputField
              label={t('su_upi_id_optional_245') || "UPI ID"}
              value={formData.upiId}
              onChangeText={(val) => setFormData({ ...formData, upiId: val })}
              placeholder="Enter UPI ID (optional)"
            />

            {generalError ? (
              <View className="bg-red-50 p-3 rounded-2xl mb-4 flex-row items-center border border-red-100 mt-1">
                <Ionicons name="alert-circle" size={18} color="#EF4444" className="mr-2" />
                <Text className="text-red-500 font-semibold text-xs">{generalError}</Text>
              </View>
            ) : null}

            <View className="flex-row gap-3 w-full mt-2">
              {!isEditing ? (
                <>
                  <TouchableOpacity onPress={() => navigation.goBack()} className="flex-1 bg-gray-100 py-3.5 rounded-2xl items-center">
                    <Text className="text-textPrimary font-bold text-base">{t("back") || "Back"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsEditing(true)} className="flex-1 bg-primary py-3.5 rounded-2xl items-center shadow-sm">
                    <Text className="text-white font-bold text-base">{t("edit") || "Edit"}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={handleCancelEdit} className="flex-1 bg-gray-100 py-3.5 rounded-2xl items-center">
                    <Text className="text-textPrimary font-bold text-base">{t("cancel") || "Cancel"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} className="flex-1 bg-primary py-3.5 rounded-2xl items-center shadow-sm">
                    <Text className="text-white font-bold text-base">{t("save_changes") || "Save Changes"}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      <Modal visible={showSuccess} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-10">
          <View className="bg-white p-10 rounded-[40px] items-center w-full shadow-2xl">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <View className="w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg">
                <Ionicons name="checkmark" size={32} color="white" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-textPrimary mb-2 text-center">{t("updated") || "Updated"}</Text>
            <Text className="text-textSecondary text-center text-sm">{t("bank_details_success") || "Bank details updated successfully."}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
