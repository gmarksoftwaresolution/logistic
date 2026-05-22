import { moderateScale } from '../utils/responsive';

export const Spacing = {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(16),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(48),
};

export const Grid = {
    gutter: Spacing.md,
    margin: Spacing.lg,
};
