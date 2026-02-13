/**
 * Onlyou Design System — Theme Index
 * Re-export all theme modules
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './fonts';

// Re-export combined theme object for convenience
import { colors } from './colors';
import { fontFamilies, fontSizes, lineHeights, letterSpacing, textStyles } from './typography';
import { spacing, screenSpacing, borderRadius, dimensions, shadows } from './spacing';

export const theme = {
    colors,
    fontFamilies,
    fontSizes,
    lineHeights,
    letterSpacing,
    textStyles,
    spacing,
    screenSpacing,
    borderRadius,
    dimensions,
    shadows,
} as const;

export default theme;
