import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <View className="flex-row items-center justify-center px-4 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;

        return (
          <React.Fragment key={index}>
            <View 
              className={`w-9 h-9 rounded-full items-center justify-center border-2 ${
                isCompleted 
                  ? 'bg-[#073318] border-[#073318]' 
                  : isActive 
                    ? 'bg-white border-[#073318]' 
                    : 'bg-[#F3F4F6] border-gray-200'
              }`}
              style={{
                shadowColor: isActive ? "#073318" : "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.3 : 0.05,
                shadowRadius: 3,
                elevation: isActive ? 4 : 0,
              }}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : (
                <Text 
                  className={`text-[13px] font-black ${
                    isActive ? 'text-[#073318]' : 'text-gray-400'
                  }`}
                >
                  {stepNum}
                </Text>
              )}
            </View>
            {index < totalSteps - 1 && (
              <View 
                className={`flex-1 h-[3px] mx-2 rounded-full ${
                  isCompleted ? 'bg-[#073318]' : 'bg-[#E5E7EB]'
                }`} 
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

export default StepIndicator;
