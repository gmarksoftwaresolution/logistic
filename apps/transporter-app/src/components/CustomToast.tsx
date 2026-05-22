import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../constants/Colors';
import { CheckCircle2 } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface CustomToastProps {
  visible: boolean;
  message: string;
  onHide: () => void;
}

const CustomToast: React.FC<CustomToastProps> = ({ visible, message, onHide }) => {
  const translateY = useRef(new Animated.Value(150)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: -verticalScale(90),
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      const timer = setTimeout(() => {
        hideToast();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.timing(translateY, {
      toValue: 150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onHide());
  };

  if (!visible) return null;

  return (
    <SafeAreaView style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.toast, { transform: [{ translateY }] }]}>
        <View style={styles.iconContainer}>
          <CheckCircle2 size={scale(20)} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    width: '90%',
    gap: scale(12),
  },
  iconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
});

export default CustomToast;
