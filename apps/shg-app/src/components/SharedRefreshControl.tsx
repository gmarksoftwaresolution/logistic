import React from 'react';
import { RefreshControl, RefreshControlProps, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';

export const SharedRefreshControl: React.FC<RefreshControlProps> = (props) => {
  const route = useRoute();
  const routeName = route?.name || '';
  
  // Screens where the ScrollView starts at the very top of the screen (Y=0)
  const headerInsideScreens = [
    'Dashboard', 
    'OrderManagement', 
    'Earnings', 
    'OrderHistory', 
    'Profile'
  ];
  
  // Determine offset to ensure identical absolute Y-position globally.
  // 90px places it perfectly below the header for 'headerInsideScreens'.
  // 10px places it perfectly at the same absolute position for others.
  const isHeaderInside = headerInsideScreens.includes(routeName);
  const offset = isHeaderInside ? 90 : 10;

  return (
    <RefreshControl
      colors={['#073318']}
      tintColor="#073318"
      progressViewOffset={Platform.OS === 'android' ? offset : 0}
      {...props}
    />
  );
};
