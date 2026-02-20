import { PrismaClient, HealthVertical, ConsultationStatus } from '@prisma/client';

const prisma = new PrismaClient();

const hairLossQuestionnaire = {
    version: 1,
    sections: [
        {
            id: 'hair_history',
            title: 'Hair Loss History',
            questions: [
                {
                    id: 'duration',
                    type: 'single_choice',
                    question: 'How long have you been experiencing hair loss?',
                    options: [
                        'Less than 6 months',
                        '6-12 months',
                        '1-2 years',
                        '2-5 years',
                        'More than 5 years',
                    ],
                    required: true,
                },
                {
                    id: 'pattern',
                    type: 'single_choice',
                    question: 'Where do you notice the most hair loss?',
                    options: [
                        'Receding hairline',
                        'Crown/top of head',
                        'Overall thinning',
                        'Temples',
                        'Multiple areas',
                    ],
                    required: true,
                },
                {
                    id: 'family_history',
                    type: 'single_choice',
                    question: 'Do you have a family history of hair loss?',
                    options: [
                        'Yes, father',
                        'Yes, mother',
                        'Yes, both parents',
                        'Yes, grandparents',
                        'No family history',
                        'Not sure',
                    ],
                    required: true,
                },
            ],
        },
        {
            id: 'lifestyle',
            title: 'Lifestyle & Health',
            questions: [
                {
                    id: 'stress_level',
                    type: 'single_choice',
                    question: 'How would you rate your current stress level?',
                    options: ['Low', 'Moderate', 'High', 'Very high'],
                    required: true,
                },
                {
                    id: 'sleep_hours',
                    type: 'single_choice',
                    question: 'How many hours do you typically sleep per night?',
                    options: [
                        'Less than 5 hours',
                        '5-6 hours',
                        '6-7 hours',
                        '7-8 hours',
                        'More than 8 hours',
                    ],
                    required: true,
                },
                {
                    id: 'smoking',
                    type: 'single_choice',
                    question: 'Do you smoke?',
                    options: ['No, never', 'Former smoker', 'Occasionally', 'Regularly'],
                    required: true,
                },
                {
                    id: 'diet',
                    type: 'single_choice',
                    question: 'How would you describe your diet?',
                    options: [
                        'Balanced with fruits, vegetables, and protein',
                        'Mostly vegetarian',
                        'High in processed foods',
                        'Irregular eating habits',
                    ],
                    required: true,
                },
            ],
        },
        {
            id: 'medical',
            title: 'Medical History',
            questions: [
                {
                    id: 'previous_treatments',
                    type: 'multiple_choice',
                    question: 'Have you tried any of these treatments before?',
                    options: [
                        'Minoxidil (Rogaine)',
                        'Finasteride (Propecia)',
                        'Hair transplant',
                        'PRP therapy',
                        'Biotin supplements',
                        'None of the above',
                    ],
                    required: true,
                },
                {
                    id: 'medical_conditions',
                    type: 'multiple_choice',
                    question: 'Do you have any of these conditions?',
                    options: [
                        'Thyroid disorder',
                        'Diabetes',
                        'Autoimmune condition',
                        'Scalp conditions (psoriasis, dermatitis)',
                        'None of the above',
                    ],
                    required: true,
                },
                {
                    id: 'medications',
                    type: 'text',
                    question: 'List any medications you are currently taking',
                    placeholder: 'Enter medications or type "None"',
                    required: true,
                },
                {
                    id: 'allergies',
                    type: 'text',
                    question: 'Do you have any known drug allergies?',
                    placeholder: 'Enter allergies or type "None"',
                    required: true,
                },
            ],
        },
        {
            id: 'goals',
            title: 'Treatment Goals',
            questions: [
                {
                    id: 'primary_goal',
                    type: 'single_choice',
                    question: 'What is your primary goal?',
                    options: [
                        'Stop further hair loss',
                        'Regrow lost hair',
                        'Both stop loss and regrow',
                        'Improve hair thickness',
                    ],
                    required: true,
                },
                {
                    id: 'commitment',
                    type: 'single_choice',
                    question: 'How committed are you to a daily treatment routine?',
                    options: [
                        'Very committed - I can follow a daily routine',
                        'Moderately committed - I prefer simpler routines',
                        'Looking for minimal effort solutions',
                    ],
                    required: true,
                },
            ],
        },
    ],
    photoRequirements: [
        { id: 'scalp_top', label: 'Top of head', required: true, instructions: 'Take a photo from directly above, showing the crown area' },
        { id: 'scalp_front', label: 'Hairline (front)', required: true, instructions: 'Take a photo showing your hairline from the front' },
        { id: 'scalp_left', label: 'Left side', required: false, instructions: 'Take a photo of your left temple area' },
        { id: 'scalp_right', label: 'Right side', required: false, instructions: 'Take a photo of your right temple area' },
    ],
};

const sexualHealthQuestionnaire = {
    version: 1,
    sections: [
        {
            id: 'symptoms',
            title: 'Symptoms',
            questions: [
                {
                    id: 'primary_concern',
                    type: 'single_choice',
                    question: 'What is your primary concern?',
                    options: [
                        'Difficulty achieving erection',
                        'Difficulty maintaining erection',
                        'Premature ejaculation',
                        'Low libido',
                        'Multiple concerns',
                    ],
                    required: true,
                },
                {
                    id: 'duration',
                    type: 'single_choice',
                    question: 'How long have you been experiencing this?',
                    options: [
                        'Less than 1 month',
                        '1-6 months',
                        '6-12 months',
                        '1-2 years',
                        'More than 2 years',
                    ],
                    required: true,
                },
                {
                    id: 'frequency',
                    type: 'single_choice',
                    question: 'How often do you experience this issue?',
                    options: ['Rarely', 'Sometimes', 'Often', 'Always'],
                    required: true,
                },
            ],
        },
        {
            id: 'medical',
            title: 'Medical History',
            questions: [
                {
                    id: 'heart_conditions',
                    type: 'single_choice',
                    question: 'Do you have any heart or cardiovascular conditions?',
                    options: ['No', 'High blood pressure', 'Heart disease', 'Previous heart attack/stroke', 'Other'],
                    required: true,
                },
                {
                    id: 'medications',
                    type: 'text',
                    question: 'List any medications you are currently taking',
                    placeholder: 'Enter medications or type "None"',
                    required: true,
                },
                {
                    id: 'nitrates',
                    type: 'single_choice',
                    question: 'Do you take nitrate medications (for chest pain/heart)?',
                    options: ['No', 'Yes', 'Not sure'],
                    required: true,
                },
            ],
        },
        {
            id: 'lifestyle',
            title: 'Lifestyle',
            questions: [
                {
                    id: 'smoking',
                    type: 'single_choice',
                    question: 'Do you smoke?',
                    options: ['No, never', 'Former smoker', 'Occasionally', 'Regularly'],
                    required: true,
                },
                {
                    id: 'alcohol',
                    type: 'single_choice',
                    question: 'How often do you consume alcohol?',
                    options: ['Never', 'Occasionally', 'Weekly', 'Daily'],
                    required: true,
                },
                {
                    id: 'exercise',
                    type: 'single_choice',
                    question: 'How often do you exercise?',
                    options: ['Rarely', '1-2 times per week', '3-4 times per week', 'Daily'],
                    required: true,
                },
            ],
        },
    ],
    photoRequirements: [],
};

const pcosQuestionnaire = {
    version: 1,
    sections: [
        {
            id: 'symptoms',
            title: 'Symptoms',
            questions: [
                {
                    id: 'primary_symptoms',
                    type: 'multiple_choice',
                    question: 'Which symptoms are you experiencing?',
                    options: [
                        'Irregular periods',
                        'Heavy periods',
                        'Missed periods',
                        'Acne',
                        'Excess facial/body hair',
                        'Hair thinning on scalp',
                        'Weight gain',
                        'Difficulty losing weight',
                        'Fatigue',
                        'Mood swings',
                    ],
                    required: true,
                },
                {
                    id: 'diagnosis',
                    type: 'single_choice',
                    question: 'Have you been diagnosed with PCOS?',
                    options: ['Yes, confirmed by doctor', 'Suspected but not confirmed', 'No diagnosis yet'],
                    required: true,
                },
                {
                    id: 'cycle_length',
                    type: 'single_choice',
                    question: 'How long is your typical menstrual cycle?',
                    options: [
                        'Less than 21 days',
                        '21-35 days (regular)',
                        '35-60 days',
                        'More than 60 days',
                        'Very irregular/unpredictable',
                    ],
                    required: true,
                },
            ],
        },
        {
            id: 'medical',
            title: 'Medical History',
            questions: [
                {
                    id: 'previous_treatments',
                    type: 'multiple_choice',
                    question: 'Have you tried any of these treatments?',
                    options: [
                        'Birth control pills',
                        'Metformin',
                        'Spironolactone',
                        'Lifestyle changes',
                        'Supplements (inositol, etc.)',
                        'None of the above',
                    ],
                    required: true,
                },
                {
                    id: 'other_conditions',
                    type: 'multiple_choice',
                    question: 'Do you have any of these conditions?',
                    options: [
                        'Thyroid disorder',
                        'Diabetes/pre-diabetes',
                        'High blood pressure',
                        'None of the above',
                    ],
                    required: true,
                },
                {
                    id: 'medications',
                    type: 'text',
                    question: 'List any medications you are currently taking',
                    placeholder: 'Enter medications or type "None"',
                    required: true,
                },
            ],
        },
        {
            id: 'goals',
            title: 'Treatment Goals',
            questions: [
                {
                    id: 'primary_goal',
                    type: 'single_choice',
                    question: 'What is your primary treatment goal?',
                    options: [
                        'Regulate periods',
                        'Manage weight',
                        'Improve skin/reduce acne',
                        'Reduce excess hair growth',
                        'Improve fertility',
                        'Overall hormonal balance',
                    ],
                    required: true,
                },
                {
                    id: 'pregnancy_plans',
                    type: 'single_choice',
                    question: 'Are you planning to become pregnant in the next 12 months?',
                    options: ['Yes', 'No', 'Maybe/Unsure'],
                    required: true,
                },
            ],
        },
    ],
    photoRequirements: [],
};

const weightManagementQuestionnaire = {
    version: 1,
    sections: [
        {
            id: 'current_status',
            title: 'Current Status',
            questions: [
                {
                    id: 'weight_goal',
                    type: 'single_choice',
                    question: 'What is your weight loss goal?',
                    options: [
                        'Lose 5-10 kg',
                        'Lose 10-20 kg',
                        'Lose 20-30 kg',
                        'Lose more than 30 kg',
                    ],
                    required: true,
                },
                {
                    id: 'previous_attempts',
                    type: 'single_choice',
                    question: 'How many times have you tried to lose weight before?',
                    options: ['This is my first time', '1-2 times', '3-5 times', 'More than 5 times'],
                    required: true,
                },
                {
                    id: 'previous_methods',
                    type: 'multiple_choice',
                    question: 'What weight loss methods have you tried?',
                    options: [
                        'Diet changes only',
                        'Exercise only',
                        'Diet and exercise',
                        'Weight loss supplements',
                        'Prescription medications',
                        'None',
                    ],
                    required: true,
                },
            ],
        },
        {
            id: 'lifestyle',
            title: 'Lifestyle',
            questions: [
                {
                    id: 'eating_habits',
                    type: 'single_choice',
                    question: 'How would you describe your eating habits?',
                    options: [
                        'Regular meals, healthy choices',
                        'Irregular meals',
                        'Frequent snacking',
                        'Emotional eating',
                        'Late night eating',
                    ],
                    required: true,
                },
                {
                    id: 'physical_activity',
                    type: 'single_choice',
                    question: 'How active are you currently?',
                    options: [
                        'Sedentary (desk job, minimal movement)',
                        'Lightly active (some walking)',
                        'Moderately active (regular exercise)',
                        'Very active (intense exercise)',
                    ],
                    required: true,
                },
                {
                    id: 'sleep_quality',
                    type: 'single_choice',
                    question: 'How would you rate your sleep quality?',
                    options: ['Poor', 'Fair', 'Good', 'Excellent'],
                    required: true,
                },
            ],
        },
        {
            id: 'medical',
            title: 'Medical History',
            questions: [
                {
                    id: 'medical_conditions',
                    type: 'multiple_choice',
                    question: 'Do you have any of these conditions?',
                    options: [
                        'Type 2 diabetes',
                        'Pre-diabetes',
                        'High blood pressure',
                        'High cholesterol',
                        'Sleep apnea',
                        'Thyroid disorder',
                        'PCOS',
                        'None of the above',
                    ],
                    required: true,
                },
                {
                    id: 'family_history',
                    type: 'single_choice',
                    question: 'Is there a family history of obesity or diabetes?',
                    options: ['Yes', 'No', 'Not sure'],
                    required: true,
                },
                {
                    id: 'medications',
                    type: 'text',
                    question: 'List any medications you are currently taking',
                    placeholder: 'Enter medications or type "None"',
                    required: true,
                },
                {
                    id: 'pancreatitis_history',
                    type: 'single_choice',
                    question: 'Have you ever had pancreatitis or thyroid cancer?',
                    options: ['No', 'Yes - pancreatitis', 'Yes - thyroid cancer', 'Yes - both'],
                    required: true,
                },
            ],
        },
    ],
    photoRequirements: [],
};

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
                    responses: {
                        duration: '1-2 years',
                        pattern: 'Crown/top of head',
                        family_history: 'Yes, father',
                        stress_level: 'Moderate',
                        sleep_hours: '6-7 hours',
                        smoking: 'No, never',
                        diet: 'Balanced with fruits, vegetables, and protein',
                        previous_treatments: ['Biotin supplements'],
                        medical_conditions: ['None of the above'],
                        medications: 'None',
                        allergies: 'None',
                        primary_goal: 'Both stop loss and regrow',
                        commitment: 'Very committed - I can follow a daily routine',
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
                    responses: {
                        primary_concern: 'Difficulty maintaining erection',
                        duration: '6-12 months',
                        frequency: 'Sometimes',
                        heart_conditions: 'No',
                        medications: 'None',
                        nitrates: 'No',
                        smoking: 'No, never',
                        alcohol: 'Occasionally',
                        exercise: '1-2 times per week',
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
