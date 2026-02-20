import { Field, ObjectType, InputType, registerEnumType } from '@nestjs/graphql';
import { HealthVertical } from '@prisma/client';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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
  @Field(() => String)
  name: string;

  @Field(() => String)
  dosage: string;

  @Field(() => String)
  frequency: string;

  @Field(() => String, { nullable: true })
  duration?: string | undefined;

  @Field(() => String, { nullable: true })
  instructions?: string | undefined;
}

// Medication input
@InputType()
export class MedicationInput {
  @Field(() => String)
  @IsNotEmpty()
  name: string;

  @Field(() => String)
  @IsNotEmpty()
  dosage: string;

  @Field(() => String)
  @IsNotEmpty()
  frequency: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  duration?: string | undefined;

  @Field(() => String, { nullable: true })
  @IsOptional()
  instructions?: string | undefined;
}

// Template definition type
@ObjectType()
export class TemplateDefinitionType {
  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => [MedicationType])
  medications: MedicationType[];

  @Field(() => String)
  whenToUse: string;
}

// Contraindication result type
@ObjectType()
export class ContraindicationResultType {
  @Field(() => Boolean)
  isBlocked: boolean;

  @Field(() => Boolean)
  requiresDoctorReview: boolean;

  @Field(() => Boolean, { nullable: true })
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
  @Field(() => String)
  id: string;

  @Field(() => String)
  consultationId: string;

  @Field(() => String, { nullable: true })
  pdfUrl?: string | undefined;

  @Field(() => GraphQLJSON)
  medications: unknown;

  @Field(() => String, { nullable: true })
  instructions?: string | undefined;

  @Field(() => Date)
  validUntil: Date;

  @Field(() => Date)
  issuedAt: Date;

  @Field(() => String, { nullable: true })
  doctorName?: string | undefined;

  @Field(() => String, { nullable: true })
  doctorRegistrationNo?: string | undefined;

  @Field(() => String, { nullable: true })
  patientName?: string | undefined;

  @Field(() => String, { nullable: true })
  patientPhone?: string | undefined;

  @Field(() => Date)
  createdAt: Date;
}

// Create prescription input
@InputType()
export class CreatePrescriptionInput {
  @Field(() => String)
  @IsNotEmpty()
  consultationId: string;

  @Field(() => PrescriptionTemplate)
  @IsNotEmpty()
  template: PrescriptionTemplate;

  @Field(() => [MedicationInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MedicationInput)
  customMedications?: MedicationInput[] | undefined;

  @Field(() => String, { nullable: true })
  @IsOptional()
  instructions?: string | undefined;
}

// Create prescription response
@ObjectType()
export class CreatePrescriptionResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
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
  @Field(() => String)
  @IsNotEmpty()
  consultationId: string;

  @Field(() => PrescriptionTemplate)
  @IsNotEmpty()
  template: PrescriptionTemplate;
}

// Check contraindications response
@ObjectType()
export class CheckContraindicationsResponse {
  @Field(() => Boolean)
  canProceed: boolean;

  @Field(() => ContraindicationResultType)
  result: ContraindicationResultType;

  @Field(() => PrescriptionTemplate, { nullable: true })
  alternativeTemplate?: PrescriptionTemplate | undefined;
}
