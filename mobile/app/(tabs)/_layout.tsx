import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, typography } from '@/styles/theme';

// Tab bar icon component
function TabIcon({
    name,
    focused,
    icon,
}: {
    name: string;
    focused: boolean;
    icon: string;
}) {
    return (
        <View style={styles.tabIconContainer}>
            <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                {icon}
            </Text>
            <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
                {name}
            </Text>
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Home" focused={focused} icon="🏠" />
                    ),
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Activity" focused={focused} icon="📋" />
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Messages" focused={focused} icon="💬" />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Profile" focused={focused} icon="👤" />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.surfaceElevated,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: Platform.OS === 'ios' ? 88 : 68,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIcon: {
        fontSize: 22,
        marginBottom: 2,
    },
    tabIconFocused: {
        // Focused style if needed
    },
    tabLabel: {
        ...typography.label,
        fontSize: 10,
        color: colors.textTertiary,
    },
    tabLabelFocused: {
        color: colors.primary,
        fontWeight: '600',
    },
});
