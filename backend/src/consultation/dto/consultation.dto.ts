import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

// Spec: master spec Section 3.7 (Consultation Lifecycle)
// These DTOs match the frontend mutation shapes in web/src/app/doctor/case/[id]/page.tsx

@InputType()
export class UpdateConsultationStatusInput {
    @Field(() => String)
    @IsNotEmpty()
    consultationId: string;

    @Field(() => String)
    @IsNotEmpty()
    status: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    doctorNotes?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    rejectionReason?: string;
}

@InputType()
export class AssignCaseInput {
    @Field(() => String)
    @IsNotEmpty()
    consultationId: string;

    @Field(() => String)
    @IsNotEmpty()
    doctorId: string;
}

@ObjectType()
export class ConsultationStatusResponse {
    @Field(() => String)
    id: string;

    @Field(() => String)
    status: string;

    @Field(() => String, { nullable: true })
    doctorNotes?: string;

    @Field(() => String, { nullable: true })
    rejectionReason?: string;

    @Field(() => String, { nullable: true })
    doctorId?: string;
}
