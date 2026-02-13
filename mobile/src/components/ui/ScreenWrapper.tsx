/**
 * ScreenWrapper — Onlyou Design System
 * Common screen layout with safe area, scroll, and sticky CTA
 */

import React from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { screenSpacing, spacing } from '@/theme/spacing';

interface ScreenWrapperProps {
    children: React.ReactNode;
    footer?: React.ReactNode;
    scrollable?: boolean;
    safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
    contentStyle?: ViewStyle;
    showFooterGradient?: boolean;
    testID?: string;
}

export function ScreenWrapper({
    children,
    footer,
    scrollable = true,
    safeAreaEdges = ['top', 'bottom'],
    contentStyle,
    showFooterGradient = true,
    testID,
}: ScreenWrapperProps) {
    const content = (
        <View style={[styles.content, contentStyle]}>
            {children}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={safeAreaEdges} testID={testID}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {scrollable ? (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                    >
                        {content}
                    </ScrollView>
                ) : (
                    <View style={styles.nonScrollContent}>{content}</View>
                )}

                {footer && (
                    <View style={styles.footerContainer}>
                        {showFooterGradient && (
                            <View style={styles.gradientContainer}>
                                <LinearGradient
                                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                                    style={styles.gradient}
                                />
                            </View>
                        )}
                        <View style={styles.footer}>{footer}</View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    nonScrollContent: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.base,
    },
    footerContainer: {
        position: 'relative',
    },
    gradientContainer: {
        position: 'absolute',
        top: -32,
        left: 0,
        right: 0,
        height: 32,
        pointerEvents: 'none',
    },
    gradient: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingVertical: spacing.base,
        backgroundColor: colors.background,
    },
});

export default ScreenWrapper;
