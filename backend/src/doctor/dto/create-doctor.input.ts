import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, IsBoolean, ArrayMinSize, Min, Max } from 'class-validator';
import { HealthVertical } from '@prisma/client';

// Spec: Phase 12 — Doctor Onboarding Input

@InputType()
export class CreateDoctorInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  email?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  registrationNo: string;

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  specializations: string[];

  @Field(() => [HealthVertical])
  @IsArray()
  @ArrayMinSize(1)
  verticals: HealthVertical[];

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  qualifications: string[];

  @Field(() => Int)
  @IsInt()
  @Min(0)
  yearsOfExperience: number;

  @Field(() => Int, { defaultValue: 15 })
  @IsInt()
  @Min(1)
  @Max(50)
  dailyCaseLimit: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  consultationFee: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  seniorDoctor?: boolean;
}
