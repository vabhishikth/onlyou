import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '@prisma/client';

// Spec: Phase 14 — Chunk 0
// GraphQL input types for video consultation endpoints

@InputType()
export class BookVideoSlotInput {
  @Field()
  @IsString()
  consultationId: string;

  @Field()
  @IsString()
  slotDate: string; // "2026-03-01"

  @Field()
  @IsString()
  startTime: string; // "10:00" (IST, 24hr)
}

@InputType()
export class RescheduleVideoBookingInput {
  @Field()
  @IsString()
  bookedSlotId: string;

  @Field()
  @IsString()
  newSlotDate: string;

  @Field()
  @IsString()
  newStartTime: string;
}

@InputType()
export class SetAvailabilitySlotInput {
  @Field(() => DayOfWeek)
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @Field()
  @IsString()
  startTime: string; // "18:00" (IST, 24hr)

  @Field()
  @IsString()
  endTime: string; // "20:00"
}

@InputType()
export class SetAvailabilityInput {
  @Field(() => [SetAvailabilitySlotInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetAvailabilitySlotInput)
  slots: SetAvailabilitySlotInput[];
}

@InputType()
export class CompleteVideoSessionInput {
  @Field()
  @IsString()
  videoSessionId: string;

  @Field()
  @IsString()
  notes: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  callType?: string; // VIDEO | AUDIO_ONLY | PHONE_FALLBACK
}

@InputType()
export class MarkAwaitingLabsInput {
  @Field()
  @IsString()
  videoSessionId: string;

  @Field()
  @IsString()
  labNotes: string;
}

@InputType()
export class HmsWebhookPayloadInput {
  @Field()
  @IsString()
  event: string;

  @Field(() => String)
  data: string; // JSON-serialized
}
