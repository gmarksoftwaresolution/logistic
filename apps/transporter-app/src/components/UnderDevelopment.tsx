import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { Construction } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface UnderDevelopmentProps {
  moduleName: string;
}

const UnderDevelopment: React.FC<UnderDevelopmentProps> = ({ moduleName }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Construction size={scale(48)} color={Colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{moduleName} {t('common.under_development')}</Text>
      <Text style={styles.description}>
        {t('common.coming_soon')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(24),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: verticalScale(10) },
    shadowOpacity: 0.1,
    shadowRadius: scale(20),
    elevation: moderateScale(8),
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(20),
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: verticalScale(12),
  },
  description: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(16),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: verticalScale(24),
  },
});

export default UnderDevelopment;
