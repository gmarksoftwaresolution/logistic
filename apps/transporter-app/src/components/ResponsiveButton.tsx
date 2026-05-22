import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';
import { moderateScale, verticalScale } from '../utils/responsive';

interface ResponsiveButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  type?: 'primary' | 'secondary' | 'outline';
}

const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({ 
  title, 
  onPress, 
  loading = false, 
  disabled = false, 
  style, 
  textStyle,
  type = 'primary'
}) => {
  const getButtonStyle = () => {
    switch (type) {
      case 'secondary': return styles.secondary;
      case 'outline': return styles.outline;
      default: return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'outline': return styles.outlineText;
      default: return styles.buttonText;
    }
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button, 
        getButtonStyle(),
        disabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: verticalScale(56),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    minHeight: 48, // Minimum touch size
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.textSecondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  disabled: {
    backgroundColor: Colors.buttonDisabled,
    borderColor: Colors.buttonDisabled,
  },
  buttonText: {
    ...(Typography as any).button,
  },
  outlineText: {
    ...(Typography as any).button,
    color: Colors.primary,
  },
});

export default ResponsiveButton;
