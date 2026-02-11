import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

// Hims-inspired colors
const colors = {
    active: '#000000',
    inactive: '#999999',
    background: '#FFFFFF',
    border: '#F0F0F0',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
    const icons: Record<string, string> = {
        home: '🏠',
        consult: '💬',
        orders: '📦',
        profile: '👤',
    };

    return (
        <View style={styles.iconContainer}>
            <Text style={[
                styles.icon,
                { opacity: focused ? 1 : 0.5 }
            ]}>
                {icons[name] || '⚪'}
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
                tabBarActiveTintColor: colors.active,
                tabBarInactiveTintColor: colors.inactive,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="consult"
                options={{
                    title: 'Consult',
                    tabBarIcon: ({ focused }) => <TabIcon name="consult" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ focused }) => <TabIcon name="orders" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
        paddingBottom: 8,
        height: 70,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 22,
    },
});
