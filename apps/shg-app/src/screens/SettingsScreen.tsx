import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useUser } from '../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { user } = useUser();
  const [lockApp, setLockApp] = useState(true);

  const SectionHeader = ({ title }: { title: string }) => (
    <Text className="text-xs font-bold text-[#64748B] mb-2 ml-1 mt-4">{title}</Text>
  );

  const SettingRow = ({ icon, title, subtitle, rightElement, onPress }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      disabled={!onPress && !rightElement}
      className="flex-row items-center bg-white py-4 px-4 border-b border-gray-50"
    >
      <View className="w-8 h-8 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-[#1E293B] text-[15px]">{title}</Text>
        {subtitle && <Text className="text-[11px] text-[#64748B] mt-0.5">{subtitle}</Text>}
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
    </TouchableOpacity>
  );

  const renderCard = (children: React.ReactNode) => (
    <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 mb-4">
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-50 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 w-10 h-10 items-center justify-center bg-[#F8FAFC] rounded-full">
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-[#1E293B] tracking-tight">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        
        <SectionHeader title="Account" />
        {renderCard(
          <>
            <SettingRow 
              icon={<Ionicons name="person-outline" size={20} color="#16A34A" />} 
              title="Personal Details" subtitle="Update your personal info" 
              onPress={() => navigation.navigate("PersonalDetails")} 
            />
            <SettingRow 
              icon={<Ionicons name="call-outline" size={20} color="#16A34A" />} 
              title="Profile Settings" subtitle={user?.mobile ? `+91 ${user.mobile}` : "Not provided"} 
            />
            <SettingRow 
              icon={<Ionicons name="lock-closed-outline" size={20} color="#16A34A" />} 
              title="Change Password" subtitle="Update your password" 
            />
            <SettingRow 
              icon={<Ionicons name="notifications-outline" size={20} color="#16A34A" />} 
              title="Manage Session" subtitle="Check your active sessions" 
            />
          </>
        )}

        <SectionHeader title="Preferences" />
        {renderCard(
          <>
            <SettingRow 
              icon={<Ionicons name="calendar-outline" size={20} color="#16A34A" />} 
              title="Notification" subtitle="Manage notification preferences" 
            />
            <SettingRow 
              icon={<Ionicons name="globe-outline" size={20} color="#16A34A" />} 
              title="Language" 
              rightElement={
                <View className="flex-row items-center">
                  <Text className="text-xs text-[#64748B] mr-2">English</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>
              }
            />
            <SettingRow 
              icon={<Ionicons name="sunny-outline" size={20} color="#16A34A" />} 
              title="App Theme" 
              rightElement={
                <View className="flex-row items-center">
                  <Text className="text-xs text-[#64748B] mr-2">Light</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>
              }
            />
          </>
        )}

        <SectionHeader title="Privacy & Security" />
        {renderCard(
          <>
            <SettingRow 
              icon={<Ionicons name="shield-checkmark-outline" size={20} color="#16A34A" />} 
              title="Privacy Policy" subtitle="View our privacy policy" 
              onPress={() => navigation.navigate("Privacy")} 
            />
            <SettingRow 
              icon={<Ionicons name="lock-closed-outline" size={20} color="#16A34A" />} 
              title="Lock App on Logout" subtitle="Automatically lock the app" 
              rightElement={
                <Switch
                  trackColor={{ false: "#E2E8F0", true: "#16A34A" }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor="#E2E8F0"
                  onValueChange={setLockApp}
                  value={lockApp}
                />
              }
            />
            <SettingRow 
              icon={<Ionicons name="finger-print-outline" size={20} color="#16A34A" />} 
              title="Two-Factor Authentication" subtitle="Add extra layer of security" 
              rightElement={
                <View className="flex-row items-center">
                  <Text className="text-xs text-[#64748B] mr-2">Off</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>
              }
            />
            <SettingRow 
              icon={<Ionicons name="trash-outline" size={20} color="#16A34A" />} 
              title="Delete Account" subtitle="Permanently delete your account" 
            />
          </>
        )}

        <SectionHeader title="Support" />
        {renderCard(
          <>
            <SettingRow 
              icon={<Ionicons name="headset-outline" size={20} color="#16A34A" />} 
              title="Help Center" subtitle="Get help and support" 
              onPress={() => navigation.navigate("Help")} 
            />
            <SettingRow 
              icon={<Ionicons name="chatbubble-ellipses-outline" size={20} color="#16A34A" />} 
              title="Contact Support" subtitle="We're here to help you" 
            />
          </>
        )}

        <SectionHeader title="About" />
        {renderCard(
          <>
            <SettingRow 
              icon={<Ionicons name="star-outline" size={20} color="#16A34A" />} 
              title="Rate Us" subtitle="Share your experience" 
              rightElement={
                <View className="flex-row items-center">
                  <Text className="text-xs text-[#64748B] mr-2">Version 2.1.0</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>
              }
            />
            <SettingRow 
              icon={<Ionicons name="document-text-outline" size={20} color="#16A34A" />} 
              title="Terms & Conditions" subtitle="Read our terms and conditions" 
              onPress={() => navigation.navigate("Terms")} 
            />
            <SettingRow 
              icon={<Ionicons name="information-circle-outline" size={20} color="#16A34A" />} 
              title="About App" subtitle="Learn more about our app" 
            />
          </>
        )}

        {/* Logout */}
        <View className="mb-12 mt-4">
          <TouchableOpacity className="bg-red-50 py-4 rounded-2xl flex-row justify-center items-center">
            <Ionicons name="log-out-outline" size={20} color="#EF4444" className="mr-2" />
            <Text className="text-[#EF4444] font-bold text-base ml-2">Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
