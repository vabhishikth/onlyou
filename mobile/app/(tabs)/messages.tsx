import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Platform,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import {
    GET_MY_CONVERSATIONS,
    GetConversationsResponse,
    Conversation,
    formatMessageTime,
    formatConversationPreview,
    VERTICAL_NAMES,
} from '@/graphql/messages';

export default function MessagesScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const { data, loading, refetch } = useQuery<GetConversationsResponse>(GET_MY_CONVERSATIONS, {
        fetchPolicy: 'cache-and-network',
    });

    const conversations = data?.myConversations || [];

    const onRefresh = React.useCallback(async () => {
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

    const renderConversation = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={styles.conversationCard}
            onPress={() => handleConversationPress(item)}
            activeOpacity={0.7}
        >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {item.doctorAvatar ? (
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {item.doctorName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {item.doctorName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                            {item.unreadCount > 9 ? '9+' : item.unreadCount}
                        </Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                    <Text style={styles.doctorName} numberOfLines={1}>
                        Dr. {item.doctorName}
                    </Text>
                    <Text style={styles.timestamp}>
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

            {/* Chevron */}
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
    );

    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading conversations...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
                <Text style={styles.subtitle}>
                    Chat with your healthcare providers
                </Text>
            </View>

            {conversations.length === 0 ? (
                /* Empty state */
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Text style={styles.emptyIcon}>💬</Text>
                    </View>
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptyText}>
                        After you start a consultation, you can message your doctor here
                    </Text>
                </View>
            ) : (
                /* Conversations list */
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderConversation}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                />
            )}
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
    loadingText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: spacing.md,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.primaryText,
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: colors.surfaceElevated,
    },
    unreadBadgeText: {
        ...typography.label,
        color: colors.primaryText,
        fontWeight: '700',
        fontSize: 10,
    },
    conversationContent: {
        flex: 1,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    doctorName: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    timestamp: {
        ...typography.label,
        color: colors.textTertiary,
        marginLeft: spacing.sm,
    },
    verticalLabel: {
        ...typography.label,
        color: colors.primary,
        marginTop: 2,
    },
    lastMessage: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    lastMessageUnread: {
        fontWeight: '600',
        color: colors.text,
    },
    chevron: {
        fontSize: 24,
        color: colors.textTertiary,
        marginLeft: spacing.sm,
    },
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
    emptyIcon: {
        fontSize: 48,
    },
    emptyTitle: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
});
