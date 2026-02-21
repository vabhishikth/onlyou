import { PrismaClient, HealthVertical, ConsultationStatus } from '@prisma/client';
import {
    hairLossQuestionnaire,
    sexualHealthQuestionnaire,
    pcosQuestionnaire,
    weightManagementQuestionnaire,
} from './questionnaires';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding questionnaire templates...');

    // Create Hair Loss template
    await prisma.questionnaireTemplate.upsert({
        where: { vertical_version: { vertical: HealthVertical.HAIR_LOSS, version: 1 } },
        update: { schema: hairLossQuestionnaire, isActive: true },
        create: {
            vertical: HealthVertical.HAIR_LOSS,
            version: 1,
            schema: hairLossQuestionnaire,
            isActive: true,
        },
    });
    console.log('  - Hair Loss questionnaire created');

    // Create Sexual Health template
    await prisma.questionnaireTemplate.upsert({
        where: { vertical_version: { vertical: HealthVertical.SEXUAL_HEALTH, version: 1 } },
        update: { schema: sexualHealthQuestionnaire, isActive: true },
        create: {
            vertical: HealthVertical.SEXUAL_HEALTH,
            version: 1,
            schema: sexualHealthQuestionnaire,
            isActive: true,
        },
    });
    console.log('  - Sexual Health questionnaire created');

    // Create PCOS template
    await prisma.questionnaireTemplate.upsert({
        where: { vertical_version: { vertical: HealthVertical.PCOS, version: 1 } },
        update: { schema: pcosQuestionnaire, isActive: true },
        create: {
            vertical: HealthVertical.PCOS,
            version: 1,
            schema: pcosQuestionnaire,
            isActive: true,
        },
    });
    console.log('  - PCOS questionnaire created');

    // Create Weight Management template
    await prisma.questionnaireTemplate.upsert({
        where: { vertical_version: { vertical: HealthVertical.WEIGHT_MANAGEMENT, version: 1 } },
        update: { schema: weightManagementQuestionnaire, isActive: true },
        create: {
            vertical: HealthVertical.WEIGHT_MANAGEMENT,
            version: 1,
            schema: weightManagementQuestionnaire,
            isActive: true,
        },
    });
    console.log('  - Weight Management questionnaire created');

    // ============================================
    // SEED: Test Doctor
    // ============================================
    console.log('\nSeeding test doctor...');

    const doctor = await prisma.user.upsert({
        where: { phone: '+919999999999' },
        update: { name: 'Dr. Arjun Mehta', role: 'DOCTOR', isVerified: true },
        create: {
            phone: '+919999999999',
            name: 'Dr. Arjun Mehta',
            role: 'DOCTOR',
            isVerified: true,
        },
    });

    await prisma.doctorProfile.upsert({
        where: { userId: doctor.id },
        update: {},
        create: {
            userId: doctor.id,
            registrationNo: 'TEST/NMC/2024',
            specialization: 'Dermatology',
            qualifications: ['MBBS', 'MD Dermatology'],
            yearsOfExperience: 8,
            bio: 'Specialist in hair loss and skin conditions with 8 years of clinical experience.',
            isAvailable: true,
            consultationFee: 79900, // ₹799 in paise
        },
    });
    console.log('  - Doctor created: Dr. Arjun Mehta (+919999999999)');

    // ============================================
    // SEED: Test Patient with completed intake
    // ============================================
    console.log('\nSeeding test patient...');

    const patient = await prisma.user.upsert({
        where: { phone: '+919888888888' },
        update: { name: 'Rahul Sharma', role: 'PATIENT', isVerified: true },
        create: {
            phone: '+919888888888',
            name: 'Rahul Sharma',
            role: 'PATIENT',
            isVerified: true,
        },
    });

    const patientProfile = await prisma.patientProfile.upsert({
        where: { userId: patient.id },
        update: {},
        create: {
            userId: patient.id,
            fullName: 'Rahul Sharma',
            dateOfBirth: new Date('1995-03-15'),
            gender: 'MALE',
            height: 175,
            weight: 72,
            addressLine1: '42, MG Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560001',
            healthGoals: ['HAIR_LOSS'],
            onboardingComplete: true,
            telehealthConsent: true,
            telehealthConsentDate: new Date(),
        },
    });
    console.log('  - Patient created: Rahul Sharma (+919888888888)');

    // Get the hair loss template for the intake response
    const hairLossTemplate = await prisma.questionnaireTemplate.findFirst({
        where: { vertical: HealthVertical.HAIR_LOSS, isActive: true },
    });

    if (hairLossTemplate) {
        // Check if we already have an intake response for this patient/template
        const existingIntake = await prisma.intakeResponse.findFirst({
            where: {
                patientProfileId: patientProfile.id,
                questionnaireTemplateId: hairLossTemplate.id,
            },
        });

        if (!existingIntake) {
            console.log('\nSeeding intake response + consultation...');

            const intakeResponse = await prisma.intakeResponse.create({
                data: {
                    patientProfileId: patientProfile.id,
                    questionnaireTemplateId: hairLossTemplate.id,
                    isDraft: false,
                    submittedAt: new Date(),
                    // Spec: hair-loss spec Section 3 — Q-number IDs match AI/Prescription services
                    responses: {
                        Q1: 29,                                  // Age
                        Q2: 'Male',                              // Sex
                        Q3: 'My hair is thinning gradually',     // Primary concern
                        Q4: '1-3 years',                         // Onset
                        Q5: 'Slow and gradual',                  // Progression
                        Q6: ['Crown/top thinning'],              // Location
                        Q7: 'III',                               // Norwood stage
                        Q8: ['Father'],                          // Family history
                        Q9: 'Moderately',                        // Confidence impact
                        Q10: ['None'],                           // Medical conditions
                        Q12: ['None'],                           // Current medications
                        Q14: ['None'],                           // Allergies
                        Q15: 'No',                               // Sexual side effects concern
                        Q17: ['Biotin supplements'],             // Previous treatments
                        Q20: 'Both stop loss and regrow',        // Treatment goal
                        Q21: 'No',                               // Smoking
                        Q22: 'Occasionally',                     // Alcohol
                        Q23: 'Balanced',                         // Diet
                        Q24: 'Moderate',                         // Stress
                        Q25: '6-7',                              // Sleep hours
                    },
                },
            });

            // Create consultation assigned to the test doctor
            const consultation = await prisma.consultation.create({
                data: {
                    patientId: patient.id,
                    doctorId: doctor.id,
                    intakeResponseId: intakeResponse.id,
                    vertical: HealthVertical.HAIR_LOSS,
                    status: ConsultationStatus.DOCTOR_REVIEWING,
                },
            });

            // Create AI pre-assessment
            await prisma.aIPreAssessment.create({
                data: {
                    consultationId: consultation.id,
                    summary: 'Male patient, 29 years old, presenting with 1-2 years of crown/vertex pattern hair loss consistent with androgenetic alopecia (AGA). Family history positive (paternal). No significant medical comorbidities. Non-smoker with balanced diet and moderate stress levels. Previously tried biotin supplements only. Highly motivated for treatment.',
                    riskLevel: 'LOW',
                    recommendedPlan: 'Start with combination therapy: Finasteride 1mg daily + Minoxidil 5% topical twice daily. Consider adding ketoconazole 2% shampoo 2-3x/week. Baseline blood work recommended (TSH, Ferritin, Vitamin D). Follow-up in 3 months for progress assessment.',
                    flags: [
                        'Family history of hair loss (paternal)',
                        'Crown pattern — classic AGA presentation',
                        'Good candidate for Finasteride (no contraindications)',
                        'Recommend baseline blood work before starting treatment',
                    ],
                    rawResponse: {
                        model: 'claude-sonnet-4-5-20250929',
                        timestamp: new Date().toISOString(),
                        prompt_version: '1.0',
                    },
                    modelVersion: 'claude-sonnet-4-5-20250929',
                },
            });

            console.log('  - Intake response created with hair loss answers');
            console.log('  - Consultation created (DOCTOR_REVIEWING)');
            console.log('  - AI pre-assessment created');
        } else {
            console.log('\n  - Intake response already exists, skipping...');
        }
    }

    // ============================================
    // SEED: Second test patient (Sexual Health)
    // ============================================
    console.log('\nSeeding second test patient...');

    const patient2 = await prisma.user.upsert({
        where: { phone: '+919777777777' },
        update: { name: 'Amit Patel', role: 'PATIENT', isVerified: true },
        create: {
            phone: '+919777777777',
            name: 'Amit Patel',
            role: 'PATIENT',
            isVerified: true,
        },
    });

    const patientProfile2 = await prisma.patientProfile.upsert({
        where: { userId: patient2.id },
        update: {},
        create: {
            userId: patient2.id,
            fullName: 'Amit Patel',
            dateOfBirth: new Date('1990-07-22'),
            gender: 'MALE',
            height: 170,
            weight: 78,
            addressLine1: '15, Park Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            healthGoals: ['SEXUAL_HEALTH'],
            onboardingComplete: true,
            telehealthConsent: true,
            telehealthConsentDate: new Date(),
        },
    });
    console.log('  - Patient created: Amit Patel (+919777777777)');

    const sexualHealthTemplate = await prisma.questionnaireTemplate.findFirst({
        where: { vertical: HealthVertical.SEXUAL_HEALTH, isActive: true },
    });

    if (sexualHealthTemplate) {
        const existingIntake2 = await prisma.intakeResponse.findFirst({
            where: {
                patientProfileId: patientProfile2.id,
                questionnaireTemplateId: sexualHealthTemplate.id,
            },
        });

        if (!existingIntake2) {
            const intakeResponse2 = await prisma.intakeResponse.create({
                data: {
                    patientProfileId: patientProfile2.id,
                    questionnaireTemplateId: sexualHealthTemplate.id,
                    isDraft: false,
                    submittedAt: new Date(),
                    // Spec: ED spec Section 3 — Q-number IDs match AI/Prescription services
                    responses: {
                        Q1: 35,                                          // Age
                        Q2: 'Male',                                      // Sex
                        Q3: 'Difficulty maintaining erection',            // Primary concern
                        Q4: 3,                                           // IIEF-5: confidence (moderate)
                        Q5: 3,                                           // IIEF-5: hardness (moderate)
                        Q6: 3,                                           // IIEF-5: maintenance (moderate)
                        Q7: 3,                                           // IIEF-5: completion (moderate)
                        Q8: 3,                                           // IIEF-5: satisfaction (moderate)
                        Q9: '6-12 months ago',                           // Onset
                        Q10: 'Gradual',                                  // Progression
                        Q11: 'Sometimes',                                // Morning erections
                        Q12: 'Sometimes — depends on the situation',     // Consistency
                        Q13: ['None'],                                   // CV conditions
                        Q14: ['None'],                                   // Current medications
                        Q16: 'No',                                       // Nitrate use
                        Q17: 'Normal',                                   // Blood pressure
                        Q18: 'No',                                       // Hospitalization
                        Q19: ['None'],                                   // Allergies
                        Q20: ['Performance anxiety'],                    // Psychological factors
                        Q21: 'No',                                       // Smoking
                        Q22: 'Occasionally',                             // Alcohol
                        Q23: '1-2 times per week',                       // Exercise
                        Q25: ['None'],                                   // Previous treatments
                        Q28: 'Reliable erections on demand',             // Treatment goal
                    },
                },
            });

            const consultation2 = await prisma.consultation.create({
                data: {
                    patientId: patient2.id,
                    doctorId: doctor.id,
                    intakeResponseId: intakeResponse2.id,
                    vertical: HealthVertical.SEXUAL_HEALTH,
                    status: ConsultationStatus.AI_REVIEWED,
                },
            });

            await prisma.aIPreAssessment.create({
                data: {
                    consultationId: consultation2.id,
                    summary: 'Male patient, 35 years old, experiencing intermittent erectile dysfunction for 6-12 months. No cardiovascular conditions or contraindications to PDE5 inhibitors. Non-smoker, occasional alcohol use, low exercise frequency. No current medications.',
                    riskLevel: 'LOW',
                    recommendedPlan: 'Consider starting with Tadalafil 5mg daily or Sildenafil 50mg as needed. Lifestyle modifications recommended: increase exercise frequency, reduce alcohol. Follow-up in 4 weeks.',
                    flags: [
                        'No cardiovascular contraindications',
                        'No nitrate use — safe for PDE5 inhibitors',
                        'Low exercise — lifestyle modification recommended',
                    ],
                    rawResponse: {
                        model: 'claude-sonnet-4-5-20250929',
                        timestamp: new Date().toISOString(),
                        prompt_version: '1.0',
                    },
                    modelVersion: 'claude-sonnet-4-5-20250929',
                },
            });

            console.log('  - Intake + consultation (AI_REVIEWED) + AI assessment created');
        } else {
            console.log('  - Intake response already exists, skipping...');
        }
    }

    // ============================================
    // SEED SUBSCRIPTION PLANS
    // Spec: master spec Section 12 — Pricing
    // ============================================
    console.log('\n--- Seeding Subscription Plans ---');

    const baseFeatures = [
        'Doctor consultation',
        'Personalized treatment plan',
        'Monthly medication refill',
        'Unlimited doctor chat',
        'Progress tracking',
    ];

    const plans = [
        // Hair Loss
        { vertical: HealthVertical.HAIR_LOSS, name: 'Hair Loss Monthly', priceInPaise: 99900, durationMonths: 1, features: [...baseFeatures] },
        { vertical: HealthVertical.HAIR_LOSS, name: 'Hair Loss Quarterly', priceInPaise: 249900, durationMonths: 3, features: [...baseFeatures, 'Save 17%'] },
        { vertical: HealthVertical.HAIR_LOSS, name: 'Hair Loss Annual', priceInPaise: 899900, durationMonths: 12, features: [...baseFeatures, 'Save 25%', 'Priority support'] },
        // Sexual Health
        { vertical: HealthVertical.SEXUAL_HEALTH, name: 'Sexual Health Monthly', priceInPaise: 129900, durationMonths: 1, features: [...baseFeatures] },
        { vertical: HealthVertical.SEXUAL_HEALTH, name: 'Sexual Health Quarterly', priceInPaise: 329900, durationMonths: 3, features: [...baseFeatures, 'Save 15%'] },
        { vertical: HealthVertical.SEXUAL_HEALTH, name: 'Sexual Health Annual', priceInPaise: 1199900, durationMonths: 12, features: [...baseFeatures, 'Save 23%', 'Priority support'] },
        // PCOS
        { vertical: HealthVertical.PCOS, name: 'PCOS Monthly', priceInPaise: 149900, durationMonths: 1, features: [...baseFeatures] },
        { vertical: HealthVertical.PCOS, name: 'PCOS Quarterly', priceInPaise: 379900, durationMonths: 3, features: [...baseFeatures, 'Save 16%'] },
        { vertical: HealthVertical.PCOS, name: 'PCOS Annual', priceInPaise: 1399900, durationMonths: 12, features: [...baseFeatures, 'Save 22%', 'Priority support'] },
        // Weight Management
        { vertical: HealthVertical.WEIGHT_MANAGEMENT, name: 'Weight Management Monthly', priceInPaise: 299900, durationMonths: 1, features: [...baseFeatures] },
        { vertical: HealthVertical.WEIGHT_MANAGEMENT, name: 'Weight Management Quarterly', priceInPaise: 799900, durationMonths: 3, features: [...baseFeatures, 'Save 11%'] },
        { vertical: HealthVertical.WEIGHT_MANAGEMENT, name: 'Weight Management Annual', priceInPaise: 2799900, durationMonths: 12, features: [...baseFeatures, 'Save 22%', 'Priority support'] },
    ];

    for (const plan of plans) {
        await prisma.subscriptionPlan.upsert({
            where: {
                vertical_durationMonths: {
                    vertical: plan.vertical,
                    durationMonths: plan.durationMonths,
                },
            },
            update: {
                name: plan.name,
                priceInPaise: plan.priceInPaise,
                features: plan.features,
                isActive: true,
            },
            create: {
                vertical: plan.vertical,
                name: plan.name,
                priceInPaise: plan.priceInPaise,
                durationMonths: plan.durationMonths,
                features: plan.features,
                isActive: true,
            },
        });
    }
    console.log(`  - ${plans.length} subscription plans seeded`);

    console.log('\nSeeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
