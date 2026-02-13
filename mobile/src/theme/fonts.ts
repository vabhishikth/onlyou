/**
 * Onlyou Design System — Font Loading
 * Use useFonts hook from expo-font with our custom fonts
 */

import {
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

// Export font map for useFonts hook
export const customFonts = {
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    // Alias for italic (Plus Jakarta Sans doesn't have true italic, using regular)
    PlusJakartaSans_400Regular_Italic: PlusJakartaSans_400Regular,
};

export type FontKey = keyof typeof customFonts;
