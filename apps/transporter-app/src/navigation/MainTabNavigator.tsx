import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated, Modal, SafeAreaView, ActivityIndicator, Alert, Vibration } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import DashboardScreen from '../screens/DashboardScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import CustomTabBar from '../components/CustomTabBar';
import OrderManagementStackNavigator from './OrderManagementStackNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useOrderManagement } from '../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { Fonts } from '../constants/Colors';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={DashboardScreen}
          options={{
            tabBarLabel: t('tabs.home')
          }}
        />

        <Tab.Screen
          name="Order Management"
          component={OrderManagementStackNavigator}
          options={{
            tabBarLabel: t('tabs.orderMgmt')
          }}
        />
        <Tab.Screen
          name="Order History"
          component={OrderHistoryScreen}
          options={{
            tabBarLabel: t('tabs.history')
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default MainTabNavigator;
