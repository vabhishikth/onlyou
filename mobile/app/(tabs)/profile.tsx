import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

// Placeholder - will be built in Task 8
export default function ProfileScreen() {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Log out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log out', style: 'destructive', onPress: logout },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                </View>

                {/* User info card */}
                <View style={styles.userCard}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {user?.name?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                            {user?.name || 'Complete your profile'}
                        </Text>
                        <Text style={styles.userPhone}>{user?.phone}</Text>
                        {!user?.isProfileComplete && (
                            <View style={styles.incompleteBadge}>
                                <Text style={styles.incompleteBadgeText}>
                                    Profile incomplete
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Placeholder sections */}
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>👤</Text>
                    <Text style={styles.placeholderTitle}>Profile & Settings</Text>
                    <Text style={styles.placeholderText}>
                        Full profile management, subscriptions, wallet, and preferences coming soon
                    </Text>
                </View>

                {/* Quick menu items */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuTitle}>Coming Soon</Text>

                    <View style={styles.menuItem}>
                        <Text style={styles.menuIcon}>📝</Text>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuLabel}>Personal Information</Text>
                            <Text style={styles.menuDesc}>Name, email, address, ID</Text>
                        </View>
                    </View>

                    <View style={styles.menuItem}>
                        <Text style={styles.menuIcon}>💳</Text>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuLabel}>Subscriptions</Text>
                            <Text style={styles.menuDesc}>Manage your treatment plans</Text>
                        </View>
                    </View>

                    <View style={styles.menuItem}>
                        <Text style={styles.menuIcon}>💰</Text>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuLabel}>Wallet</Text>
                            <Text style={styles.menuDesc}>Referral credits and refunds</Text>
                        </View>
                    </View>

                    <View style={styles.menuItem}>
                        <Text style={styles.menuIcon}>🔔</Text>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuLabel}>Notifications</Text>
                            <Text style={styles.menuDesc}>Push, SMS, WhatsApp, Email</Text>
                        </View>
                    </View>
                </View>

                {/* Logout button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Text style={styles.logoutButtonText}>Log out</Text>
                </TouchableOpacity>
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
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        ...typography.headingLarge,
        color: colors.primaryText,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: 2,
    },
    userPhone: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    incompleteBadge: {
        backgroundColor: colors.warningLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginTop: spacing.xs,
    },
    incompleteBadgeText: {
        ...typography.label,
        color: colors.warning,
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginBottom: spacing.xl,
    },
    placeholderIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    placeholderTitle: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    placeholderText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    menuSection: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    menuTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    menuContent: {
        flex: 1,
    },
    menuLabel: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    menuDesc: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    logoutButton: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    logoutButtonText: {
        ...typography.button,
        color: colors.error,
    },
});
