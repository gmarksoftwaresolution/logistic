import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Animated, DeviceEventEmitter } from 'react-native';
import { LayoutDashboard, Briefcase, Truck, History, LucideIcon } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale, moderateScale, SCREEN_WIDTH } from '../utils/responsive';
import WalkthroughElement from './WalkthroughElement';

// Premium Design Constants
const BAR_WIDTH = SCREEN_WIDTH - scale(24); // Increased width
const TAB_BAR_HEIGHT = verticalScale(76); // Spacious height
const INDICATOR_WIDTH = scale(40);

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const totalTabs = state.routes.length;
  const tabWidth = BAR_WIDTH / totalTabs;
  
  const animationValue = useRef(new Animated.Value(state.index)).current;
  const tabTabBarTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animationValue, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 20,
      stiffness: 120,
      mass: 0.8,
    }).start();

    // Reset tab bar visibility to visible when switching tabs
    Animated.spring(tabTabBarTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 120,
    }).start();
  }, [state.index]);

  useEffect(() => {
    const showSubscription = DeviceEventEmitter.addListener('show-tabbar', () => {
      Animated.timing(tabTabBarTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSubscription = DeviceEventEmitter.addListener('hide-tabbar', () => {
      Animated.timing(tabTabBarTranslateY, {
        toValue: TAB_BAR_HEIGHT + verticalScale(60),
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const indicatorX = animationValue.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2),
  });

  return (
    <Animated.View style={[
      styles.outerContainer, 
      { 
        paddingBottom: Math.max(insets.bottom, verticalScale(16)) + verticalScale(14),
        transform: [{ translateY: tabTabBarTranslateY }]
      }
    ]}>
      <View style={styles.bar}>
        {/* Sliding Indicator Bar (Top or Bottom) */}
        <Animated.View 
          style={[
            styles.indicator, 
            { 
              transform: [{ translateX: indicatorX }],
            }
          ]} 
        />

        <View style={styles.content}>
          {state.routes.map((route, index) => {
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

            let Icon: LucideIcon;
            let labelKey = '';
            
            switch (route.name) {
              case 'Home': Icon = LayoutDashboard; labelKey = 'tabs.home'; break;

              case 'Order Management': Icon = Truck; labelKey = 'tabs.orderMgmt'; break;
              case 'Order History': Icon = History; labelKey = 'tabs.history'; break;
              default: Icon = LayoutDashboard; labelKey = route.name;
            }

            const tabContent = (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.7}
                style={styles.tabItem}
              >
                {route.name === 'Order Management' ? (
                  <WalkthroughElement stepId="order_management_tab" style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(8), paddingVertical: verticalScale(4) }}>
                    <Animated.View 
                      style={{ 
                        transform: [{ scale: isFocused ? 1.1 : 1 }],
                      }}
                    >
                      <Icon 
                        color={isFocused ? Colors.primary : '#94A3B8'} 
                        size={scale(24)} 
                        strokeWidth={isFocused ? 2.5 : 2} 
                      />
                    </Animated.View>
                    <Text style={[
                      styles.labelText, 
                      { 
                        color: isFocused ? Colors.primary : '#94A3B8',
                        fontWeight: isFocused ? '700' : '600'
                      }
                    ]}>
                      {t(labelKey)}
                    </Text>
                  </WalkthroughElement>
                ) : route.name === 'Order History' ? (
                  <WalkthroughElement stepId="order_history_tab" style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(8), paddingVertical: verticalScale(4) }}>
                    <Animated.View 
                      style={{ 
                        transform: [{ scale: isFocused ? 1.1 : 1 }],
                      }}
                    >
                      <Icon 
                        color={isFocused ? Colors.primary : '#94A3B8'} 
                        size={scale(24)} 
                        strokeWidth={isFocused ? 2.5 : 2} 
                      />
                    </Animated.View>
                    <Text style={[
                      styles.labelText, 
                      { 
                        color: isFocused ? Colors.primary : '#94A3B8',
                        fontWeight: isFocused ? '700' : '600'
                      }
                    ]}>
                      {t(labelKey)}
                    </Text>
                  </WalkthroughElement>
                ) : (
                  <>
                    <Animated.View 
                      style={{ 
                        transform: [{ scale: isFocused ? 1.1 : 1 }],
                      }}
                    >
                      <Icon 
                        color={isFocused ? Colors.primary : '#94A3B8'} 
                        size={scale(24)} 
                        strokeWidth={isFocused ? 2.5 : 2} 
                      />
                    </Animated.View>
                    <Text style={[
                      styles.labelText, 
                      { 
                        color: isFocused ? Colors.primary : '#94A3B8',
                        fontWeight: isFocused ? '700' : '600'
                      }
                    ]}>
                      {t(labelKey)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );

            return tabContent;
          })}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    backgroundColor: '#FFFFFF',
    height: TAB_BAR_HEIGHT,
    borderRadius: scale(100),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'column',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(8) },
        shadowOpacity: 0.12,
        shadowRadius: scale(16),
      },
      android: {
        elevation: moderateScale(12),
      },
    }),
  },
  indicator: {
    position: 'absolute',
    top: 0, // Top-mounted indicator for a modern look
    height: verticalScale(4),
    width: INDICATOR_WIDTH,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: scale(4),
    borderBottomRightRadius: scale(4),
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(2),
  },
  labelText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    marginTop: verticalScale(2),
    letterSpacing: moderateScale(0.2),
    textAlign: 'center',
  },
});

export default CustomTabBar;
