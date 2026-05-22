import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { CheckCircle2 } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface SuccessFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  message: string;
}

const SuccessFeedbackModal: React.FC<SuccessFeedbackModalProps> = ({ visible, onClose, message }) => {
  const scaleValue = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }).start();

      const timer = setTimeout(() => {
        onClose();
      }, 1800);

      return () => clearTimeout(timer);
    } else {
      scaleValue.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }] }]}>
          <View style={styles.iconBg}>
            <CheckCircle2 size={scale(60)} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Success!</Text>
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(32),
    padding: scale(30),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  iconBg: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(24),
    color: Colors.textPrimary,
    marginBottom: verticalScale(8),
  },
  message: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(15),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: verticalScale(22),
  },
});

export default SuccessFeedbackModal;
