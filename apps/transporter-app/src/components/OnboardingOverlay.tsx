import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing, Platform, StatusBar, BackHandler } from 'react-native';
import { useOnboarding, ONBOARDING_STEPS } from '../context/OnboardingContext';
import { Colors, Fonts } from '../constants/Colors';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect, Path, Polygon } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OnboardingOverlay: React.FC = () => {
  const { isActive, currentStep, targetLayout, nextStep, skipOnboarding, currentStepIndex } = useOnboarding();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [activeLayout, setActiveLayout] = useState<any>(null);
  const assetsOpacity = useRef(new Animated.Value(0)).current;
  
  // Real-time container offset measurement to solve physical shift across all device screen layouts
  const overlayRef = useRef<View>(null);
  const [overlayOffset, setOverlayOffset] = useState({ x: 0, y: 0 });

  const handleLayout = () => {
    if (overlayRef.current) {
      overlayRef.current.measureInWindow((x, y) => {
        // Safe check for valid coordinates
        if (typeof x === 'number' && typeof y === 'number') {
          setOverlayOffset({ x, y });
        }
      });
    }
  };

  // Block physical hardware Back button on Android during active onboarding guide
  useEffect(() => {
    const handleBackButton = () => {
      if (isActive) {
        return true; // Blocks default back action
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      subscription.remove();
    };
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      // 1. Ensure main dim overlay is smoothly visible
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // 2. Smoothly transition highlight assets opacity
      if (targetLayout) {
        setActiveLayout(targetLayout);
        Animated.timing(assetsOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else {
        // Step navigation transition is in progress! Keep backdrop, but fade out glowing frame & cards
        Animated.timing(assetsOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    } else {
      fadeAnim.setValue(0);
      assetsOpacity.setValue(0);
      setActiveLayout(null);
    }
  }, [isActive, targetLayout]);

  if (!isActive || !activeLayout || !currentStep) {
    return null;
  }

  // Calculate self-correcting coordinates relative to the absolute overlay container bounds
  const { x: rawX, y: rawY, width, height } = activeLayout;
  const x = rawX - overlayOffset.x;
  const y = rawY - overlayOffset.y;

  // Pulse animation outputs
  const opacityAnim = pulseAnim.interpolate({
    inputRange: [1, 1.03],
    outputRange: [1, 0.82],
  });

  // Precise non-overlapping bounds matching the element exactly to avoid neighboring element bleeding!
  const padding = 0;
  let cutX = x - padding;
  let cutY = y - padding;
  let cutW = width + padding * 2;
  let cutH = height + padding * 2;



  // Dynamic responsive card heights (compact height with buttons and safe-area adjustments)
  const isTablet = SCREEN_WIDTH > 600;
  const isRecentDelivered = currentStep?.id === 'recent_delivered_order';
  const estimatedTooltipHeight = isRecentDelivered
    ? verticalScale(140)
    : (isTablet ? verticalScale(220) : verticalScale(230));
  
  // Responsive positioning maths: Place card at the opposite end of the target to guarantee 100% collision-free layout!
  const topSafeLimit = insets.top + verticalScale(12);
  const bottomSafeLimit = SCREEN_HEIGHT - insets.bottom - estimatedTooltipHeight - verticalScale(12);
  
  // Calculate free vertical space above and below the spotlight cutout
  const spaceAbove = cutY;
  const spaceBelow = SCREEN_HEIGHT - (cutY + cutH);
  
  // Place card where there is more free space to completely eliminate overlaps!
  const tooltipY = spaceAbove > spaceBelow ? topSafeLimit : bottomSafeLimit;

  // Premium Dotted Curved Arrow drawing function in neon lime green
  const renderDashedArrow = () => {
    const isTooltipBelow = tooltipY > cutY;
    
    // Start of the arrow is from top or bottom center edge of the centered card
    const startX = SCREEN_WIDTH / 2;
    const startY = isTooltipBelow ? tooltipY - 4 : tooltipY + estimatedTooltipHeight + 4;
    
    // End points exactly to top or bottom center of the spotlight target
    const endX = cutX + cutW / 2;
    const endY = isTooltipBelow ? cutY + cutH + 10 : cutY - 10;

    // Curved Bezier Control points scaled for screen dimension
    const cpX = (startX + endX) / 2 + (startX < endX ? -scale(16) : scale(16));
    const cpY = (startY + endY) / 2;

    const pathData = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;

    // Precise Arrowhead vector angles
    const angle = Math.atan2(endY - cpY, endX - cpX);
    const arrowLength = scale(9);
    const x1 = endX - arrowLength * Math.cos(angle - Math.PI / 6);
    const y1 = endY - arrowLength * Math.sin(angle - Math.PI / 6);
    const x2 = endX - arrowLength * Math.cos(angle + Math.PI / 6);
    const y2 = endY - arrowLength * Math.sin(angle + Math.PI / 6);

    return (
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Path
          d={pathData}
          stroke="#B2D534" // Signature neon lime green!
          strokeWidth={1.8} // Sleek, clean dashed line
          strokeDasharray="4, 4"
          fill="none"
        />
        <Polygon
          points={`${endX},${endY} ${x1},${y1} ${x2},${y2}`}
          fill="#B2D534" // Signature neon lime green!
        />
      </Svg>
    );
  };

  return (
    <Animated.View 
      ref={overlayRef}
      onLayout={handleLayout}
      style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 99999, elevation: 999 }]} 
      pointerEvents="box-none"
    >
      {/* 4 Custom Blur Overlay Boxes (Glassmorphism Blur Cutout: Keeps highlighted target 100% sharp & clickable) */}
      <BlurView intensity={5} tint="dark" experimentalBlurMethod="dimezisBlurView" style={[styles.overlayBox, { top: 0, left: 0, width: SCREEN_WIDTH, height: Math.max(0, cutY) }]} pointerEvents="auto" />
      <BlurView intensity={5} tint="dark" experimentalBlurMethod="dimezisBlurView" style={[styles.overlayBox, { top: cutY, left: 0, width: Math.max(0, cutX), height: cutH }]} pointerEvents="auto" />
      <BlurView intensity={5} tint="dark" experimentalBlurMethod="dimezisBlurView" style={[styles.overlayBox, { top: cutY, left: cutX + cutW, width: Math.max(0, SCREEN_WIDTH - (cutX + cutW)), height: cutH }]} pointerEvents="auto" />
      <BlurView intensity={5} tint="dark" experimentalBlurMethod="dimezisBlurView" style={[styles.overlayBox, { top: cutY + cutH, left: 0, width: SCREEN_WIDTH, bottom: -200 }]} pointerEvents="auto" />

      {/* Animated container for all highlight elements to fade smoothly in-and-out during step transitions */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: assetsOpacity }]} pointerEvents="none">
        {/* 4 Corner Arc Masks to round off the sharp cutout corners of the 4 absolute BlurViews */}
        <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {/* Top-Left Corner Mask */}
          <Path
            d={`M ${cutX},${cutY} H ${cutX + scale(16)} A ${scale(16)},${scale(16)} 0 0,0 ${cutX},${cutY + scale(16)} Z`}
            fill="rgba(0, 0, 0, 0.55)"
          />
          {/* Top-Right Corner Mask */}
          <Path
            d={`M ${cutX + cutW},${cutY} H ${cutX + cutW - scale(16)} A ${scale(16)},${scale(16)} 0 0,1 ${cutX + cutW},${cutY + scale(16)} Z`}
            fill="rgba(0, 0, 0, 0.55)"
          />
          {/* Bottom-Left Corner Mask */}
          <Path
            d={`M ${cutX},${cutY + cutH} H ${cutX + scale(16)} A ${scale(16)},${scale(16)} 0 0,1 ${cutX},${cutY + cutH - scale(16)} Z`}
            fill="rgba(0, 0, 0, 0.55)"
          />
          {/* Bottom-Right Corner Mask */}
          <Path
            d={`M ${cutX + cutW},${cutY + cutH} H ${cutX + cutW - scale(16)} A ${scale(16)},${scale(16)} 0 0,0 ${cutX + cutW},${cutY + cutH - scale(16)} Z`}
            fill="rgba(0, 0, 0, 0.55)"
          />
        </Svg>

        {/* Connecting Dotted / Dashed Curved Arrow */}
        {renderDashedArrow()}

        {/* Premium Spotlight Frame & Glow matching the exact style of the screenshot (No zoom/pulsing transform!) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.limeGlowFrame,
            {
              top: cutY - 1.1,
              left: cutX - 1.1,
              width: cutW + 2.2,
              height: cutH + 2.2,
            }
          ]}
        />

        {/* 3 Top-Left Lime Rays / Sparks */}
        <View style={{ position: 'absolute', left: cutX - 16, top: cutY - 16, width: 24, height: 24 }} pointerEvents="none">
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M 12,12 L 2,8" stroke="#B2D534" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 14,10 L 6,2" stroke="#B2D534" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 16,10 L 14,0" stroke="#B2D534" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </View>
      </Animated.View>

      {/* Tooltip Card (Tablet-responsive centered premium glassmorphism card - animates smoothly during transitions) */}
      <Animated.View style={{ opacity: assetsOpacity, position: 'absolute', width: '100%', alignItems: 'center', top: tooltipY }} pointerEvents="box-none">
        <BlurView
          intensity={30}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={[
            styles.tooltipCard,
            isRecentDelivered && {
              paddingVertical: verticalScale(10),
              paddingHorizontal: scale(16),
              borderRadius: moderateScale(16),
            }
          ]}
          pointerEvents="auto"
        >
          <View style={[styles.badgeRow, isRecentDelivered && { marginBottom: verticalScale(6) }]}>
            <View style={styles.badgeCapsule}>
              <Text style={styles.badgeText}>STEP {currentStepIndex + 1}</Text>
            </View>
          </View>
          
          <Text 
            style={[
              styles.tooltipTitle, 
              isRecentDelivered && { 
                fontSize: moderateScale(18), 
                marginBottom: verticalScale(3) 
              }
            ]} 
            numberOfLines={1} 
            adjustsFontSizeToFit
          >
            {t(`onboarding.${currentStep.id}_title`)}
          </Text>
          
          <Text 
            style={[
              styles.tooltipDesc, 
              isRecentDelivered && { 
                fontSize: moderateScale(13.5), 
                lineHeight: moderateScale(17), 
                marginBottom: verticalScale(10) 
              }
            ]} 
            numberOfLines={2}
          >
            {t(`onboarding.${currentStep.id}_desc`)}
          </Text>

          {/* Responsive Progress Indicator Dots */}
          <View style={[styles.dotsRow, isRecentDelivered && { marginBottom: verticalScale(8) }]}>
            {Array.from({ length: ONBOARDING_STEPS.length }).map((_, index) => {
              const isDotActive = index === currentStepIndex;
              return (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    isDotActive ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.skipTextBtn} activeOpacity={0.7} onPress={skipOnboarding}>
              <Text style={styles.skipBtnLabel}>{t('onboarding.skip_guide')}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayBox: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.55)', // Dim level exactly as specified
  },
  limeGlowFrame: {
    position: 'absolute',
    borderWidth: 2.2, // Robust beautiful outline matching screenshot
    borderColor: '#B2D534', // Signature neon lime success green!
    borderRadius: scale(16), // Rounded rectangular card shape
    backgroundColor: 'transparent', // Explicitly transparent to eliminate Android white background bug!
    shadowColor: '#B2D534', // High-fidelity neon lime glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
  },
  tooltipCard: {
    position: 'absolute',
    width: '88%',
    maxWidth: 420, // Tablet and large device max-width constraint
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Sleek micro-tinted glassmorphism shine!
    borderRadius: moderateScale(24), // Frosted glass soft rounded corners
    paddingHorizontal: scale(22),
    paddingVertical: verticalScale(18),
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)', // Premium semi-transparent white frosted edge!
    overflow: 'hidden', // Crucial to clip native blur on Android!
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(10),
  },
  badgeCapsule: {
    backgroundColor: '#16A34A', // Active capsule green background
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(99),
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  tooltipTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(26),
    color: '#FFFFFF', // High-contrast glowing white text!
    marginBottom: verticalScale(6),
    letterSpacing: -0.5,
  },
  tooltipDesc: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(16),
    color: '#E5E7EB', // High-contrast premium light silver text!
    lineHeight: moderateScale(26),
    marginBottom: verticalScale(18),
  },
  dotsRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(18),
  },
  progressDot: {
    height: scale(8),
    borderRadius: scale(4),
  },
  activeDot: {
    width: scale(18),
    backgroundColor: '#22C55E', // Bright vibrant active green dot
  },
  inactiveDot: {
    width: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Semi-transparent white inactive dot
  },
  footerActions: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    gap: verticalScale(10),
  },
  skipTextBtn: {
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(16),
  },
  skipBtnLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(13.5),
    color: 'rgba(255, 255, 255, 0.65)', // Premium muted white skip button
  },
});

export default OnboardingOverlay;
