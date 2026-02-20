import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import {
    GET_MESSAGES,
    SEND_MESSAGE,
    MARK_MESSAGES_READ,
    GetMessagesResponse,
    Message,
    formatMessageTime,
} from '@/graphql/messages';
import { GET_PRESIGNED_UPLOAD_URL } from '@/graphql/intake';

export default function ChatScreen() {
    const { consultationId } = useLocalSearchParams<{ consultationId: string }>();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);

    // Fetch messages
    const { data, loading, refetch } = useQuery<GetMessagesResponse>(GET_MESSAGES, {
        variables: { consultationId, limit: 50 },
        skip: !consultationId,
        pollInterval: 5000, // Poll every 5 seconds for new messages
    });

    // Mark messages as read
    const [markRead] = useMutation(MARK_MESSAGES_READ);

    // Send message mutation
    const [sendMessage] = useMutation(SEND_MESSAGE);

    // Get presigned URL for attachments
    const [getPresignedUrl] = useMutation(GET_PRESIGNED_UPLOAD_URL);

    const messages = data?.messages || [];

    // Mark messages as read when screen opens
    useEffect(() => {
        if (consultationId) {
            markRead({ variables: { consultationId } }).catch(() => {});
        }
    }, [consultationId, markRead]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    const handleSendMessage = async () => {
        if (!messageText.trim() || sending) return;

        setSending(true);
        try {
            await sendMessage({
                variables: {
                    input: {
                        consultationId,
                        type: 'TEXT',
                        content: messageText.trim(),
                    },
                },
                refetchQueries: ['GetMessages'],
            });
            setMessageText('');
        } catch (error) {
            Alert.alert('Error', 'Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleAttachment = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        setSending(true);

        try {
            // Get presigned URL
            const { data: presignedData } = await getPresignedUrl({
                variables: {
                    input: {
                        filename: asset.fileName || 'image.jpg',
                        contentType: asset.mimeType || 'image/jpeg',
                        category: 'message_attachment',
                    },
                },
            });

            const { uploadUrl, fileUrl } = presignedData.getPresignedUploadUrl;

            // Upload to S3
            const response = await fetch(asset.uri);
            const blob = await response.blob();

            await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': asset.mimeType || 'image/jpeg',
                },
            });

            // Send message with attachment
            await sendMessage({
                variables: {
                    input: {
                        consultationId,
                        type: 'IMAGE',
                        content: 'Sent an image',
                        attachmentUrl: fileUrl,
                        attachmentName: asset.fileName || 'image.jpg',
                    },
                },
                refetchQueries: ['GetMessages'],
            });
        } catch {
            Alert.alert('Error', 'Failed to send attachment. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isPatient = item.senderType === 'PATIENT';
        const isSystem = item.senderType === 'SYSTEM';
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showTimestamp = index === 0 || !prevMessage ||
            new Date(item.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000;

        return (
            <View style={styles.messageWrapper}>
                {showTimestamp && (
                    <Text style={styles.dateHeader}>
                        {formatMessageTime(item.createdAt)}
                    </Text>
                )}

                {isSystem ? (
                    <View style={styles.systemMessage}>
                        <Text style={styles.systemMessageText}>{item.content}</Text>
                    </View>
                ) : (
                    <View style={[
                        styles.messageBubble,
                        isPatient ? styles.messageBubblePatient : styles.messageBubbleDoctor,
                    ]}>
                        {!isPatient && (
                            <Text style={styles.senderName}>{item.senderName}</Text>
                        )}

                        {item.type === 'IMAGE' && item.attachmentUrl && (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(item.attachmentUrl!)}
                            >
                                <View style={styles.imageAttachment}>
                                    <Text style={styles.imageAttachmentIcon}>📷</Text>
                                    <Text style={styles.imageAttachmentText}>
                                        {item.attachmentName || 'Image'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {item.type === 'FILE' && item.attachmentUrl && (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(item.attachmentUrl!)}
                            >
                                <View style={styles.fileAttachment}>
                                    <Text style={styles.fileAttachmentIcon}>📎</Text>
                                    <Text style={styles.fileAttachmentText}>
                                        {item.attachmentName || 'Attachment'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {item.type !== 'IMAGE' && (
                            <Text style={[
                                styles.messageText,
                                isPatient ? styles.messageTextPatient : styles.messageTextDoctor,
                            ]}>
                                {item.content}
                            </Text>
                        )}

                        <View style={styles.messageFooter}>
                            <Text style={[
                                styles.messageTime,
                                isPatient ? styles.messageTimePatient : styles.messageTimeDoctor,
                            ]}>
                                {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </Text>
                            {isPatient && item.readAt && (
                                <Text style={styles.readReceipt}>✓✓</Text>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Your Doctor</Text>
                    <Text style={styles.headerSubtitle}>Usually replies within 24 hours</Text>
                </View>
                <TouchableOpacity onPress={() => refetch()}>
                    <Text style={styles.refreshIcon}>🔄</Text>
                </TouchableOpacity>
            </View>

            {/* Messages list */}
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => {
                        flatListRef.current?.scrollToEnd({ animated: false });
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <Text style={styles.emptyChatIcon}>💬</Text>
                            <Text style={styles.emptyChatText}>
                                Send a message to start the conversation
                            </Text>
                        </View>
                    }
                />

                {/* Input area */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={handleAttachment}
                        disabled={sending}
                    >
                        <Text style={styles.attachButtonText}>📎</Text>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.textInput}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.textTertiary}
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                        maxLength={1000}
                        editable={!sending}
                    />

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!messageText.trim() || sending) && styles.sendButtonDisabled,
                        ]}
                        onPress={handleSendMessage}
                        disabled={!messageText.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={colors.primaryText} />
                        ) : (
                            <Text style={styles.sendButtonText}>→</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surfaceElevated,
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
    headerContent: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    headerSubtitle: {
        ...typography.label,
        color: colors.textSecondary,
    },
    refreshIcon: {
        fontSize: 20,
        padding: spacing.sm,
    },
    keyboardView: {
        flex: 1,
    },
    messagesList: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
    },
    messageWrapper: {
        marginBottom: spacing.sm,
    },
    dateHeader: {
        ...typography.label,
        color: colors.textTertiary,
        textAlign: 'center',
        marginVertical: spacing.md,
    },
    systemMessage: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        alignSelf: 'center',
        maxWidth: '80%',
    },
    systemMessageText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: spacing.md,
        borderRadius: borderRadius.xl,
    },
    messageBubblePatient: {
        alignSelf: 'flex-end',
        backgroundColor: colors.primary,
        borderBottomRightRadius: borderRadius.sm,
    },
    messageBubbleDoctor: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceElevated,
        borderBottomLeftRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    senderName: {
        ...typography.label,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    messageText: {
        ...typography.bodyMedium,
    },
    messageTextPatient: {
        color: colors.primaryText,
    },
    messageTextDoctor: {
        color: colors.text,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: spacing.xs,
    },
    messageTime: {
        ...typography.label,
        fontSize: 10,
    },
    messageTimePatient: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    messageTimeDoctor: {
        color: colors.textTertiary,
    },
    readReceipt: {
        marginLeft: spacing.xs,
        color: '#a0e7f0',
        fontSize: 10,
    },
    imageAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        marginBottom: spacing.xs,
    },
    imageAttachmentIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    imageAttachmentText: {
        ...typography.bodySmall,
        color: colors.primaryText,
    },
    fileAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        marginBottom: spacing.xs,
    },
    fileAttachmentIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    fileAttachmentText: {
        ...typography.bodySmall,
        color: colors.text,
    },
    emptyChat: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
    },
    emptyChatIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyChatText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    attachButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.xs,
    },
    attachButtonText: {
        fontSize: 24,
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginRight: spacing.sm,
        ...typography.bodyMedium,
        color: colors.text,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    sendButtonDisabled: {
        backgroundColor: colors.border,
    },
    sendButtonText: {
        fontSize: 20,
        color: colors.primaryText,
        fontWeight: '600',
    },
});
