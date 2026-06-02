import 'react-native-gesture-handler';
import 'react-native-reanimated'; 
import React, { useCallback, useEffect } from 'react';
import { View, Text, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { 
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black
} from '@expo-google-fonts/poppins';

import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import { UserProvider } from './src/context/UserContext';
import { OrderProvider } from './src/context/OrderContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import "./global.css";

const SuccessToast = ({ text1, text2 }: any) => {
  useEffect(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#073318',
        borderRadius: 100,
        width: '90%',
        minHeight: 52,
        paddingHorizontal: 20,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6
      }}
    >
      <View style={{ flex: 1, paddingRight: 10, justifyContent: 'center' }}>
        {text1 ? <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'Poppins-Bold' }}>{text1}</Text> : null}
        {text2 ? <Text style={{ fontSize: 12, color: '#E5E7EB', marginTop: 2, fontFamily: 'Poppins-Regular' }}>{text2}</Text> : null}
      </View>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
};

const ErrorToastComponent = ({ text1, text2 }: any) => {
  useEffect(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#DC2626',
        borderRadius: 100,
        width: '90%',
        minHeight: 52,
        paddingHorizontal: 20,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6
      }}
    >
      <View style={{ flex: 1, paddingRight: 10, justifyContent: 'center' }}>
        {text1 ? <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'Poppins-Bold' }}>{text1}</Text> : null}
        {text2 ? <Text style={{ fontSize: 12, color: '#FECACA', marginTop: 2, fontFamily: 'Poppins-Regular' }}>{text2}</Text> : null}
      </View>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
};

const toastConfig = {
  success: (props: any) => <SuccessToast {...props} />,
  error: (props: any) => <ErrorToastComponent {...props} />,
};

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    // Poppins Font Family
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-ExtraBold': Poppins_800ExtraBold,
    'Poppins-Black': Poppins_900Black,

    // Mukta Fallbacks
    'Mukta-Regular': Poppins_400Regular,
    'Mukta-Medium': Poppins_500Medium,
    'Mukta-SemiBold': Poppins_600SemiBold,
    'Mukta-Bold': Poppins_700Bold,
    'Mukta-ExtraBold': Poppins_800ExtraBold,

    // PlusJakartaSans Fallbacks
    'PlusJakartaSans-Regular': Poppins_400Regular,
    'PlusJakartaSans-Medium': Poppins_500Medium,
    'PlusJakartaSans-SemiBold': Poppins_600SemiBold,
    'PlusJakartaSans-Bold': Poppins_700Bold,
    'PlusJakartaSans-ExtraBold': Poppins_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    // Splash screen will be hidden by LandingScreen after auth/API checks
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <UserProvider>
          <OrderProvider>
            <SafeAreaProvider onLayout={onLayoutRootView}>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
              <Toast config={toastConfig} position="bottom" bottomOffset={110} />
            </SafeAreaProvider>
          </OrderProvider>
        </UserProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}