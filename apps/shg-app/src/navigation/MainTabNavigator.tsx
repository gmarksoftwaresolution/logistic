import React, { useContext } from 'react';
import { View, Text, Pressable, Platform, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';

import { MainTabParamList, OrdersStackParamList } from './types';

// Screen Imports
import DashboardScreen from '../screens/DashboardScreen';
import OrderManagementScreen from '../screens/OrderManagementScreen';
import OrdersOverviewScreen from '../screens/OrdersOverviewScreen';
import StockManagementScreen from '../screens/StockManagementScreen';
import CompletedOrdersScreen from '../screens/CompletedOrdersScreen';
import OrderHistoryScreen from '../modules/order-history/screens/OrderHistoryScreen';
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

  const [containerWidth, setContainerWidth] = React.useState(0);
  const translateX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (containerWidth > 0) {
      const tabWidth = containerWidth / 5;
      const targetValue = state.index * tabWidth;
      Animated.spring(translateX, {
        toValue: targetValue,
        stiffness: 120,
        damping: 18,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, containerWidth]);

  const indicatorWidth = 32;
  const tabWidth = containerWidth > 0 ? containerWidth / 5 : 0;
  // Center the horizontal pill indicator inside the first tab space initially
  const indicatorLeft = tabWidth > 0 ? (tabWidth / 2 - indicatorWidth / 2) : 0;

  return (
    <View 
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        setContainerWidth(width);
      }}
      className="absolute bottom-6 left-5 right-5 h-[72px] bg-white border border-[#E2F0E7] flex-row justify-around items-center rounded-[32px] shadow-lg"
      style={{
        elevation: 8,
        shadowColor: '#073318',
        shadowOffset: {
          width: 0,
          height: 6
        },
        shadowOpacity: 0.12,
        shadowRadius: 10
      }}
    >
      {containerWidth > 0 && (
        <Animated.View 
          style={{
            position: 'absolute',
            top: 0,
            width: indicatorWidth,
            height: 4,
            backgroundColor: '#073318',
            borderRadius: 2,
            left: indicatorLeft,
            transform: [{ translateX }],
          }}
        />
      )}

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
          displayLabel = t('home') || 'Home';
        } else if (route.name === 'Orders') {
          IconComponent = MaterialCommunityIcons;
          iconName = isFocused ? 'truck' : 'truck-outline';
          displayLabel = t('title_order_management') || 'Order Management';
        } else if (route.name === 'OrderHistory') {
          IconComponent = Ionicons;
          iconName = isFocused ? 'document-text' : 'document-text-outline';
          displayLabel = t('order_history') || 'Order History';
        } else if (route.name === 'Earning') {
          IconComponent = Ionicons;
          iconName = isFocused ? 'wallet' : 'wallet-outline';
          displayLabel = t('earning') || 'Earnings';
        } else {
          iconName = isFocused ? 'person' : 'person-outline';
          displayLabel = t('profile') || 'Profile';
        }

        return (
          <Pressable
            key={index}
            onPress={onPress}
            className="items-center justify-center flex-1 h-full relative"
          >
            <View className="items-center justify-center pt-2">
              <View className={`${isFocused && route.name === 'OrderHistory' ? 'bg-[#F0FDF4] w-[46px] h-[46px] rounded-full items-center justify-center mb-0.5' : 'mb-0.5'}`}>
                <IconComponent 
                  name={iconName} 
                  size={22} 
                  color={isFocused ? "#073318" : "#94A3B8"} 
                />
              </View>
              <Text 
                numberOfLines={1}
                className={`text-[10px] text-center tracking-tight ${
                  isFocused ? 'font-black text-[#073318]' : 'font-bold text-slate-400'
                }`}
              >
                {displayLabel}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const DeliveryRedirectScreen = ({ navigation }: any) => {
  React.useEffect(() => {
    navigation.replace('AcceptedOrders', { initialTab: 'delivery' });
  }, [navigation]);
  return null;
};

const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();

function OrdersStackNavigator() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrdersOverview" component={OrdersOverviewScreen} />
      <OrdersStack.Screen name="IncomingOrders" component={IncomingOrdersScreen} options={{ gestureEnabled: false }} />
      <OrdersStack.Screen name="AcceptedOrders" component={AcceptedOrdersScreen} options={{ animation: 'none', gestureEnabled: false }} />
      <OrdersStack.Screen name="RejectedOrders" component={RejectedOrdersScreen} />
      <OrdersStack.Screen name="Delivery" component={DeliveryRedirectScreen} options={{ animation: 'none', gestureEnabled: false }} />
      <OrdersStack.Screen name="CompletedOrders" component={CompletedOrdersScreen} />
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
      <Tab.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <Tab.Screen name="Earning" component={PlaceholderScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
