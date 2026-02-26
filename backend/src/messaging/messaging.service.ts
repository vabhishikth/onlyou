import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationStatus, HealthVertical, UserRole } from '@prisma/client';

// Spec: master spec Section 5.5 (Messaging)
// Spec: hair-loss spec Section 7 (Canned Messages)

// Canned response structure
export interface CannedResponse {
  id: string;
  label: string;
  content: string;
}

// Spec: hair-loss spec Section 7 — Canned Messages (Hair Loss)
export const HAIR_LOSS_CANNED_RESPONSES: CannedResponse[] = [
  {
    id: 'treatment_ready',
    label: 'Treatment Plan Ready',
    content:
      'Your treatment plan is ready! Apply minoxidil twice daily to dry scalp and take finasteride once daily with or without food.',
  },
  {
    id: 'clearer_photos',
    label: 'Request Clearer Photos',
    content:
      'I need clearer photos. Please retake in natural light with dry, unstyled hair.',
  },
  {
    id: 'blood_tests',
    label: 'Order Blood Tests',
    content:
      'Please get the following blood tests: TSH, CBC, Ferritin, Vitamin D.',
  },
  {
    id: 'good_progress',
    label: 'Good Progress',
    content:
      'Great progress! Hair density is improving. Continue current treatment.',
  },
  {
    id: 'adjust_treatment',
    label: 'Adjust Treatment',
    content:
      "I'd like to adjust your treatment. Adding ketoconazole shampoo twice weekly.",
  },
  {
    id: 'assessment_result',
    label: 'Assessment Result',
    content:
      'Based on my assessment, your hair loss appears to be [condition]. I recommend [action].',
  },
];

// Send message input
export interface SendMessageInput {
  consultationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf' | 'document';
}

// Message with receipts
export interface MessageWithReceipts {
  id: string;
  consultationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  isFromAI: boolean;
  createdAt: Date;
  readAt: Date | null;
  sender?: {
    id: string;
    name: string | null;
    role: UserRole;
  };
}

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get canned responses for a vertical
   * Spec: hair-loss spec Section 7
   */
  getCannedResponses(vertical: HealthVertical): CannedResponse[] {
    switch (vertical) {
      case HealthVertical.HAIR_LOSS:
        return HAIR_LOSS_CANNED_RESPONSES;
      // Other verticals would have their own canned responses
      default:
        return HAIR_LOSS_CANNED_RESPONSES;
    }
  }

  /**
   * Verify user exists
   */
  private async getUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Verify consultation exists and user has access
   */
  private async verifyConsultationAccess(
    consultationId: string,
    userId: string
  ): Promise<any> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    const user = await this.getUser(userId);

    // Check if user is part of this consultation
    const isPatient = consultation.patientId === userId;
    const isDoctor = consultation.doctorId === userId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isPatient && !isDoctor && !isAdmin) {
      throw new ForbiddenException('You do not have access to this consultation');
    }

    return { consultation, user, isPatient, isDoctor };
  }

  /**
   * Send a message in a consultation
   * Spec: master spec Section 5.5 — Threaded chat per consultation
   */
  async sendMessage(input: SendMessageInput): Promise<MessageWithReceipts> {
    const { consultation, user: _user, isPatient } = await this.verifyConsultationAccess(
      input.consultationId,
      input.senderId
    );

    // Create the message
    const message = await this.prisma.message.create({
      data: {
        consultationId: input.consultationId,
        senderId: input.senderId,
        content: input.content,
        attachmentUrl: input.attachmentUrl,
        attachmentType: input.attachmentType,
        isFromAI: false,
        createdAt: new Date(),
      },
    });

    // If patient sends message and consultation is in NEEDS_INFO, return to DOCTOR_REVIEWING
    if (isPatient && consultation.status === ConsultationStatus.NEEDS_INFO) {
      await this.prisma.consultation.update({
        where: { id: input.consultationId },
        data: { status: ConsultationStatus.DOCTOR_REVIEWING },
      });
    }

    return message as MessageWithReceipts;
  }

  /**
   * Mark a message as read
   * Spec: master spec Section 5.5 — Read receipts
   */
  async markAsRead(messageId: string, userId: string): Promise<MessageWithReceipts> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Sender cannot mark their own message as read
    if (message.senderId === userId) {
      throw new BadRequestException('Cannot mark your own message as read');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });

    return updated as MessageWithReceipts;
  }

  /**
   * Mark all unread messages in a consultation as read
   */
  async markAllAsRead(
    consultationId: string,
    userId: string
  ): Promise<{ count: number }> {
    await this.verifyConsultationAccess(consultationId, userId);

    const result = await this.prisma.message.updateMany({
      where: {
        consultationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { count: result.count };
  }

  /**
   * Request more info from patient
   * Spec: Doctor sends "Request More Info" → case status changes to Awaiting Response
   */
  async requestMoreInfo(
    consultationId: string,
    doctorId: string,
    message: string
  ): Promise<{ message: MessageWithReceipts; consultation: any }> {
    const { consultation: _consultation, user } = await this.verifyConsultationAccess(
      consultationId,
      doctorId
    );

    // Only doctors can request more info
    if (user.role !== UserRole.DOCTOR) {
      throw new ForbiddenException('Only doctors can request more information');
    }

    // Create the message
    const createdMessage = await this.prisma.message.create({
      data: {
        consultationId,
        senderId: doctorId,
        content: message,
        isFromAI: false,
        createdAt: new Date(),
      },
    });

    // Update consultation status to NEEDS_INFO
    const updatedConsultation = await this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.NEEDS_INFO },
    });

    return {
      message: createdMessage as MessageWithReceipts,
      consultation: updatedConsultation,
    };
  }

  /**
   * Get messages for a consultation
   */
  async getMessages(
    consultationId: string,
    userId: string
  ): Promise<MessageWithReceipts[]> {
    await this.verifyConsultationAccess(consultationId, userId);

    const messages = await this.prisma.message.findMany({
      where: { consultationId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages as MessageWithReceipts[];
  }

  /**
   * Get unread message count for a user in a consultation
   * Uses prisma.count() instead of findMany() to avoid loading all messages into memory
   */
  async getUnreadCount(consultationId: string, userId: string): Promise<number> {
    await this.verifyConsultationAccess(consultationId, userId);

    return this.prisma.message.count({
      where: {
        consultationId,
        senderId: { not: userId },
        readAt: null,
      },
    });
  }

  /**
   * Get all conversations (consultations with messages) for a doctor
   * Spec: master spec Section 5.5 — Doctor conversations list
   */
  async getDoctorConversations(doctorId: string): Promise<any[]> {
    const consultations = await this.prisma.consultation.findMany({
      where: {
        doctorId,
        messages: { some: {} },
      },
      include: {
        patient: { select: { name: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
        },
      },
      _count: { select: { messages: true } },
    } as any);

    const results = consultations.map((consultation: any) => {
      const messages = [...(consultation.messages || [])].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const lastMessage = messages[0]; // Most recent after sort
      const unreadCount = messages.filter(
        (m: any) => m.senderId !== doctorId && m.readAt === null,
      ).length;

      return {
        consultationId: consultation.id,
        patientName: consultation.patient?.name || undefined,
        vertical: consultation.vertical,
        consultationStatus: consultation.status,
        lastMessageContent: lastMessage?.content || undefined,
        lastMessageAt: lastMessage?.createdAt || undefined,
        lastMessageIsFromDoctor: lastMessage?.senderId === doctorId,
        unreadCount,
        totalMessages: consultation._count?.messages ?? messages.length,
      };
    });

    // Sort by most recent message first
    results.sort((a: any, b: any) => {
      const aTime = a.lastMessageAt?.getTime() ?? 0;
      const bTime = b.lastMessageAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return results;
  }

  /**
   * Send a canned response
   */
  async sendCannedResponse(
    consultationId: string,
    doctorId: string,
    responseIndex: number
  ): Promise<MessageWithReceipts> {
    const { consultation } = await this.verifyConsultationAccess(
      consultationId,
      doctorId
    );

    const cannedResponses = this.getCannedResponses(consultation.vertical);

    if (responseIndex < 0 || responseIndex >= cannedResponses.length) {
      throw new BadRequestException('Invalid canned response index');
    }

    const cannedResponse = cannedResponses[responseIndex];

    return this.sendMessage({
      consultationId,
      senderId: doctorId,
      content: cannedResponse.content,
    });
  }
}
