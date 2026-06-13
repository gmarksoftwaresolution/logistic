import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import WalkthroughElement from './WalkthroughElement';
import { StepId } from '../context/OnboardingContext';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  confirmStepId?: StepId;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive = false,
  confirmStepId,
}) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  
  const finalConfirmText = confirmText || t('su_confirm_358') || 'Confirm';
  const finalCancelText = cancelText || t('su_cancel_357') || 'Cancel';

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} className="z-[9999] justify-center items-center px-6">
      {/* Dimmed backdrop background */}
      <View style={StyleSheet.absoluteFillObject} className="bg-black/50" />
      
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onCancel} 
        className="absolute inset-0"
      />
      <View 
        className="bg-white w-full rounded-[24px] p-6 shadow-xl"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 10,
          maxWidth: 400
        }}
      >
        {/* Header */}
        <View className="flex-row items-center mb-4">
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isDestructive ? 'bg-red-50' : 'bg-[#E8F5EC]'}`}>
            <Ionicons 
              name={isDestructive ? "warning-outline" : "information-circle-outline"} 
              size={22} 
              color={isDestructive ? "#DC2626" : "#073318"} 
            />
          </View>
          <Text className="text-[18px] font-extrabold text-[#111827] flex-1">{title}</Text>
        </View>
        
        {/* Message */}
        <Text className="text-[14px] text-[#4B5563] font-medium leading-5 mb-6">
          {message}
        </Text>

          {/* Actions */}
          <View className="flex-row items-center justify-end gap-3">
            <TouchableOpacity 
              onPress={onCancel}
              activeOpacity={0.7}
              className="py-3 px-6 rounded-[16px] bg-[#F1F5F9]"
            >
              <Text className="text-[14px] font-bold text-[#475569]">{finalCancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={onConfirm}
              activeOpacity={0.7}
              className={`py-3 px-6 rounded-[16px] shadow-sm ${isDestructive ? 'bg-[#DC2626]' : 'bg-[#073318]'}`}
            >
              <Text className="text-[14px] font-bold text-white">{finalConfirmText}</Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
