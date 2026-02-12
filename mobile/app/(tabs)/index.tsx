import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Platform,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { colors, spacing, typography } from '@/styles/theme';
import { useAuth } from '@/lib/auth';
import { GET_AVAILABLE_VERTICALS, VerticalInfo } from '@/graphql/intake';
import { GET_ACTIVE_TRACKING, ActiveTrackingResponse } from '@/graphql/tracking';
import ConditionCard from '@/components/ConditionCard';
import TrackingBanner from '@/components/TrackingBanner';

// Default verticals if API isn't ready yet
const DEFAULT_VERTICALS: VerticalInfo[] = [
    {
        id: 'HAIR_LOSS',
        name: 'Hair Loss',
        description: 'Clinically-proven treatments for hair thinning and loss',
        tagline: 'Thicker, fuller hair with personalised treatments',
        pricePerMonth: 999,
        icon: '💇',
        color: '#8B5A2B',
    },
    {
        id: 'SEXUAL_HEALTH',
        name: 'Sexual Health',
        description: 'Private consultations for intimate health concerns',
        tagline: 'Discreet care for ED and performance concerns',
        pricePerMonth: 1499,
        icon: '❤️',
        color: '#C41E3A',
    },
    {
        id: 'PCOS',
        name: 'PCOS',
        description: 'Comprehensive care for polycystic ovary syndrome',
        tagline: 'Manage symptoms and restore hormonal balance',
        pricePerMonth: 1299,
        icon: '🌸',
        color: '#FF69B4',
    },
    {
        id: 'WEIGHT_MANAGEMENT',
        name: 'Weight Management',
        description: 'Medically-supervised weight loss programs',
        tagline: 'Science-backed plans that work for your body',
        pricePerMonth: 1999,
        icon: '⚖️',
        color: '#228B22',
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>
                        {getGreeting()}{firstName ? `, ${firstName}` : ''}
                    </Text>
                    <Text style={styles.title}>What can we help with?</Text>
                </View>

                {/* Active Tracking Banner */}
                <TrackingBanner
                    labOrders={labOrders}
                    deliveryOrders={deliveryOrders}
                />

                {/* Condition Cards */}
                {verticalsLoading && !verticals.length ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <View style={styles.cardsSection}>
                        <Text style={styles.sectionTitle}>Start your health journey</Text>
                        {verticals.map((vertical) => (
                            <ConditionCard
                                key={vertical.id}
                                id={vertical.id}
                                name={vertical.name}
                                tagline={vertical.tagline}
                                icon={vertical.icon}
                                color={vertical.color}
                                pricePerMonth={vertical.pricePerMonth}
                            />
                        ))}
                    </View>
                )}

                {/* Why Onlyou Section */}
                <View style={styles.whySection}>
                    <Text style={styles.whySectionTitle}>Why Onlyou?</Text>
                    <View style={styles.featureGrid}>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>👨‍⚕️</Text>
                            <Text style={styles.featureTitle}>Expert Doctors</Text>
                            <Text style={styles.featureDesc}>
                                Board-certified specialists
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>🔒</Text>
                            <Text style={styles.featureTitle}>100% Private</Text>
                            <Text style={styles.featureDesc}>
                                Discreet packaging & care
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>💊</Text>
                            <Text style={styles.featureTitle}>Doorstep Delivery</Text>
                            <Text style={styles.featureDesc}>
                                Medication delivered free
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>💬</Text>
                            <Text style={styles.featureTitle}>24/7 Support</Text>
                            <Text style={styles.featureDesc}>
                                Message your doctor anytime
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
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
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    header: {
        marginBottom: spacing.xl,
    },
    greeting: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
    },
    loadingContainer: {
        paddingVertical: spacing.xxxl,
        alignItems: 'center',
    },
    cardsSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    whySection: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    whySectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
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
    featureIcon: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    featureTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 2,
    },
    featureDesc: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
