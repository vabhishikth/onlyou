/**
 * Home Screen
 * PR 4: Home Dashboard Restyle with Clinical Luxe design system
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ShieldCheck, Stethoscope, Package, MessageCircle } from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import { useAuth } from '@/lib/auth';
import { GET_AVAILABLE_VERTICALS, VerticalInfo } from '@/graphql/intake';
import { GET_ACTIVE_TRACKING, ActiveTrackingResponse } from '@/graphql/tracking';
import TreatmentCard from '@/components/TreatmentCard';
import ActiveOrderBanner from '@/components/ActiveOrderBanner';

// Map vertical ID to icon name
const verticalIcons = {
    HAIR_LOSS: 'Sparkles',
    SEXUAL_HEALTH: 'Heart',
    PCOS: 'Flower2',
    WEIGHT_MANAGEMENT: 'Scale',
} as const;

// Default verticals if API isn't ready yet
const DEFAULT_VERTICALS: VerticalInfo[] = [
    {
        id: 'HAIR_LOSS',
        name: 'Hair Loss',
        description: 'Clinically-proven treatments for hair thinning and loss',
        tagline: 'Thicker, fuller hair with personalised treatments',
        pricePerMonth: 99900, // ₹999 in paise
        icon: '💇',
        color: '#B8A472',
    },
    {
        id: 'SEXUAL_HEALTH',
        name: 'Sexual Health',
        description: 'Private consultations for intimate health concerns',
        tagline: 'Discreet care for ED and performance concerns',
        pricePerMonth: 79900, // ₹799 in paise
        icon: '❤️',
        color: '#7E86AD',
    },
    {
        id: 'PCOS',
        name: 'PCOS',
        description: 'Comprehensive care for polycystic ovary syndrome',
        tagline: 'Manage symptoms and restore hormonal balance',
        pricePerMonth: 119900, // ₹1,199 in paise
        icon: '🌸',
        color: '#AD7E8E',
    },
    {
        id: 'WEIGHT_MANAGEMENT',
        name: 'Weight Management',
        description: 'Medically-supervised weight loss programs',
        tagline: 'Science-backed plans that work for your body',
        pricePerMonth: 249900, // ₹2,499 in paise
        icon: '⚖️',
        color: '#6E9E7E',
    },
];

// Feature items for "Why Onlyou" section
const FEATURES = [
    {
        icon: Stethoscope,
        title: 'Expert Doctors',
        description: 'Board-certified specialists',
    },
    {
        icon: ShieldCheck,
        title: '100% Private',
        description: 'Discreet packaging & care',
    },
    {
        icon: Package,
        title: 'Doorstep Delivery',
        description: 'Medication delivered free',
    },
    {
        icon: MessageCircle,
        title: '24/7 Support',
        description: 'Message your doctor anytime',
    },
];

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function HomeScreen() {
    const { user } = useAuth();
    const [refreshing, setRefreshing] = React.useState(false);

    // Fetch available verticals
    const {
        data: verticalsData,
        loading: verticalsLoading,
        refetch: refetchVerticals,
    } = useQuery<{ availableVerticals: VerticalInfo[] }>(GET_AVAILABLE_VERTICALS, {
        fetchPolicy: 'cache-first',
    });

    // Fetch active tracking items
    const {
        data: trackingData,
        refetch: refetchTracking,
    } = useQuery<ActiveTrackingResponse>(GET_ACTIVE_TRACKING, {
        fetchPolicy: 'cache-and-network',
    });

    const verticals = verticalsData?.availableVerticals || DEFAULT_VERTICALS;
    const labOrders = trackingData?.activeTracking?.labOrders || [];
    const deliveryOrders = trackingData?.activeTracking?.deliveryOrders || [];

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refetchVerticals(), refetchTracking()]);
        } finally {
            setRefreshing(false);
        }
    }, [refetchVerticals, refetchTracking]);

    const firstName = user?.name?.split(' ')[0] || '';

    return (
        <SafeAreaView style={styles.container} edges={['top']} testID="home-screen">
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                testID="home-scroll-view"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accent}
                        colors={[colors.accent]}
                    />
                }
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInUp.delay(0).duration(400)}
                    style={styles.header}
                >
                    <Text style={styles.greeting}>
                        {getGreeting()}{firstName ? `, ${firstName}` : ''}
                    </Text>
                    <Text style={styles.title}>What can we help with?</Text>
                </Animated.View>

                {/* Active Order Banner */}
                <Animated.View entering={FadeInUp.delay(100).duration(400)}>
                    <ActiveOrderBanner
                        labOrders={labOrders}
                        deliveryOrders={deliveryOrders}
                    />
                </Animated.View>

                {/* Treatment Cards */}
                {verticalsLoading && !verticals.length ? (
                    <View style={styles.loadingContainer} testID="home-loading">
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                ) : (
                    <Animated.View
                        entering={FadeInUp.delay(200).duration(400)}
                        style={styles.cardsSection}
                    >
                        <Text style={styles.sectionTitle}>Start your health journey</Text>
                        {verticals.map((vertical, index) => (
                            <Animated.View
                                key={vertical.id}
                                entering={FadeInUp.delay(300 + index * 80).duration(400)}
                            >
                                <TreatmentCard
                                    id={vertical.id}
                                    name={vertical.name}
                                    tagline={vertical.tagline}
                                    icon={verticalIcons[vertical.id]}
                                    pricePerMonth={vertical.pricePerMonth}
                                />
                            </Animated.View>
                        ))}
                    </Animated.View>
                )}

                {/* Why Onlyou Section */}
                <Animated.View
                    entering={FadeInUp.delay(600).duration(400)}
                    style={styles.whySection}
                    testID="why-onlyou-section"
                >
                    <Text style={styles.whySectionTitle}>Why Onlyou?</Text>
                    <View style={styles.featureGrid}>
                        {FEATURES.map((feature, index) => {
                            const IconComponent = feature.icon;
                            return (
                                <View key={index} style={styles.featureItem}>
                                    <View style={styles.featureIconContainer}>
                                        <IconComponent
                                            size={24}
                                            color={colors.accent}
                                            strokeWidth={1.5}
                                        />
                                    </View>
                                    <Text style={styles.featureTitle}>{feature.title}</Text>
                                    <Text style={styles.featureDesc}>{feature.description}</Text>
                                </View>
                            );
                        })}
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.lg,
        paddingBottom: spacing['4xl'],
    },
    header: {
        marginBottom: spacing.xl,
    },
    greeting: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.label,
        color: colors.textTertiary,
        marginBottom: spacing.xs,
    },
    title: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.title,
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },
    loadingContainer: {
        paddingVertical: spacing['4xl'],
        alignItems: 'center',
    },
    cardsSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.cardTitle,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    whySection: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    whySectionTitle: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.sectionH,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    featureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing.xs,
    },
    featureItem: {
        width: '50%',
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accentLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    featureTitle: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.label,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 2,
    },
    featureDesc: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
