/**
 * Messages Screen
 * PR 6: Remaining Screens Restyle
 * Clinical Luxe design system with conversation list
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Pressable,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { MessageCircle, ChevronRight } from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import {
    GET_MY_CONVERSATIONS,
    GetConversationsResponse,
    Conversation,
    formatMessageTime,
    formatConversationPreview,
} from '@/graphql/messages';

// Vertical display names
const VERTICAL_NAMES: Record<string, string> = {
    HAIR_LOSS: 'Hair Loss',
    SEXUAL_HEALTH: 'Sexual Health',
    PCOS: 'PCOS',
    WEIGHT_MANAGEMENT: 'Weight Management',
};

export default function MessagesScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const { data, loading, refetch } = useQuery<GetConversationsResponse>(GET_MY_CONVERSATIONS, {
        fetchPolicy: 'cache-and-network',
    });

    const conversations = data?.myConversations || [];

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);

    const handleConversationPress = (conversation: Conversation) => {
        router.push(`/chat/${conversation.consultationId}` as never);
    };

    // Loading skeleton
    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container} edges={['top']} testID="messages-screen">
                <View style={styles.header}>
                    <Text style={styles.title}>Messages</Text>
                </View>
                <View testID="loading-skeleton" style={styles.skeletonContainer}>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </View>
            </SafeAreaView>
        );
    }

    const renderConversation = ({ item, index }: { item: Conversation; index: number }) => (
        <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
            <Pressable
                testID={`conversation-${item.id}`}
                style={[
                    styles.conversationRow,
                    index < conversations.length - 1 && styles.conversationRowBorder,
                ]}
                onPress={() => handleConversationPress(item)}
            >
                {/* Avatar */}
                <View testID={`avatar-${item.id}`} style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.doctorName.charAt(0).toUpperCase()}
                    </Text>
                </View>

                {/* Content */}
                <View style={styles.conversationContent}>
                    <View style={styles.nameRow}>
                        <Text style={styles.doctorName} numberOfLines={1}>
                            Dr. {item.doctorName}
                        </Text>
                        <Text testID={`timestamp-${item.id}`} style={styles.timestamp}>
                            {item.lastMessage ? formatMessageTime(item.lastMessage.createdAt) : ''}
                        </Text>
                    </View>

                    <Text style={styles.verticalLabel}>
                        {VERTICAL_NAMES[item.vertical] || item.vertical}
                    </Text>

                    <Text
                        style={[
                            styles.lastMessage,
                            item.unreadCount > 0 && styles.lastMessageUnread,
                        ]}
                        numberOfLines={1}
                    >
                        {item.lastMessage?.senderType === 'PATIENT' && 'You: '}
                        {formatConversationPreview(item.lastMessage)}
                    </Text>
                </View>

                {/* Unread indicator & Chevron */}
                <View style={styles.rowRight}>
                    {item.unreadCount > 0 && (
                        <View testID={`unread-indicator-${item.id}`} style={styles.unreadDot} />
                    )}
                    <ChevronRight size={18} color={colors.textMuted} />
                </View>
            </Pressable>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']} testID="messages-screen">
            {/* Header */}
            <Animated.View entering={FadeInUp.duration(300)} style={styles.header}>
                <Text style={styles.title}>Messages</Text>
            </Animated.View>

            {conversations.length === 0 ? (
                /* Empty state */
                <Animated.View
                    entering={FadeInUp.delay(100).duration(300)}
                    style={styles.emptyState}
                    testID="empty-state"
                >
                    <View testID="empty-state-icon" style={styles.emptyIconContainer}>
                        <MessageCircle size={48} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptyText}>
                        Your care team will message you after your consultation begins.
                    </Text>
                </Animated.View>
            ) : (
                /* Conversations list */
                <FlatList
                    testID="conversation-list"
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderConversation}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.accent}
                            colors={[colors.accent]}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

// Skeleton row for loading state
function SkeletonRow() {
    return (
        <View style={styles.skeletonRow}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonContent}>
                <View style={styles.skeletonName} />
                <View style={styles.skeletonMessage} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
    },
    title: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },
    listContent: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingBottom: spacing['3xl'],
    },

    // Conversation Row
    conversationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    conversationRowBorder: {
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderLight,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.cardTitle,
        color: colors.textPrimary,
    },
    conversationContent: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    doctorName: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
        flex: 1,
    },
    timestamp: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textMuted,
        marginLeft: spacing.sm,
    },
    verticalLabel: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        color: colors.accent,
        marginTop: 2,
    },
    lastMessage: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
    lastMessageUnread: {
        fontFamily: fontFamilies.sansMedium,
        color: colors.textPrimary,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accent,
        marginRight: spacing.sm,
    },

    // Empty State
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.sectionH,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        lineHeight: fontSizes.body * 1.5,
    },

    // Skeleton
    skeletonContainer: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.md,
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderLight,
    },
    skeletonAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.border,
        marginRight: spacing.md,
    },
    skeletonContent: {
        flex: 1,
    },
    skeletonName: {
        width: '50%',
        height: 16,
        backgroundColor: colors.border,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    skeletonMessage: {
        width: '80%',
        height: 14,
        backgroundColor: colors.border,
        borderRadius: borderRadius.md,
    },
});
