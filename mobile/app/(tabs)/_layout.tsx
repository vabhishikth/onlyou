/**
 * Tab Layout
 * PR 6: Remaining Screens Restyle
 * Clinical Luxe design with Lucide icons
 */

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Home, Activity, ShoppingBag, MessageCircle, CircleUser } from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies } from '@/theme/typography';
import { dimensions } from '@/theme/spacing';

// Tab bar icon component
interface TabIconProps {
    name: string;
    focused: boolean;
    Icon: React.FC<{ size: number; color: string }>;
}

function TabIcon({ name, focused, Icon }: TabIconProps) {
    return (
        <View style={styles.tabIconContainer}>
            <Icon
                size={22}
                color={focused ? colors.textPrimary : colors.textTertiary}
            />
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
                tabBarActiveTintColor: colors.textPrimary,
                tabBarInactiveTintColor: colors.textTertiary,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Home" focused={focused} Icon={Home} />
                    ),
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Activity" focused={focused} Icon={Activity} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Orders" focused={focused} Icon={ShoppingBag} />
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Messages" focused={focused} Icon={MessageCircle} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Profile" focused={focused} Icon={CircleUser} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: Platform.OS === 'ios' ? dimensions.tabBarHeight : 68,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
    tabLabelFocused: {
        color: colors.textPrimary,
    },
});
