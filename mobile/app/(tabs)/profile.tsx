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
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

interface MenuItemProps {
    icon: string;
    label: string;
    description: string;
    onPress: () => void;
}

function MenuItem({ icon, label, description, onPress }: MenuItemProps) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{label}</Text>
                <Text style={styles.menuDesc}>{description}</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>
    );
}

export default function ProfileScreen() {
    const router = useRouter();
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
                <TouchableOpacity
                    style={styles.userCard}
                    onPress={() => router.push('/profile/edit' as never)}
                    activeOpacity={0.7}
                >
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
                                    Tap to complete
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.editChevron}>›</Text>
                </TouchableOpacity>

                {/* Account section */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuTitle}>Account</Text>

                    <MenuItem
                        icon="📝"
                        label="Personal Information"
                        description="Name, email, address, ID"
                        onPress={() => router.push('/profile/edit' as never)}
                    />

                    <MenuItem
                        icon="💳"
                        label="Subscriptions"
                        description="Manage your treatment plans"
                        onPress={() => router.push('/profile/subscriptions' as never)}
                    />

                    <MenuItem
                        icon="💰"
                        label="Wallet"
                        description="Referral credits and refunds"
                        onPress={() => router.push('/profile/wallet' as never)}
                    />
                </View>

                {/* Preferences section */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuTitle}>Preferences</Text>

                    <MenuItem
                        icon="🔔"
                        label="Notifications"
                        description="Push, SMS, WhatsApp, Email"
                        onPress={() => router.push('/profile/notifications' as never)}
                    />
                </View>

                {/* Support section */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuTitle}>Support</Text>

                    <MenuItem
                        icon="❓"
                        label="Help & FAQs"
                        description="Common questions and guides"
                        onPress={() => Alert.alert('Help', 'Help center coming soon')}
                    />

                    <MenuItem
                        icon="📞"
                        label="Contact Support"
                        description="Chat or call us"
                        onPress={() => Alert.alert('Support', 'Email: support@onlyou.life\nPhone: 1800-XXX-XXXX')}
                    />
                </View>

                {/* App info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appVersion}>Onlyou v1.0.0</Text>
                    <Text style={styles.appCopyright}>© 2026 Onlyou Health</Text>
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
        backgroundColor: colors.surfaceElevated,
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
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginTop: spacing.xs,
    },
    incompleteBadgeText: {
        ...typography.label,
        color: colors.primary,
    },
    editChevron: {
        fontSize: 24,
        color: colors.textTertiary,
    },
    menuSection: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    menuTitle: {
        ...typography.label,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.lg,
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
        fontWeight: '500',
        color: colors.text,
    },
    menuDesc: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 1,
    },
    menuChevron: {
        fontSize: 20,
        color: colors.textTertiary,
    },
    appInfo: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    appVersion: {
        ...typography.bodySmall,
        color: colors.textTertiary,
    },
    appCopyright: {
        ...typography.label,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
    logoutButton: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error,
    },
    logoutButtonText: {
        ...typography.button,
        color: colors.error,
    },
});
