import React, { useState, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { View, Text, TextInput, TouchableOpacity, TextInputProps, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ==========================================
// 1. Form Container
// ==========================================
interface FormContainerProps {
  children: React.ReactNode;
  style?: any;
}

export const FormContainer: React.FC<FormContainerProps> = ({ children, style }) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  return (
    <View 
      className="bg-white rounded-[32px] p-6 w-full border border-gray-100"
      style={[{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
      }, style]}
    >
      {children}
    </View>
  );
};

// ==========================================
// 2. Form Section Header
// ==========================================
interface FormSectionProps {
  iconName: any;
  title: string;
  subtitle: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ iconName, title, subtitle }) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  return (
    <View className="items-center mb-6">
      <View className="w-14 h-14 rounded-full bg-[#EEF5F0] items-center justify-center mb-2">
        <Ionicons name={iconName} size={28} color="#073318" />
      </View>
      <Text className="text-2xl font-extrabold text-[#111827] text-center">{title}</Text>
      <Text className="text-[#6B7280] text-[13px] font-semibold text-center mt-1">{subtitle}</Text>
    </View>
  );
};

// ==========================================
// 3. Premium Label
// ==========================================
interface LabelProps {
  text: string;
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ text, required = false }) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  return (
    <Text className="text-[10px] font-bold text-[#414651] uppercase tracking-wider mb-2 ml-1">
      {text} {required && <Text className="text-[#B42318] font-bold">*</Text>}
    </Text>
  );
};

// ==========================================
// 4. InputField Component
// ==========================================
interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: any;
  error?: string;
  required?: boolean;
  prefix?: string;
  suffixIcon?: any;
  onSuffixPress?: () => void;
  loading?: boolean;
}

export const InputField = React.forwardRef<TextInput, InputFieldProps>(({
  label,
  icon,
  error,
  required = false,
  prefix,
  suffixIcon,
  onSuffixPress,
  loading = false,
  style,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;

  return (
    <View className="mb-4 w-full">
      <Label text={label} required={required} />
      <View 
        className={`bg-[#F9FAFB] min-h-[58px] py-3 px-4 rounded-[20px] border flex-row items-center ${
          error ? 'border-[#EF4444]' : isFocused ? 'border-[#073318]' : (required && props.value && !error) ? 'border-[#22C55E]' : 'border-gray-200'
        } ${props.editable === false ? 'bg-[#F3F4F6]' : ''}`}
      >
        {icon && (
          <View className="w-[24px] items-center justify-center mr-3 flex-shrink-0">
            <Ionicons name={icon} size={24} color="#073318" />
          </View>
        )}
        {prefix && <Text className="text-[#073318] font-bold mr-2 flex-shrink-0">{prefix}</Text>}
        <TextInput
          ref={ref}
          className="flex-1 text-[#111827] text-[16px] font-medium"
          style={[{ padding: 0, textAlignVertical: 'center' }, style]}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            if (props.onBlur) props.onBlur(e);
          }}
          {...props}
        />
        {loading ? (
          <ActivityIndicator size="small" color="#073318" className="ml-2 flex-shrink-0" />
        ) : suffixIcon ? (
          <TouchableOpacity onPress={onSuffixPress} className="p-1 ml-2 flex-shrink-0">
            <Ionicons name={suffixIcon} size={24} color="#073318" />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '500' }}>{error}</Text> : null}
    </View>
  );
});

// ==========================================
// 5. DropdownField Component
// ==========================================
interface DropdownFieldProps {
  label: string;
  placeholder: string;
  value?: string;
  icon?: any;
  error?: string;
  required?: boolean;
  onPress: () => void;
}

export const DropdownField: React.FC<DropdownFieldProps> = ({
  label,
  placeholder,
  value,
  icon,
  error,
  required = false,
  onPress
}) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  
  // Safely extract only the primary language text by stripping out appended english in parentheses
  const displayValue = value ? value.split('(')[0].trim() : '';
  
  return (
    <View className="mb-4 w-full">
      <Label text={label} required={required} />
      <TouchableOpacity
        onPress={onPress}
        className={`bg-[#F9FAFB] min-h-[58px] py-3 px-4 rounded-[20px] border flex-row justify-between items-center ${
          error ? 'border-[#EF4444]' : (required && value && !error) ? 'border-[#22C55E]' : 'border-gray-200'
        }`}
      >
        <View className="flex-row items-center flex-1 pr-2">
          {icon && (
            <View className="w-[24px] items-center justify-center mr-3 flex-shrink-0">
              <Ionicons name={icon} size={24} color="#073318" />
            </View>
          )}
          <Text 
            className={`flex-1 font-medium text-[16px] ${value ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}
            style={{ textAlignVertical: 'center' }}
          >
            {displayValue || placeholder}
          </Text>
        </View>
        <View className="flex-shrink-0">
          <Ionicons name="chevron-down" size={24} color="#073318" />
        </View>
      </TouchableOpacity>
      {error ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '500' }}>{error}</Text> : null}
    </View>
  );
};

// ==========================================
// 6. ToggleButtonGroup Component
// ==========================================
interface ToggleButtonGroupProps {
  label: string;
  value: 'yes' | 'no' | null;
  error?: string;
  required?: boolean;
  onSelect: (val: 'yes' | 'no') => void;
}

export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({
  label,
  value,
  error,
  required = false,
  onSelect
}) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  return (
    <View className="mb-4 w-full">
      <Label text={label} required={required} />
      <View className={`flex-row w-full justify-between rounded-[20px] ${error ? 'border border-[#EF4444]' : ''}`}>
        <TouchableOpacity
          onPress={() => onSelect('yes')}
          className={`flex-1 h-[58px] rounded-[20px] border-2 flex-row items-center justify-center mr-2 ${
            value === 'yes' ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
          }`}
        >
          <Text className={`text-[16px] font-bold ${value === 'yes' ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("Yes") || 'Yes'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelect('no')}
          className={`flex-1 h-[58px] rounded-[20px] border-2 flex-row items-center justify-center ml-2 ${
            value === 'no' ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
          }`}
        >
          <Text className={`text-[16px] font-bold ${value === 'no' ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("No") || 'No'}</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '500' }}>{error}</Text> : null}
    </View>
  );
};

// ==========================================
// 7. PrimaryButton Component
// ==========================================
interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  iconName?: any;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  iconName = "arrow-forward"
}) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`py-4 rounded-2xl items-center justify-center flex-row w-full mt-6 mb-2 ${
        disabled ? 'bg-[#073318]/60' : 'bg-[#073318]'
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
      }}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide mr-2">{title}</Text>
          {iconName && <Ionicons name={iconName} size={20} color="white" />}
        </>
      )}
    </TouchableOpacity>
  );
};
