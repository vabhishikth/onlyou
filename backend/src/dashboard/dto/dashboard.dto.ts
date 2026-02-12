import { Field, ObjectType, InputType, registerEnumType, Int } from '@nestjs/graphql';
import { HealthVertical } from '@prisma/client';
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
  vertical?: HealthVertical;

  @Field(() => DashboardStatus, { nullable: true })
  dashboardStatus?: DashboardStatus;

  @Field({ nullable: true })
  attentionLevel?: string;
}

// Case card type for queue display
@ObjectType()
export class CaseCardType {
  @Field()
  id: string;

  @Field()
  patientName: string;

  @Field(() => Int, { nullable: true })
  patientAge?: number | undefined;

  @Field({ nullable: true })
  patientSex?: string | undefined;

  @Field(() => HealthVertical)
  vertical: HealthVertical;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  aiAttentionLevel?: string | undefined;

  @Field(() => DashboardStatus)
  dashboardStatus: DashboardStatus;

  @Field()
  statusBadge: string;

  @Field()
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
  @Field({ nullable: true })
  name?: string | undefined;

  @Field(() => Int, { nullable: true })
  age?: number | undefined;

  @Field({ nullable: true })
  sex?: string | undefined;

  @Field({ nullable: true })
  city?: string | undefined;

  @Field()
  phone: string;
}

// AI assessment for case detail
@ObjectType()
export class CaseAIAssessmentType {
  @Field()
  summary: string;

  @Field()
  riskLevel: string;

  @Field(() => [String])
  flags: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  rawResponse?: any | undefined;
}

// Photo for case detail
@ObjectType()
export class CasePhotoType {
  @Field()
  id: string;

  @Field()
  type: string;

  @Field()
  url: string;
}

// Message for case detail
@ObjectType()
export class CaseMessageType {
  @Field()
  id: string;

  @Field()
  content: string;

  @Field()
  senderId: string;

  @Field()
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

// Consultation info for case detail
@ObjectType()
export class CaseConsultationType {
  @Field()
  id: string;

  @Field()
  status: string;

  @Field(() => HealthVertical)
  vertical: HealthVertical;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  doctorNotes?: string | undefined;
}

// Prescription for case detail
@ObjectType()
export class CasePrescriptionType {
  @Field()
  id: string;

  @Field({ nullable: true })
  pdfUrl?: string | undefined;

  @Field(() => GraphQLJSON)
  medications: any;

  @Field({ nullable: true })
  instructions?: string | undefined;

  @Field()
  validUntil: Date;

  @Field()
  issuedAt: Date;
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
}
