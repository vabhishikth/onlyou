import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsArray, IsInt, IsBoolean, IsString, Min, Max } from 'class-validator';
import { HealthVertical } from '@prisma/client';

// Spec: Phase 12 — Doctor Update Input

@InputType()
export class UpdateDoctorInput {
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  specializations?: string[];

  @Field(() => [HealthVertical], { nullable: true })
  @IsOptional()
  @IsArray()
  verticals?: HealthVertical[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  dailyCaseLimit?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  consultationFee?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  seniorDoctor?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  qualifications?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;
}
