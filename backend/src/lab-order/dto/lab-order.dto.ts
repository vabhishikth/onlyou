import { Field, ObjectType, InputType, registerEnumType } from '@nestjs/graphql';
import { HealthVertical } from '@prisma/client';
import { LabOrderStatus } from '../lab-order.service';

// Spec: master spec Section 7 (Blood Work & Diagnostics)

// Register LabOrderStatus enum
registerEnumType(LabOrderStatus, {
    name: 'LabOrderStatus',
    description: 'Lab order status values',
});

// Test panel configuration by vertical
export const TEST_PANELS_BY_VERTICAL: Record<
    HealthVertical,
    { name: string; tests: string[]; description: string }[]
> = {
    [HealthVertical.HAIR_LOSS]: [
        {
            name: 'Hair Loss Basic Panel',
            tests: ['TSH', 'CBC', 'Ferritin', 'Vitamin_D', 'B12'],
            description: 'Essential screening for thyroid, anemia, and nutritional deficiencies',
        },
        {
            name: 'Hair Loss Comprehensive Panel',
            tests: ['TSH', 'Free_T4', 'Free_T3', 'CBC', 'Ferritin', 'Vitamin_D', 'B12', 'Zinc', 'Iron_Studies'],
            description: 'Complete workup including full thyroid panel and trace minerals',
        },
        {
            name: 'Hormone Panel (Female)',
            tests: ['FSH', 'LH', 'Prolactin', 'DHEA_S', 'Free_Testosterone'],
            description: 'Hormonal assessment for female pattern hair loss',
        },
    ],
    [HealthVertical.SEXUAL_HEALTH]: [
        {
            name: 'ED Basic Panel',
            tests: ['Fasting_Glucose', 'HbA1c', 'Lipid_Profile', 'Total_Testosterone'],
            description: 'Metabolic and hormonal screening for ED',
        },
        {
            name: 'ED Comprehensive Panel',
            tests: ['Fasting_Glucose', 'HbA1c', 'Lipid_Profile', 'Total_Testosterone', 'Free_Testosterone', 'Prolactin', 'TSH', 'LH'],
            description: 'Complete hormonal and metabolic workup',
        },
        {
            name: 'Cardiovascular Panel',
            tests: ['Lipid_Profile', 'hs_CRP', 'Homocysteine', 'Liver_Function'],
            description: 'Cardiovascular risk assessment before PDE5 inhibitors',
        },
    ],
    [HealthVertical.WEIGHT_MANAGEMENT]: [
        {
            name: 'Weight Basic Panel',
            tests: ['Fasting_Glucose', 'HbA1c', 'Lipid_Profile', 'TSH', 'Liver_Function', 'Kidney_Function'],
            description: 'Metabolic screening before weight loss medications',
        },
        {
            name: 'Weight Comprehensive Panel',
            tests: ['Fasting_Glucose', 'HbA1c', 'Fasting_Insulin', 'Lipid_Profile', 'TSH', 'Free_T4', 'Liver_Function', 'Kidney_Function', 'Vitamin_D', 'B12'],
            description: 'Complete metabolic and nutritional assessment',
        },
    ],
    [HealthVertical.PCOS]: [
        {
            name: 'PCOS Basic Panel',
            tests: ['FSH', 'LH', 'Free_Testosterone', 'DHEA_S', 'Prolactin', 'TSH'],
            description: 'Hormonal screening for PCOS diagnosis',
        },
        {
            name: 'PCOS Comprehensive Panel',
            tests: ['FSH', 'LH', 'Free_Testosterone', 'Total_Testosterone', 'DHEA_S', 'Prolactin', 'TSH', 'Fasting_Glucose', 'Fasting_Insulin', 'Lipid_Profile', 'AMH'],
            description: 'Complete hormonal and metabolic assessment',
        },
        {
            name: 'PCOS Follow-up Panel',
            tests: ['Fasting_Glucose', 'Fasting_Insulin', 'Lipid_Profile', 'Liver_Function'],
            description: 'Monitoring panel for patients on treatment',
        },
    ],
};

// Individual test type
@ObjectType()
export class TestType {
    @Field()
    code: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string | undefined;
}

// Test panel type
@ObjectType()
export class TestPanelType {
    @Field()
    name: string;

    @Field(() => [String])
    tests: string[];

    @Field()
    description: string;
}

// Available panels response
@ObjectType()
export class AvailablePanelsResponse {
    @Field(() => HealthVertical)
    vertical: HealthVertical;

    @Field(() => [TestPanelType])
    panels: TestPanelType[];
}

// Lab order type
@ObjectType()
export class LabOrderType {
    @Field()
    id: string;

    @Field()
    patientId: string;

    @Field()
    consultationId: string;

    @Field()
    doctorId: string;

    @Field(() => [String])
    testPanel: string[];

    @Field({ nullable: true })
    panelName?: string | undefined;

    @Field({ nullable: true })
    doctorNotes?: string | undefined;

    @Field(() => LabOrderStatus)
    status: LabOrderStatus;

    @Field({ nullable: true })
    bookedDate?: Date | undefined;

    @Field({ nullable: true })
    bookedTimeSlot?: string | undefined;

    @Field()
    collectionAddress: string;

    @Field()
    collectionCity: string;

    @Field()
    collectionPincode: string;

    @Field({ nullable: true })
    phlebotomistId?: string | undefined;

    @Field({ nullable: true })
    diagnosticCentreId?: string | undefined;

    @Field({ nullable: true })
    resultFileUrl?: string | undefined;

    @Field({ nullable: true })
    criticalValues?: boolean | undefined;

    @Field()
    orderedAt: Date;

    @Field({ nullable: true })
    slotBookedAt?: Date | undefined;

    @Field({ nullable: true })
    sampleCollectedAt?: Date | undefined;

    @Field({ nullable: true })
    resultsUploadedAt?: Date | undefined;

    @Field({ nullable: true })
    doctorReviewedAt?: Date | undefined;

    @Field({ nullable: true })
    closedAt?: Date | undefined;

    // Patient info (nested)
    @Field({ nullable: true })
    patientName?: string | undefined;

    @Field({ nullable: true })
    patientPhone?: string | undefined;
}

// Create lab order input
@InputType()
export class CreateLabOrderInput {
    @Field()
    consultationId: string;

    @Field(() => [String])
    testPanel: string[];

    @Field({ nullable: true })
    panelName?: string | undefined;

    @Field({ nullable: true })
    doctorNotes?: string | undefined;
}

// Create lab order response
@ObjectType()
export class CreateLabOrderResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => LabOrderType, { nullable: true })
    labOrder?: LabOrderType | undefined;
}

// Review lab results input
@InputType()
export class ReviewLabResultsInput {
    @Field()
    labOrderId: string;

    @Field({ nullable: true })
    reviewNotes?: string | undefined;
}

// Review lab results response
@ObjectType()
export class ReviewLabResultsResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => LabOrderType, { nullable: true })
    labOrder?: LabOrderType | undefined;
}
