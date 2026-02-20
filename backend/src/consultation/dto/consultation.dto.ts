import { ObjectType, Field, InputType } from '@nestjs/graphql';

// Spec: master spec Section 3.7 (Consultation Lifecycle)
// These DTOs match the frontend mutation shapes in web/src/app/doctor/case/[id]/page.tsx

@InputType()
export class UpdateConsultationStatusInput {
    @Field(() => String)
    consultationId: string;

    @Field(() => String)
    status: string;

    @Field(() => String, { nullable: true })
    doctorNotes?: string;

    @Field(() => String, { nullable: true })
    rejectionReason?: string;
}

@InputType()
export class AssignCaseInput {
    @Field(() => String)
    consultationId: string;

    @Field(() => String)
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
