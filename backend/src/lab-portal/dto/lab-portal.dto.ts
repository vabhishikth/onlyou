import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

// Spec: master spec Section 7.1 — Lab Portal (lab.onlyou.life)

@ObjectType()
export class LabInfo {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    city: string;

    @Field()
    isActive: boolean;
}

@ObjectType()
export class LabTodaySummary {
    @Field(() => Int)
    incoming: number;

    @Field(() => Int)
    inProgress: number;

    @Field(() => Int)
    completed: number;
}

@ObjectType()
export class LabSampleSummary {
    @Field()
    id: string;

    @Field()
    sampleId: string;

    @Field()
    panelName: string;

    @Field(() => [String])
    testsOrdered: string[];

    @Field(() => String, { nullable: true })
    deliveredBy: string | null;

    @Field(() => Date, { nullable: true })
    deliveredAt: Date | null;

    @Field()
    status: string;

    @Field(() => Int, { nullable: true })
    tubeCount: number | null;

    @Field()
    patientInitials: string;

    @Field()
    createdAt: Date;
}

@InputType()
export class MarkSampleReceivedInput {
    @Field()
    labOrderId: string;

    @Field(() => Int)
    tubeCount: number;
}

@InputType()
export class ReportSampleIssueInput {
    @Field()
    labOrderId: string;

    @Field()
    reason: string;
}

@InputType()
export class UploadResultsInput {
    @Field()
    labOrderId: string;

    @Field()
    resultFileUrl: string;

    @Field(() => GraphQLJSON)
    abnormalFlags: Record<string, string>;
}

@ObjectType()
export class LabPortalMutationResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;
}
