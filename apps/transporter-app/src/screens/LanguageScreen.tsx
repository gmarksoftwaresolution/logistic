import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  useWindowDimensions
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Fonts } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';
import { moderateScale, scale, verticalScale } from '../utils/responsive';
import ResponsiveButton from '../components/ResponsiveButton';
import api from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;

const LanguageScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'en');
  const fromProfile = route.params?.fromProfile;

  // Small device check (height < 700 like iPhone SE or older Androids)
  const isSmallDevice = height < 700;

  const handleLanguageSelect = async (lng: string) => {
    setSelectedLang(lng);
    try {
      if (i18n && typeof i18n.changeLanguage === 'function') {
        await i18n.changeLanguage(lng);
        await AsyncStorage.setItem('user-language', lng);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleContinue = async () => {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'mr': 'Marathi'
    };
    
    // Send language selection to the backend in the background
    api.post('/registration/select-language', {
      language: languageMap[selectedLang] || 'English'
    })
    .then(response => {
      console.log('Language selection synchronized with backend:', response.data);
    })
    .catch(error => {
      console.error('Failed to send language selection to backend:', error);
    });
    
    // Navigate instantly without waiting for the network roundtrip
    if (fromProfile) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
    }
  };

  const LanguageOption = ({ code, label, native, letter }: { code: string, label: string, native: string, letter: string }) => (
    <TouchableOpacity
      style={[
        styles.optionCard,
        selectedLang === code && styles.optionCardSelected,
        isSmallDevice && styles.optionCardSmall
      ]}
      onPress={() => handleLanguageSelect(code)}
      activeOpacity={0.7}
    >
      <View style={styles.optionLeft}>
        <View style={[
          styles.iconContainer,
          selectedLang === code && styles.iconContainerSelected,
          isSmallDevice && styles.iconContainerSmall
        ]}>
          <Text style={[
            styles.letterIcon,
            selectedLang === code && styles.letterIconSelected,
            isSmallDevice && styles.letterIconSmall
          ]}>{letter}</Text>
        </View>
        <View>
          <Text style={[styles.languageName, isSmallDevice && styles.languageNameSmall]}>{label}</Text>
          <Text style={[styles.languageNative, isSmallDevice && styles.languageNativeSmall]}>{native}</Text>
        </View>
      </View>
      <View style={[styles.radioCircle, selectedLang === code && styles.radioCircleSelected]}>
        {selectedLang === code && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* TOP SECTION - Logo */}
      <View style={styles.topSection}>
        <Image
          source={require('../assets/GMLogo.png')}
          style={[styles.logo, isSmallDevice && styles.logoSmall]}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>
          <Text style={{ color: Colors.primary }}>Gram</Text>
          <Text style={{ color: Colors.secondary }}>Unnati</Text>
          <Text style={{ color: Colors.primary }}> Logistics</Text>
        </Text>
      </View>

      {/* MIDDLE SECTION - Title & Language Selection */}
      <View style={styles.middleSection}>
        <View style={styles.textHeader}>
          <Text style={[styles.title, isSmallDevice && styles.titleSmall]}>
            {t('language_selection.title')}
          </Text>
          <Text style={[styles.subtitle, isSmallDevice && styles.subtitleSmall]}>
            {t('language_selection.subtitle')}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <LanguageOption
            code="en"
            label="English"
            native="Trusted by transport professionals"
            letter="E"
          />
          <LanguageOption
            code="mr"
            label="मराठी (Marathi)"
            native="वाहतूक व्यावसायिकांचा विश्वास"
            letter="म"
          />
          <LanguageOption
            code="hi"
            label="हिंदी (Hindi)"
            native="परिवहन पेशेवरों का भरोसा"
            letter="हि"
          />
        </View>
      </View>

      {/* BOTTOM SECTION - Action Button */}
      <View style={styles.bottomSection}>
        <ResponsiveButton
          title={t('common.continue')}
          onPress={handleContinue}
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
  },
  middleSection: {
    flex: 5.5, // Adjusted slightly to give more room for cards
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
  },
  bottomSection: {
    flex: 1.5,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 0 : Spacing.md,
  },
  textHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logo: {
    width: moderateScale(160),
    height: moderateScale(80),
  },
  logoSmall: {
    width: moderateScale(120),
    height: moderateScale(60),
  },
  logoText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(28),
    marginTop: moderateScale(-5),
    lineHeight: moderateScale(34),
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  titleSmall: {
    fontSize: moderateScale(22),
  },
  subtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  subtitleSmall: {
    fontSize: moderateScale(12),
    lineHeight: moderateScale(16),
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.md,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(4) },
        shadowOpacity: 0.05,
        shadowRadius: moderateScale(12),
      },
      android: {
        elevation: 3,
      },
    }),
  },
  optionCardSmall: {
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9F4',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(14),
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconContainerSmall: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    marginRight: Spacing.sm,
  },
  iconContainerSelected: {
    backgroundColor: '#FFFFFF',
  },
  letterIcon: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(22),
    color: Colors.textPlaceholder,
  },
  letterIconSmall: {
    fontSize: moderateScale(16),
  },
  letterIconSelected: {
    color: Colors.primary,
  },
  languageName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
  },
  languageNameSmall: {
    fontSize: moderateScale(14),
  },
  languageNative: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: 2,
  },
  languageNativeSmall: {
    fontSize: moderateScale(10),
    marginTop: 0,
  },
  radioCircle: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    backgroundColor: Colors.primary,
  },
  continueButton: {
    width: '100%',
  },
});

export default LanguageScreen;
