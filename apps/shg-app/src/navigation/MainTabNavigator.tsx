import React, { useContext } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';

import { MainTabParamList, OrdersStackParamList } from './types';

// Screen Imports
import DashboardScreen from '../screens/DashboardScreen';
import OrderManagementScreen from '../screens/OrderManagementScreen';
import OrdersOverviewScreen from '../screens/OrdersOverviewScreen';
import StockManagementScreen from '../screens/StockManagementScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import IncomingOrdersScreen from '../screens/IncomingOrdersScreen';
import AcceptedOrdersScreen from '../screens/AcceptedOrdersScreen';
import DeliveryScreen from '../screens/DeliveryScreen';
import RejectedOrdersScreen from '../screens/RejectedOrdersScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import CompletedOrderDetailsScreen from '../screens/CompletedOrderDetailsScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator<MainTabParamList>();

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const context = useContext(LanguageContext);
  if (!context) return null;
  const { t } = context;

  return (
    <View className="bg-white pt-3 pb-6 border-t border-gray-100 flex-row justify-around rounded-t-[36px] shadow-2xl elevation-8">
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: any;
        let displayLabel: string;
        let IconComponent: any = Ionicons;

        if (route.name === 'Dashboard') {
          iconName = isFocused ? 'grid' : 'grid-outline';
          displayLabel = t('dashboard');
        } else if (route.name === 'Orders') {
          iconName = isFocused ? 'cube' : 'cube-outline';
          displayLabel = t('orders');
        } else if (route.name === 'Earning') {
          iconName = isFocused ? 'wallet' : 'wallet-outline';
          displayLabel = t('earning');
        } else {
          iconName = isFocused ? 'person' : 'person-outline';
          displayLabel = t('profile');
        }

        return (
          <Pressable
            key={index}
            onPress={onPress}
            className="items-center justify-center flex-1 relative"
          >
            <IconComponent name={iconName} size={22} color={isFocused ? "#5E5CE6" : "#94A3B8"} />
            <Text 
              numberOfLines={1}
              className={`text-[10px] mt-1 text-center font-bold ${isFocused ? "text-[#5E5CE6]" : "text-slate-400"}`}
            >
              {displayLabel}
            </Text>
            {isFocused && (
              <View className="w-8 h-[3px] bg-[#5E5CE6] rounded-full mt-1" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();

function OrdersStackNavigator() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrdersOverview" component={OrdersOverviewScreen} />
      <OrdersStack.Screen name="IncomingOrders" component={IncomingOrdersScreen} />
      <OrdersStack.Screen name="AcceptedOrders" component={AcceptedOrdersScreen} />
      <OrdersStack.Screen name="RejectedOrders" component={RejectedOrdersScreen} />
      <OrdersStack.Screen name="Delivery" component={DeliveryScreen} />
      <OrdersStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <OrdersStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <OrdersStack.Screen name="CompletedOrderDetails" component={CompletedOrderDetailsScreen} />
    </OrdersStack.Navigator>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Orders" component={OrdersStackNavigator} />
      <Tab.Screen name="Earning" component={PlaceholderScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
