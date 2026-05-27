import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StepId = 
  | 'dashboard_tab'
  | 'orders_tab'
  | 'incoming_orders_card'
  | 'select_order_card'
  | 'accept_selected_button'
  | 'accepted_orders_card'
  | 'select_accepted_order_card'
  | 'capture_photos_button'
  | 'submit_order_button'
  | 'select_delivery_order_card'
  | 'scan_products_button'
  | 'submit_delivery_button'
  | 'completed_orders_card'
  | 'select_completed_order_card'
  | 'completed_details_close'
  | 'earning_tab'
  | 'profile_tab';

export interface StepConfig {
  id: StepId;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: StepConfig[] = [
  { id: 'dashboard_tab', title: 'Home Dashboard', description: 'Check your daily delivery status, notifications, and quick stats.' },
  { id: 'orders_tab', title: 'Order Management', description: 'Tap here to view and manage incoming, accepted, and completed orders.' },
  { id: 'incoming_orders_card', title: 'New Orders', description: 'Tap here to review and accept incoming delivery requests from transporters.' },
  { id: 'select_order_card', title: 'Select Order', description: 'Tap on the order card to select it manually.' },
  { id: 'accept_selected_button', title: 'Accept Order', description: 'Tap here to accept the selected order.' },
  { id: 'accepted_orders_card', title: 'Accepted Orders', description: 'Tap here to view and process your accepted delivery orders.' },
  { id: 'select_accepted_order_card', title: 'Select Accepted Order', description: 'Tap on the accepted order card to see its full collection details.' },
  { id: 'capture_photos_button', title: 'Verify Products', description: 'Tap here to capture photos of the products for collection verification.' },
  { id: 'submit_order_button', title: 'Submit Order', description: 'Tap here to submit the verified order and complete the collection phase.' },
  { id: 'select_delivery_order_card', title: 'Select Delivery Order', description: 'Tap on the delivery order card to see its full destination and scanner details.' },
  { id: 'scan_products_button', title: 'Scan Products', description: 'Tap here to open the scanner and verify the barcodes on the products for drop-off.' },
  { id: 'submit_delivery_button', title: 'Complete Delivery', description: 'Tap here to submit the verified drop-off and complete this delivery transport!' },
  { id: 'completed_orders_card', title: 'Completed Transports', description: 'Tap here to view the list of all your successfully completed delivery transports.' },
  { id: 'select_completed_order_card', title: 'Select Completed Order', description: 'Tap on the completed order card to see its full delivery verification summary and details.' },
  { id: 'completed_details_close', title: 'Delivery Summary', description: 'Review your successfully uploaded delivery proof photos and recipient details. Tap here to finish the guide!' },
];

export interface MeasuredLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OnboardingContextProps {
  isActive: boolean;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  currentStepIndex: number;
  currentStep: StepConfig | null;
  targetLayout: MeasuredLayout | null;
  startOnboarding: () => void;
  nextStep: () => void;
  skipOnboarding: () => void;
  registerStepLayout: (stepId: StepId, layout: MeasuredLayout | null) => void;
  checkFirstLaunch: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextProps | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetLayout, setTargetLayout] = useState<MeasuredLayout | null>(null);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('HAS_COMPLETED_ONBOARDING');
      if (!hasLaunched) {
        setTimeout(() => setIsActive(true), 1000); //snappy, load slightly after layout mounts
      }
    } catch (e) {
      console.warn('Onboarding storage error:', e);
    }
  };

  const startOnboarding = () => {
    setCurrentStepIndex(0);
    setTargetLayout(null);
    setIsPaused(false);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setTargetLayout(null);
    } else {
      skipOnboarding();
    }
  };

  const skipOnboarding = async () => {
    setIsActive(false);
    setIsPaused(false);
    try {
      await AsyncStorage.setItem('HAS_COMPLETED_ONBOARDING', 'true');
    } catch (e) {
      console.warn('Onboarding storage error:', e);
    }
  };

  const registerStepLayout = (stepId: StepId, layout: MeasuredLayout | null) => {
    if (isActive && ONBOARDING_STEPS[currentStepIndex].id === stepId) {
      if (layout === null) {
        setTargetLayout(null);
        return;
      }
      const roundedLayout = {
        x: Math.round(layout.x),
        y: Math.round(layout.y),
        width: Math.round(layout.width),
        height: Math.round(layout.height),
      };

      setTargetLayout(prev => {
        if (
          prev &&
          prev.x === roundedLayout.x &&
          prev.y === roundedLayout.y &&
          prev.width === roundedLayout.width &&
          prev.height === roundedLayout.height
        ) {
          return prev;
        }
        return roundedLayout;
      });
    }
  };

  const currentStep = isActive ? ONBOARDING_STEPS[currentStepIndex] : null;

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        isPaused,
        setIsPaused,
        currentStepIndex,
        currentStep,
        targetLayout,
        startOnboarding,
        nextStep,
        skipOnboarding,
        registerStepLayout,
        checkFirstLaunch,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
