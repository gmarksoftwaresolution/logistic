import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';
import { moderateScale, verticalScale } from '../utils/responsive';

interface ResponsiveInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  containerStyle,
  inputStyle,
  keyboardType = 'default'
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textPlaceholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          style={[styles.input, inputStyle]}
          allowFontScaling={true}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    height: verticalScale(56),
    borderRadius: moderateScale(12),
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  input: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});

export default ResponsiveInput;
