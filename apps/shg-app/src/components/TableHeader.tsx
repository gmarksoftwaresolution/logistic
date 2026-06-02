import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLUMN_WIDTHS = [60, 100, 100, 150, 150, 130, 100, 100, 200, 150, 80];
const COLUMNS = [
  'Sr. No.',
  'Parcel Photo',
  'Order ID',
  'Parcel Name',
  'Category',
  'Mobile',
  'Amount',
  'Payment',
  'Delivery Address',
  'Delivery Day',
  'Action'
];

const TableHeader = () => {
  return (
    <View style={styles.headerRow}>
      {COLUMNS.map((col, index) => (
        <View key={index} style={[styles.headerCell, { width: COLUMN_WIDTHS[index] }]}>
          <Text style={styles.headerText}>{col}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Light gray background
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  headerCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
    color: '#414651',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default TableHeader;
export { COLUMN_WIDTHS };
