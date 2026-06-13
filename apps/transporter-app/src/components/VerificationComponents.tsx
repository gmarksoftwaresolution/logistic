import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Clipboard,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { Copy, Check, X, ShieldAlert, CheckCircle2, Key, Info } from 'lucide-react-native';

// ── 1. GENERATE CODE BUTTON ──────────────────────────────────────────────
export const GenerateCodeButton: React.FC<{ onPress: () => void; text: string }> = ({ onPress, text }) => {
  return (
    <TouchableOpacity style={styles.generateBtn} onPress={onPress} activeOpacity={0.85}>
      <Key size={scale(18)} color="#FFFFFF" strokeWidth={2.5} />
      <Text style={styles.generateBtnText}>{text}</Text>
    </TouchableOpacity>
  );
};

// ── 2. ENTER CODE BUTTON ────────────────────────────────────────────────
export const EnterCodeButton: React.FC<{ onPress: () => void; text: string }> = ({ onPress, text }) => {
  return (
    <TouchableOpacity style={styles.enterBtn} onPress={onPress} activeOpacity={0.85}>
      <Key size={scale(18)} color="#FFFFFF" strokeWidth={2.5} />
      <Text style={styles.enterBtnText}>{text}</Text>
    </TouchableOpacity>
  );
};

// ── 3. CODE DISPLAY CARD ────────────────────────────────────────────────
export const CodeDisplayCard: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.codeCardContainer}>
      <Text style={styles.codeCardLabel}>VERIFICATION CODE</Text>
      <View style={styles.codeDigitsRow}>
        {code.split('').map((char, index) => (
          <View key={index} style={styles.digitBox}>
            <Text style={styles.digitText}>{char}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
        onPress={handleCopy}
        activeOpacity={0.7}
      >
        {copied ? (
          <>
            <Check size={scale(14)} color="#10B981" strokeWidth={2.5} />
            <Text style={[styles.copyBtnText, { color: '#10B981' }]}>Copied!</Text>
          </>
        ) : (
          <>
            <Copy size={scale(14)} color={Colors.primary} strokeWidth={2.5} />
            <Text style={styles.copyBtnText}>Copy Code</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

// ── 4. OTP INPUT WIDGET ──────────────────────────────────────────────────
export const OTPInputWidget: React.FC<{
  code: string[];
  onChangeCode: (newCode: string[]) => void;
}> = ({ code, onChangeCode }) => {
  const refs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const handleTextChange = (text: string, index: number) => {
    const newCode = [...code];
    // Take the last character typed
    const cleanedText = text.replace(/[^0-9]/g, '');
    const char = cleanedText.substring(cleanedText.length - 1);
    
    newCode[index] = char;
    onChangeCode(newCode);

    if (char && index < 3) {
      refs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newCode = [...code];
      
      // If current is filled, just delete current
      if (newCode[index]) {
        newCode[index] = '';
        onChangeCode(newCode);
      } else if (index > 0) {
        // If current is empty, delete previous and move back
        newCode[index - 1] = '';
        onChangeCode(newCode);
        refs[index - 1].current?.focus();
      }
    }
  };

  return (
    <View style={styles.otpWidgetContainer}>
      <View style={styles.otpRow}>
        {code.map((val, index) => (
          <TextInput
            key={index}
            ref={refs[index]}
            style={[styles.otpInput, val !== '' && styles.otpInputFilled]}
            keyboardType="number-pad"
            maxLength={1}
            value={val}
            onChangeText={(text) => handleTextChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            selectTextOnFocus
            textAlign="center"
          />
        ))}
      </View>
    </View>
  );
};

// ── 5. VERIFICATION BOTTOM SHEET ────────────────────────────────────────
export const VerificationBottomSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, subtitle, children }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetOverlay}
      >
        <TouchableOpacity style={styles.sheetDismissArea} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.dragIndicator} />
            <Text style={styles.sheetTitle}>{title}</Text>
            <Text style={styles.sheetSubtitle}>{subtitle}</Text>
          </View>
          
          <View style={styles.sheetBody}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── 6. STATUS BADGE ─────────────────────────────────────────────────────
export const VerificationStatusBadge: React.FC<{
  status: 'pending_pickup' | 'pickup_verified' | 'pending_delivery' | 'delivery_verified' | 'completed';
}> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'pending_pickup':
        return { bg: '#FEF3C7', border: '#FCD34D', text: '#D97706', label: 'Awaiting Pickup Verification' };
      case 'pickup_verified':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'Pickup Verified' };
      case 'pending_delivery':
        return { bg: '#FEF3C7', border: '#FCD34D', text: '#D97706', label: 'Awaiting Delivery Verification' };
      case 'delivery_verified':
        return { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669', label: 'Delivery Verified' };
      case 'completed':
        return { bg: '#D1FAE5', border: '#34D399', text: '#065F46', label: 'Order Completed Successfully' };
      default:
        return { bg: '#F1F5F9', border: '#E2E8F0', text: '#64748B', label: 'Awaiting Verification' };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badgeContainer, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Info size={scale(14)} color={config.text} style={{ marginRight: scale(6) }} />
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

// ── 7. SUCCESS DIALOG ───────────────────────────────────────────────────
export const VerificationSuccessDialog: React.FC<{
  visible: boolean;
  onClose: () => void;
  message: string;
}> = ({ visible, onClose, message }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCard}>
          <View style={[styles.dialogIconBox, { backgroundColor: '#ECFDF5' }]}>
            <CheckCircle2 size={scale(32)} color="#10B981" strokeWidth={2} />
          </View>
          <Text style={styles.dialogTitle}>Verification Success</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <TouchableOpacity style={[styles.dialogBtn, { backgroundColor: '#10B981' }]} onPress={onClose}>
            <Text style={styles.dialogBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── 8. FAILURE DIALOG ───────────────────────────────────────────────────
export const VerificationFailureDialog: React.FC<{
  visible: boolean;
  onClose: () => void;
  message: string;
}> = ({ visible, onClose, message }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCard}>
          <View style={[styles.dialogIconBox, { backgroundColor: '#FEF2F2' }]}>
            <ShieldAlert size={scale(32)} color="#EF4444" strokeWidth={2} />
          </View>
          <Text style={[styles.dialogTitle, { color: '#EF4444' }]}>Verification Failed</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <TouchableOpacity style={[styles.dialogBtn, { backgroundColor: '#EF4444' }]} onPress={onClose}>
            <Text style={styles.dialogBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── STYLESHEET ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Buttons
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  generateBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#FFFFFF',
  },
  enterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  enterBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#FFFFFF',
  },

  // Code Display Card
  codeCardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(16),
    padding: scale(20),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  codeCardLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: verticalScale(12),
  },
  codeDigitsRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(20),
  },
  digitBox: {
    width: scale(48),
    height: scale(56),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  digitText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(26),
    color: Colors.textPrimary,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  copyBtnSuccess: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  copyBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.primary,
  },

  // OTP Input Widget
  otpWidgetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
  },
  otpRow: {
    flexDirection: 'row',
    gap: scale(16),
  },
  otpInput: {
    width: scale(50),
    height: scale(56),
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: moderateScale(24),
    fontFamily: Fonts.extraBold,
    color: Colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
  },

  // Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetDismissArea: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingBottom: verticalScale(32),
    paddingHorizontal: scale(20),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  dragIndicator: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: '#E2E8F0',
    borderRadius: scale(2),
    alignSelf: 'center',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(16),
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  sheetTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(20),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  sheetSubtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#64748B',
    textAlign: 'center',
  },
  sheetBody: {
    width: '100%',
  },

  // Status Badges
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    width: '100%',
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
  },

  // Success / Failure Dialogs
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(20),
    padding: scale(24),
    width: '85%',
    maxWidth: scale(320),
    alignItems: 'center',
    elevation: 10,
  },
  dialogIconBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  dialogTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(20),
    color: '#10B981',
    marginBottom: verticalScale(8),
  },
  dialogMessage: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#64748B',
    textAlign: 'center',
    marginBottom: verticalScale(20),
    lineHeight: verticalScale(20),
  },
  dialogBtn: {
    width: '100%',
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  dialogBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#FFFFFF',
  },
});
