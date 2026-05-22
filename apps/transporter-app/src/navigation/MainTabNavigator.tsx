import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import DashboardScreen from '../screens/DashboardScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import CustomTabBar from '../components/CustomTabBar';
import OrderManagementStackNavigator from './OrderManagementStackNavigator';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { t } = useTranslation();

  return (
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
  );
};

export default MainTabNavigator;
