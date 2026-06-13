import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../constants/Colors';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { ShieldCheck, Clock, CheckCircle2, ChevronLeft, UserCheck, FileText } from 'lucide-react-native';
import api from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ApprovalPending'>;

const { width } = Dimensions.get('window');

const ApprovalPendingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const [uniqueId, setUniqueId] = useState<string | null>(route.params?.transporterUniqueId || null);
  const [requestId, setRequestId] = useState<string | null>(route.params?.requestId || null);
  const [isLoading, setIsLoading] = useState<boolean>(!route.params?.transporterUniqueId);

  // Subtle pulsing animation for the premium badge effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse micro-animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    if (!uniqueId) {
      api.get('/registration/me')
        .then(res => {
          if (res.data?.transporterUniqueId) {
            setUniqueId(res.data.transporterUniqueId);
          }
          if (res.data?.requestId) {
            setRequestId(res.data.requestId);
          }
        })
        .catch(err => console.log('Fetch profile error:', err))
        .finally(() => setIsLoading(false));
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.topSection}>
          {/* Top Header Graphic */}
          <View style={styles.headerBackground}>
            <Animated.View style={[styles.outerPulsingCircle, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.innerCircle}>
                <ShieldCheck size={scale(46)} color={Colors.primary} strokeWidth={2} />
              </View>
            </Animated.View>
            <View style={styles.statusBadge}>
              <Clock size={scale(16)} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>

          {/* Status Content Card */}
          <View style={styles.mainCard}>
            <Text style={styles.statusSub}>{t('signup.approval_pending', 'Application Under Review')}</Text>
            <Text style={styles.title}>{t('signup.approval_title', 'Registration Submitted!')}</Text>

            <Text style={styles.descriptionText}>
              {t('signup.approval_desc_full', 'Thank you for registering. Your document verification is currently in progress. You will receive an SMS update once approved.')}
            </Text>

            {/* Credentials Display Section */}
            <View style={styles.credentialsBox}>
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: verticalScale(12) }} />
              ) : (
                <>
                  {uniqueId ? (
                    <View style={styles.credentialItem}>
                      <View style={styles.credIconBg}>
                        <UserCheck size={scale(18)} color={Colors.primary} />
                      </View>
                      <View style={styles.credTextCol}>
                        <Text style={styles.credLabel}>{t('signup.transporter_id_label', 'Transporter Unique ID')}</Text>
                        <Text style={styles.credValue}>{uniqueId}</Text>
                      </View>
                    </View>
                  ) : null}

                  {uniqueId && requestId ? <View style={styles.divider} /> : null}

                  {requestId ? (
                    <View style={styles.credentialItem}>
                      <View style={styles.credIconBg}>
                        <FileText size={scale(18)} color={Colors.primary} />
                      </View>
                      <View style={styles.credTextCol}>
                        <Text style={styles.credLabel}>{t('signup.request_id_label', 'Application Request ID')}</Text>
                        <Text style={styles.credValueReq}>{requestId}</Text>
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            {/* Features / Next Steps List */}
            <View style={styles.stepsBox}>
              <View style={styles.stepRow}>
                <CheckCircle2 size={scale(16)} color={Colors.primary} style={styles.stepIcon} />
                <Text style={styles.stepText}>{t('signup.step_verified', 'Phone Number & Profile Details Captured')}</Text>
              </View>
              <View style={styles.stepRow}>
                <CheckCircle2 size={scale(16)} color={Colors.primary} style={styles.stepIcon} />
                <Text style={styles.stepText}>{t('signup.step_docs', 'Vehicle & Route Configurations Uploaded')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer Navigation Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <ChevronLeft size={scale(20)} color="#FFFFFF" />
            <Text style={styles.buttonText}>{t('signup.back_to_login', 'Back to Login Screen')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(20),
  },
  topSection: {
    width: '100%',
    alignItems: 'center',
  },
  headerBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(12),
    position: 'relative',
  },
  outerPulsingCircle: {
    width: scale(130),
    height: scale(130),
    borderRadius: scale(65),
    backgroundColor: 'rgba(21, 94, 117, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  statusBadge: {
    position: 'absolute',
    bottom: scale(4),
    right: scale(10),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    paddingVertical: verticalScale(22),
    paddingHorizontal: scale(20),
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
    marginTop: verticalScale(8),
    borderWidth: 1,
    borderColor: 'rgba(21, 94, 117, 0.05)',
  },
  statusSub: {
    fontSize: moderateScale(12),
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: verticalScale(4),
  },
  title: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: verticalScale(10),
  },
  descriptionText: {
    fontSize: moderateScale(13.5),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(18),
    paddingHorizontal: scale(6),
  },
  credentialsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(16),
    width: '100%',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    borderWidth: 1.5,
    borderColor: 'rgba(21, 94, 117, 0.15)',
    borderStyle: 'dashed',
    marginBottom: verticalScale(18),
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(6),
  },
  credIconBg: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  credTextCol: {
    flex: 1,
  },
  credLabel: {
    fontSize: moderateScale(11.5),
    color: '#64748B',
    fontWeight: '600',
    marginBottom: verticalScale(1),
  },
  credValue: {
    fontSize: moderateScale(16),
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  credValueReq: {
    fontSize: moderateScale(14.5),
    color: '#334155',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: verticalScale(6),
  },
  stepsBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(4),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(5),
  },
  stepIcon: {
    marginRight: scale(10),
  },
  stepText: {
    fontSize: moderateScale(13),
    color: '#475569',
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    marginTop: verticalScale(10),
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    height: verticalScale(54),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15.5),
    fontWeight: 'bold',
    marginLeft: scale(8),
  },
});

export default ApprovalPendingScreen;
