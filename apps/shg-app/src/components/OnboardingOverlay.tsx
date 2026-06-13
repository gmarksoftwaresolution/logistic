import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, BackHandler } from 'react-native';
import { useOnboarding, ONBOARDING_STEPS } from '../context/OnboardingContext';
import { Colors, Fonts } from '../constants/theme';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Polygon, Defs, Mask, Rect } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LanguageContext } from '../context/LanguageContext';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OnboardingOverlay: React.FC = () => {
  const { isActive, currentStep, targetLayout, nextStep, skipOnboarding, currentStepIndex, isPaused } = useOnboarding();
  const context = React.useContext(LanguageContext);
  const insets = useSafeAreaInsets();
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [activeLayout, setActiveLayout] = useState<any>(null);
  const assetsOpacity = useRef(new Animated.Value(0)).current;
  
  // High-performance animated coordinates for spotlight portal morphing
  const spotlightX = useRef(new Animated.Value(0)).current;
  const spotlightY = useRef(new Animated.Value(0)).current;
  const spotlightW = useRef(new Animated.Value(0)).current;
  const spotlightH = useRef(new Animated.Value(0)).current;
  const tooltipAnimY = useRef(new Animated.Value(verticalScale(100))).current;
  const hasLayout = useRef(false);

  const overlayRef = useRef<View>(null);
  const [overlayOffset, setOverlayOffset] = useState({ x: 0, y: 0 });

  const handleLayout = () => {
    if (overlayRef.current) {
      overlayRef.current.measureInWindow((x, y) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setOverlayOffset({ x, y });
        }
      });
    }
  };

  useEffect(() => {
    const handleBackButton = () => {
      if (isActive) {
        return true; 
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      subscription.remove();
    };
  }, [isActive]);

  const isTablet = SCREEN_WIDTH > 600;
  const estimatedTooltipHeight = isTablet ? verticalScale(220) : verticalScale(230);

  useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150, // Snappy initial entry
        useNativeDriver: false,
      }).start();

      if (targetLayout) {
        // Calculate new tooltip target position
        const topSafeLimit = insets.top + verticalScale(12);
        const bottomSafeLimit = SCREEN_HEIGHT - insets.bottom - estimatedTooltipHeight - verticalScale(12);
        
        const spaceAbove = targetLayout.y - overlayOffset.y;
        const spaceBelow = SCREEN_HEIGHT - (targetLayout.y - overlayOffset.y + targetLayout.height);
        const nextTooltipY = spaceAbove > spaceBelow ? topSafeLimit : bottomSafeLimit;

        if (!hasLayout.current) {
          // If first step layout, set values instantly to avoid visual jump from 0,0
          spotlightX.setValue(targetLayout.x - overlayOffset.x);
          spotlightY.setValue(targetLayout.y - overlayOffset.y);
          spotlightW.setValue(targetLayout.width);
          spotlightH.setValue(targetLayout.height);
          tooltipAnimY.setValue(nextTooltipY);
          hasLayout.current = true;
          setActiveLayout(targetLayout);
        } else {
          // Otherwise, perform high-performance parallel timing transitions
          Animated.parallel([
            Animated.timing(spotlightX, {
              toValue: targetLayout.x - overlayOffset.x,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(spotlightY, {
              toValue: targetLayout.y - overlayOffset.y,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(spotlightW, {
              toValue: targetLayout.width,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(spotlightH, {
              toValue: targetLayout.height,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(tooltipAnimY, {
              toValue: nextTooltipY,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();

          setActiveLayout(targetLayout);
        }

        // Beautiful continuous backdrop morph: animate opacity down slightly and back to 1.0!
        Animated.sequence([
          Animated.timing(assetsOpacity, {
            toValue: 0.35,
            duration: 80,
            useNativeDriver: false,
          }),
          Animated.timing(assetsOpacity, {
            toValue: 1.0,
            duration: 140,
            useNativeDriver: false,
          })
        ]).start();

      } else {
        // Fade out assets during screen change, but keep the previous spotlight coordinates active so they don't reset to 0!
        Animated.timing(assetsOpacity, {
          toValue: 0,
          duration: 80,
          useNativeDriver: false,
        }).start();
      }
    } else {
      fadeAnim.setValue(0);
      assetsOpacity.setValue(0);
      hasLayout.current = false;
      setActiveLayout(null);
    }
  }, [isActive, targetLayout, overlayOffset]);

  if (!context) return null;
  const { t } = context;

  if (!isActive || !currentStep || isPaused) {
    return null;
  }

  let cutX = 0;
  let cutY = 0;
  let cutW = 0;
  let cutH = 0;
  let tooltipY = verticalScale(100);

  if (activeLayout) {
    const { x: rawX, y: rawY, width, height } = activeLayout;
    const x = rawX - overlayOffset.x;
    const y = rawY - overlayOffset.y;

    const padding = 0;
    cutX = x - padding;
    cutY = y - padding;
    cutW = width + padding * 2;
    cutH = height + padding * 2;
    
    const topSafeLimit = insets.top + verticalScale(12);
    const bottomSafeLimit = SCREEN_HEIGHT - insets.bottom - estimatedTooltipHeight - verticalScale(12);
    
    const spaceAbove = cutY;
    const spaceBelow = SCREEN_HEIGHT - (cutY + cutH);
    
    tooltipY = spaceAbove > spaceBelow ? topSafeLimit : bottomSafeLimit;
  }

  const renderDashedArrow = () => {
    if (!activeLayout) return null;
    const isTooltipBelow = tooltipY > cutY;
    
    const startX = SCREEN_WIDTH / 2;
    const startY = isTooltipBelow ? tooltipY - 4 : tooltipY + estimatedTooltipHeight + 4;
    
    const endX = cutX + cutW / 2;
    const endY = isTooltipBelow ? cutY + cutH + 10 : cutY - 10;

    const cpX = (startX + endX) / 2 + (startX < endX ? -scale(16) : scale(16));
    const cpY = (startY + endY) / 2;

    const pathData = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;

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
          stroke="#B2D534" 
          strokeWidth={1.8} 
          strokeDasharray="4, 4"
          fill="none"
        />
        <Polygon
          points={`${endX},${endY} ${x1},${y1} ${x2},${y2}`}
          fill="#B2D534" 
        />
      </Svg>
    );
  };

  const renderBackdrop = () => {
    if (!activeLayout) {
      return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]} pointerEvents="auto" />
      );
    }
    return (
      <>
        {/* Box 1 (top) */}
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.overlayBox,
            {
              top: 0,
              left: 0,
              right: 0,
              height: spotlightY,
            }
          ]}
        />
        {/* Box 2 (left) */}
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.overlayBox,
            {
              top: spotlightY,
              left: 0,
              width: spotlightX,
              height: spotlightH,
            }
          ]}
        />
        {/* Box 3 (right) */}
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.overlayBox,
            {
              top: spotlightY,
              left: Animated.add(spotlightX, spotlightW),
              right: 0,
              height: spotlightH,
            }
          ]}
        />
        {/* Box 4 (bottom) */}
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.overlayBox,
            {
              top: Animated.add(spotlightY, spotlightH),
              left: 0,
              right: 0,
              bottom: -200,
            }
          ]}
        />
      </>
    );
  };

  return (
    <Animated.View 
      ref={overlayRef}
      onLayout={handleLayout}
      style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 99999, elevation: 999 }]} 
      pointerEvents="box-none"
    >
      {renderBackdrop()}

      {activeLayout && (
        <Svg
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <Defs>
            <Mask id="spotlightMask">
              <Rect width="100%" height="100%" fill="white" />
              <AnimatedRect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx={scale(16)}
                ry={scale(16)}
                fill="black"
              />
            </Mask>
          </Defs>
          <Rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.55)"
            mask="url(#spotlightMask)"
          />
        </Svg>
      )}

      {activeLayout && (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: assetsOpacity }]} pointerEvents="none">
          {renderDashedArrow()}

          <Animated.View
            pointerEvents="none"
            style={[
              styles.limeGlowFrame,
              {
                top: spotlightY,
                left: spotlightX,
                width: spotlightW,
                height: spotlightH,
              }
            ]}
          />

          <Animated.View 
            style={{ 
              position: 'absolute', 
              left: Animated.subtract(spotlightX, 16), 
              top: Animated.subtract(spotlightY, 16), 
              width: 24, 
              height: 24 
            }} 
            pointerEvents="none"
          >
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path d="M 12,12 L 2,8" stroke="#B2D534" strokeWidth={2.5} strokeLinecap="round" />
              <Path d="M 14,10 L 6,2" stroke="#B2D534" strokeWidth={2.5} strokeLinecap="round" />
              <Path d="M 16,10 L 14,0" stroke="#B2D534" strokeWidth={2.5} strokeLinecap="round" />
            </Svg>
          </Animated.View>
        </Animated.View>
      )}

      {activeLayout && (
        <Animated.View style={{ opacity: assetsOpacity, position: 'absolute', width: '100%', alignItems: 'center', top: tooltipAnimY }} pointerEvents="box-none">
          <BlurView
            intensity={30}
            tint="dark"
            style={styles.tooltipCard}
            pointerEvents="auto"
          >
            <View style={styles.badgeRow}>
              <View style={styles.badgeCapsule}>
                <Text style={styles.badgeText}>STEP {currentStepIndex + 1}</Text>
              </View>
            </View>
            
            <Text 
              style={styles.tooltipTitle} 
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
              {t(`onboarding.${currentStep.id}_title`)}
            </Text>
            
            <Text 
              style={styles.tooltipDesc} 
              numberOfLines={2}
            >
              {t(`onboarding.${currentStep.id}_desc`)}
            </Text>

            <View style={styles.dotsRow}>
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
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayBox: {
    position: 'absolute',
    backgroundColor: 'transparent', 
  },
  limeGlowFrame: {
    position: 'absolute',
    borderWidth: 2.2, 
    borderColor: '#B2D534', 
    borderRadius: scale(16), 
    backgroundColor: 'transparent', 
    shadowColor: '#B2D534', 
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
  },
  tooltipCard: {
    position: 'absolute',
    width: '88%',
    maxWidth: 420, 
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderRadius: moderateScale(24), 
    paddingHorizontal: scale(22),
    paddingVertical: verticalScale(18),
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)', 
    overflow: 'hidden', 
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(10),
  },
  badgeCapsule: {
    backgroundColor: '#16A34A', 
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(99),
  },
  badgeText: {
    fontWeight: 'bold',
    fontSize: moderateScale(10),
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  tooltipTitle: {
    fontWeight: '900',
    fontSize: moderateScale(26),
    color: '#FFFFFF', 
    marginBottom: verticalScale(6),
    letterSpacing: -0.5,
  },
  tooltipDesc: {
    fontWeight: '500',
    fontSize: moderateScale(16),
    color: '#E5E7EB', 
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
    backgroundColor: '#22C55E', 
  },
  inactiveDot: {
    width: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.3)', 
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
    fontWeight: '600',
    fontSize: moderateScale(13.5),
    color: 'rgba(255, 255, 255, 0.65)', 
  },
});

export default OnboardingOverlay;
