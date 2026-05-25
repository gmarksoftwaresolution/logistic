import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screen Imports
import LandingScreen from '../screens/LandingScreen';
import LanguageScreen from '../screens/LanguageScreen';
import AuthSelectionScreen from '../screens/AuthSelectionScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HelpScreen from '../screens/HelpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import OrderManagementScreen from '../screens/OrderManagementScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PersonalDetailsScreen from '../screens/PersonalDetailsScreen';
import IncomingOrdersScreen from '../screens/IncomingOrdersScreen';
import AddressScreen from '../screens/AddressScreen';
import OrdersOverviewScreen from '../screens/OrdersOverviewScreen';
import RejectedOrdersScreen from '../screens/RejectedOrdersScreen';
import MainTabNavigator from './MainTabNavigator';
import StockManagementScreen from '../screens/StockManagementScreen';
import ApplicationStatusScreen from '../screens/ApplicationStatusScreen';


import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * AppNavigator.tsx - Main Navigation Stack
 * 
 * Note: No NavigationContainer here. It's managed in App.js.
 * All screens automatically receive 'navigation' and 'route' props.
 */
export default function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }} 
      initialRouteName="Landing"
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="AuthSelection" component={AuthSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="Stock" component={StockManagementScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="Address" component={AddressScreen} />
      <Stack.Screen name="ApplicationStatus" component={ApplicationStatusScreen} />
      <Stack.Screen name="RejectedOrders" component={RejectedOrdersScreen} />
    </Stack.Navigator>
  );
}
