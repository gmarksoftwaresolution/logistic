import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StepId = 
  | 'order_management_tab'
  | 'assigned_orders_card'
  | 'accept_task'
  | 'navigation_map'
  | 'upload_proof'
  | 'navigation_map_drop'
  | 'upload_proof_drop'
  | 'order_history_tab'
  | 'recent_delivered_order';

export interface StepConfig {
  id: StepId;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: StepConfig[] = [
  { id: 'order_management_tab', title: 'Open Order Management', description: 'Tap here to view your assigned transport tasks.' },
  { id: 'assigned_orders_card', title: 'View Assigned Orders', description: 'Check all the pickups and deliveries assigned to you.' },
  { id: 'accept_task', title: 'Accept Task', description: 'Accept a task to start your pickup or delivery process.' },
  { id: 'navigation_map', title: 'Pickup Navigation', description: 'Tap navigation to reach the SHG pickup location.' },
  { id: 'upload_proof', title: 'Collect & Proof', description: 'Verify items and upload product photo to finish pickup.' },
  { id: 'navigation_map_drop', title: 'Delivery Navigation', description: 'Use dynamic navigation to reach the drop-off GMU Hub.' },
  { id: 'upload_proof_drop', title: 'Deliver & Complete', description: 'Upload delivery proof to complete the entire transport task!' },
  { id: 'order_history_tab', title: 'Order History', description: 'View your completed routes, batch history and trip summaries.' },
  { id: 'recent_delivered_order', title: 'Recent Delivered Order', description: 'Select a recent delivery to view verified photos, itemized lists and weight summaries.' },
];

export interface MeasuredLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OnboardingContextProps {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: StepConfig | null;
  targetLayout: MeasuredLayout | null;
  startOnboarding: () => void;
  nextStep: () => void;
  skipOnboarding: () => void;
  registerStepLayout: (stepId: StepId, layout: MeasuredLayout) => void;
  checkFirstLaunch: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextProps | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetLayout, setTargetLayout] = useState<MeasuredLayout | null>(null);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('HAS_COMPLETED_ONBOARDING');
      if (!hasLaunched) {
        setTimeout(() => setIsActive(true), 200); // Snappy, near-instant load
      }
    } catch (e) {
      console.warn('Onboarding storage error:', e);
    }
  };

  const startOnboarding = () => {
    setCurrentStepIndex(0);
    setTargetLayout(null);
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
    try {
      await AsyncStorage.setItem('HAS_COMPLETED_ONBOARDING', 'true');
    } catch (e) {
      console.warn('Onboarding storage error:', e);
    }
  };

  const registerStepLayout = (stepId: StepId, layout: MeasuredLayout) => {
    if (isActive && ONBOARDING_STEPS[currentStepIndex].id === stepId) {
      // Round all values to prevent sub-pixel layout jitter (floats vs integers)
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
          return prev; // Coordinate is identical -> skip update to avoid re-renders
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
