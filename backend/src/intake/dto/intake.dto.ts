import { Field, InputType, ObjectType, registerEnumType, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HealthVertical } from '@prisma/client';
import { GraphQLJSON } from 'graphql-type-json';

// Register the Prisma enum for GraphQL
registerEnumType(HealthVertical, {
    name: 'HealthVertical',
    description: 'Available health treatment verticals',
});

// ============================================
// OBJECT TYPES (Responses)
// ============================================

@ObjectType()
export class VerticalInfo {
    @Field(() => HealthVertical)
    id: HealthVertical;

    @Field()
    name: string;

    @Field()
    description: string;

    @Field()
    tagline: string;

    @Field(() => Int)
    pricePerMonth: number; // in paise

    @Field()
    icon: string;

    @Field()
    color: string;
}

@ObjectType()
export class QuestionnaireTemplateType {
    @Field()
    id: string;

    @Field(() => HealthVertical)
    vertical: HealthVertical;

    @Field(() => Int)
    version: number;

    @Field(() => GraphQLJSON)
    schema: Record<string, unknown>;

    @Field()
    isActive: boolean;

    @Field()
    createdAt: Date;
}

@ObjectType()
export class IntakeResponseType {
    @Field()
    id: string;

    @Field()
    patientProfileId: string;

    @Field()
    questionnaireTemplateId: string;

    @Field(() => GraphQLJSON)
    responses: Record<string, unknown>;

    @Field()
    isDraft: boolean;

    @Field(() => Date, { nullable: true })
    submittedAt?: Date;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}

@ObjectType()
export class ConsultationType {
    @Field()
    id: string;

    @Field(() => HealthVertical)
    vertical: HealthVertical;

    @Field()
    status: string;

    @Field()
    createdAt: Date;
}

@ObjectType()
export class SubmitIntakeResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => IntakeResponseType, { nullable: true })
    intakeResponse?: IntakeResponseType;

    @Field(() => ConsultationType, { nullable: true })
    consultation?: ConsultationType;
}

@ObjectType()
export class SaveDraftResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => IntakeResponseType, { nullable: true })
    intakeResponse?: IntakeResponseType;
}

// ============================================
// INPUT TYPES (Requests)
// ============================================

@InputType()
export class PhotoInput {
    @Field()
    @IsString()
    type: string; // e.g., "scalp_top", "scalp_front"

    @Field()
    @IsString()
    url: string;
}

@InputType()
export class SubmitIntakeInput {
    @Field(() => HealthVertical)
    @IsEnum(HealthVertical)
    vertical: HealthVertical;

    @Field(() => GraphQLJSON)
    @IsObject()
    responses: Record<string, unknown>;

    @Field(() => [PhotoInput], { nullable: true })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PhotoInput)
    photos?: PhotoInput[];
}

@InputType()
export class SaveDraftInput {
    @Field(() => HealthVertical)
    @IsEnum(HealthVertical)
    vertical: HealthVertical;

    @Field(() => GraphQLJSON)
    @IsObject()
    responses: Record<string, unknown>;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    intakeResponseId?: string; // For updating existing draft
}

@InputType()
export class GetQuestionnaireInput {
    @Field(() => HealthVertical)
    @IsEnum(HealthVertical)
    vertical: HealthVertical;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    version?: number;
}
