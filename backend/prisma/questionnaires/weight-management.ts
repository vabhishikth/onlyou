// Spec: weight-management spec Section 3 — 30 Questions, ~7-10 minutes
// Skip logic: Q2=Male→skip Q8, Q2=Female→add Q8/Q8b, Q11=None→skip Q12, Q20=None→skip Q21/Q22

export const weightManagementQuestionnaire = {
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
                    // Validation: <18 blocked.
                },
                {
                    id: 'Q2',
                    type: 'single_choice',
                    question: 'What is your biological sex?',
                    options: ['Male', 'Female'],
                    required: true,
                    // Affects treatment (metformin dosing, GLP-1 pregnancy contraindications).
                },
                {
                    id: 'Q3',
                    type: 'single_choice',
                    question: 'What is your primary weight concern?',
                    options: [
                        'I want to lose weight for health reasons',
                        'I want to lose weight for appearance/confidence',
                        'I\'ve been told by a doctor I need to lose weight',
                        'I keep gaining weight despite trying to control it',
                        'I gained weight after a medication, pregnancy, or life change',
                        'I have difficulty losing weight and suspect a medical reason',
                    ],
                    required: true,
                    // AI: "Suspect medical reason" = potential thyroid, insulin resistance, PCOS.
                },
                {
                    id: 'Q4',
                    type: 'single_choice',
                    question: 'What is your weight loss goal?',
                    options: [
                        'Lose 5-10 kg',
                        'Lose 10-20 kg',
                        'Lose 20-30 kg',
                        'Lose 30+ kg',
                        'Not sure — want professional guidance',
                    ],
                    required: true,
                    // AI: >30kg may need bariatric referral discussion.
                },
            ],
        },
        {
            id: 'body_measurements',
            title: 'Body Measurements',
            questions: [
                {
                    id: 'Q5',
                    type: 'number',
                    question: 'What is your height?',
                    placeholder: 'Height in cm',
                    required: true,
                    // System uses for BMI calculation.
                },
                {
                    id: 'Q6',
                    type: 'number',
                    question: 'What is your current weight?',
                    placeholder: 'Weight in kg',
                    required: true,
                    // System uses for BMI calculation.
                },
                {
                    id: 'Q7',
                    type: 'number',
                    question: 'What is your waist circumference? (optional but encouraged)',
                    placeholder: 'Measure around belly button, in cm',
                    required: false,
                    // AI: >102cm (men) or >88cm (women) = central obesity, higher metabolic risk.
                },
                {
                    id: 'Q8',
                    type: 'single_choice',
                    question: 'Are your periods regular?',
                    options: [
                        'Yes, regular',
                        'Irregular (vary a lot)',
                        'Very infrequent (every few months)',
                        'I don\'t get periods',
                        'Post-menopausal',
                    ],
                    required: true,
                    skipLogic: { showIf: { questionId: 'Q2', value: 'Female' } },
                    // AI: Irregular + weight gain = possible PCOS.
                },
                {
                    id: 'Q8b',
                    type: 'single_choice',
                    question: 'Do you also experience excess facial/body hair or acne?',
                    options: ['Yes', 'No'],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q8',
                            value: ['Irregular (vary a lot)', 'Very infrequent (every few months)'],
                        },
                    },
                    // AI: Yes = likely PCOS. Suggest PCOS vertical instead.
                },
            ],
        },
        {
            id: 'weight_history',
            title: 'Weight History',
            questions: [
                {
                    id: 'Q9',
                    type: 'single_choice',
                    question: 'What has your weight been like over the past few years?',
                    options: [
                        'Steadily increasing year over year',
                        'Went up sharply in the last 6-12 months',
                        'Goes up and down (yo-yo)',
                        'Been overweight since childhood/adolescence',
                        'Was normal weight until a specific event',
                    ],
                    required: true,
                    // AI: "Sharp increase" = possible medication, thyroid, hormonal cause.
                },
                {
                    id: 'Q10',
                    type: 'text',
                    question: 'What\'s the most you\'ve ever weighed, and approximately when?',
                    placeholder: 'e.g., "95 kg, about 2 years ago"',
                    required: true,
                    // AI: Trend data for doctor.
                },
                {
                    id: 'Q11',
                    type: 'single_choice',
                    question: 'Have you lost and regained weight multiple times (yo-yo dieting)?',
                    options: ['Yes, many times', 'Once or twice', 'No'],
                    required: true,
                    // AI: Yo-yo = metabolic adaptation, may need different approach.
                },
                {
                    id: 'Q12',
                    type: 'multiple_choice',
                    question: 'What triggered your weight gain? (Select all that apply)',
                    options: [
                        'Nothing specific — it just happened gradually',
                        'Started a new medication',
                        'Pregnancy / postpartum',
                        'Quit smoking',
                        'Stressful life event (job, relationship, bereavement)',
                        'Injury/illness that reduced activity',
                        'Work/lifestyle change (sedentary job, WFH)',
                        'COVID lockdown',
                        'None of these',
                    ],
                    required: true,
                    // AI: Medication-induced = review meds. Post-pregnancy = PCOS screen.
                },
            ],
        },
        {
            id: 'medical_screening',
            title: 'Medical Screening',
            questions: [
                {
                    id: 'Q13',
                    type: 'multiple_choice',
                    question: 'Do you have any of these conditions? (Select all)',
                    options: [
                        'Type 2 diabetes',
                        'Pre-diabetes / insulin resistance',
                        'Thyroid disorder (hypo/hyperthyroidism)',
                        'PCOS (women)',
                        'High blood pressure',
                        'High cholesterol',
                        'Sleep apnea',
                        'Fatty liver disease',
                        'Heart disease',
                        'Kidney disease',
                        'Gallbladder disease / gallstones',
                        'History of pancreatitis',
                        'Eating disorder (current or past)',
                        'Depression or anxiety',
                        'None of these',
                    ],
                    required: true,
                    // AI: Pancreatitis = GLP-1 CONTRAINDICATED. Eating disorder = careful.
                },
                {
                    id: 'Q14',
                    type: 'multiple_choice',
                    question: 'Are you currently taking any medications? (Select all)',
                    options: [
                        'Diabetes medication (Metformin, insulin, sulfonylureas)',
                        'Thyroid medication',
                        'Blood pressure medication',
                        'Antidepressants (SSRIs, SNRIs, TCAs)',
                        'Antipsychotics',
                        'Steroids (prednisone)',
                        'Birth control (hormonal)',
                        'Anticonvulsants/mood stabilizers',
                        'None',
                    ],
                    required: true,
                    // AI: Many psych meds cause weight gain.
                },
                {
                    id: 'Q15',
                    type: 'single_choice',
                    question: 'Are you pregnant, breastfeeding, or planning pregnancy in the next 12 months?',
                    options: ['Yes', 'No'],
                    required: true,
                    skipLogic: { showIf: { questionId: 'Q2', value: 'Female' } },
                    // AI: Yes = ABSOLUTE BLOCK for Orlistat and GLP-1.
                },
                {
                    id: 'Q16',
                    type: 'single_choice',
                    question: 'Do you have a history of pancreatitis?',
                    options: ['Yes', 'No', 'Not sure'],
                    required: true,
                    // AI: Yes = GLP-1 medications CONTRAINDICATED.
                },
                {
                    id: 'Q17',
                    type: 'single_choice',
                    question: 'Do you have a personal or family history of thyroid cancer (medullary thyroid carcinoma) or MEN2 syndrome?',
                    options: ['Yes', 'No', 'Not sure'],
                    required: true,
                    // AI: Yes = GLP-1 medications CONTRAINDICATED.
                },
                {
                    id: 'Q18',
                    type: 'text',
                    question: 'Do you have any drug allergies?',
                    placeholder: 'Enter allergies or type "None"',
                    required: true,
                },
            ],
        },
        {
            id: 'diet_lifestyle',
            title: 'Diet & Lifestyle',
            questions: [
                {
                    id: 'Q19',
                    type: 'single_choice',
                    question: 'How would you describe your eating habits?',
                    options: [
                        'I eat regular meals but large portions',
                        'I skip meals and then overeat',
                        'I snack frequently throughout the day',
                        'I eat late at night',
                        'I eat due to stress/emotions',
                        'I eat a fairly healthy diet but still gain weight',
                        'I eat a lot of processed/fast food',
                    ],
                    required: true,
                    // AI: Emotional eating = may need counseling. "Healthy but gaining" = metabolic.
                },
                {
                    id: 'Q20',
                    type: 'single_choice',
                    question: 'How many meals/snacks do you typically eat per day?',
                    options: ['1-2', '3', '4-5', '6+', 'Very irregular'],
                    required: true,
                },
                {
                    id: 'Q21',
                    type: 'single_choice',
                    question: 'What type of diet do you follow?',
                    options: [
                        'Balanced non-vegetarian',
                        'Mostly vegetarian',
                        'Strictly vegetarian',
                        'Vegan',
                        'No specific pattern',
                    ],
                    required: true,
                    // AI: Nutritional planning for diet plan.
                },
                {
                    id: 'Q22',
                    type: 'single_choice',
                    question: 'How physically active are you currently?',
                    options: [
                        'Sedentary (no exercise)',
                        'Light (1-2x/week walking)',
                        'Moderate (3-4x/week)',
                        'Active (5+ times/week)',
                        'Physically demanding job',
                    ],
                    required: true,
                    // AI: Sedentary + high BMI = exercise prescription important.
                },
                {
                    id: 'Q23',
                    type: 'single_choice',
                    question: 'How many hours do you typically sleep per night?',
                    options: ['Less than 5', '5-6', '6-7', '7-8', 'More than 8'],
                    required: true,
                    // AI: <6 hours = affects weight loss hormones (leptin, ghrelin).
                },
            ],
        },
        {
            id: 'treatment_history',
            title: 'Treatment History',
            questions: [
                {
                    id: 'Q24',
                    type: 'multiple_choice',
                    question: 'What weight loss methods have you tried before? (Select all)',
                    options: [
                        'Diet changes (calorie counting, keto, intermittent fasting)',
                        'Exercise programs',
                        'Weight loss medications (Orlistat/Alli, others)',
                        'GLP-1 medications (Ozempic, Wegovy, Saxenda)',
                        'Ayurvedic/herbal weight loss products',
                        'Bariatric surgery',
                        'Commercial programs (HealthifyMe, Cult.fit)',
                        'None',
                    ],
                    required: true,
                    // AI: Prior medication response. Bariatric surgery = different approach.
                },
                {
                    id: 'Q25',
                    type: 'text',
                    question: 'If you tried medications before, how long and what happened?',
                    placeholder: 'Describe your experience or type "N/A"',
                    required: false,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q24',
                            value: [
                                'Diet changes (calorie counting, keto, intermittent fasting)',
                                'Exercise programs',
                                'Weight loss medications (Orlistat/Alli, others)',
                                'GLP-1 medications (Ozempic, Wegovy, Saxenda)',
                                'Ayurvedic/herbal weight loss products',
                                'Bariatric surgery',
                                'Commercial programs (HealthifyMe, Cult.fit)',
                            ],
                        },
                    },
                },
                {
                    id: 'Q26',
                    type: 'multiple_choice',
                    question: 'Did you experience any side effects from previous weight loss treatments? (Select all)',
                    options: [
                        'Nausea/vomiting',
                        'Diarrhea',
                        'Constipation',
                        'Stomach pain',
                        'Headache',
                        'Gallbladder issues',
                        'None',
                    ],
                    required: true,
                    skipLogic: {
                        showIf: {
                            questionId: 'Q24',
                            value: [
                                'Diet changes (calorie counting, keto, intermittent fasting)',
                                'Exercise programs',
                                'Weight loss medications (Orlistat/Alli, others)',
                                'GLP-1 medications (Ozempic, Wegovy, Saxenda)',
                                'Ayurvedic/herbal weight loss products',
                                'Bariatric surgery',
                                'Commercial programs (HealthifyMe, Cult.fit)',
                            ],
                        },
                    },
                    // AI: Gallbladder issues = Orlistat caution.
                },
                {
                    id: 'Q27',
                    type: 'single_choice',
                    question: 'Have you had blood work done in the last 12 months?',
                    options: ['Yes', 'No'],
                    required: true,
                    // AI: Most weight patients SHOULD get baseline labs.
                },
            ],
        },
        {
            id: 'motivation',
            title: 'Motivation & Expectations',
            questions: [
                {
                    id: 'Q28',
                    type: 'single_choice',
                    question: 'What\'s your biggest challenge with weight management?',
                    options: [
                        'Controlling hunger/cravings',
                        'Staying motivated long-term',
                        'Finding time for exercise',
                        'Emotional/stress eating',
                        'Medical condition making it harder',
                        'Don\'t know what\'s working against me',
                    ],
                    required: true,
                    // AI: Personalizes approach and doctor messaging.
                },
                {
                    id: 'Q29',
                    type: 'single_choice',
                    question: 'Are you interested in medication-assisted weight loss?',
                    options: [
                        'Yes — I\'ve struggled with lifestyle changes alone',
                        'Open to it if the doctor recommends',
                        'Prefer lifestyle-only approach',
                        'Specifically interested in GLP-1 medications',
                    ],
                    required: true,
                    // AI: "GLP-1 specifically" = discuss pricing and availability.
                },
                {
                    id: 'Q30',
                    type: 'single_choice',
                    question: 'What are your timeline expectations?',
                    options: [
                        'I want quick results (1-3 months)',
                        'Steady progress over 6-12 months',
                        'Long-term sustainable change',
                        'No specific timeline',
                    ],
                    required: true,
                    // AI: "Quick results" = manage expectations. Safe = 0.5-1 kg/week.
                },
            ],
        },
    ],
    photoRequirements: [
        { id: 'body_front', label: 'Full body — front', required: true, instructions: 'Standing straight, arms at sides, wearing fitted clothes. Plain background.' },
        { id: 'body_side', label: 'Full body — side', required: true, instructions: 'Same position, 90° angle. Shows abdominal fat distribution.' },
        { id: 'waist_measurement', label: 'Waist measurement (optional)', required: false, instructions: 'Close-up of tape measure around waist at navel.' },
    ],
};
