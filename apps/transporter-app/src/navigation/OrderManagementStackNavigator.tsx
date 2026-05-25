import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OrderManagementMainScreen from '../screens/OrderManagement/OrderManagementMainScreen';
import CategoryOrdersScreen from '../screens/OrderManagement/CategoryOrdersScreen';
import AcceptedOrdersScreen from '../screens/OrderManagement/AcceptedOrdersScreen';
import OrderBatchRejectedScreen from '../screens/OrderManagement/OrderBatchRejectedScreen';
import OrderBatchCompletedScreen from '../screens/OrderManagement/OrderBatchCompletedScreen';
import OrderBatchPickupDetailScreen from '../screens/OrderManagement/OrderBatchPickupDetailScreen';
import CameraCaptureScreen from '../screens/OrderManagement/CameraCaptureScreen';
import ActivityOrderDetailScreen from '../screens/OrderManagement/ActivityOrderDetailScreen';

// Legacy components fallback import
import GmuDetailScreen from '../screens/OrderManagement/GmuDetailScreen';
import AreaShgListScreen from '../screens/OrderManagement/AreaShgListScreen';
import ShgDetailScreen from '../screens/OrderManagement/ShgDetailScreen';

export type OrderManagementStackParamList = {
  OrderManagementMain: undefined;
  CategoryOrders: { category: 'new' | 'accepted' | 'rejected' | 'completed' };
  AcceptedOrders: undefined;
  OrderBatchRejected: undefined;
  OrderBatchCompleted: undefined;
  OrderBatchPickupDetail: { batchId: string };
  CameraCapture: { batchId: string; productId: string; context: 'pickup' | 'drop'; productName: string; shgId?: string };
  ActivityOrderDetail: { batchId: string };
  
  // legacy backwards safety parameter map
  GmuDetail: undefined;
  AreaShgList: { routeId: string; areaName: string };
  ShgDetail: { shgId: string; shgName: string };
};

const Stack = createNativeStackNavigator<OrderManagementStackParamList>();

const OrderManagementStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="OrderManagementMain">
      <Stack.Screen name="OrderManagementMain" component={OrderManagementMainScreen} />
      <Stack.Screen name="CategoryOrders" component={CategoryOrdersScreen} />
      <Stack.Screen name="AcceptedOrders" component={AcceptedOrdersScreen} />
      <Stack.Screen name="OrderBatchRejected" component={OrderBatchRejectedScreen} />
      <Stack.Screen name="OrderBatchCompleted" component={OrderBatchCompletedScreen} />
      <Stack.Screen name="OrderBatchPickupDetail" component={OrderBatchPickupDetailScreen} />
      <Stack.Screen 
        name="ActivityOrderDetail" 
        component={ActivityOrderDetailScreen} 
        options={{ 
          presentation: 'transparentModal',
          animation: 'slide_from_bottom' 
        }} 
      />
      <Stack.Screen 
        name="CameraCapture" 
        component={CameraCaptureScreen} 
        options={{ 
          presentation: 'fullScreenModal',
          animation: 'fade' 
        }} 
      />
      
      {/* Legacy registered bindings to keep older folders from unused breakages */}
      <Stack.Screen name="GmuDetail" component={GmuDetailScreen} />
      <Stack.Screen name="AreaShgList" component={AreaShgListScreen} />
      <Stack.Screen name="ShgDetail" component={ShgDetailScreen} />
    </Stack.Navigator>
  );
};

export default OrderManagementStackNavigator;
