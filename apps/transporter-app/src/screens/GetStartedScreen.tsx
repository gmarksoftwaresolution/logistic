import React from 'react';
import { View, Text, StyleSheet, ImageBackground, StatusBar, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Fonts } from '../constants/Colors';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { ChevronRight } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'GetStarted'>;

const GetStartedScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground 
        source={require('../assets/GMLStartingScreen.png')} 
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(24, 29, 39, 0.98)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.textGroup}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text 
                style={styles.title}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Gram<Text style={{ color: Colors.secondary }}>Unnati</Text> Logistics
              </Text>
              <Text style={styles.subtitle}>
                Streamlining transport, one trip at a time. Join our network of professional drivers and grow your business today.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={() => navigation.navigate('Language')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <View style={styles.iconCircle}>
                <ChevronRight size={scale(20)} color="#FFFFFF" strokeWidth={3} />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: scale(24),
    paddingBottom: verticalScale(60),
  },
  content: {
    width: '100%',
  },
  textGroup: {
    marginBottom: verticalScale(40),
  },
  welcomeText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(18),
    color: 'rgba(255,255,255,0.8)',
    marginBottom: verticalScale(8),
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(32),
    color: '#FFFFFF',
    lineHeight: moderateScale(38),
    marginBottom: verticalScale(16),
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(16),
    color: 'rgba(255,255,255,0.7)',
    lineHeight: moderateScale(24),
  },
  button: {
    backgroundColor: Colors.primary,
    height: verticalScale(64),
    borderRadius: moderateScale(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(8),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    marginLeft: scale(40),
  },
  iconCircle: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(16),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GetStartedScreen;
