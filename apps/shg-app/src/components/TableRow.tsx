import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLUMN_WIDTHS } from './TableHeader';

interface TableRowProps {
  item: any;
  index: number;
  onActionPress: (item: any) => void;
}

const TableRow: React.FC<TableRowProps> = ({ item, index, onActionPress }) => {
  const handleCall = (mobile: string) => {
    Linking.openURL(`tel:${mobile}`);
  };

  return (
    <View style={[styles.row, index % 2 === 1 && styles.alternateRow]}>
      {/* Sr. No. */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[0] }]}>
        <Text style={styles.cellText}>{index + 1}</Text>
      </View>

      {/* Parcel Photo */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[1] }]}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/679/679821.png' }} 
            style={styles.parcelImage} 
          />
        </View>
      </View>

      {/* Order ID */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[2] }]}>
        <Text style={styles.orderIdText}>{item.orderId}</Text>
      </View>

      {/* Parcel Name */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[3] }]}>
        <Text style={styles.cellText}>{item.parcelName}</Text>
      </View>

      {/* Category */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[4] }]}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>

      {/* Mobile */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[5] }]}>
        <View style={styles.mobileContainer}>
          <Text style={styles.mobileText}>{item.mobile}</Text>
          <TouchableOpacity onPress={() => handleCall(item.mobile)} style={styles.callButton}>
            <MaterialCommunityIcons name="phone" size={14} color="#12B76A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Amount */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[6] }]}>
        <Text style={styles.amountText}>₹{item.amount}</Text>
      </View>

      {/* Payment */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[7] }]}>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: item.payment === 'Online' ? '#ECFDF5' : '#FEF3C7' }
        ]}>
          <View style={[styles.statusDot, { backgroundColor: item.payment === 'Online' ? '#10B981' : '#F59E0B' }]} />
          <Text style={[
            styles.statusBadgeText, 
            { color: item.payment === 'Online' ? '#065F46' : '#92400E' }
          ]}>
            {item.payment}
          </Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[8] }]}>
        <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
      </View>

      {/* Delivery Day */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[9] }]}>
        <View style={styles.dayBadge}>
          <MaterialCommunityIcons name="clock-outline" size={12} color="#6C737F" />
          <Text style={styles.dayText}>{item.deliveryDay}</Text>
        </View>
      </View>

      {/* Action */}
      <View style={[styles.cell, { width: COLUMN_WIDTHS[10] }]}>
        <TouchableOpacity 
          onPress={() => onActionPress(item)}
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="dots-vertical" size={18} color="#6C737F" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingVertical: 14,
    alignItems: 'center',
  },
  alternateRow: {
    backgroundColor: '#FAFBFC',
  },
  cell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: '#181D27',
  },
  orderIdText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 13,
    color: '#073318',
  },
  imageContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  parcelImage: {
    width: 24,
    height: 24,
    opacity: 0.8,
  },
  mobileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: '#414651',
  },
  callButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 13,
    color: '#181D27',
  },
  categoryBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#6C737F',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
  },
  addressText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#6C737F',
    lineHeight: 18,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dayText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
    color: '#414651',
    marginLeft: 6,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});

export default TableRow;
