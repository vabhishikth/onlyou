import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import { GET_WALLET, GetWalletResponse, WalletTransaction, formatAmount } from '@/graphql/profile';

export default function WalletScreen() {
    const router = useRouter();

    const { data, loading } = useQuery<GetWalletResponse>(GET_WALLET);

    const wallet = data?.myWallet;

    const handleShareReferral = async () => {
        if (!wallet?.referralCode) return;

        try {
            await Share.share({
                message: `Join Onlyou for discreet healthcare. Use my referral code ${wallet.referralCode} and we both get credits! Download: https://onlyou.life/app`,
            });
        } catch {
            // User cancelled
        }
    };

    const getTransactionIcon = (type: WalletTransaction['type']) => {
        switch (type) {
            case 'CREDIT':
                return '➕';
            case 'DEBIT':
                return '➖';
            case 'REFERRAL':
                return '🎁';
            case 'REFUND':
                return '↩️';
            default:
                return '💰';
        }
    };

    const getTransactionColor = (type: WalletTransaction['type']) => {
        return type === 'DEBIT' ? colors.error : colors.success;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Wallet</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceAmount}>
                        {formatAmount(wallet?.balance || 0)}
                    </Text>
                    <Text style={styles.balanceNote}>
                        Use for consultations, medications, and lab tests
                    </Text>
                </View>

                {/* Referral Card */}
                <View style={styles.referralCard}>
                    <View style={styles.referralIcon}>
                        <Text style={styles.referralIconText}>🎁</Text>
                    </View>
                    <View style={styles.referralContent}>
                        <Text style={styles.referralTitle}>Refer & Earn</Text>
                        <Text style={styles.referralText}>
                            Share your code and get ₹200 when your friend completes their first consultation
                        </Text>
                        <View style={styles.referralCodeBox}>
                            <Text style={styles.referralCodeLabel}>Your code:</Text>
                            <Text style={styles.referralCode}>
                                {wallet?.referralCode || '---'}
                            </Text>
                        </View>
                        <View style={styles.referralStats}>
                            <Text style={styles.referralStat}>
                                {wallet?.totalReferrals || 0} friends referred
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={handleShareReferral}
                    >
                        <Text style={styles.shareButtonText}>Share</Text>
                    </TouchableOpacity>
                </View>

                {/* Transaction History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transaction History</Text>

                    {!wallet?.transactions?.length ? (
                        <View style={styles.emptyTransactions}>
                            <Text style={styles.emptyText}>No transactions yet</Text>
                        </View>
                    ) : (
                        wallet.transactions.map((transaction) => (
                            <View key={transaction.id} style={styles.transactionRow}>
                                <View style={styles.transactionIcon}>
                                    <Text style={styles.transactionIconText}>
                                        {getTransactionIcon(transaction.type)}
                                    </Text>
                                </View>
                                <View style={styles.transactionContent}>
                                    <Text style={styles.transactionDescription}>
                                        {transaction.description}
                                    </Text>
                                    <Text style={styles.transactionDate}>
                                        {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </Text>
                                </View>
                                <Text style={[
                                    styles.transactionAmount,
                                    { color: getTransactionColor(transaction.type) },
                                ]}>
                                    {transaction.type === 'DEBIT' ? '-' : '+'}
                                    {formatAmount(transaction.amount)}
                                </Text>
                            </View>
                        ))
                    )}
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: colors.text,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    balanceCard: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    balanceLabel: {
        ...typography.bodySmall,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: spacing.xs,
    },
    balanceAmount: {
        fontFamily: 'System',
        fontSize: 36,
        fontWeight: '700',
        color: colors.primaryText,
        marginBottom: spacing.xs,
    },
    balanceNote: {
        ...typography.label,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
    referralCard: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    referralIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accentLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    referralIconText: {
        fontSize: 24,
    },
    referralContent: {
        flex: 1,
    },
    referralTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    referralText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
        marginBottom: spacing.sm,
    },
    referralCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        alignSelf: 'flex-start',
    },
    referralCodeLabel: {
        ...typography.label,
        color: colors.textSecondary,
        marginRight: spacing.xs,
    },
    referralCode: {
        ...typography.bodyMedium,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1,
    },
    referralStats: {
        marginTop: spacing.xs,
    },
    referralStat: {
        ...typography.label,
        color: colors.textTertiary,
    },
    shareButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    shareButtonText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    emptyTransactions: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textTertiary,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    transactionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    transactionIconText: {
        fontSize: 16,
    },
    transactionContent: {
        flex: 1,
    },
    transactionDescription: {
        ...typography.bodyMedium,
        color: colors.text,
    },
    transactionDate: {
        ...typography.label,
        color: colors.textTertiary,
        marginTop: 2,
    },
    transactionAmount: {
        ...typography.bodyMedium,
        fontWeight: '600',
    },
});
