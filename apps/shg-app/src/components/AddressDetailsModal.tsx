import React, { useContext } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';

interface AddressDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  orderIdText: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: string | number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AddressDetailsModal: React.FC<AddressDetailsModalProps> = ({
  visible,
  onClose,
  orderIdText,
  pickupAddress,
  deliveryAddress,
  distance,
}) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (key: string) => key;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Dim Overlay */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' }}>
        
        {/* Modal Container */}
        <View 
          style={{ 
            width: SCREEN_WIDTH * 0.9, 
            backgroundColor: 'white', 
            borderRadius: 24, 
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827' }}>
              {t("address_details") || "Address Details"}
            </Text>
            <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#475569' }}>
                #{orderIdText}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#E2E8F0', marginBottom: 20 }} />

          {/* Pickup Address */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                <Ionicons name="cube" size={12} color="#3B82F6" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155' }}>
                {t("pickup_address") || "Pickup Address"}
              </Text>
            </View>
            <Text style={{ fontSize: 15, color: '#0F172A', lineHeight: 22, paddingLeft: 32 }}>
              {pickupAddress || "N/A"}
            </Text>
          </View>

          {/* Delivery Address */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                <Ionicons name="location" size={12} color="#EF4444" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155' }}>
                {t("delivery_address") || "Delivery Address"}
              </Text>
            </View>
            <Text style={{ fontSize: 15, color: '#0F172A', lineHeight: 22, paddingLeft: 32 }}>
              {deliveryAddress || "N/A"}
            </Text>
          </View>

          {/* Distance */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#475569' }}>
              {t("total_distance") || "Distance"}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="navigate" size={16} color="#073318" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#073318' }}>
                {distance} {t("km") || "km"}
              </Text>
            </View>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity 
            onPress={onClose}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#F1F5F9',
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#334155' }}>
              {t("su_cancel_357") || "Cancel"}
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};
