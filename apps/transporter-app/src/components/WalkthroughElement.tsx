import React, { useRef, useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useOnboarding, StepId } from '../context/OnboardingContext';
import { useIsFocused } from '@react-navigation/native';

interface Props {
  stepId: StepId;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const WalkthroughElement: React.FC<Props> = ({ stepId, children, style }) => {
  const { currentStep, isActive, registerStepLayout, nextStep } = useOnboarding();
  const viewRef = useRef<View>(null);
  const isFocused = useIsFocused();

  const handleTouchEnd = () => {
    if (isActive && currentStep?.id === stepId && isFocused) {
      // Small 120ms delay to let the underlying button's native action/transition execute first
      setTimeout(() => {
        nextStep();
      }, 120);
    }
  };

  const measureLayout = () => {
    if (isActive && currentStep?.id === stepId && isFocused && viewRef.current) {
      viewRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          // Add premium spacious padding around target component (8-12px)
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

    if (isActive && currentStep?.id === stepId && isFocused) {
      // Immediate measures during transitions
      timer1 = setTimeout(measureLayout, 80);
      timer2 = setTimeout(measureLayout, 450); // Failsafe for screen animation finishes
      
      // Dynamic layout tracking polling loop (every 300ms)
      // Automatically self-heals coordinate bounds if parents (accordions, lists) expand or scroll!
      intervalId = setInterval(measureLayout, 300);
    }

    return () => {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, currentStep, stepId, isFocused]);

  return (
    <View 
      ref={viewRef} 
      style={style} 
      onLayout={measureLayout} 
      collapsable={false}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </View>
  );
};

export default WalkthroughElement;
