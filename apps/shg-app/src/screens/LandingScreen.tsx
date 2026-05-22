import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions, ImageBackground, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from "../context/LanguageContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';
import { signupService } from '../services/signupService';
import deliveryPartnerImage from '../../assets/images/GMUDeliveryPartner.png';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

export default function LandingScreen({ navigation }: Props) {
  const context = React.useContext(LanguageContext);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
        if (token) {
          try {
            const progressRes = await signupService.getProgress();
            if (progressRes.success) {
              if (progressRes.isCompleted) {
                try {
                  const statusRes = await signupService.getApplicationStatus();
                  if (statusRes.success && statusRes.status === 'APPROVED') {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Main' }],
                    });
                    return;
                  }
                } catch (statusErr) {
                  console.error("Failed to check application status, routing to status screen:", statusErr);
                }
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'ApplicationStatus' }],
                });
                return;
              } else if (progressRes.frontendStep && progressRes.frontendStep >= 3 && progressRes.frontendStep <= 9) {
                // Pre-populate keys for SignupScreen to seamlessly resume
                await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STEP, progressRes.frontendStep.toString());
                await AsyncStorage.setItem(STORAGE_KEYS.SIGNUP_DATA, JSON.stringify({ ...progressRes.signupData }));
                
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Signup' }],
                });
                return;
              }
            }
          } catch (err: any) {
            console.error("Failed to check signup progress on app launch:", err);
            if (err.response?.status === 401) {
              await AsyncStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
              await AsyncStorage.removeItem('user_profile');
            }
          }
        }
      } catch (error) {
        console.error("Failed to read token on app launch:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkUserSession();
  }, [navigation]);

  if (!context) return null;
  const { t } = context;

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: '#073318', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ImageBackground
        source={deliveryPartnerImage}
        className="flex-1"
        resizeMode="cover"
      >
        <View className="flex-1 justify-end px-8 pb-16">
          <TouchableOpacity
            onPress={() => navigation.navigate("Language")}
            className="bg-primary py-4 rounded-2xl border-2 border-white shadow-xl active:opacity-90"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 4.65,
              elevation: 8,
            }}
          >
            <Text className="text-white text-xl font-bold text-center">
              {t('get_started')}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

