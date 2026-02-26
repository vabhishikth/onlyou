import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VideoSessionStatus } from '@prisma/client';

// Spec: Phase 14 — Video session status transition validation + audit logging
// All status changes MUST go through transitionStatus() to enforce valid transitions.

/**
 * Map of allowed transitions for each VideoSessionStatus.
 * Terminal states (COMPLETED, CANCELLED, NO_SHOW_*, FAILED) have no outgoing transitions.
 */
export const VALID_TRANSITIONS: Record<VideoSessionStatus, VideoSessionStatus[]> = {
  [VideoSessionStatus.SCHEDULED]: [
    VideoSessionStatus.WAITING_FOR_PATIENT,
    VideoSessionStatus.WAITING_FOR_DOCTOR,
    VideoSessionStatus.CANCELLED,
    VideoSessionStatus.NO_SHOW_DOCTOR,
    VideoSessionStatus.NO_SHOW_PATIENT,
  ],
  [VideoSessionStatus.WAITING_FOR_PATIENT]: [
    VideoSessionStatus.IN_PROGRESS,
    VideoSessionStatus.CANCELLED,
    VideoSessionStatus.NO_SHOW_PATIENT,
    VideoSessionStatus.FAILED,
  ],
  [VideoSessionStatus.WAITING_FOR_DOCTOR]: [
    VideoSessionStatus.IN_PROGRESS,
    VideoSessionStatus.CANCELLED,
    VideoSessionStatus.NO_SHOW_DOCTOR,
    VideoSessionStatus.FAILED,
  ],
  [VideoSessionStatus.IN_PROGRESS]: [
    VideoSessionStatus.COMPLETED,
    VideoSessionStatus.FAILED,
  ],
  // Terminal states — no outgoing transitions
  [VideoSessionStatus.COMPLETED]: [],
  [VideoSessionStatus.CANCELLED]: [],
  [VideoSessionStatus.NO_SHOW_PATIENT]: [],
  [VideoSessionStatus.NO_SHOW_DOCTOR]: [],
  [VideoSessionStatus.FAILED]: [],
};

/**
 * Check if a status transition is valid.
 */
export function validateTransition(
  from: VideoSessionStatus,
  to: VideoSessionStatus,
): boolean {
  if (from === to) return false;
  const allowed = VALID_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

/**
 * Transition a video session to a new status with validation and audit logging.
 * This is the ONLY way status should be changed (replaces raw Prisma updates).
 *
 * @param prisma - PrismaService or transaction client
 * @param sessionId - Video session ID
 * @param newStatus - Target status
 * @param triggeredBy - Who/what triggered the change (userId, 'system', 'cron', 'webhook')
 * @param failureReason - Optional reason for FAILED status
 * @param extraData - Optional extra fields to include in the Prisma update
 */
export async function transitionStatus(
  prisma: any,
  sessionId: string,
  newStatus: VideoSessionStatus,
  triggeredBy: string,
  failureReason?: string,
  extraData?: Record<string, any>,
): Promise<any> {
  const session = await prisma.videoSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new NotFoundException('Video session not found');
  }

  if (!validateTransition(session.status, newStatus)) {
    throw new BadRequestException(
      `Invalid status transition: ${session.status} → ${newStatus}`,
    );
  }

  // Build update data with automatic timestamp fields
  const updateData: any = {
    status: newStatus,
  };

  // Set actualStartTime when call begins
  if (newStatus === VideoSessionStatus.IN_PROGRESS) {
    updateData.actualStartTime = new Date();
  }

  // Set actualEndTime for terminal states that end a call
  if (
    newStatus === VideoSessionStatus.COMPLETED ||
    newStatus === VideoSessionStatus.FAILED
  ) {
    updateData.actualEndTime = new Date();
  }

  // Store failure reason
  if (failureReason) {
    updateData.failureReason = failureReason;
  }

  // Audit log entry: append to statusHistory JSON field
  const historyEntry = {
    from: session.status,
    to: newStatus,
    triggeredBy,
    timestamp: new Date().toISOString(),
    ...(failureReason ? { reason: failureReason } : {}),
  };

  const existingHistory = Array.isArray(session.statusHistory)
    ? session.statusHistory
    : [];

  updateData.statusHistory = [...existingHistory, historyEntry];

  // Merge any extra data (e.g., durationSeconds, noShowMarkedBy)
  if (extraData) {
    Object.assign(updateData, extraData);
  }

  return prisma.videoSession.update({
    where: { id: sessionId },
    data: updateData,
  });
}
