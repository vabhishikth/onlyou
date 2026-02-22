import { Field, ObjectType, Int, registerEnumType } from '@nestjs/graphql';
import {
  VideoSessionStatus,
  BookedSlotStatus,
  DayOfWeek,
  CallType,
} from '@prisma/client';
// graphql-type-json available if needed for JSON fields

// Spec: Phase 14 — Chunk 0
// GraphQL output types for video consultation endpoints

// Register Prisma enums for GraphQL
registerEnumType(VideoSessionStatus, {
  name: 'VideoSessionStatus',
  description: 'Status of a video consultation session',
});

registerEnumType(BookedSlotStatus, {
  name: 'BookedSlotStatus',
  description: 'Status of a booked video slot',
});

registerEnumType(DayOfWeek, {
  name: 'DayOfWeek',
  description: 'Day of the week for recurring availability',
});

registerEnumType(CallType, {
  name: 'CallType',
  description: 'Type of video consultation call',
});

// ============================================
// Slot and Availability types
// ============================================

@ObjectType()
export class AvailableSlotWindowType {
  @Field()
  date: string; // "2026-03-01"

  @Field()
  startTime: string; // "10:00"

  @Field()
  endTime: string; // "10:15"
}

@ObjectType()
export class AvailableSlotsResponse {
  @Field()
  doctorId: string;

  @Field(() => [AvailableSlotWindowType])
  slots: AvailableSlotWindowType[];

  @Field()
  connectivityWarning: string;
}

@ObjectType()
export class AvailabilitySlotType {
  @Field()
  id: string;

  @Field()
  doctorId: string;

  @Field(() => DayOfWeek)
  dayOfWeek: DayOfWeek;

  @Field()
  startTime: string;

  @Field()
  endTime: string;

  @Field(() => Int)
  slotDurationMinutes: number;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// ============================================
// Booking types
// ============================================

@ObjectType()
export class BookedSlotType {
  @Field()
  id: string;

  @Field()
  videoSessionId: string;

  @Field()
  doctorId: string;

  @Field()
  patientId: string;

  @Field()
  consultationId: string;

  @Field()
  slotDate: Date;

  @Field()
  startTime: Date;

  @Field()
  endTime: Date;

  @Field(() => BookedSlotStatus)
  status: BookedSlotStatus;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class VideoSessionType {
  @Field()
  id: string;

  @Field()
  consultationId: string;

  @Field()
  doctorId: string;

  @Field()
  patientId: string;

  @Field({ nullable: true })
  roomId?: string;

  @Field(() => VideoSessionStatus)
  status: VideoSessionStatus;

  @Field()
  scheduledStartTime: Date;

  @Field()
  scheduledEndTime: Date;

  @Field({ nullable: true })
  actualStartTime?: Date;

  @Field({ nullable: true })
  actualEndTime?: Date;

  @Field(() => Int, { nullable: true })
  durationSeconds?: number;

  @Field()
  recordingConsentGiven: boolean;

  @Field(() => CallType)
  callType: CallType;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class BookingResponse {
  @Field(() => BookedSlotType)
  bookedSlot: BookedSlotType;

  @Field(() => VideoSessionType)
  videoSession: VideoSessionType;

  @Field()
  connectivityWarning: string;
}

// ============================================
// Join and consent types
// ============================================

@ObjectType()
export class JoinSessionResponse {
  @Field()
  roomId: string;

  @Field()
  token: string;
}

@ObjectType()
export class RecordingConsentResponse {
  @Field()
  id: string;

  @Field()
  recordingConsentGiven: boolean;
}

// ============================================
// No-show types
// ============================================

@ObjectType()
export class NoShowResultType {
  @Field(() => VideoSessionStatus)
  status: VideoSessionStatus;

  @Field()
  noShowMarkedBy: string;

  @Field()
  adminAlert: boolean;
}

// ============================================
// Cancel result
// ============================================

@ObjectType()
export class CancelBookingResult {
  @Field()
  id: string;

  @Field(() => BookedSlotStatus)
  status: BookedSlotStatus;
}
