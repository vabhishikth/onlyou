/**
 * Onlyou Design System — Typography
 * Serif for headings (Playfair Display), Sans for body (Plus Jakarta Sans)
 */

export const fontFamilies = {
    // Playfair Display — serif for headings and brand
    serifBlack: 'PlayfairDisplay_900Black', // logo ONLY
    serifBold: 'PlayfairDisplay_700Bold', // large headings
    serifSemiBold: 'PlayfairDisplay_600SemiBold', // screen headings
    serifRegular: 'PlayfairDisplay_400Regular', // rarely used

    // Plus Jakarta Sans — sans for body/UI
    sansBold: 'PlusJakartaSans_700Bold',
    sansSemiBold: 'PlusJakartaSans_600SemiBold',
    sansMedium: 'PlusJakartaSans_500Medium',
    sansRegular: 'PlusJakartaSans_400Regular',
    sansItalic: 'PlusJakartaSans_400Regular_Italic', // "personalized" accent
} as const;

export const fontSizes = {
    logo: 36, // "onlyou" brand mark
    heroTitle: 32, // "Get your personalized treatment plan"
    title: 28, // screen headings
    sectionH: 22, // section headings
    cardTitle: 18, // card titles
    body: 16, // body text, descriptions
    label: 14, // input labels, secondary info
    caption: 12, // timestamps, fine print
    tiny: 10, // badges, indicators
} as const;

export const lineHeights = {
    tight: 1.2, // headings
    normal: 1.5, // body
    relaxed: 1.7, // long-form reading
} as const;

export const letterSpacing = {
    tight: -0.5, // large headings (tighten for elegance)
    normal: 0, // body
    wide: 0.5, // labels
    extraWide: 1.5, // "GETTING STARTED" micro-header
} as const;

// Pre-composed text styles
export const textStyles = {
    // Logo / Brand
    logo: {
        fontFamily: fontFamilies.serifBlack,
        fontSize: fontSizes.logo,
        lineHeight: fontSizes.logo * lineHeights.tight,
        letterSpacing: letterSpacing.tight,
    },

    // Headings (serif)
    heroTitle: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.heroTitle,
        lineHeight: fontSizes.heroTitle * lineHeights.tight,
        letterSpacing: letterSpacing.tight,
    },
    title: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.title,
        lineHeight: fontSizes.title * lineHeights.tight,
        letterSpacing: letterSpacing.tight,
    },
    sectionHeading: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.sectionH,
        lineHeight: fontSizes.sectionH * lineHeights.tight,
        letterSpacing: letterSpacing.normal,
    },

    // Body (sans)
    cardTitle: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.cardTitle,
        lineHeight: fontSizes.cardTitle * lineHeights.normal,
    },
    body: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        lineHeight: fontSizes.body * lineHeights.normal,
    },
    bodyMedium: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.body,
        lineHeight: fontSizes.body * lineHeights.normal,
    },
    bodySemiBold: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        lineHeight: fontSizes.body * lineHeights.normal,
    },
    label: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.label,
        lineHeight: fontSizes.label * lineHeights.normal,
    },
    caption: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        lineHeight: fontSizes.caption * lineHeights.normal,
    },
    bodySmall: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        lineHeight: fontSizes.label * lineHeights.normal,
    },

    // Heading aliases
    h2: {
        fontFamily: fontFamilies.serifBlack,
        fontSize: fontSizes.title,
        lineHeight: fontSizes.title * lineHeights.tight,
        letterSpacing: letterSpacing.tight,
    },

    // Buttons
    button: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        lineHeight: fontSizes.body * lineHeights.normal,
    },
    buttonSmall: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.label,
        lineHeight: fontSizes.label * lineHeights.normal,
    },

    // Special
    microHeader: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        lineHeight: fontSizes.caption * lineHeights.normal,
        letterSpacing: letterSpacing.extraWide,
        textTransform: 'uppercase' as const,
    },
} as const;

// Legacy typography object (matches old @/styles/theme API shape)
export const typography = {
    displayLarge: {
        fontFamily: fontFamilies.serifBold,
        fontSize: 32,
        lineHeight: 40,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },
    displayMedium: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
        lineHeight: 36,
        fontWeight: '600' as const,
        letterSpacing: -0.3,
    },
    headingLarge: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: 24,
        lineHeight: 32,
        fontWeight: '600' as const,
    },
    headingMedium: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '600' as const,
    },
    headingSmall: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: 18,
        lineHeight: 24,
        fontWeight: '600' as const,
    },
    bodyLarge: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '400' as const,
    },
    bodyMedium: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400' as const,
    },
    bodySmall: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '400' as const,
    },
    label: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500' as const,
        letterSpacing: 0.5,
    },
    button: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '600' as const,
    },
    buttonSmall: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600' as const,
    },
} as const;
