import React, { useRef, useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useOnboarding, StepId } from '../context/OnboardingContext';

interface Props {
  stepId: StepId;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  autoAdvance?: boolean;
  isFocused?: boolean;
}

const WalkthroughElement: React.FC<Props> = ({ stepId, children, style, autoAdvance = true, isFocused = true }) => {
  const { currentStep, isActive, registerStepLayout, nextStep } = useOnboarding();
  const viewRef = useRef<View>(null);

  const handlePress = (originalOnPress?: () => void) => {
    if (isActive && currentStep?.id === stepId && isFocused && autoAdvance) {
      nextStep();
    }
    if (originalOnPress) {
      originalOnPress();
    }
  };

  const measureLayout = () => {
    if (isActive && currentStep?.id === stepId && isFocused && viewRef.current) {
      viewRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          const padding = 10;
          registerStepLayout(stepId, { 
            x: x - padding, 
            y: y - padding, 
            width: width + padding * 2, 
            height: height + padding * 2 
          });
        }
      });
    }
  };

  useEffect(() => {
    let intervalId: any;
    let timer1: any;
    let timer2: any;
    let timer3: any;

    if (isActive && currentStep?.id === stepId && isFocused) {
      measureLayout(); // Synchronous initial measurement
      timer1 = setTimeout(measureLayout, 16);  // 1 frame post-mount
      timer2 = setTimeout(measureLayout, 120); // Transition catch
      timer3 = setTimeout(measureLayout, 350); // Late rendering sync
      intervalId = setInterval(measureLayout, 100); // Snappy 100ms polling
    }

    return () => {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      if (timer3) clearTimeout(timer3);
      if (intervalId) clearInterval(intervalId);
      // Clean up layout on unmount or blur
      if (isActive && currentStep?.id === stepId) {
        registerStepLayout(stepId, null);
      }
    };
  }, [isActive, currentStep, stepId, isFocused]);

  const renderChildren = () => {
    if (React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      const originalOnPress = child.props.onPress || child.props.onPressCard;
      const propName = child.props.onPressCard ? 'onPressCard' : 'onPress';
      return React.cloneElement(child, {
        [propName]: () => handlePress(originalOnPress),
      });
    }
    return children;
  };

  return (
    <View 
      ref={viewRef} 
      style={style} 
      onLayout={measureLayout} 
      collapsable={false}
    >
      {renderChildren()}
    </View>
  );
};

export default WalkthroughElement;
