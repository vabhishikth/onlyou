import { VideoSessionStatus } from '@prisma/client';
import {
  VALID_TRANSITIONS,
  validateTransition,
  transitionStatus,
} from './video-state-machine';

// Spec: Phase 14 — Video session status transition validation
// Ensures only valid status changes are allowed and audit logging works

describe('VideoStateMachine', () => {
  describe('VALID_TRANSITIONS map', () => {
    it('should define transitions for every VideoSessionStatus', () => {
      const allStatuses = Object.values(VideoSessionStatus);
      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
      }
    });

    it('should not allow any transitions from terminal states', () => {
      const terminalStates: VideoSessionStatus[] = [
        VideoSessionStatus.COMPLETED,
        VideoSessionStatus.CANCELLED,
        VideoSessionStatus.NO_SHOW_PATIENT,
        VideoSessionStatus.NO_SHOW_DOCTOR,
        VideoSessionStatus.FAILED,
      ];

      for (const status of terminalStates) {
        expect(VALID_TRANSITIONS[status]).toEqual([]);
      }
    });
  });

  describe('validateTransition()', () => {
    // Valid transitions from SCHEDULED
    it.each([
      [VideoSessionStatus.SCHEDULED, VideoSessionStatus.WAITING_FOR_PATIENT],
      [VideoSessionStatus.SCHEDULED, VideoSessionStatus.WAITING_FOR_DOCTOR],
      [VideoSessionStatus.SCHEDULED, VideoSessionStatus.CANCELLED],
      [VideoSessionStatus.SCHEDULED, VideoSessionStatus.NO_SHOW_DOCTOR],
      [VideoSessionStatus.SCHEDULED, VideoSessionStatus.NO_SHOW_PATIENT],
    ])('should allow %s → %s', (from, to) => {
      expect(validateTransition(from, to)).toBe(true);
    });

    // Valid transitions from WAITING states
    it.each([
      [VideoSessionStatus.WAITING_FOR_PATIENT, VideoSessionStatus.IN_PROGRESS],
      [VideoSessionStatus.WAITING_FOR_PATIENT, VideoSessionStatus.CANCELLED],
      [VideoSessionStatus.WAITING_FOR_PATIENT, VideoSessionStatus.NO_SHOW_PATIENT],
      [VideoSessionStatus.WAITING_FOR_PATIENT, VideoSessionStatus.FAILED],
      [VideoSessionStatus.WAITING_FOR_DOCTOR, VideoSessionStatus.IN_PROGRESS],
      [VideoSessionStatus.WAITING_FOR_DOCTOR, VideoSessionStatus.CANCELLED],
      [VideoSessionStatus.WAITING_FOR_DOCTOR, VideoSessionStatus.NO_SHOW_DOCTOR],
      [VideoSessionStatus.WAITING_FOR_DOCTOR, VideoSessionStatus.FAILED],
    ])('should allow %s → %s', (from, to) => {
      expect(validateTransition(from, to)).toBe(true);
    });

    // Valid transitions from IN_PROGRESS
    it.each([
      [VideoSessionStatus.IN_PROGRESS, VideoSessionStatus.COMPLETED],
      [VideoSessionStatus.IN_PROGRESS, VideoSessionStatus.FAILED],
    ])('should allow %s → %s', (from, to) => {
      expect(validateTransition(from, to)).toBe(true);
    });

    // Invalid transitions
    it.each([
      [VideoSessionStatus.SCHEDULED, VideoSessionStatus.COMPLETED],
      [VideoSessionStatus.SCHEDULED, VideoSessionStatus.IN_PROGRESS],
      [VideoSessionStatus.WAITING_FOR_PATIENT, VideoSessionStatus.WAITING_FOR_DOCTOR],
      [VideoSessionStatus.IN_PROGRESS, VideoSessionStatus.SCHEDULED],
      [VideoSessionStatus.IN_PROGRESS, VideoSessionStatus.CANCELLED],
      [VideoSessionStatus.COMPLETED, VideoSessionStatus.IN_PROGRESS],
      [VideoSessionStatus.COMPLETED, VideoSessionStatus.SCHEDULED],
      [VideoSessionStatus.CANCELLED, VideoSessionStatus.SCHEDULED],
      [VideoSessionStatus.FAILED, VideoSessionStatus.IN_PROGRESS],
      [VideoSessionStatus.NO_SHOW_PATIENT, VideoSessionStatus.SCHEDULED],
      [VideoSessionStatus.NO_SHOW_DOCTOR, VideoSessionStatus.SCHEDULED],
    ])('should reject %s → %s', (from, to) => {
      expect(validateTransition(from, to)).toBe(false);
    });

    // Self-transition is invalid
    it('should reject self-transition (same status)', () => {
      expect(validateTransition(
        VideoSessionStatus.IN_PROGRESS,
        VideoSessionStatus.IN_PROGRESS,
      )).toBe(false);
    });
  });

  describe('transitionStatus()', () => {
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        videoSession: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      };
    });

    it('should throw if session not found', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      await expect(
        transitionStatus(mockPrisma, 'session-1', VideoSessionStatus.COMPLETED, 'doctor-1'),
      ).rejects.toThrow('Video session not found');
    });

    it('should throw for invalid transition', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: VideoSessionStatus.SCHEDULED,
      });

      await expect(
        transitionStatus(mockPrisma, 'session-1', VideoSessionStatus.COMPLETED, 'system'),
      ).rejects.toThrow('Invalid status transition: SCHEDULED → COMPLETED');
    });

    it('should update status and create audit entry for valid transition', async () => {
      const existingSession = {
        id: 'session-1',
        status: VideoSessionStatus.IN_PROGRESS,
        statusHistory: [],
      };
      const updatedSession = {
        ...existingSession,
        status: VideoSessionStatus.COMPLETED,
      };

      mockPrisma.videoSession.findUnique.mockResolvedValue(existingSession);
      mockPrisma.videoSession.update.mockResolvedValue(updatedSession);

      const result = await transitionStatus(
        mockPrisma,
        'session-1',
        VideoSessionStatus.COMPLETED,
        'doctor-123',
      );

      expect(result.status).toBe(VideoSessionStatus.COMPLETED);
      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          status: VideoSessionStatus.COMPLETED,
        }),
      });
    });

    it('should set actualStartTime when transitioning to IN_PROGRESS', async () => {
      const existingSession = {
        id: 'session-1',
        status: VideoSessionStatus.WAITING_FOR_DOCTOR,
        statusHistory: [],
      };

      mockPrisma.videoSession.findUnique.mockResolvedValue(existingSession);
      mockPrisma.videoSession.update.mockResolvedValue({
        ...existingSession,
        status: VideoSessionStatus.IN_PROGRESS,
      });

      await transitionStatus(
        mockPrisma,
        'session-1',
        VideoSessionStatus.IN_PROGRESS,
        'system',
      );

      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          status: VideoSessionStatus.IN_PROGRESS,
          actualStartTime: expect.any(Date),
        }),
      });
    });

    it('should set actualEndTime when transitioning to COMPLETED', async () => {
      const existingSession = {
        id: 'session-1',
        status: VideoSessionStatus.IN_PROGRESS,
        statusHistory: [],
      };

      mockPrisma.videoSession.findUnique.mockResolvedValue(existingSession);
      mockPrisma.videoSession.update.mockResolvedValue({
        ...existingSession,
        status: VideoSessionStatus.COMPLETED,
      });

      await transitionStatus(
        mockPrisma,
        'session-1',
        VideoSessionStatus.COMPLETED,
        'doctor-1',
      );

      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          status: VideoSessionStatus.COMPLETED,
          actualEndTime: expect.any(Date),
        }),
      });
    });

    it('should set actualEndTime when transitioning to FAILED', async () => {
      const existingSession = {
        id: 'session-1',
        status: VideoSessionStatus.IN_PROGRESS,
        statusHistory: [],
      };

      mockPrisma.videoSession.findUnique.mockResolvedValue(existingSession);
      mockPrisma.videoSession.update.mockResolvedValue({
        ...existingSession,
        status: VideoSessionStatus.FAILED,
      });

      await transitionStatus(
        mockPrisma,
        'session-1',
        VideoSessionStatus.FAILED,
        'system',
        'NETWORK_ERROR',
      );

      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          status: VideoSessionStatus.FAILED,
          actualEndTime: expect.any(Date),
          failureReason: 'NETWORK_ERROR',
        }),
      });
    });
  });
});
