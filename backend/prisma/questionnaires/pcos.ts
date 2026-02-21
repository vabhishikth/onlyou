// Spec: PCOS spec Section 3 — 32 Questions, ~8-10 minutes
// Skip logic: Q5=regular→skip Q6/Q7/Q9, Q19=No→skip Q20, Q22=None→skip Q23, Q27=None→skip Q28

export const pcosQuestionnaire = {
    version: 1,
    sections: [
        {
            id: 'basics',
            title: 'Basics',
            questions: [
                {
                    id: 'Q1',
                    type: 'single_choice',
                    question: 'What is your biological sex?',
                    options: ['Female'],
                    required: true,
                    // Note: This vertical is female-only. Males redirected.
                },
                {
                    id: 'Q2',
                    type: 'number',
                    question: 'What is your age?',
                    required: true,
                    // Validation: <18 blocked. >45 = post-menopausal may need different evaluation.
                },
                {
                    id: 'Q3',
                    type: 'multiple_choice',
                    question: 'What brought you here? (Select all that apply)',
                    options: [
                        'Irregular or absent periods',
                        'Difficulty getting pregnant',
                        'Acne that won\'t clear up',
                        'Excess facial or body hair (hirsutism)',
                        'Weight gain or difficulty losing weight',
                        'Hair thinning on the scalp',
                        'Darkening of skin (neck, armpits, groin)',
                        'Mood swings, anxiety, or depression',
                        'Already diagnosed with PCOS, want treatment',
                        'I suspect I might have PCOS',
                    ],
                    required: true,
                    // AI: 2+ of (irregular, excess hair, acne, weight) = likely PCOS.
                },
            ],
        },
        {
            id: 'menstrual_cycle',
            title: 'Menstrual Cycle',
            questions: [
                {
                    id: 'Q4',
                    type: 'single_choice',
                    question: 'When was your last period?',
                    options: [
                        'Last week',
                        '2-3 weeks ago',
                        '1-2 months ago',
                        '3+ months ago',
                        'Can\'t remember',
                    ],
                    required: true,
                },
                {
                    id: 'Q5',
                    type: 'single_choice',
                    question: 'How would you describe your periods?',
                    options: [
                        'Regular (24-35 days, predictable)',
                        'Somewhat irregular (varies by a week+)',
                        'Very irregular (sometimes skip months)',
                        'Infrequent (few times a year)',
                        'Absent (3+ months, not pregnant)',
                        'On birth control so hard to tell',
                    ],
                    required: true,
                    // AI: Irregular/infrequent/absent = Rotterdam criterion #1.
                },
                {
                    id: 'Q6',
                    type: 'single_choice',
                    question: 'How long have your periods been irregular?',
                    options: [
                        'Since puberty',
                        'Last 1-2 years',
                        'Last 6-12 months',
                        'Recently (last few months)',
                    ],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q5',
                            value: [
                                'Somewhat irregular (varies by a week+)',
                                'Very irregular (sometimes skip months)',
                                'Infrequent (few times a year)',
                                'Absent (3+ months, not pregnant)',
                            ],
                        },
                    },
                    // AI: "Since puberty" = classic PCOS. "Recently" = may be stress.
                },
                {
                    id: 'Q7',
                    type: 'single_choice',
                    question: 'Are your periods heavy or painful?',
                    options: ['Light', 'Normal', 'Heavy', 'Very heavy with large clots', 'Varies'],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q5',
                            value: [
                                'Somewhat irregular (varies by a week+)',
                                'Very irregular (sometimes skip months)',
                                'Infrequent (few times a year)',
                                'Absent (3+ months, not pregnant)',
                            ],
                        },
                    },
                    // AI: Very heavy = possible endometrial issues.
                },
                {
                    id: 'Q8',
                    type: 'single_choice',
                    question: 'Have you been evaluated for the cause of irregular periods?',
                    options: [
                        'Yes, diagnosed with PCOS',
                        'Yes, but no diagnosis',
                        'No',
                        'Not sure',
                    ],
                    required: true,
                },
                {
                    id: 'Q9',
                    type: 'multiple_choice',
                    question: 'Do you experience any of these symptoms around your period? (Select all)',
                    options: [
                        'Severe cramps',
                        'Bloating',
                        'Mood swings',
                        'Heavy bleeding',
                        'Spotting between periods',
                        'None',
                    ],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q5',
                            value: [
                                'Somewhat irregular (varies by a week+)',
                                'Very irregular (sometimes skip months)',
                                'Infrequent (few times a year)',
                                'Absent (3+ months, not pregnant)',
                            ],
                        },
                    },
                },
            ],
        },
        {
            id: 'hyperandrogenism',
            title: 'Hyperandrogenism Symptoms',
            questions: [
                {
                    id: 'Q10',
                    type: 'multiple_choice',
                    question: 'Where do you have excess hair growth? (Select all)',
                    options: [
                        'Upper lip/chin',
                        'Cheeks/sideburns',
                        'Chest',
                        'Abdomen',
                        'Back',
                        'Upper arms/thighs',
                        'None',
                    ],
                    required: true,
                    // AI: Hirsutism = hyperandrogenism signal. Rotterdam criterion #2.
                },
                {
                    id: 'Q11',
                    type: 'single_choice',
                    question: 'How would you rate your unwanted hair growth?',
                    options: ['None', 'Mild', 'Moderate', 'Severe'],
                    required: true,
                    // AI: Modified Ferriman-Gallwey approximation.
                },
                {
                    id: 'Q12',
                    type: 'single_choice',
                    question: 'Do you currently have acne?',
                    options: ['No', 'Mild', 'Moderate', 'Severe (deep/cystic)', 'Currently treating'],
                    required: true,
                    // AI: Cystic acne + irregular periods = strong PCOS signal.
                },
                {
                    id: 'Q13',
                    type: 'single_choice',
                    question: 'Are you experiencing scalp hair thinning?',
                    options: ['No', 'Mild at part line', 'Noticeable', 'Significant/bald patches'],
                    required: true,
                    // AI: Female AGA = PCOS hyperandrogenism sign.
                },
                {
                    id: 'Q14',
                    type: 'multiple_choice',
                    question: 'Do you have darkening of the skin (acanthosis nigricans) in any of these areas? (Select all)',
                    options: [
                        'Back of neck',
                        'Armpits',
                        'Under breasts',
                        'Groin/thighs',
                        'None',
                    ],
                    required: true,
                    // AI: Strong insulin resistance marker. Suggests Metformin benefit.
                },
            ],
        },
        {
            id: 'weight_metabolism',
            title: 'Weight & Metabolism',
            questions: [
                {
                    id: 'Q15',
                    type: 'number',
                    question: 'What is your height (cm) and weight (kg)?',
                    placeholder: 'Height in cm, Weight in kg',
                    required: true,
                    // System calculates BMI.
                },
                {
                    id: 'Q16',
                    type: 'single_choice',
                    question: 'Have you experienced recent weight gain?',
                    options: [
                        'No',
                        '5-10 kg in the last year',
                        '10+ kg in the last year',
                        'Always been overweight',
                        'Struggle to lose weight',
                    ],
                    required: true,
                    // AI: "Struggle to lose" + PCOS = insulin resistance likely.
                },
                {
                    id: 'Q17',
                    type: 'single_choice',
                    question: 'Where do you tend to carry your weight?',
                    options: [
                        'Evenly distributed',
                        'Mainly belly (apple shape)',
                        'Mainly hips/thighs (pear shape)',
                        'Not overweight',
                    ],
                    required: true,
                    // AI: Central/apple = higher metabolic risk.
                },
                {
                    id: 'Q18',
                    type: 'number',
                    question: 'What is your waist circumference? (optional, in cm)',
                    placeholder: 'Measure around belly button, in cm',
                    required: false,
                    // AI: >88cm = elevated risk.
                },
            ],
        },
        {
            id: 'fertility',
            title: 'Fertility & Reproductive',
            questions: [
                {
                    id: 'Q19',
                    type: 'single_choice',
                    question: 'Are you currently trying to get pregnant?',
                    options: ['Yes', 'No', 'Planning in next 12 months', 'Not sure'],
                    required: true,
                    // AI: CRITICAL. Changes entire treatment. Trying = NO spironolactone, NO combined BC.
                },
                {
                    id: 'Q20',
                    type: 'single_choice',
                    question: 'How long have you been trying to conceive?',
                    options: [
                        'Less than 6 months',
                        '6-12 months',
                        '1-2 years',
                        '2+ years',
                    ],
                    required: true,
                    skipLogic: { showIf: { questionId: 'Q19', value: 'Yes' } },
                    // AI: >12 months = infertility. May need fertility specialist.
                },
                {
                    id: 'Q21',
                    type: 'single_choice',
                    question: 'Are you currently pregnant or breastfeeding?',
                    options: ['Yes, pregnant', 'Yes, breastfeeding', 'No'],
                    required: true,
                    // AI: Pregnant = BLOCK most medications.
                },
            ],
        },
        {
            id: 'medical_screening',
            title: 'Medical Screening',
            questions: [
                {
                    id: 'Q22',
                    type: 'multiple_choice',
                    question: 'Do you have any of these medical conditions? (Select all)',
                    options: [
                        'Type 2 diabetes/pre-diabetes',
                        'Thyroid disorder',
                        'Endometriosis',
                        'High blood pressure',
                        'High cholesterol',
                        'Blood clot history (DVT/PE)',
                        'Liver disease',
                        'Migraine with aura',
                        'Epilepsy',
                        'Depression/anxiety',
                        'Eating disorder',
                        'None',
                    ],
                    required: true,
                    // AI: Blood clots or migraine with aura = combined BC CONTRAINDICATED.
                },
                {
                    id: 'Q23',
                    type: 'multiple_choice',
                    question: 'What medications are you currently taking? (Select all)',
                    options: [
                        'Birth control (specify type)',
                        'Metformin',
                        'Thyroid medications',
                        'Antidepressants',
                        'Blood pressure medications',
                        'Spironolactone',
                        'None',
                    ],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q22',
                            value: [
                                'Type 2 diabetes/pre-diabetes', 'Thyroid disorder', 'Endometriosis',
                                'High blood pressure', 'High cholesterol', 'Blood clot history (DVT/PE)',
                                'Liver disease', 'Migraine with aura', 'Epilepsy',
                                'Depression/anxiety', 'Eating disorder',
                            ],
                        },
                    },
                },
                {
                    id: 'Q24',
                    type: 'text',
                    question: 'Do you have any drug allergies?',
                    placeholder: 'Enter allergies or type "None"',
                    required: true,
                },
                {
                    id: 'Q25',
                    type: 'multiple_choice',
                    question: 'Is there a family history of PCOS, diabetes, or thyroid disorders?',
                    options: [
                        'Mother has PCOS',
                        'Sister has PCOS',
                        'Family history of diabetes',
                        'Family history of thyroid disorder',
                        'None',
                        'Not sure',
                    ],
                    required: true,
                },
                {
                    id: 'Q26',
                    type: 'single_choice',
                    question: 'Have you had blood work done in the last 12 months?',
                    options: ['Yes', 'No'],
                    required: true,
                },
            ],
        },
        {
            id: 'treatment_history',
            title: 'Treatment History',
            questions: [
                {
                    id: 'Q27',
                    type: 'multiple_choice',
                    question: 'Have you tried any of these PCOS treatments? (Select all)',
                    options: [
                        'Combined birth control pills',
                        'Progesterone-only pills',
                        'Metformin',
                        'Spironolactone',
                        'Letrozole/Clomiphene (fertility)',
                        'Anti-acne treatments',
                        'Laser hair removal',
                        'Supplements (inositol, berberine)',
                        'Lifestyle changes',
                        'None',
                    ],
                    required: true,
                },
                {
                    id: 'Q28',
                    type: 'text',
                    question: 'Did you experience any side effects from previous treatments?',
                    placeholder: 'Describe side effects or type "None"',
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q27',
                            value: [
                                'Combined birth control pills', 'Progesterone-only pills',
                                'Metformin', 'Spironolactone', 'Letrozole/Clomiphene (fertility)',
                                'Anti-acne treatments', 'Laser hair removal',
                                'Supplements (inositol, berberine)', 'Lifestyle changes',
                            ],
                        },
                    },
                },
                {
                    id: 'Q29',
                    type: 'multiple_choice',
                    question: 'What concerns you MOST about your PCOS? (Select your top 3)',
                    options: [
                        'Irregular periods',
                        'Fertility',
                        'Acne',
                        'Excess hair growth',
                        'Weight management',
                        'Hair thinning',
                        'Mood changes',
                        'Long-term health risks',
                    ],
                    required: true,
                    // AI: Prioritizes treatment approach entirely.
                },
            ],
        },
        {
            id: 'lifestyle',
            title: 'Lifestyle',
            questions: [
                {
                    id: 'Q30',
                    type: 'single_choice',
                    question: 'How often do you exercise?',
                    options: ['Sedentary', 'Light (1-2x/week)', 'Moderate (3-4x/week)', 'Active (5+/week)'],
                    required: true,
                },
                {
                    id: 'Q31',
                    type: 'single_choice',
                    question: 'How would you describe your diet?',
                    options: ['Balanced', 'Vegetarian', 'Vegan', 'Irregular/fast food', 'Low-carb'],
                    required: true,
                },
                {
                    id: 'Q32',
                    type: 'single_choice',
                    question: 'How would you rate your stress level?',
                    options: ['Low', 'Moderate', 'High', 'Very high'],
                    required: true,
                },
            ],
        },
    ],
    photoRequirements: [],
};
