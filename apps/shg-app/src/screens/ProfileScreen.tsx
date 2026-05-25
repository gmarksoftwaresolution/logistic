import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SharedHeader } from '../components/SharedHeader';
import { useUser } from '../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState(true);

  const ActionRow = ({ icon, title, subtitle, onPress }: { icon: any, title: string, subtitle?: string, onPress?: () => void }) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center bg-white py-3 px-4 mb-1"
    >
      <View className="w-10 h-10 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-[#1E293B] text-sm">{title}</Text>
        {subtitle && <Text className="text-xs text-[#64748B] mt-0.5">{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <SharedHeader title="Profile" subtitle="Manage your account details" navigation={navigation} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Card Section */}
        <View className="bg-white px-6 pt-6 pb-6 rounded-b-[40px] shadow-sm relative overflow-hidden mb-6">
          {/* Subtle curved background decoration */}
          <View className="absolute top-0 left-0 right-0 h-32 bg-[#EEF5F0] rounded-b-[100px]" style={{ transform: [{ scaleX: 1.5 }] }} />
          
          <View className="items-center z-10 pt-4">
            <View className="relative">
              <View className="w-24 h-24 bg-white rounded-full items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} className="w-full h-full" />
                ) : (
                  <Text className="text-[#073318] font-bold text-3xl">{user?.name?.charAt(0) || 'U'}</Text>
                )}
              </View>
              <TouchableOpacity className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-gray-100 items-center justify-center shadow-sm">
                <Feather name="camera" size={14} color="#073318" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mt-3">
              <Text className="text-xl font-bold text-[#1E293B]">{user?.name || 'User'}</Text>
              <View className="flex-row items-center bg-[#EEF5F0] px-2 py-0.5 rounded-full ml-2">
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text className="text-[10px] text-[#16A34A] font-bold ml-1">Verified</Text>
              </View>
            </View>
            
            <Text className="text-sm text-[#64748B] mt-1">+91 {user?.mobile || '----------'}</Text>
            <Text className="text-sm text-[#64748B]">{user?.name?.toLowerCase().replace(' ', '.')}@gmail.com</Text>

            <View className="bg-[#F8FAFC] w-full rounded-2xl p-4 mt-6 flex-row items-center border border-gray-100">
              <MaterialCommunityIcons name="moped-electric" size={24} color="#073318" className="mr-3" />
              <Text className="flex-1 text-sm text-[#475569] font-medium leading-5 ml-3">
                Delivering to make life easier, one order at a time.
              </Text>
            </View>
          </View>
        </View>

        {/* Statistics Card */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-3xl p-5 flex-row justify-between shadow-sm border border-gray-50">
            <View className="items-center flex-1">
              <Ionicons name="bag-handle" size={24} color="#16A34A" />
              <Text className="text-xl font-bold text-[#1E293B] mt-2">128</Text>
              <Text className="text-xs text-[#64748B] text-center mt-1">Orders{'\n'}Completed</Text>
            </View>
            <View className="w-[1px] bg-gray-100 my-2" />
            <View className="items-center flex-1">
              <Ionicons name="star" size={24} color="#FBBF24" />
              <Text className="text-xl font-bold text-[#1E293B] mt-2">4.9</Text>
              <Text className="text-xs text-[#64748B] text-center mt-1">Rating</Text>
            </View>
            <View className="w-[1px] bg-gray-100 my-2" />
            <View className="items-center flex-1">
              <Ionicons name="time" size={24} color="#16A34A" />
              <Text className="text-xl font-bold text-[#1E293B] mt-2">98%</Text>
              <Text className="text-xs text-[#64748B] text-center mt-1">On-time{'\n'}Delivery</Text>
            </View>
          </View>
        </View>

        {/* Quick Access */}
        <View className="px-6 mb-6">
          <Text className="text-sm font-bold text-[#1E293B] mb-3 ml-1">Quick Access</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 py-2">
            <ActionRow 
              icon={<Ionicons name="bag-handle-outline" size={22} color="#16A34A" />} 
              title="My Orders" subtitle="View your past deliveries" 
              onPress={() => navigation.navigate("Orders")} 
            />
            <ActionRow 
              icon={<Ionicons name="location-outline" size={22} color="#16A34A" />} 
              title="My Addresses" subtitle="Manage saved addresses" 
              onPress={() => navigation.navigate("Address")} 
            />
            <ActionRow 
              icon={<Ionicons name="card-outline" size={22} color="#16A34A" />} 
              title="Payment Methods" subtitle="Cards & wallets" 
            />
            <ActionRow 
              icon={<Ionicons name="cash-outline" size={22} color="#16A34A" />} 
              title="Earnings" subtitle="View your earnings & stats" 
            />
            <ActionRow 
              icon={<Ionicons name="gift-outline" size={22} color="#16A34A" />} 
              title="Refer & Earn" subtitle="Invite friends and earn rewards" 
            />
            <ActionRow 
              icon={<Ionicons name="settings-outline" size={22} color="#16A34A" />} 
              title="Settings" subtitle="Manage your app preferences" 
              onPress={() => navigation.navigate("Settings")} 
            />
          </View>
        </View>

        {/* Online Toggle */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex-row items-center">
            <View className="w-10 h-10 items-center justify-center mr-3">
              <MaterialCommunityIcons name="clock-check-outline" size={24} color="#16A34A" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-[#1E293B] text-sm">Go Online</Text>
              <Text className="text-xs text-[#64748B] mt-0.5">Start receiving delivery requests</Text>
            </View>
            <Switch
              trackColor={{ false: "#E2E8F0", true: "#16A34A" }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor="#E2E8F0"
              onValueChange={setIsOnline}
              value={isOnline}
            />
          </View>
        </View>

        {/* Additional Links */}
        <View className="px-6 mb-8">
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 py-2">
            <ActionRow 
              icon={<Ionicons name="help-circle-outline" size={22} color="#16A34A" />} 
              title="Help & Support" subtitle="Get help and contact support" 
              onPress={() => navigation.navigate("Help")} 
            />
            <ActionRow 
              icon={<Ionicons name="information-circle-outline" size={22} color="#16A34A" />} 
              title="About Us" subtitle="Learn more about our service" 
            />
          </View>
        </View>

        {/* Logout */}
        <View className="px-6 mb-12">
          <TouchableOpacity className="bg-red-50 py-4 rounded-2xl flex-row justify-center items-center">
            <Ionicons name="log-out-outline" size={20} color="#EF4444" className="mr-2" />
            <Text className="text-[#EF4444] font-bold text-base ml-2">Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
