import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Standard scaling based on screen width
 */
export const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Vertical scaling based on screen height
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Balanced scaling for fonts and subtle elements
 */
export const moderateScale = (size: number, factor = 0.5) => 
  size + (scale(size) - size) * factor;

/**
 * Font normalization based on pixel density
 */
export const normalize = (size: number) => {
  const newSize = scale(size);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * Orientation helper
 */
export const isLandscape = () => SCREEN_WIDTH > SCREEN_HEIGHT;

export { SCREEN_WIDTH, SCREEN_HEIGHT };
