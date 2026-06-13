import React, { useCallback, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/localization/i18n'; 
import AppNavigator from './src/navigation/AppNavigator';
import { OrderManagementProvider } from './src/context/OrderManagementContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import OnboardingOverlay from './src/components/OnboardingOverlay';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
const PlusJakartaSans_400Regular = require('./src/assets/fonts/PlusJakartaSans_400Regular.ttf');
const PlusJakartaSans_500Medium = require('./src/assets/fonts/PlusJakartaSans_500Medium.ttf');
const PlusJakartaSans_600SemiBold = require('./src/assets/fonts/PlusJakartaSans_600SemiBold.ttf');
const PlusJakartaSans_700Bold = require('./src/assets/fonts/PlusJakartaSans_700Bold.ttf');
const PlusJakartaSans_800ExtraBold = require('./src/assets/fonts/PlusJakartaSans_800ExtraBold.ttf');
import { View } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync({
          'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
          'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
          'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
          'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
          'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
        });
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we need this to happen later, 
      // we can call this at the end of the useEffect or anywhere else.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <OrderManagementProvider>
            <OnboardingProvider>
              <AppNavigator />
              <OnboardingOverlay />
            </OnboardingProvider>
          </OrderManagementProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </View>
  );
}
