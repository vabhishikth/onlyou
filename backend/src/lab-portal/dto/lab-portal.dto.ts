import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

// Spec: master spec Section 7.1 — Lab Portal (lab.onlyou.life)

@ObjectType()
export class LabInfo {
    @Field(() => String)
    id: string;

    @Field(() => String)
    name: string;

    @Field(() => String)
    city: string;

    @Field(() => Boolean)
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
    @Field(() => String)
    id: string;

    @Field(() => String)
    sampleId: string;

    @Field(() => String)
    panelName: string;

    @Field(() => [String])
    testsOrdered: string[];

    @Field(() => String, { nullable: true })
    deliveredBy: string | null;

    @Field(() => Date, { nullable: true })
    deliveredAt: Date | null;

    @Field(() => String)
    status: string;

    @Field(() => Int, { nullable: true })
    tubeCount: number | null;

    @Field(() => String)
    patientInitials: string;

    @Field(() => Date)
    createdAt: Date;
}

@InputType()
export class MarkSampleReceivedInput {
    @Field(() => String)
    labOrderId: string;

    @Field(() => Int)
    tubeCount: number;
}

@InputType()
export class ReportSampleIssueInput {
    @Field(() => String)
    labOrderId: string;

    @Field(() => String)
    reason: string;
}

@InputType()
export class UploadResultsInput {
    @Field(() => String)
    labOrderId: string;

    @Field(() => String)
    resultFileUrl: string;

    @Field(() => GraphQLJSON)
    abnormalFlags: Record<string, string>;
}

@ObjectType()
export class LabPortalMutationResponse {
    @Field(() => Boolean)
    success: boolean;

    @Field(() => String)
    message: string;
}
