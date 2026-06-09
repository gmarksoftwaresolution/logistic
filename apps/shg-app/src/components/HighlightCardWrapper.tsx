import React, { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';

interface HighlightCardWrapperProps {
  isHighlighted?: 'new' | 'updated';
  children: React.ReactElement<any>; // Must be a single React element (e.g. TouchableOpacity or View)
}

export const HighlightCardWrapper: React.FC<HighlightCardWrapperProps> = ({
  isHighlighted,
  children,
}) => {
  const fadeAnim = useRef(new Animated.Value(isHighlighted ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(isHighlighted ? 0.97 : 1)).current;

  useEffect(() => {
    if (isHighlighted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isHighlighted]);

  if (!isHighlighted) {
    return children;
  }

  // Define highlight colors (light blue theme)
  const highlightBg = '#E8F4FF';
  const highlightBorder = '#7EC8FF';
  const badgeBg = '#3B82F6'; // TailWind blue-500
  const badgeText = isHighlighted === 'new' ? 'NEW' : 'UPDATED';

  // Inject styles into the child component (e.g., TouchableOpacity)
  const childStyle = children.props.style || {};
  const modifiedStyle = [
    childStyle,
    {
      backgroundColor: highlightBg,
      borderColor: highlightBorder,
      borderWidth: 1.5,
      // Light blue glow/shadow
      shadowColor: '#7EC8FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
  ];

  const clonedChild = React.cloneElement(children, {
    style: modifiedStyle,
  });

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        position: 'relative', // Ensures absolute badge is positioned relative to the card wrapper
      }}
    >
      {clonedChild}
      
      {/* Floating Badge on Top-Right */}
      <View
        style={{
          position: 'absolute',
          top: 6,
          right: 20,
          backgroundColor: badgeBg,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          zIndex: 9999, // Ensure it sits on top of everything
        }}
      >
        <Text
          style={{
            color: 'white',
            fontSize: 9,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {badgeText}
        </Text>
      </View>
    </Animated.View>
  );
};
