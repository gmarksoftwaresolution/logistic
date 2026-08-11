import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, Text, View, Alert } from 'react-native';
import { QrCode } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScanSession } from '../../context/ScanSessionContext';
import { FloatingScannerButtonProps } from './FloatingScannerButton.types';
import { styles } from './FloatingScannerButton.styles';
import { verticalScale } from '../../utils/responsive';

export const FloatingScannerButton: React.FC<FloatingScannerButtonProps> = ({
  module,
  orderIds,
  navigation,
}) => {
  const { activePickupSession } = useScanSession();
  const activeSession = activePickupSession;
  const insets = useSafeAreaInsets();

  // Tab Bar height = verticalScale(76) + Math.max(insets.bottom, verticalScale(16)) + verticalScale(14)
  const tabBarHeight = verticalScale(76) + Math.max(insets.bottom, verticalScale(16)) + verticalScale(14);
  const fabBottomOffset = tabBarHeight + verticalScale(18);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (activeSession) {
        navigation.navigate('PickupScanner', { sessionId: activeSession.sessionId, orderIds });
      } else {
        if (!orderIds || orderIds.length === 0) {
          Alert.alert('No Orders', `There are no active ${module.toLowerCase()} orders to scan.`);
          return;
        }
        navigation.navigate('PickupScanner', { orderIds });
      }
    });
  };

  const hasActiveSession = activeSession && activeSession.sessionType === 'PICKUP';
  const badgeText = hasActiveSession
    ? `${activeSession.totalScanned}/${activeSession.totalExpected}`
    : null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: fabBottomOffset,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityLabel={`Open ${module} QR Scanner`}
        accessibilityRole="button"
      >
        <QrCode size={26} color="#FFFFFF" />
        {badgeText && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
export default FloatingScannerButton;
