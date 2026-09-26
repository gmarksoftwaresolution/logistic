import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface FlowBadgeProps {
  flowType?: string;
  isRedirected?: boolean;
  isPickupRedirected?: boolean;
  pickupShgStatus?: string;
  mainStatus?: string;
  isDirect?: boolean;
}

export const FlowBadge: React.FC<FlowBadgeProps> = ({
  flowType,
  isRedirected,
  isPickupRedirected,
  pickupShgStatus,
  mainStatus,
  isDirect,
}) => {
  const checkRedirected =
    Boolean(isRedirected) ||
    Boolean(isPickupRedirected) ||
    pickupShgStatus === 'REDIRECTED' ||
    mainStatus === 'REDIRECTED';

  const cleanFlow = String(flowType || '').toUpperCase();
  const checkDirect =
    Boolean(isDirect) ||
    cleanFlow === 'DIRECT_SHG_TO_SHG' ||
    cleanFlow === 'SHG_TO_SHG';

  if (checkRedirected) {
    return (
      <View style={[styles.badgeContainer, styles.redirectedBg]}>
        <View style={[styles.dot, styles.redirectedDot]} />
        <Text style={[styles.badgeText, styles.redirectedText]}>REDIRECTED</Text>
      </View>
    );
  }

  if (checkDirect) {
    return (
      <View style={[styles.badgeContainer, styles.directBg]}>
        <View style={[styles.dot, styles.directDot]} />
        <Text style={[styles.badgeText, styles.directText]}>SHG → SHG</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badgeContainer, styles.normalBg]}>
      <View style={[styles.dot, styles.normalDot]} />
      <Text style={[styles.badgeText, styles.normalText]}>NORMAL</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  redirectedBg: {
    backgroundColor: '#F3E8FF',
  },
  redirectedDot: {
    backgroundColor: '#7C3AED',
  },
  redirectedText: {
    color: '#5B21B6',
  },
  directBg: {
    backgroundColor: '#EFF6FF',
  },
  directDot: {
    backgroundColor: '#2563EB',
  },
  directText: {
    color: '#1D4ED8',
  },
  normalBg: {
    backgroundColor: '#ECFDF5',
  },
  normalDot: {
    backgroundColor: '#059669',
  },
  normalText: {
    color: '#047857',
  },
});

export default FlowBadge;
