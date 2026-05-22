import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Animated } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface TabItemProps {
  Icon: LucideIcon;
  label: string;
  focused: boolean;
  onPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ Icon, label, focused, onPress }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
  }, [focused]);

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const labelOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const labelTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const bgScale = animatedValue;
  const bgOpacity = animatedValue;

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Animated.View 
        style={[
          styles.background, 
          { 
            opacity: bgOpacity,
            transform: [{ scale: bgScale }] 
          }
        ]} 
      />
      <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
        <Icon 
          size={22} 
          color={focused ? Colors.primary : '#94A3B8'} 
          strokeWidth={focused ? 2.5 : 2}
        />
      </Animated.View>
      <Animated.Text 
        style={[
          styles.label, 
          { 
            opacity: labelOpacity,
            transform: [{ translateY: labelTranslateY }],
            color: Colors.primary 
          }
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
  },
  background: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECFDF3',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    position: 'absolute',
    bottom: -12,
  },
});

export default TabItem;
