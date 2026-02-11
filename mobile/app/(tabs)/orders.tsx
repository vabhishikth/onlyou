import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, SafeAreaView, StatusBar } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

export default function OrdersScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Order history</Text>
                </View>

                {/* Empty State */}
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Text style={styles.emptyIcon}>📦</Text>
                    </View>
                    <Text style={styles.emptyTitle}>No orders yet</Text>
                    <Text style={styles.emptySubtitle}>
                        When you order prescriptions or products, they'll appear here
                    </Text>
                    <TouchableOpacity style={styles.browseButton} activeOpacity={0.8}>
                        <Text style={styles.browseButtonText}>Start shopping</Text>
                    </TouchableOpacity>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoIcon}>🚚</Text>
                        <Text style={styles.infoTitle}>Free shipping</Text>
                        <Text style={styles.infoSubtitle}>On all prescriptions</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoIcon}>🔒</Text>
                        <Text style={styles.infoTitle}>Discreet packaging</Text>
                        <Text style={styles.infoSubtitle}>Privacy guaranteed</Text>
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
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxl,
    },

    // Header
    header: {
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    emptyIcon: {
        fontSize: 48,
    },
    emptyTitle: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 22,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.lg,
    },
    browseButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
    },
    browseButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },

    // Info Section
    infoSection: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.xl,
    },
    infoCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoIcon: {
        fontSize: 28,
        marginBottom: spacing.sm,
    },
    infoTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    infoSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 2,
    },
});
