// Spec: ED spec Section 3 — 28 Questions, ~6-8 minutes
// Skip logic: Q3="never able"→skip Q4/Q5, Q14="No meds"→skip Q15, Q22="Never tried"→skip Q23/Q24

export const sexualHealthQuestionnaire = {
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
                    // Validation: <18 = blocked. AI: >65 = more conservative dosing.
                },
                {
                    id: 'Q2',
                    type: 'single_choice',
                    question: 'What is your biological sex?',
                    options: ['Male'],
                    required: true,
                    // Note: This vertical is male-only.
                },
                {
                    id: 'Q3',
                    type: 'single_choice',
                    question: 'Which best describes your situation?',
                    options: [
                        'I can get an erection but have trouble maintaining it',
                        'I have difficulty getting an erection at all',
                        'I sometimes get erections but they\'re not firm enough for sex',
                        'I get erections but only occasionally — it\'s inconsistent',
                        'I\'ve never been able to get an erection adequate for sex',
                        'I\'m experiencing reduced sex drive / low libido',
                        'I\'m experiencing premature ejaculation',
                    ],
                    required: true,
                    // AI: "Never able" = may need in-person urology referral.
                },
            ],
        },
        {
            id: 'iief5_assessment',
            title: 'IIEF-5 Severity Assessment',
            questions: [
                {
                    id: 'Q4',
                    type: 'scale',
                    question: 'Over the past 6 months, how do you rate your confidence that you could get and keep an erection?',
                    options: ['Very low (1)', 'Low (2)', 'Moderate (3)', 'High (4)', 'Very high (5)'],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q3',
                            value: [
                                'I can get an erection but have trouble maintaining it',
                                'I have difficulty getting an erection at all',
                                'I sometimes get erections but they\'re not firm enough for sex',
                                'I get erections but only occasionally — it\'s inconsistent',
                                'I\'m experiencing reduced sex drive / low libido',
                                'I\'m experiencing premature ejaculation',
                            ],
                        },
                    },
                },
                {
                    id: 'Q5',
                    type: 'scale',
                    question: 'When you had erections with sexual stimulation, how often were your erections hard enough for penetration?',
                    options: ['Almost never or never (1)', 'A few times (2)', 'Sometimes (3)', 'Most times (4)', 'Almost always or always (5)'],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q3',
                            value: [
                                'I can get an erection but have trouble maintaining it',
                                'I have difficulty getting an erection at all',
                                'I sometimes get erections but they\'re not firm enough for sex',
                                'I get erections but only occasionally — it\'s inconsistent',
                                'I\'m experiencing reduced sex drive / low libido',
                                'I\'m experiencing premature ejaculation',
                            ],
                        },
                    },
                },
                {
                    id: 'Q6',
                    type: 'scale',
                    question: 'During sexual intercourse, how often were you able to maintain your erection after penetration?',
                    options: ['Almost never or never (1)', 'A few times (2)', 'Sometimes (3)', 'Most times (4)', 'Almost always or always (5)'],
                    required: true,
                },
                {
                    id: 'Q7',
                    type: 'scale',
                    question: 'During sexual intercourse, how difficult was it to maintain your erection to completion?',
                    options: ['Extremely difficult (1)', 'Very difficult (2)', 'Difficult (3)', 'Slightly difficult (4)', 'Not difficult (5)'],
                    required: true,
                },
                {
                    id: 'Q8',
                    type: 'scale',
                    question: 'When you attempted sexual intercourse, how often was it satisfactory?',
                    options: ['Almost never or never (1)', 'A few times (2)', 'Sometimes (3)', 'Most times (4)', 'Almost always or always (5)'],
                    required: true,
                },
            ],
        },
        {
            id: 'onset_pattern',
            title: 'Onset & Pattern',
            questions: [
                {
                    id: 'Q9',
                    type: 'single_choice',
                    question: 'When did you first notice erectile difficulty?',
                    options: [
                        'Less than 3 months ago',
                        '3-6 months ago',
                        '6-12 months ago',
                        '1-3 years ago',
                        '3+ years ago',
                        'As long as I can remember',
                    ],
                    required: true,
                    // AI: Sudden onset (<3 months) = possible vascular event or medication side effect.
                },
                {
                    id: 'Q10',
                    type: 'single_choice',
                    question: 'How did the problem start?',
                    options: [
                        'Gradually got worse over time',
                        'Suddenly — it was fine and then it wasn\'t',
                        'After starting a new medication',
                        'After a stressful life event',
                        'After surgery or injury',
                    ],
                    required: true,
                    // AI: "Suddenly" = possible psychological or medication cause.
                },
                {
                    id: 'Q11',
                    type: 'multiple_choice',
                    question: 'Do you get erections at other times?',
                    options: [
                        'Morning erections (wake up with erection)',
                        'Erections when masturbating (but not during sex)',
                        'Erections from visual stimulation but lose them during sex',
                        'Rarely/never get erections in any situation',
                    ],
                    required: true,
                    // AI: CRITICAL. Morning erections = likely psychological. No erections at all = likely organic.
                },
                {
                    id: 'Q12',
                    type: 'single_choice',
                    question: 'Is the problem consistent or situational?',
                    options: [
                        'Every time — regardless of partner or situation',
                        'Situational — works sometimes but not others',
                        'Only with a specific partner',
                        'Only during intercourse (fine during foreplay/oral)',
                    ],
                    required: true,
                    // AI: Situational/partner-specific = likely significant psychological component.
                },
            ],
        },
        {
            id: 'cardiovascular_screening',
            title: 'Medical Screening — Cardiovascular',
            questions: [
                {
                    id: 'Q13',
                    type: 'multiple_choice',
                    question: 'Do you have any of these conditions? (Select all)',
                    options: [
                        'Heart disease / history of heart attack',
                        'Stroke / history of stroke',
                        'High blood pressure (hypertension)',
                        'Low blood pressure (hypotension)',
                        'Irregular heartbeat (arrhythmia)',
                        'Chest pain (angina)',
                        'Heart failure',
                        'Diabetes (Type 1 or Type 2)',
                        'High cholesterol',
                        'Peyronie\'s disease (curved penis)',
                        'Prostate problems',
                        'Kidney disease',
                        'Liver disease',
                        'Sickle cell disease',
                        'Blood disorder (leukemia, multiple myeloma)',
                        'None of these',
                    ],
                    required: true,
                    // AI: Heart disease + nitrates = ABSOLUTE block. Diabetes = common co-factor.
                },
                {
                    id: 'Q14',
                    type: 'multiple_choice',
                    question: 'Do you currently take any of these medications? (Select all)',
                    options: [
                        'Nitrates (nitroglycerin, isosorbide, amyl nitrite/poppers)',
                        'Blood pressure medications',
                        'Alpha-blockers (tamsulosin, alfuzosin — for prostate)',
                        'HIV protease inhibitors (ritonavir, saquinavir)',
                        'Antifungals (ketoconazole, itraconazole)',
                        'Antidepressants (SSRIs, SNRIs)',
                        'Anti-anxiety medications',
                        'Blood thinners (warfarin)',
                        'Other erectile dysfunction medications',
                        'Recreational drugs (cocaine, marijuana, MDMA)',
                        'None',
                    ],
                    required: true,
                    // AI: NITRATES = ABSOLUTE CONTRAINDICATION for PDE5 inhibitors.
                },
                {
                    id: 'Q15',
                    type: 'text',
                    question: 'Do you know your most recent blood pressure reading?',
                    placeholder: 'e.g., 120/80 or "don\'t know"',
                    required: false,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q14',
                            value: 'Blood pressure medications',
                        },
                    },
                    // AI: BP <90/50 = PDE5 inhibitors risky.
                },
                {
                    id: 'Q16',
                    type: 'single_choice',
                    question: 'Have you been hospitalized for a heart-related issue in the last 6 months?',
                    options: ['Yes', 'No'],
                    required: true,
                    // AI: Recent cardiac event = BLOCK PDE5 inhibitors.
                },
                {
                    id: 'Q17',
                    type: 'single_choice',
                    question: 'Do you experience chest pain during physical activity or sexual activity?',
                    options: ['Yes', 'No', 'Sometimes'],
                    required: true,
                    // AI: Yes = unstable angina risk. MUST be evaluated before prescribing.
                },
                {
                    id: 'Q18',
                    type: 'single_choice',
                    question: 'Have you ever been told your heart is not strong enough for sexual activity?',
                    options: ['Yes', 'No'],
                    required: true,
                    // AI: Yes = BLOCK. Needs cardiology clearance.
                },
                {
                    id: 'Q19',
                    type: 'multiple_choice',
                    question: 'Do you have any drug allergies?',
                    options: [
                        'Sildenafil',
                        'Tadalafil',
                        'Vardenafil',
                        'No known allergies',
                    ],
                    required: true,
                },
            ],
        },
        {
            id: 'psychological_lifestyle',
            title: 'Psychological & Lifestyle',
            questions: [
                {
                    id: 'Q20',
                    type: 'multiple_choice',
                    question: 'Are you currently experiencing any of these? (Select all)',
                    options: [
                        'Stress at work or home',
                        'Relationship problems',
                        'Performance anxiety about sex',
                        'Depression',
                        'Anxiety disorder',
                        'Low self-esteem / body image issues',
                        'Pornography-related concerns',
                        'Sleep problems',
                        'None of these',
                    ],
                    required: true,
                    // AI: Multiple psych factors + morning erections = primarily psychological ED.
                },
                {
                    id: 'Q21',
                    type: 'single_choice',
                    question: 'Do you smoke?',
                    options: ['Yes daily', 'Occasionally', 'No', 'Quit recently'],
                    required: true,
                    // AI: Smoking is a major risk factor for vascular ED.
                },
                {
                    id: 'Q22',
                    type: 'single_choice',
                    question: 'How often do you consume alcohol?',
                    options: ['Never', 'Occasionally', 'Regularly (2-3 times/week)', 'Daily', 'Heavy (>4 drinks/session)'],
                    required: true,
                    // AI: Heavy drinking causes ED and interacts with PDE5 inhibitors.
                },
                {
                    id: 'Q23',
                    type: 'single_choice',
                    question: 'How often do you exercise?',
                    options: ['Never', '1-2 times/week', '3-4 times/week', '5+ times/week'],
                    required: true,
                    // AI: Sedentary = ED risk factor. Exercise improves ED outcomes.
                },
                {
                    id: 'Q24',
                    type: 'number',
                    question: 'What is your height (cm) and weight (kg)?',
                    placeholder: 'Height in cm, Weight in kg',
                    required: true,
                    // AI: BMI >30 = obesity is significant ED risk factor.
                },
            ],
        },
        {
            id: 'treatment_history',
            title: 'Treatment History',
            questions: [
                {
                    id: 'Q25',
                    type: 'multiple_choice',
                    question: 'Have you tried any ED treatments before? (Select all)',
                    options: [
                        'Sildenafil (Viagra)',
                        'Tadalafil (Cialis)',
                        'Vardenafil (Levitra)',
                        'Herbal/ayurvedic supplements',
                        'Vacuum pump',
                        'Counseling/therapy',
                        'None',
                    ],
                    required: true,
                    // AI: Prior medication response informs dosing.
                },
                {
                    id: 'Q26',
                    type: 'single_choice',
                    question: 'If you tried ED medication, what happened?',
                    options: [
                        'Worked well — I want to continue with it',
                        'Worked but gave me side effects (headache, flushing, stuffy nose)',
                        'Didn\'t work at all',
                        'Didn\'t work at first but I only tried once or twice',
                        'Worked initially but stopped working over time',
                        'Haven\'t tried medication',
                    ],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q25',
                            value: [
                                'Sildenafil (Viagra)', 'Tadalafil (Cialis)', 'Vardenafil (Levitra)',
                                'Herbal/ayurvedic supplements', 'Vacuum pump', 'Counseling/therapy',
                            ],
                        },
                    },
                },
                {
                    id: 'Q27',
                    type: 'multiple_choice',
                    question: 'Did you experience any side effects from previous treatments? (Select all)',
                    options: [
                        'Headache',
                        'Facial flushing',
                        'Nasal congestion',
                        'Vision changes (blue tint)',
                        'Back pain',
                        'Muscle pain',
                        'Dizziness',
                        'Priapism (erection >4 hours)',
                        'Hearing changes',
                        'None',
                    ],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q25',
                            value: [
                                'Sildenafil (Viagra)', 'Tadalafil (Cialis)', 'Vardenafil (Levitra)',
                                'Herbal/ayurvedic supplements', 'Vacuum pump', 'Counseling/therapy',
                            ],
                        },
                    },
                    // AI: Vision/hearing changes = flag. Priapism = extra caution.
                },
                {
                    id: 'Q28',
                    type: 'single_choice',
                    question: 'What are you hoping for from treatment?',
                    options: [
                        'Reliable erections for intercourse',
                        'Improved confidence and reduced anxiety about performance',
                        'Better spontaneity (don\'t want to plan around taking a pill)',
                        'Overall sexual health improvement including libido',
                    ],
                    required: true,
                    // AI: "Spontaneity" = suggest daily low-dose tadalafil.
                },
            ],
        },
    ],
    photoRequirements: [],
};
