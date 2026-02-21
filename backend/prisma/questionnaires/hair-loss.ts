// Spec: hair-loss spec Section 3 — 25 Questions, ~5-7 minutes
// Skip logic: Q2=Female→Q2b, Q10=scalp→Q10b, Q17=None→skip Q18/Q19

export const hairLossQuestionnaire = {
    version: 1,
    sections: [
        {
            id: 'basics',
            title: 'Basics',
            questions: [
                {
                    id: 'Q1',
                    type: 'number',
                    question: 'What is your age?',
                    required: true,
                    // Validation: <18 = blocked. AI: Age-appropriate treatment, <25 more conservative.
                },
                {
                    id: 'Q2',
                    type: 'single_choice',
                    question: 'What is your biological sex?',
                    options: ['Male', 'Female'],
                    required: true,
                    // AI: Finasteride contraindicated in women of childbearing age.
                },
                {
                    id: 'Q2b',
                    type: 'single_choice',
                    question: 'Are you currently pregnant, breastfeeding, or planning pregnancy in the next 12 months?',
                    options: ['Yes', 'No'],
                    required: true,
                    skipLogic: { showIf: { questionId: 'Q2', value: 'Female' } },
                    // AI: Yes = ABSOLUTE finasteride block.
                },
                {
                    id: 'Q3',
                    type: 'single_choice',
                    question: 'What is your primary concern?',
                    options: [
                        'My hair is thinning gradually',
                        'My hairline is receding',
                        'I have bald patches/spots',
                        'I\'m shedding a lot of hair suddenly',
                        'I have scalp itching/flaking along with hair loss',
                        'Not sure — I want professional guidance',
                    ],
                    required: true,
                    // AI: "Bald patches" = possible alopecia areata. "Sudden shedding" = possible TE.
                },
            ],
        },
        {
            id: 'hair_loss_pattern',
            title: 'Hair Loss Pattern',
            questions: [
                {
                    id: 'Q4',
                    type: 'single_choice',
                    question: 'When did you first notice hair loss?',
                    options: [
                        'Less than 3 months ago',
                        '3-6 months ago',
                        '6-12 months ago',
                        '1-3 years ago',
                        '3-5 years ago',
                        '5+ years ago',
                    ],
                    required: true,
                    // AI: <6 months + sudden = red flag for TE.
                },
                {
                    id: 'Q5',
                    type: 'single_choice',
                    question: 'How would you describe the progression?',
                    options: [
                        'Slow and gradual',
                        'Steady — noticeable every few months',
                        'Rapid — significant change recently',
                        'Comes and goes',
                    ],
                    required: true,
                    // AI: "Rapid" or "comes and goes" = NOT typical AGA.
                },
                {
                    id: 'Q6',
                    type: 'multiple_choice',
                    question: 'Where are you losing hair? (Select all that apply)',
                    options: [
                        'Hairline/forehead receding',
                        'Crown/top thinning',
                        'Temples thinning',
                        'Overall thinning everywhere',
                        'Specific patches/spots',
                        'Sides of head',
                        'Back of head',
                    ],
                    required: true,
                    // AI: Hairline+Crown+Temples = AGA. Patches = alopecia areata. Sides/Back = unusual.
                },
                {
                    id: 'Q7',
                    type: 'single_choice',
                    question: 'Which image best matches your hair loss? (Norwood-Hamilton Scale)',
                    options: ['I', 'II', 'III', 'III Vertex', 'IV', 'V', 'VI', 'VII', 'None match'],
                    required: true,
                    // AI: Severity assessment. Cross-referenced with photos.
                },
                {
                    id: 'Q8',
                    type: 'multiple_choice',
                    question: 'Does anyone in your family have hair loss?',
                    options: [
                        'Father',
                        'Maternal grandfather',
                        'Maternal uncles',
                        'Brothers',
                        'No one',
                        'Not sure',
                    ],
                    required: true,
                    // AI: Both sides = high AGA likelihood. Maternal grandfather strongest predictor.
                },
                {
                    id: 'Q9',
                    type: 'single_choice',
                    question: 'Has hair loss affected your confidence?',
                    options: ['Not at all', 'Slightly', 'Moderately', 'Significantly'],
                    required: true,
                    // AI: Helps doctor personalize message. Not clinical.
                },
            ],
        },
        {
            id: 'medical_screening',
            title: 'Medical Screening',
            questions: [
                {
                    id: 'Q10',
                    type: 'multiple_choice',
                    question: 'Do you have any of these conditions? (Select all that apply)',
                    options: [
                        'Thyroid disorder',
                        'Diabetes',
                        'Autoimmune condition',
                        'Iron deficiency/anemia',
                        'Scalp psoriasis or eczema',
                        'Liver disease',
                        'Kidney disease',
                        'Depression or anxiety',
                        'Heart condition',
                        'None',
                    ],
                    required: true,
                    // AI: Thyroid+iron = independent hair loss causes. Liver = finasteride caution.
                },
                {
                    id: 'Q10b',
                    type: 'single_choice',
                    question: 'How severe is your scalp condition?',
                    options: ['Mild', 'Moderate', 'Severe'],
                    required: true,
                    skipLogic: { showIf: { questionId: 'Q10', value: 'Scalp psoriasis or eczema' } },
                    // AI: Severe may need treatment before hair loss protocol.
                },
                {
                    id: 'Q11',
                    type: 'multiple_choice',
                    question: 'Have you experienced any of these in the last 6 months? (Select all)',
                    options: [
                        'Major surgery',
                        'Severe illness or high fever',
                        'Weight loss >10kg',
                        'Major stress',
                        'New medication',
                        'Crash diet',
                        'None',
                    ],
                    required: true,
                    // AI: ANY = telogen effluvium risk.
                },
                {
                    id: 'Q12',
                    type: 'multiple_choice',
                    question: 'What medications are you currently taking? (Select all)',
                    options: [
                        'Blood thinners',
                        'Blood pressure medications',
                        'Antidepressants',
                        'Steroids',
                        'Isotretinoin',
                        'Testosterone/anabolic steroids',
                        'Thyroid medications',
                        'Diabetes medications',
                        'Statins',
                        'None',
                    ],
                    required: true,
                    // AI: Drug interactions. Isotretinoin = wait. Testosterone = may worsen AGA.
                },
                {
                    id: 'Q13',
                    type: 'multiple_choice',
                    question: 'Do you have any drug allergies?',
                    options: [
                        'Minoxidil',
                        'Finasteride',
                        'Propylene glycol',
                        'Sulfa drugs',
                        'None',
                    ],
                    required: true,
                    // AI: Minoxidil allergy = alternative formulation.
                },
                {
                    id: 'Q14',
                    type: 'multiple_choice',
                    question: 'Have you experienced any of these? (Select all)',
                    options: [
                        'Decreased sex drive',
                        'Erectile difficulty',
                        'Breast tenderness',
                        'Mood changes from medication',
                        'None',
                    ],
                    required: true,
                    // AI: CRITICAL for finasteride safety.
                },
                {
                    id: 'Q15',
                    type: 'single_choice',
                    question: 'Are you planning to have children in the next 12 months?',
                    options: ['Yes', 'No', 'Not sure'],
                    required: true,
                    // AI: Finasteride affects sperm. Not absolute block but doctor must discuss.
                },
                {
                    id: 'Q16',
                    type: 'single_choice',
                    question: 'Have you had blood work done in the last 12 months?',
                    options: ['Yes', 'No'],
                    required: true,
                    // AI: No recent blood work + suspected thyroid/nutritional = recommend panel.
                },
            ],
        },
        {
            id: 'treatment_history',
            title: 'Treatment History',
            questions: [
                {
                    id: 'Q17',
                    type: 'multiple_choice',
                    question: 'Have you tried any of these treatments before? (Select all)',
                    options: [
                        'Minoxidil',
                        'Finasteride',
                        'Dutasteride',
                        'Hair oils',
                        'Ayurvedic treatments',
                        'Biotin supplements',
                        'PRP therapy',
                        'Hair transplant',
                        'Ketoconazole shampoo',
                        'LLLT (laser therapy)',
                        'None',
                    ],
                    required: true,
                    // AI: Prior response informs protocol.
                },
                {
                    id: 'Q18',
                    type: 'single_choice',
                    question: 'How long did you use the treatment(s)?',
                    options: [
                        'Less than 1 month',
                        '1-3 months',
                        '3-6 months',
                        '6-12 months',
                        'More than 1 year',
                    ],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q17',
                            value: [
                                'Minoxidil', 'Finasteride', 'Dutasteride', 'Hair oils',
                                'Ayurvedic treatments', 'Biotin supplements', 'PRP therapy',
                                'Hair transplant', 'Ketoconazole shampoo', 'LLLT (laser therapy)',
                            ],
                        },
                    },
                    // AI: <6 months = insufficient trial.
                },
                {
                    id: 'Q19',
                    type: 'multiple_choice',
                    question: 'Did you experience any side effects from previous treatments? (Select all)',
                    options: [
                        'Scalp irritation',
                        'Unwanted facial hair',
                        'Initial shedding',
                        'Sexual side effects',
                        'Mood changes',
                        'Breast tenderness',
                        'No side effects',
                    ],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q17',
                            value: [
                                'Minoxidil', 'Finasteride', 'Dutasteride', 'Hair oils',
                                'Ayurvedic treatments', 'Biotin supplements', 'PRP therapy',
                                'Hair transplant', 'Ketoconazole shampoo', 'LLLT (laser therapy)',
                            ],
                        },
                    },
                    // AI: Previous finasteride side effects = minoxidil-only protocol.
                },
                {
                    id: 'Q20',
                    type: 'single_choice',
                    question: 'What are your expectations from treatment?',
                    options: [
                        'Stop further hair loss',
                        'Regrow some lost hair',
                        'Full restoration',
                        'Want professional guidance',
                    ],
                    required: true,
                    // AI: Norwood V+ wanting "full restoration" = expectations need adjustment.
                },
            ],
        },
        {
            id: 'lifestyle',
            title: 'Lifestyle',
            questions: [
                {
                    id: 'Q21',
                    type: 'single_choice',
                    question: 'Do you smoke?',
                    options: ['Yes daily', 'Occasionally', 'No', 'Quit recently'],
                    required: true,
                    // AI: Reduces scalp blood flow, affects minoxidil efficacy.
                },
                {
                    id: 'Q22',
                    type: 'single_choice',
                    question: 'How often do you consume alcohol?',
                    options: ['Never', 'Occasionally', 'Regularly', 'Daily'],
                    required: true,
                    // AI: Daily = liver flag for finasteride.
                },
                {
                    id: 'Q23',
                    type: 'single_choice',
                    question: 'How would you describe your diet?',
                    options: [
                        'Balanced',
                        'Mostly vegetarian',
                        'Strictly vegetarian/vegan',
                        'Irregular/fast food',
                        'Restrictive diet',
                    ],
                    required: true,
                    // AI: Vegetarian/vegan in India = iron, zinc, B12 deficiency risk.
                },
                {
                    id: 'Q24',
                    type: 'single_choice',
                    question: 'How would you rate your stress level?',
                    options: ['Low', 'Moderate', 'High', 'Very high'],
                    required: true,
                    // AI: Chronic high stress = TE risk factor.
                },
                {
                    id: 'Q25',
                    type: 'single_choice',
                    question: 'How many hours do you typically sleep per night?',
                    options: ['Less than 5', '5-6', '6-7', '7-8', 'More than 8'],
                    required: true,
                    // AI: Chronic sleep deprivation affects hair growth cycle.
                },
            ],
        },
    ],
    photoRequirements: [
        { id: 'scalp_top', label: 'Top of head (crown)', required: true, instructions: 'Take a photo from directly above, showing the crown area. Natural light, dry unstyled hair.' },
        { id: 'scalp_front', label: 'Hairline (front)', required: true, instructions: 'Take a photo showing your hairline from the front. Hair pulled back, forehead visible.' },
        { id: 'scalp_left', label: 'Left side', required: false, instructions: 'Take a profile photo showing your left temple area.' },
        { id: 'scalp_right', label: 'Right side', required: false, instructions: 'Take a profile photo showing your right temple area.' },
    ],
};
