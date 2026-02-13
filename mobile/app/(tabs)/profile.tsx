/**
 * Profile Screen
 * PR 6: Remaining Screens Restyle
 * Clinical Luxe design system with settings sections
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Pressable,
    Switch,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
    User,
    CreditCard,
    Wallet,
    FileText,
    TestTube2,
    ClipboardList,
    Bell,
    Eye,
    Settings,
    HelpCircle,
    Phone,
    Info,
    LogOut,
    ChevronRight,
    Edit3,
} from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();

    // Toggle states
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [discreetModeEnabled, setDiscreetModeEnabled] = useState(false);

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

    const formatPhone = (phone: string) => {
        // Format: +91 98765 43210
        return phone?.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3') || '';
    };

    const getInitials = (name: string) => {
        return name?.charAt(0).toUpperCase() || '?';
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']} testID="profile-screen">
            <ScrollView
                testID="profile-scroll-view"
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header / User Info */}
                <Animated.View entering={FadeInUp.duration(300)} style={styles.header}>
                    <View testID="user-avatar" style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {getInitials(user?.name || '')}
                        </Text>
                    </View>
                    <Text style={styles.userName}>
                        {user?.name || 'Complete your profile'}
                    </Text>
                    <Text style={styles.userPhone}>
                        {formatPhone(user?.phone || '')}
                    </Text>
                    <Pressable
                        testID="edit-profile-button"
                        style={styles.editButton}
                        onPress={() => router.push('/profile/edit' as never)}
                    >
                        <Edit3 size={14} color={colors.accent} />
                        <Text style={styles.editButtonText}>Edit profile</Text>
                    </Pressable>
                </Animated.View>

                {/* Account Section */}
                <Animated.View
                    entering={FadeInUp.delay(50).duration(300)}
                    testID="section-account"
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    <View style={styles.sectionContent}>
                        <SettingsRow
                            testID="row-personal-info"
                            icon={User}
                            label="Personal Information"
                            onPress={() => router.push('/profile/edit' as never)}
                        />
                        <SettingsRow
                            testID="row-subscriptions"
                            icon={CreditCard}
                            label="Subscription & Plans"
                            onPress={() => router.push('/profile/subscriptions' as never)}
                            showDivider
                        />
                        <SettingsRow
                            testID="row-wallet"
                            icon={Wallet}
                            label="Wallet & Payments"
                            onPress={() => router.push('/profile/wallet' as never)}
                            showDivider
                        />
                    </View>
                </Animated.View>

                {/* Health Section */}
                <Animated.View
                    entering={FadeInUp.delay(100).duration(300)}
                    testID="section-health"
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>HEALTH</Text>
                    <View style={styles.sectionContent}>
                        <SettingsRow
                            testID="row-prescriptions"
                            icon={FileText}
                            label="My Prescriptions"
                            onPress={() => router.push('/profile/prescriptions' as never)}
                        />
                        <SettingsRow
                            testID="row-lab-results"
                            icon={TestTube2}
                            label="My Lab Results"
                            onPress={() => router.push('/profile/lab-results' as never)}
                            showDivider
                        />
                        <SettingsRow
                            testID="row-health-profile"
                            icon={ClipboardList}
                            label="Health Profile"
                            onPress={() => router.push('/profile/health' as never)}
                            showDivider
                        />
                    </View>
                </Animated.View>

                {/* Preferences Section */}
                <Animated.View
                    entering={FadeInUp.delay(150).duration(300)}
                    testID="section-preferences"
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>PREFERENCES</Text>
                    <View style={styles.sectionContent}>
                        <ToggleRow
                            testID="row-notifications"
                            toggleTestID="toggle-notifications"
                            icon={Bell}
                            label="Notifications"
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                        />
                        <ToggleRow
                            testID="row-discreet-mode"
                            toggleTestID="toggle-discreet-mode"
                            icon={Eye}
                            label="Discreet Mode"
                            value={discreetModeEnabled}
                            onValueChange={setDiscreetModeEnabled}
                            showDivider
                        />
                        <SettingsRow
                            testID="row-language"
                            icon={Settings}
                            label="Language"
                            value="English"
                            onPress={() => Alert.alert('Language', 'Language selection coming soon')}
                            showDivider
                        />
                    </View>
                </Animated.View>

                {/* Support Section */}
                <Animated.View
                    entering={FadeInUp.delay(200).duration(300)}
                    testID="section-support"
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>SUPPORT</Text>
                    <View style={styles.sectionContent}>
                        <SettingsRow
                            testID="row-help"
                            icon={HelpCircle}
                            label="Help & FAQ"
                            onPress={() => Alert.alert('Help', 'Help center coming soon')}
                        />
                        <SettingsRow
                            testID="row-contact"
                            icon={Phone}
                            label="Contact Support"
                            onPress={() => Alert.alert('Support', 'Email: support@onlyou.life\nPhone: 1800-XXX-XXXX')}
                            showDivider
                        />
                        <SettingsRow
                            testID="row-about"
                            icon={Info}
                            label="About Onlyou"
                            onPress={() => Alert.alert('About', 'Onlyou v1.0.0\n© 2026 Onlyou Health')}
                            showDivider
                        />
                    </View>
                </Animated.View>

                {/* Logout */}
                <Animated.View entering={FadeInUp.delay(250).duration(300)}>
                    <Pressable
                        testID="logout-button"
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <LogOut size={20} color={colors.error} />
                        <Text style={styles.logoutText}>Log out</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Settings Row Component
interface SettingsRowProps {
    testID: string;
    icon: React.FC<{ size: number; color: string }>;
    label: string;
    value?: string;
    onPress: () => void;
    showDivider?: boolean;
}

function SettingsRow({ testID, icon: Icon, label, value, onPress, showDivider }: SettingsRowProps) {
    return (
        <>
            {showDivider && <View style={styles.divider} />}
            <Pressable testID={testID} style={styles.row} onPress={onPress}>
                <Icon size={20} color={colors.textTertiary} />
                <Text style={styles.rowLabel}>{label}</Text>
                {value && <Text style={styles.rowValue}>{value}</Text>}
                <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
        </>
    );
}

// Toggle Row Component
interface ToggleRowProps {
    testID: string;
    toggleTestID: string;
    icon: React.FC<{ size: number; color: string }>;
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    showDivider?: boolean;
}

function ToggleRow({ testID, toggleTestID, icon: Icon, label, value, onValueChange, showDivider }: ToggleRowProps) {
    return (
        <>
            {showDivider && <View style={styles.divider} />}
            <View testID={testID} style={styles.row}>
                <Icon size={20} color={colors.textTertiary} />
                <Text style={styles.rowLabel}>{label}</Text>
                <Switch
                    testID={toggleTestID}
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#E0E0E0', true: colors.textPrimary }}
                    thumbColor={colors.white}
                    ios_backgroundColor="#E0E0E0"
                />
            </View>
        </>
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
        paddingBottom: spacing['3xl'],
    },

    // Header
    header: {
        alignItems: 'center',
        marginBottom: spacing['2xl'],
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
        color: colors.textPrimary,
    },
    userName: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 24,
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },
    userPhone: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        gap: spacing.xs,
    },
    editButtonText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.label,
        color: colors.accent,
    },

    // Section
    section: {
        marginBottom: spacing['2xl'],
    },
    sectionTitle: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginBottom: spacing.md,
    },
    sectionContent: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },

    // Row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        paddingHorizontal: spacing.md,
        gap: spacing.md,
    },
    rowLabel: {
        flex: 1,
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    rowValue: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textTertiary,
        marginRight: spacing.sm,
    },
    divider: {
        height: 0.5,
        backgroundColor: colors.borderLight,
        marginLeft: spacing.md + 20 + spacing.md, // icon + gap offset
    },

    // Logout
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        marginTop: spacing.xl,
        gap: spacing.sm,
    },
    logoutText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.body,
        color: colors.error,
    },
});
