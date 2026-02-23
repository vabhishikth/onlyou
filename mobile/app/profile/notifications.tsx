import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/theme';
import {
    GET_NOTIFICATION_PREFERENCES,
    UPDATE_NOTIFICATION_PREFERENCES,
    GetNotificationPreferencesResponse,
} from '@/graphql/profile';

interface NotificationToggleProps {
    icon: string;
    label: string;
    description: string;
    value: boolean;
    onToggle: (value: boolean) => void;
}

function NotificationToggle({ icon, label, description, value, onToggle }: NotificationToggleProps) {
    return (
        <View style={styles.toggleRow}>
            <Text style={styles.toggleIcon}>{icon}</Text>
            <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>{label}</Text>
                <Text style={styles.toggleDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={value ? colors.primary : colors.surface}
            />
        </View>
    );
}

export default function NotificationsScreen() {
    const router = useRouter();

    const [pushEnabled, setPushEnabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(true);
    const [whatsappEnabled, setWhatsappEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [discreetMode, setDiscreetMode] = useState(false);

    const { data, loading } = useQuery<GetNotificationPreferencesResponse>(GET_NOTIFICATION_PREFERENCES);

    const [updatePreferences, { loading: updating }] = useMutation(UPDATE_NOTIFICATION_PREFERENCES, {
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    // Populate form with existing data
    useEffect(() => {
        if (data?.notificationPreferences) {
            setPushEnabled(data.notificationPreferences.pushEnabled);
            setSmsEnabled(data.notificationPreferences.smsEnabled);
            setWhatsappEnabled(data.notificationPreferences.whatsappEnabled);
            setEmailEnabled(data.notificationPreferences.emailEnabled);
            setDiscreetMode(data.notificationPreferences.discreetMode);
        }
    }, [data]);

    const handleToggle = (
        key: 'pushEnabled' | 'smsEnabled' | 'whatsappEnabled' | 'emailEnabled' | 'discreetMode',
        value: boolean
    ) => {
        // Update local state
        switch (key) {
            case 'pushEnabled':
                setPushEnabled(value);
                break;
            case 'smsEnabled':
                setSmsEnabled(value);
                break;
            case 'whatsappEnabled':
                setWhatsappEnabled(value);
                break;
            case 'emailEnabled':
                setEmailEnabled(value);
                break;
            case 'discreetMode':
                setDiscreetMode(value);
                break;
        }

        // Save to backend
        updatePreferences({
            variables: {
                input: {
                    pushEnabled: key === 'pushEnabled' ? value : pushEnabled,
                    smsEnabled: key === 'smsEnabled' ? value : smsEnabled,
                    whatsappEnabled: key === 'whatsappEnabled' ? value : whatsappEnabled,
                    emailEnabled: key === 'emailEnabled' ? value : emailEnabled,
                    discreetMode: key === 'discreetMode' ? value : discreetMode,
                },
            },
        });
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
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerSpacer}>
                    {updating && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Important Updates */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Important Updates</Text>
                    <Text style={styles.sectionDescription}>
                        These notifications keep you informed about your treatment
                    </Text>

                    <View style={styles.card}>
                        <NotificationToggle
                            icon="📱"
                            label="Push Notifications"
                            description="App notifications for appointments, lab results, and messages"
                            value={pushEnabled}
                            onToggle={(v) => handleToggle('pushEnabled', v)}
                        />

                        <View style={styles.divider} />

                        <NotificationToggle
                            icon="💬"
                            label="SMS"
                            description="Text messages for delivery OTP and urgent updates"
                            value={smsEnabled}
                            onToggle={(v) => handleToggle('smsEnabled', v)}
                        />

                        <View style={styles.divider} />

                        <NotificationToggle
                            icon="🟢"
                            label="WhatsApp"
                            description="Updates about your orders, lab bookings, and more"
                            value={whatsappEnabled}
                            onToggle={(v) => handleToggle('whatsappEnabled', v)}
                        />

                        <View style={styles.divider} />

                        <NotificationToggle
                            icon="📧"
                            label="Email"
                            description="Receipts, prescriptions, and detailed reports"
                            value={emailEnabled}
                            onToggle={(v) => handleToggle('emailEnabled', v)}
                        />
                    </View>
                </View>

                {/* Privacy */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy</Text>
                    <Text style={styles.sectionDescription}>
                        Control how sensitive information appears in notifications
                    </Text>

                    <View style={styles.card}>
                        <NotificationToggle
                            icon="🔒"
                            label="Discreet Mode"
                            description="Hide health details in notifications — shows only 'You have an update'"
                            value={discreetMode}
                            onToggle={(v) => handleToggle('discreetMode', v)}
                        />
                    </View>
                </View>

                {/* Info note */}
                <View style={styles.infoNote}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={styles.infoText}>
                        We'll always notify you about critical updates like prescription changes and urgent health alerts, regardless of these settings.
                    </Text>
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
        alignItems: 'flex-end',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    sectionDescription: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    card: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    toggleIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    toggleContent: {
        flex: 1,
    },
    toggleLabel: {
        ...typography.bodyMedium,
        fontWeight: '500',
        color: colors.text,
    },
    toggleDescription: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.xs,
    },
    infoNote: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'flex-start',
    },
    infoIcon: {
        fontSize: 16,
        marginRight: spacing.sm,
    },
    infoText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
});
