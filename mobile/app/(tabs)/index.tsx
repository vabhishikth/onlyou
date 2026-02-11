import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, SafeAreaView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

type VerticalType = 'HAIR_LOSS' | 'SEXUAL_HEALTH' | 'PCOS_HORMONAL' | 'WEIGHT_MANAGEMENT';

interface VerticalConfig {
    id: VerticalType;
    title: string;
    highlight: string;
    icon: string;
    tagline: string;
    price: string;
    gradient: [string, string];
}

const VERTICALS: VerticalConfig[] = [
    {
        id: 'HAIR_LOSS',
        title: 'Hair',
        highlight: 'Loss',
        icon: '✨',
        tagline: 'Regrow thicker, fuller hair',
        price: '₹999/mo',
        gradient: ['#FEF3C7', '#FDE68A'],
    },
    {
        id: 'SEXUAL_HEALTH',
        title: 'Sexual',
        highlight: 'Health',
        icon: '💙',
        tagline: 'ED treatment that works',
        price: '₹799/mo',
        gradient: ['#DBEAFE', '#BFDBFE'],
    },
    {
        id: 'PCOS_HORMONAL',
        title: 'PCOS &',
        highlight: 'Hormones',
        icon: '🌸',
        tagline: 'Balance your hormones',
        price: '₹1,199/mo',
        gradient: ['#FCE7F3', '#FBCFE8'],
    },
    {
        id: 'WEIGHT_MANAGEMENT',
        title: 'Weight',
        highlight: 'Loss',
        icon: '💪',
        tagline: 'GLP-1 powered results',
        price: '₹2,499/mo',
        gradient: ['#D1FAE5', '#A7F3D0'],
    },
];

export default function HomeScreen() {
    const { user } = useAuth();

    const handleVerticalPress = (vertical: VerticalType) => {
        // Map vertical types to URL-friendly paths
        const verticalPaths: Record<VerticalType, string> = {
            HAIR_LOSS: 'hair-loss',
            SEXUAL_HEALTH: 'sexual-health',
            PCOS_HORMONAL: 'pcos',
            WEIGHT_MANAGEMENT: 'weight-management',
        };
        router.push(`/intake/${verticalPaths[vertical]}` as never);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Logo Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>onlyou</Text>
                </View>

                {/* Welcome Section */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>
                        Welcome{user?.name ? ',' : ''}{'\n'}
                        <Text style={styles.welcomeName}>{user?.name || 'to your health journey'}</Text>
                    </Text>
                    <Text style={styles.welcomeSubtitle}>
                        Private, personalized care delivered to your door
                    </Text>
                </View>

                {/* Treatment Categories */}
                <View style={styles.categoriesContainer}>
                    <Text style={styles.sectionTitle}>Choose your treatment</Text>

                    <View style={styles.cardsGrid}>
                        {VERTICALS.map((vertical) => (
                            <TouchableOpacity
                                key={vertical.id}
                                style={[
                                    styles.verticalCard,
                                    { backgroundColor: vertical.gradient[0] },
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleVerticalPress(vertical.id)}
                            >
                                <Text style={styles.verticalIcon}>{vertical.icon}</Text>
                                <View style={styles.verticalContent}>
                                    <Text style={styles.verticalTitle}>
                                        {vertical.title}{' '}
                                        <Text style={styles.verticalHighlight}>{vertical.highlight}</Text>
                                    </Text>
                                    <Text style={styles.verticalTagline}>{vertical.tagline}</Text>
                                </View>
                                <View style={styles.verticalFooter}>
                                    <Text style={styles.verticalPrice}>{vertical.price}</Text>
                                    <Text style={styles.verticalArrow}>→</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* How It Works */}
                <View style={styles.howItWorksSection}>
                    <Text style={styles.sectionTitle}>How it works</Text>

                    <View style={styles.stepsContainer}>
                        <StepCard
                            number="1"
                            title="Answer questions"
                            description="Quick medical intake (5 min)"
                        />
                        <StepCard
                            number="2"
                            title="Doctor reviews"
                            description="Licensed physician in 24h"
                        />
                        <StepCard
                            number="3"
                            title="Get treatment"
                            description="Discreet delivery to your door"
                        />
                    </View>
                </View>

                {/* Trust Badges */}
                <View style={styles.trustSection}>
                    <View style={styles.trustBadge}>
                        <Text style={styles.trustIcon}>🔒</Text>
                        <Text style={styles.trustText}>100% Private</Text>
                    </View>
                    <View style={styles.trustBadge}>
                        <Text style={styles.trustIcon}>👨‍⚕️</Text>
                        <Text style={styles.trustText}>Licensed Doctors</Text>
                    </View>
                    <View style={styles.trustBadge}>
                        <Text style={styles.trustIcon}>📦</Text>
                        <Text style={styles.trustText}>Discreet Shipping</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>Quick actions</Text>

                    <View style={styles.actionsGrid}>
                        <QuickAction
                            icon="💬"
                            title="Chat"
                            subtitle="Talk to care team"
                            onPress={() => router.push('/(tabs)/consult')}
                        />
                        <QuickAction
                            icon="📋"
                            title="Orders"
                            subtitle="Track shipments"
                            onPress={() => router.push('/(tabs)/orders')}
                        />
                    </View>
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView>
    );
}

function StepCard({
    number,
    title,
    description,
}: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{number}</Text>
            </View>
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepDescription}>{description}</Text>
            </View>
        </View>
    );
}

function QuickAction({
    icon,
    title,
    subtitle,
    onPress,
}: {
    icon: string;
    title: string;
    subtitle: string;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity style={styles.quickAction} activeOpacity={0.7} onPress={onPress}>
            <Text style={styles.quickActionIcon}>{icon}</Text>
            <Text style={styles.quickActionTitle}>{title}</Text>
            <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
    },

    // Header
    header: {
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    logo: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -1,
    },

    // Welcome
    welcomeSection: {
        marginBottom: spacing.xl,
    },
    welcomeTitle: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        color: colors.text,
        lineHeight: 36,
    },
    welcomeName: {
        fontWeight: '600',
    },
    welcomeSubtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },

    // Categories
    categoriesContainer: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    cardsGrid: {
        gap: spacing.md,
    },
    verticalCard: {
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        flexDirection: 'row',
        alignItems: 'center',
    },
    verticalIcon: {
        fontSize: 36,
        marginRight: spacing.md,
    },
    verticalContent: {
        flex: 1,
    },
    verticalTitle: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.text,
    },
    verticalHighlight: {
        color: colors.primary,
    },
    verticalTagline: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    verticalFooter: {
        alignItems: 'flex-end',
    },
    verticalPrice: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.text,
    },
    verticalArrow: {
        ...typography.headingMedium,
        color: colors.primary,
        marginTop: spacing.xs,
    },

    // How It Works
    howItWorksSection: {
        marginBottom: spacing.xl,
    },
    stepsContainer: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    stepNumberText: {
        ...typography.bodySmall,
        fontWeight: '700',
        color: colors.primaryText,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    stepDescription: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },

    // Trust Badges
    trustSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.sm,
    },
    trustBadge: {
        alignItems: 'center',
    },
    trustIcon: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    trustText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    // Quick Actions
    actionsSection: {
        marginBottom: spacing.xl,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    quickAction: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickActionIcon: {
        fontSize: 28,
        marginBottom: spacing.sm,
    },
    quickActionTitle: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.text,
    },
    quickActionSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },

    bottomPadding: {
        height: spacing.xl,
    },
});
