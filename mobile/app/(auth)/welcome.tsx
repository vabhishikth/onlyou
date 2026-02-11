import { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    StatusBar,
    Animated,
    ScrollView,
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;

export default function WelcomeScreen() {
    const [showSplash, setShowSplash] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const contentFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in splash logo
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // After 1.5s, transition to main content
        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowSplash(false);
                Animated.timing(contentFadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }).start();
            });
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    const handleGetStarted = () => {
        router.push('/(auth)/location');
    };

    const handleLogin = () => {
        router.push('/(auth)/phone');
    };

    if (showSplash) {
        return (
            <View style={styles.splashContainer}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <Animated.View style={[styles.splashLogoContainer, { opacity: fadeAnim }]}>
                    <Text style={styles.splashLogo}>onlyou</Text>
                </Animated.View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <Animated.ScrollView
                style={{ opacity: contentFadeAnim }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Logo */}
                <Text style={styles.logo}>onlyou</Text>

                {/* Hero Text */}
                <View style={styles.heroContainer}>
                    <Text style={styles.heroTitle}>
                        Get your <Text style={styles.heroAccent}>personalized</Text>
                        {'\n'}treatment plan
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        Your free online visit starts here.
                    </Text>
                </View>

                {/* Horizontally Scrollable Category Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cardsScrollContent}
                    style={styles.cardsScroll}
                    snapToInterval={CARD_WIDTH + spacing.md}
                    decelerationRate="fast"
                >
                    <CategoryCard emoji="💙" title="Have great" highlight="sex" />
                    <CategoryCard emoji="✨" title="Regrow" highlight="hair" />
                    <CategoryCard emoji="🧴" title="Get smooth" highlight="skin" />

                    {/* Find my treatment card */}
                    <TouchableOpacity style={styles.findTreatmentCard} activeOpacity={0.8}>
                        <Text style={styles.findTreatmentTitle}>Find my{'\n'}treatment</Text>
                        <Text style={styles.findTreatmentArrow}>→</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleGetStarted}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>Get started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleLogin}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.secondaryButtonText}>Log in</Text>
                    </TouchableOpacity>

                    <Text style={styles.createAccountText}>
                        New to onlyou?  <Text style={styles.createAccountLink}>Create an account</Text>
                    </Text>

                    <Text style={styles.privacyText}>Your privacy choices</Text>
                </View>

                {/* Bottom Tag */}
                <View style={styles.bottomTag}>
                    <Text style={styles.bottomTagIcon}>🚚</Text>
                    <Text style={styles.bottomTagText}>
                        Free shipping for all prescriptions
                    </Text>
                </View>
            </Animated.ScrollView>
        </View>
    );
}

function CategoryCard({
    emoji,
    title,
    highlight
}: {
    emoji: string;
    title: string;
    highlight: string;
}) {
    return (
        <TouchableOpacity style={styles.categoryCard} activeOpacity={0.7}>
            <Text style={styles.categoryEmoji}>{emoji}</Text>
            <View style={styles.categoryTextRow}>
                <Text style={styles.categoryTitle}>
                    {title} <Text style={styles.categoryHighlight}>{highlight}</Text>
                </Text>
                <Text style={styles.categoryArrow}>→</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    // Splash
    splashContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    splashLogoContainer: {
        alignItems: 'center',
    },
    splashLogo: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 42,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -1,
    },

    // Main
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
    },

    // Logo
    logo: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -1,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },

    // Hero
    heroContainer: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
    heroTitle: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '400',
        color: colors.text,
        lineHeight: 38,
    },
    heroAccent: {
        color: '#8B7FC7',
    },
    heroSubtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },

    // Cards
    cardsScroll: {
        flexGrow: 0,
        marginBottom: spacing.xl,
    },
    cardsScrollContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    categoryCard: {
        width: CARD_WIDTH,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        height: 130,
        justifyContent: 'space-between',
    },
    categoryEmoji: {
        fontSize: 40,
    },
    categoryTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryTitle: {
        ...typography.bodyMedium,
        color: colors.text,
        fontWeight: '500',
    },
    categoryHighlight: {
        color: '#8B7FC7',
    },
    categoryArrow: {
        ...typography.bodyMedium,
        color: colors.textTertiary,
    },
    findTreatmentCard: {
        width: CARD_WIDTH,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        height: 130,
        justifyContent: 'space-between',
    },
    findTreatmentTitle: {
        ...typography.bodyLarge,
        color: colors.primaryText,
        fontWeight: '600',
        lineHeight: 24,
    },
    findTreatmentArrow: {
        ...typography.bodyLarge,
        color: colors.primaryText,
        alignSelf: 'flex-end',
    },

    // Buttons
    buttonsContainer: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    primaryButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    secondaryButton: {
        borderWidth: 1.5,
        borderColor: '#8B7FC7',
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    secondaryButtonText: {
        ...typography.button,
        color: '#8B7FC7',
    },
    createAccountText: {
        ...typography.bodyMedium,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    createAccountLink: {
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    privacyText: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        textAlign: 'center',
    },

    // Bottom Tag
    bottomTag: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    bottomTagIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
    },
    bottomTagText: {
        ...typography.bodyMedium,
        color: colors.accent,
    },
});
