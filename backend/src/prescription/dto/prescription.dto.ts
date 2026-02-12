import { Field, ObjectType, InputType, registerEnumType } from '@nestjs/graphql';
import { HealthVertical } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
import { PrescriptionTemplate } from '../prescription.service';

// Spec: master spec Section 5.4 (Prescription Builder)

// Register prescription template enum
registerEnumType(PrescriptionTemplate, {
  name: 'PrescriptionTemplate',
  description: 'Available prescription templates',
});

// Medication type
@ObjectType()
export class MedicationType {
  @Field()
  name: string;

  @Field()
  dosage: string;

  @Field()
  frequency: string;

  @Field({ nullable: true })
  duration?: string | undefined;

  @Field({ nullable: true })
  instructions?: string | undefined;
}

// Medication input
@InputType()
export class MedicationInput {
  @Field()
  name: string;

  @Field()
  dosage: string;

  @Field()
  frequency: string;

  @Field({ nullable: true })
  duration?: string | undefined;

  @Field({ nullable: true })
  instructions?: string | undefined;
}

// Template definition type
@ObjectType()
export class TemplateDefinitionType {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => [MedicationType])
  medications: MedicationType[];

  @Field()
  whenToUse: string;
}

// Contraindication result type
@ObjectType()
export class ContraindicationResultType {
  @Field()
  isBlocked: boolean;

  @Field()
  requiresDoctorReview: boolean;

  @Field({ nullable: true })
  suggestMinoxidilOnly?: boolean | undefined;

  @Field(() => [String])
  reasons: string[];

  @Field(() => [String])
  flags: string[];
}

// Template suggestion response
@ObjectType()
export class TemplateSuggestionType {
  @Field(() => PrescriptionTemplate)
  suggestedTemplate: PrescriptionTemplate;

  @Field(() => TemplateDefinitionType)
  templateDefinition: TemplateDefinitionType;

  @Field(() => ContraindicationResultType)
  contraindications: ContraindicationResultType;
}

// Prescription type (database record)
@ObjectType()
export class PrescriptionType {
  @Field()
  id: string;

  @Field()
  consultationId: string;

  @Field({ nullable: true })
  pdfUrl?: string | undefined;

  @Field(() => GraphQLJSON)
  medications: unknown;

  @Field({ nullable: true })
  instructions?: string | undefined;

  @Field()
  validUntil: Date;

  @Field()
  issuedAt: Date;

  @Field({ nullable: true })
  doctorName?: string | undefined;

  @Field({ nullable: true })
  doctorRegistrationNo?: string | undefined;

  @Field({ nullable: true })
  patientName?: string | undefined;

  @Field({ nullable: true })
  patientPhone?: string | undefined;

  @Field()
  createdAt: Date;
}

// Create prescription input
@InputType()
export class CreatePrescriptionInput {
  @Field()
  consultationId: string;

  @Field(() => PrescriptionTemplate)
  template: PrescriptionTemplate;

  @Field(() => [MedicationInput], { nullable: true })
  customMedications?: MedicationInput[] | undefined;

  @Field({ nullable: true })
  instructions?: string | undefined;
}

// Create prescription response
@ObjectType()
export class CreatePrescriptionResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => PrescriptionType, { nullable: true })
  prescription?: PrescriptionType | undefined;
}

// Available templates response
@ObjectType()
export class AvailableTemplatesResponse {
  @Field(() => HealthVertical)
  vertical: HealthVertical;

  @Field(() => GraphQLJSON)
  templates: unknown;
}

// Check contraindications input
@InputType()
export class CheckContraindicationsInput {
  @Field()
  consultationId: string;

  @Field(() => PrescriptionTemplate)
  template: PrescriptionTemplate;
}

// Check contraindications response
@ObjectType()
export class CheckContraindicationsResponse {
  @Field()
  canProceed: boolean;

  @Field(() => ContraindicationResultType)
  result: ContraindicationResultType;

  @Field(() => PrescriptionTemplate, { nullable: true })
  alternativeTemplate?: PrescriptionTemplate | undefined;
}
