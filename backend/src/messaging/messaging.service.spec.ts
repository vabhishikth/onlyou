import { Test, TestingModule } from '@nestjs/testing';
import {
  MessagingService,
  HAIR_LOSS_CANNED_RESPONSES,
  SendMessageInput,
  MessageWithReceipts,
} from './messaging.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsultationStatus, HealthVertical, UserRole } from '@prisma/client';

// Spec: master spec Section 5.5 (Messaging)
// Spec: hair-loss spec Section 7 (Canned Messages)

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: PrismaService;

  // Mock data
  const mockDoctor = {
    id: 'doctor-1',
    name: 'Dr. Test Doctor',
    role: UserRole.DOCTOR,
    isVerified: true,
  };

  const mockPatient = {
    id: 'patient-1',
    name: 'Test Patient',
    role: UserRole.PATIENT,
    phone: '+919876543210',
  };

  const mockPatient2 = {
    id: 'patient-2',
    name: 'Another Patient',
    role: UserRole.PATIENT,
  };

  const mockConsultation = {
    id: 'consultation-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    vertical: HealthVertical.HAIR_LOSS,
    status: ConsultationStatus.DOCTOR_REVIEWING,
  };

  const mockMessage = {
    id: 'message-1',
    consultationId: 'consultation-1',
    senderId: 'doctor-1',
    content: 'Hello, how can I help you?',
    isFromAI: false,
    readAt: null,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Canned Responses', () => {
    // Spec: hair-loss spec Section 7 — Canned Messages

    it('should have 6 hair loss canned responses', () => {
      expect(HAIR_LOSS_CANNED_RESPONSES).toHaveLength(6);
    });

    it('should have treatment plan ready message', () => {
      const message = HAIR_LOSS_CANNED_RESPONSES.find((m) =>
        m.content.includes('treatment plan is ready')
      );
      expect(message).toBeDefined();
    });

    it('should have clearer photos request message', () => {
      const message = HAIR_LOSS_CANNED_RESPONSES.find((m) =>
        m.content.includes('clearer photos')
      );
      expect(message).toBeDefined();
    });

    it('should have blood test request message', () => {
      const message = HAIR_LOSS_CANNED_RESPONSES.find((m) =>
        m.content.includes('blood tests')
      );
      expect(message).toBeDefined();
    });

    it('should have progress update message', () => {
      const message = HAIR_LOSS_CANNED_RESPONSES.find((m) =>
        m.content.includes('progress')
      );
      expect(message).toBeDefined();
    });

    it('should have treatment adjustment message', () => {
      const message = HAIR_LOSS_CANNED_RESPONSES.find((m) =>
        m.content.includes('adjust your treatment')
      );
      expect(message).toBeDefined();
    });

    it('should have assessment result message', () => {
      const message = HAIR_LOSS_CANNED_RESPONSES.find((m) =>
        m.content.includes('assessment')
      );
      expect(message).toBeDefined();
    });

    it('should return canned responses for a vertical', () => {
      const responses = service.getCannedResponses(HealthVertical.HAIR_LOSS);
      expect(responses).toHaveLength(6);
    });
  });

  describe('Send Message', () => {
    // Spec: master spec Section 5.5 — Threaded chat per consultation

    it('should send message from doctor to patient', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);

      const input: SendMessageInput = {
        consultationId: 'consultation-1',
        senderId: 'doctor-1',
        content: 'Hello, how can I help you?',
      };

      const result = await service.sendMessage(input);

      expect(result).toBeDefined();
      expect(result.id).toBe('message-1');
      expect(mockPrismaService.message.create).toHaveBeenCalled();
    });

    it('should send message from patient to doctor', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.create.mockResolvedValue({
        ...mockMessage,
        senderId: 'patient-1',
        content: 'I have a question about my treatment',
      });

      const input: SendMessageInput = {
        consultationId: 'consultation-1',
        senderId: 'patient-1',
        content: 'I have a question about my treatment',
      };

      const result = await service.sendMessage(input);

      expect(result.senderId).toBe('patient-1');
    });

    it('should throw if consultation not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(null);

      const input: SendMessageInput = {
        consultationId: 'non-existent',
        senderId: 'doctor-1',
        content: 'Hello',
      };

      await expect(service.sendMessage(input)).rejects.toThrow(NotFoundException);
    });

    it('should throw if patient tries to message a doctor they are not assigned to', async () => {
      const otherDoctorConsultation = { ...mockConsultation, patientId: 'patient-2' };
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(otherDoctorConsultation);

      const input: SendMessageInput = {
        consultationId: 'consultation-1',
        senderId: 'patient-1',
        content: 'Hello',
      };

      await expect(service.sendMessage(input)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if doctor tries to message a patient they are not assigned to', async () => {
      const otherDoctorConsultation = { ...mockConsultation, doctorId: 'doctor-2' };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(otherDoctorConsultation);

      const input: SendMessageInput = {
        consultationId: 'consultation-1',
        senderId: 'doctor-1',
        content: 'Hello',
      };

      await expect(service.sendMessage(input)).rejects.toThrow(ForbiddenException);
    });

    it('should include timestamp when message is sent', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.create.mockImplementation((args) => {
        expect(args.data.createdAt).toBeDefined();
        return Promise.resolve({ ...mockMessage, ...args.data });
      });

      await service.sendMessage({
        consultationId: 'consultation-1',
        senderId: 'doctor-1',
        content: 'Hello',
      });
    });
  });

  describe('File/Photo Attachments', () => {
    // Spec: master spec Section 5.5 — Attachments (photos, PDFs)

    it('should allow sending message with attachment URL', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.create.mockImplementation((args) => {
        return Promise.resolve({ id: 'message-1', ...args.data });
      });

      const input: SendMessageInput = {
        consultationId: 'consultation-1',
        senderId: 'doctor-1',
        content: 'Here is your prescription',
        attachmentUrl: 'https://s3.example/prescription.pdf',
        attachmentType: 'pdf',
      };

      const result = await service.sendMessage(input);

      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attachmentUrl: 'https://s3.example/prescription.pdf',
            attachmentType: 'pdf',
          }),
        })
      );
    });

    it('should allow sending message with photo attachment', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.create.mockImplementation((args) => {
        return Promise.resolve({ id: 'message-1', ...args.data });
      });

      const input: SendMessageInput = {
        consultationId: 'consultation-1',
        senderId: 'patient-1',
        content: 'Here is my updated scalp photo',
        attachmentUrl: 'https://s3.example/photo.jpg',
        attachmentType: 'image',
      };

      await service.sendMessage(input);

      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attachmentType: 'image',
          }),
        })
      );
    });
  });

  describe('Read Receipts', () => {
    // Spec: master spec Section 5.5 — Read receipts

    it('should mark message as read', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.update.mockImplementation((args) => {
        return Promise.resolve({ ...mockMessage, readAt: args.data.readAt });
      });

      const result = await service.markAsRead('message-1', 'patient-1');

      expect(result.readAt).toBeDefined();
      expect(mockPrismaService.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            readAt: expect.any(Date),
          }),
        })
      );
    });

    it('should not allow sender to mark their own message as read', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);

      // Doctor sent the message, so they shouldn't be able to mark it as read
      await expect(service.markAsRead('message-1', 'doctor-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should mark all unread messages in consultation as read', async () => {
      const unreadMessages = [
        { ...mockMessage, id: 'msg-1', readAt: null },
        { ...mockMessage, id: 'msg-2', readAt: null },
      ];
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.markAllAsRead('consultation-1', 'patient-1');

      expect(result.count).toBe(2);
      expect(mockPrismaService.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            consultationId: 'consultation-1',
            senderId: { not: 'patient-1' },
            readAt: null,
          }),
        })
      );
    });

    it('should return sent timestamp in message', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.findMany.mockResolvedValue([mockMessage]);

      const messages = await service.getMessages('consultation-1', 'doctor-1');

      expect(messages[0].createdAt).toBeDefined();
    });

    it('should return read timestamp when message is read', async () => {
      const readMessage = { ...mockMessage, readAt: new Date() };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.findMany.mockResolvedValue([readMessage]);

      const messages = await service.getMessages('consultation-1', 'doctor-1');

      expect(messages[0].readAt).toBeDefined();
    });
  });

  describe('Request More Info', () => {
    // Spec: Doctor sends "Request More Info" → case status changes to Awaiting Response

    it('should change consultation status to NEEDS_INFO when doctor requests more info', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.consultation.update.mockImplementation((args) => {
        expect(args.data.status).toBe(ConsultationStatus.NEEDS_INFO);
        return Promise.resolve({ ...mockConsultation, status: ConsultationStatus.NEEDS_INFO });
      });

      await service.requestMoreInfo('consultation-1', 'doctor-1', 'Please provide clearer photos');

      expect(mockPrismaService.consultation.update).toHaveBeenCalled();
    });

    it('should create a message when requesting more info', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.consultation.update.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.NEEDS_INFO,
      });

      await service.requestMoreInfo('consultation-1', 'doctor-1', 'Please provide clearer photos');

      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'Please provide clearer photos',
            senderId: 'doctor-1',
          }),
        })
      );
    });

    it('should only allow doctor to request more info', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);

      await expect(
        service.requestMoreInfo('consultation-1', 'patient-1', 'Hello')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return consultation to DOCTOR_REVIEWING when patient responds', async () => {
      const needsInfoConsultation = {
        ...mockConsultation,
        status: ConsultationStatus.NEEDS_INFO,
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(needsInfoConsultation);
      mockPrismaService.message.create.mockResolvedValue({
        ...mockMessage,
        senderId: 'patient-1',
      });
      mockPrismaService.consultation.update.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.DOCTOR_REVIEWING,
      });

      await service.sendMessage({
        consultationId: 'consultation-1',
        senderId: 'patient-1',
        content: 'Here are the clearer photos',
      });

      expect(mockPrismaService.consultation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ConsultationStatus.DOCTOR_REVIEWING,
          }),
        })
      );
    });
  });

  describe('Get Messages', () => {
    it('should return messages for a consultation', async () => {
      const messages = [
        mockMessage,
        { ...mockMessage, id: 'message-2', content: 'Thank you doctor' },
      ];
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.findMany.mockResolvedValue(messages);

      const result = await service.getMessages('consultation-1', 'doctor-1');

      expect(result).toHaveLength(2);
    });

    it('should order messages by createdAt ascending', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.findMany.mockResolvedValue([]);

      await service.getMessages('consultation-1', 'doctor-1');

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        })
      );
    });

    it('should throw if user is not part of consultation', async () => {
      const otherConsultation = { ...mockConsultation, patientId: 'other', doctorId: 'other' };
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(otherConsultation);

      await expect(service.getMessages('consultation-1', 'patient-1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should include sender info in messages', async () => {
      const messageWithSender = {
        ...mockMessage,
        sender: { id: 'doctor-1', name: 'Dr. Test Doctor', role: UserRole.DOCTOR },
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.findMany.mockResolvedValue([messageWithSender]);

      const result = await service.getMessages('consultation-1', 'doctor-1');

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            sender: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                name: true,
                role: true,
              }),
            }),
          }),
        })
      );
    });
  });

  describe('Unread Count', () => {
    it('should return count of unread messages for user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.findMany.mockResolvedValue([
        { ...mockMessage, readAt: null },
        { ...mockMessage, id: 'msg-2', readAt: null },
      ]);

      const count = await service.getUnreadCount('consultation-1', 'patient-1');

      expect(count).toBe(2);
    });

    it('should not count messages sent by the user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.findMany.mockResolvedValue([]);

      const count = await service.getUnreadCount('consultation-1', 'doctor-1');

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            senderId: { not: 'doctor-1' },
            readAt: null,
          }),
        })
      );
    });
  });

  describe('Send Canned Response', () => {
    it('should send canned response message', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.message.create.mockResolvedValue({
        ...mockMessage,
        content: HAIR_LOSS_CANNED_RESPONSES[0].content,
      });

      const result = await service.sendCannedResponse(
        'consultation-1',
        'doctor-1',
        0 // First canned response
      );

      expect(result.content).toBe(HAIR_LOSS_CANNED_RESPONSES[0].content);
    });

    it('should throw if canned response index is invalid', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);

      await expect(
        service.sendCannedResponse('consultation-1', 'doctor-1', 99)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
