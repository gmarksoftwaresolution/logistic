import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';

const DOT_COUNT = 6;
const DOT_SIZE = 14;
const RING_RADIUS = 35;

export const DashboardLoader: React.FC<{ t?: any }> = ({ t }) => {
  const rotation = useSharedValue(0);
  const route = useRoute();

  const getLoadingText = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return { title: 'Loading Home', subtitle: 'Fetching latest updates...' };
      case 'OrderManagement':
      case 'OrderManagement':
        return { title: 'Loading Order Management', subtitle: 'Fetching latest orders...' };
      case 'IncomingOrders':
        return { title: 'Loading New Orders', subtitle: 'Fetching incoming requests...' };
      case 'AcceptedOrders':
        return { title: 'Loading Accepted Orders', subtitle: 'Fetching accepted orders...' };
      case 'RejectedOrders':
        return { title: 'Loading Rejected Orders', subtitle: 'Fetching rejected orders...' };
      case 'OrderHistory':
        return { title: 'Loading Order History', subtitle: 'Fetching past orders...' };
      case 'DeliveryDetails':
        return { title: 'Loading Delivery Details', subtitle: 'Fetching order information...' };
      case 'CollectionDetails':
        return { title: 'Loading Collection Details', subtitle: 'Fetching collection information...' };
      case 'Earnings':
        return { title: 'Loading Earnings', subtitle: 'Fetching earnings data...' };
      case 'Profile':
        return { title: 'Loading Profile', subtitle: 'Fetching profile information...' };
      case 'Settings':
        return { title: 'Loading Settings', subtitle: 'Fetching preferences...' };
      default:
        // Fallback that elegantly parses camelCase route names
        const formattedName = routeName.replace(/([A-Z])/g, ' $1').trim();
        return { title: `Loading ${formattedName}`, subtitle: 'Fetching data...' };
    }
  };

  const { title, subtitle } = getLoadingText(route.name);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(400)}
      style={StyleSheet.absoluteFillObject}
      className="z-50 items-center justify-center"
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />

      <View className="items-center justify-center">
        {/* Animated Ring */}
        <View style={{ width: RING_RADIUS * 2 + DOT_SIZE, height: RING_RADIUS * 2 + DOT_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[animatedStyle, { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }]}>
            {Array.from({ length: DOT_COUNT }).map((_, index) => {
              const angle = (index * 360) / DOT_COUNT;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * RING_RADIUS;
              const y = Math.sin(rad) * RING_RADIUS;

              // Rainbow colors
              const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6'];
              const color = colors[index % colors.length];

              return (
                <View
                  key={index}
                  style={{
                    position: 'absolute',
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: DOT_SIZE / 2,
                    backgroundColor: color,
                    transform: [{ translateX: x }, { translateY: y }],
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                />
              );
            })}
          </Animated.View>
        </View>

        {/* Text */}
        <View className="mt-8 items-center">
          <Text className="text-white font-extrabold text-[18px] tracking-wide mb-1.5" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
            {t ? t(`loading_title_${route.name}`, title) : title}
          </Text>
          <Text className="text-gray-300 font-medium text-[13px] tracking-wider">
            {t ? t(`loading_subtitle_${route.name}`, subtitle) : subtitle}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};
