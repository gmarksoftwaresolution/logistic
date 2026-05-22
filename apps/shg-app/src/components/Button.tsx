import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  loading = false, 
  disabled = false, 
  variant = 'primary',
  className = '',
  icon
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary': return 'bg-[#073318]';
      case 'secondary': return 'bg-gray-100';
      case 'outline': return 'bg-transparent border border-[#073318]';
      default: return 'bg-[#073318]';
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'primary': return 'text-white';
      case 'secondary': return 'text-[#073318]';
      case 'outline': return 'text-[#073318]';
      default: return 'text-white';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`w-full py-4 rounded-2xl items-center justify-center flex-row shadow-sm ${getVariantStyles()} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#073318' : 'white'} />
      ) : (
        <View className="flex-row items-center">
          <Text className={`text-lg font-bold ${getTextStyles()} ${icon ? 'mr-2' : ''}`}>
            {title}
          </Text>
          {icon}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default Button;
