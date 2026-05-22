import { normalize } from '../utils/responsive';
import { Fonts, Colors } from './Colors';

export const Typography = {
  h1: {
    fontFamily: Fonts.extraBold,
    fontSize: normalize(32),
    color: Colors.textPrimary,
  },
  h2: {
    fontFamily: Fonts.extraBold,
    fontSize: normalize(24),
    color: Colors.textPrimary,
  },
  h3: {
    fontFamily: Fonts.bold,
    fontSize: normalize(20),
    color: Colors.textPrimary,
  },
  bodyLarge: {
    fontFamily: Fonts.medium,
    fontSize: normalize(18),
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontFamily: Fonts.regular,
    fontSize: normalize(16),
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: normalize(14),
    color: Colors.textSecondary,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: normalize(12),
    color: Colors.textSecondary,
  },
  button: {
    fontFamily: Fonts.bold,
    fontSize: normalize(16),
    color: '#FFFFFF',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
};
