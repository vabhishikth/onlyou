import { Field, ObjectType, InputType, registerEnumType, Int } from '@nestjs/graphql';
import { HealthVertical } from '@prisma/client';
import { IsOptional } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

// Spec: master spec Section 5 (Doctor Dashboard)

// Dashboard status enum (maps from ConsultationStatus)
export enum DashboardStatus {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  LAB_RESULTS_READY = 'LAB_RESULTS_READY',
  FOLLOW_UP = 'FOLLOW_UP',
  COMPLETED = 'COMPLETED',
  REFERRED = 'REFERRED',
}

registerEnumType(DashboardStatus, {
  name: 'DashboardStatus',
  description: 'Dashboard-friendly status for consultations',
});

// Filter input for queue queries
@InputType()
export class QueueFiltersInput {
  @Field(() => HealthVertical, { nullable: true })
  @IsOptional()
  vertical?: HealthVertical;

  @Field(() => DashboardStatus, { nullable: true })
  @IsOptional()
  dashboardStatus?: DashboardStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  attentionLevel?: string;
}

// Case card type for queue display
@ObjectType()
export class CaseCardType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  patientName: string;

  @Field(() => Int, { nullable: true })
  patientAge?: number | undefined;

  @Field(() => String, { nullable: true })
  patientSex?: string | undefined;

  @Field(() => HealthVertical)
  vertical: HealthVertical;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String, { nullable: true })
  aiAttentionLevel?: string | undefined;

  @Field(() => DashboardStatus)
  dashboardStatus: DashboardStatus;

  @Field(() => String)
  statusBadge: string;

  @Field(() => Boolean)
  isFollowUp: boolean;
}

// Queue response with cases
@ObjectType()
export class QueueResponse {
  @Field(() => [CaseCardType])
  cases: CaseCardType[];
}

// Queue statistics
@ObjectType()
export class QueueStatsType {
  @Field(() => Int)
  new: number;

  @Field(() => Int)
  inReview: number;

  @Field(() => Int)
  awaitingResponse: number;

  @Field(() => Int)
  labResultsReady: number;

  @Field(() => Int)
  followUp: number;

  @Field(() => Int)
  completed: number;

  @Field(() => Int)
  referred: number;

  @Field(() => Int)
  totalActive: number;
}

// Patient info for case detail
@ObjectType()
export class CasePatientType {
  @Field(() => String, { nullable: true })
  name?: string | undefined;

  @Field(() => Int, { nullable: true })
  age?: number | undefined;

  @Field(() => String, { nullable: true })
  sex?: string | undefined;

  @Field(() => String, { nullable: true })
  city?: string | undefined;

  @Field(() => String)
  phone: string;
}

// AI assessment for case detail
@ObjectType()
export class CaseAIAssessmentType {
  @Field(() => String)
  summary: string;

  @Field(() => String)
  riskLevel: string;

  @Field(() => [String])
  flags: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  rawResponse?: any | undefined;
}

// Photo for case detail
@ObjectType()
export class CasePhotoType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  url: string;
}

// Message for case detail
@ObjectType()
export class CaseMessageType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  content: string;

  @Field(() => String)
  senderId: string;

  @Field(() => Date)
  createdAt: Date;
}

// Questionnaire data for case detail
@ObjectType()
export class CaseQuestionnaireType {
  @Field(() => GraphQLJSON)
  responses: any;

  @Field(() => GraphQLJSON)
  template: any;
}

// Booked video slot info for case detail
@ObjectType()
export class CaseBookedSlotType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  videoSessionId: string;

  @Field(() => Date)
  slotDate: Date;

  @Field(() => Date)
  startTime: Date;

  @Field(() => Date)
  endTime: Date;

  @Field(() => String)
  status: string;
}

// Consultation info for case detail
@ObjectType()
export class CaseConsultationType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  status: string;

  @Field(() => HealthVertical)
  vertical: HealthVertical;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String, { nullable: true })
  doctorNotes?: string | undefined;

  @Field(() => Boolean)
  videoRequested: boolean;

  @Field(() => CaseBookedSlotType, { nullable: true })
  bookedSlot?: CaseBookedSlotType | undefined;
}

// Prescription for case detail
@ObjectType()
export class CasePrescriptionType {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  pdfUrl?: string | undefined;

  @Field(() => GraphQLJSON)
  medications: any;

  @Field(() => String, { nullable: true })
  instructions?: string | undefined;

  @Field(() => Date)
  validUntil: Date;

  @Field(() => Date)
  issuedAt: Date;
}

// Lab order for case detail
@ObjectType()
export class CaseLabOrderType {
  @Field(() => String)
  id: string;

  @Field(() => [String])
  testPanel: string[];

  @Field(() => String, { nullable: true })
  panelName?: string | undefined;

  @Field(() => String)
  status: string;

  @Field(() => Date)
  orderedAt: Date;

  @Field(() => String, { nullable: true })
  resultFileUrl?: string | undefined;

  @Field(() => Boolean)
  criticalValues: boolean;
}

// Full case detail response
@ObjectType()
export class CaseDetailType {
  @Field(() => CaseConsultationType)
  consultation: CaseConsultationType;

  @Field(() => CasePatientType)
  patient: CasePatientType;

  @Field(() => CaseQuestionnaireType)
  questionnaire: CaseQuestionnaireType;

  @Field(() => CaseAIAssessmentType, { nullable: true })
  aiAssessment?: CaseAIAssessmentType | undefined;

  @Field(() => [CasePhotoType])
  photos: CasePhotoType[];

  @Field(() => [CaseMessageType])
  messages: CaseMessageType[];

  @Field(() => CasePrescriptionType, { nullable: true })
  prescription?: CasePrescriptionType | undefined;

  @Field(() => [CaseLabOrderType])
  labOrders: CaseLabOrderType[];
}
