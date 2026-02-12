// Spec: onlyou-spec-weight-management.md Section 3 — Weight Management Questionnaire
// 30 questions + Q8b conditional, BMI calculation with WHO Asian criteria

export interface WeightQuestion {
  id: string;
  text: string;
  type:
    | 'number'
    | 'single_select'
    | 'multi_select'
    | 'text'
    | 'height'
    | 'weight'
    | 'measurement';
  section: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  conditionalOn?: Record<string, string | string[]>;
  hint?: string;
}

export interface SkipLogicRule {
  condition: Record<string, string | string[]>;
  skipQuestion: string;
}

export interface PhotoRequirement {
  id: string;
  label: string;
  required: boolean;
  instructions: string;
}

// SECTION 1: BASICS (Q1-Q4)
const section1: WeightQuestion[] = [
  {
    id: 'Q1',
    text: 'What is your age?',
    type: 'number',
    section: 'Basics',
    required: true,
    validation: { min: 18, max: 80 },
    hint: 'You must be at least 18 years old',
  },
  {
    id: 'Q2',
    text: 'What is your biological sex?',
    type: 'single_select',
    section: 'Basics',
    required: true,
    options: ['Male', 'Female'],
    hint: 'Affects treatment recommendations and dosing',
  },
  {
    id: 'Q3',
    text: 'What is your primary weight concern?',
    type: 'single_select',
    section: 'Basics',
    required: true,
    options: [
      'I want to lose weight for health reasons',
      'I want to lose weight for appearance/confidence',
      "I've been told by a doctor I need to lose weight",
      'I keep gaining weight despite trying to control it',
      'I gained weight after a medication, pregnancy, or life change',
      'I have difficulty losing weight and suspect a medical reason',
    ],
  },
  {
    id: 'Q4',
    text: 'What is your weight loss goal?',
    type: 'single_select',
    section: 'Basics',
    required: true,
    options: [
      'Lose 5-10 kg',
      'Lose 10-20 kg',
      'Lose 20-30 kg',
      'Lose 30+ kg',
      'Not sure — want professional guidance',
    ],
  },
];

// SECTION 2: BODY MEASUREMENTS (Q5-Q8b)
const section2: WeightQuestion[] = [
  {
    id: 'Q5',
    text: 'What is your height?',
    type: 'height',
    section: 'Body Measurements',
    required: true,
    hint: 'Enter in cm or feet/inches',
  },
  {
    id: 'Q6',
    text: 'What is your current weight?',
    type: 'weight',
    section: 'Body Measurements',
    required: true,
    hint: 'Enter in kg',
  },
  {
    id: 'Q7',
    text: 'What is your waist circumference?',
    type: 'measurement',
    section: 'Body Measurements',
    required: false,
    hint: 'Measure around your belly button with a tape measure. Stand straight, breathe normally.',
  },
  {
    id: 'Q8',
    text: 'Are your periods regular?',
    type: 'single_select',
    section: 'Body Measurements',
    required: true,
    conditionalOn: { Q2: 'Female' },
    options: [
      'Yes, regular',
      'Irregular (vary a lot)',
      'Very infrequent (every few months)',
      "I don't get periods",
      'Post-menopausal',
    ],
  },
  {
    id: 'Q8b',
    text: 'Do you also experience excess facial/body hair or acne?',
    type: 'single_select',
    section: 'Body Measurements',
    required: true,
    conditionalOn: { Q8: ['Irregular (vary a lot)', 'Very infrequent (every few months)'] },
    options: ['Yes', 'No'],
    hint: 'These symptoms may indicate PCOS',
  },
];

// SECTION 3: WEIGHT HISTORY (Q9-Q12)
const section3: WeightQuestion[] = [
  {
    id: 'Q9',
    text: 'What has your weight been like over the past few years?',
    type: 'single_select',
    section: 'Weight History',
    required: true,
    options: [
      'Steadily increasing year over year',
      'Went up sharply in the last 6-12 months',
      'Goes up and down (yo-yo)',
      'Been overweight since childhood/adolescence',
      'Was normal weight until a specific event',
    ],
  },
  {
    id: 'Q10',
    text: "What's the most you've ever weighed, and when?",
    type: 'text',
    section: 'Weight History',
    required: true,
    hint: 'e.g., "95 kg, about 2 years ago"',
  },
  {
    id: 'Q11',
    text: 'Have you lost and regained weight multiple times (yo-yo dieting)?',
    type: 'single_select',
    section: 'Weight History',
    required: true,
    options: ['Yes, many times', 'Once or twice', 'No'],
  },
  {
    id: 'Q12',
    text: 'What triggered your weight gain? (Select all that apply)',
    type: 'multi_select',
    section: 'Weight History',
    required: true,
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
  },
];

// SECTION 4: MEDICAL SCREENING (Q13-Q18)
const section4: WeightQuestion[] = [
  {
    id: 'Q13',
    text: 'Do you have any of these conditions? (Select all that apply)',
    type: 'multi_select',
    section: 'Medical Screening',
    required: true,
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
      'Eating disorder (current or past: anorexia, bulimia, binge eating)',
      'Depression or anxiety',
      'None of these',
    ],
  },
  {
    id: 'Q14',
    text: 'Are you currently taking any medications? (Select all that apply)',
    type: 'multi_select',
    section: 'Medical Screening',
    required: true,
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
      'Other',
    ],
    hint: 'Include an "Other" text field if selected',
  },
  {
    id: 'Q15',
    text: 'Are you pregnant, breastfeeding, or planning pregnancy in the next 12 months?',
    type: 'single_select',
    section: 'Medical Screening',
    required: true,
    conditionalOn: { Q2: 'Female' },
    options: ['Yes', 'No'],
    hint: 'Weight loss medications are contraindicated during pregnancy/breastfeeding',
  },
  {
    id: 'Q16',
    text: 'Do you have a history of pancreatitis?',
    type: 'single_select',
    section: 'Medical Screening',
    required: true,
    options: ['Yes', 'No', 'Not sure'],
    hint: 'Important for GLP-1 medication safety',
  },
  {
    id: 'Q17',
    text: 'Do you have a personal or family history of thyroid cancer (medullary thyroid carcinoma) or MEN2 syndrome?',
    type: 'single_select',
    section: 'Medical Screening',
    required: true,
    options: ['Yes', 'No', 'Not sure'],
    hint: 'Important for GLP-1 medication safety',
  },
  {
    id: 'Q18',
    text: 'Do you have any drug allergies?',
    type: 'text',
    section: 'Medical Screening',
    required: false,
    hint: 'Enter "None" if no known allergies',
  },
];

// SECTION 5: DIET & LIFESTYLE (Q19-Q23)
const section5: WeightQuestion[] = [
  {
    id: 'Q19',
    text: 'How would you describe your eating habits?',
    type: 'single_select',
    section: 'Diet & Lifestyle',
    required: true,
    options: [
      'I eat regular meals but large portions',
      'I skip meals and then overeat',
      'I snack frequently throughout the day',
      'I eat late at night',
      'I eat due to stress/emotions',
      'I eat a fairly healthy diet but still gain weight',
      'I eat a lot of processed/fast food',
    ],
  },
  {
    id: 'Q20',
    text: 'How many meals/snacks do you typically eat per day?',
    type: 'single_select',
    section: 'Diet & Lifestyle',
    required: true,
    options: ['1-2', '3', '4-5', '6+', 'Very irregular'],
  },
  {
    id: 'Q21',
    text: 'What is your diet type?',
    type: 'single_select',
    section: 'Diet & Lifestyle',
    required: true,
    options: [
      'Balanced non-veg',
      'Mostly vegetarian',
      'Strictly vegetarian',
      'Vegan',
      'No specific pattern',
    ],
  },
  {
    id: 'Q22',
    text: 'How would you describe your physical activity level?',
    type: 'single_select',
    section: 'Diet & Lifestyle',
    required: true,
    options: [
      'Sedentary (no exercise)',
      'Light (1-2x/week walking)',
      'Moderate (3-4x/week)',
      'Active (5+ times/week)',
      'Physically demanding job',
    ],
  },
  {
    id: 'Q23',
    text: 'How many hours of sleep do you typically get?',
    type: 'single_select',
    section: 'Diet & Lifestyle',
    required: true,
    options: ['<5 hours', '5-6 hours', '6-7 hours', '7-8 hours', '>8 hours'],
  },
];

// SECTION 6: TREATMENT HISTORY (Q24-Q27)
const section6: WeightQuestion[] = [
  {
    id: 'Q24',
    text: 'What previous weight loss attempts have you tried? (Select all that apply)',
    type: 'multi_select',
    section: 'Treatment History',
    required: true,
    options: [
      'Diet changes (calorie counting, keto, intermittent fasting, etc.)',
      'Exercise programs',
      'Weight loss medications (Orlistat/Alli, Sibutramine, others)',
      'GLP-1 medications (Ozempic, Wegovy, Saxenda)',
      'Ayurvedic/herbal weight loss products',
      'Bariatric surgery',
      'Commercial programs (HealthifyMe, Cult.fit, etc.)',
      'None',
    ],
  },
  {
    id: 'Q25',
    text: 'How long did you try medications and what happened?',
    type: 'text',
    section: 'Treatment History',
    required: false,
    conditionalOn: {
      Q24: [
        'Weight loss medications (Orlistat/Alli, Sibutramine, others)',
        'GLP-1 medications (Ozempic, Wegovy, Saxenda)',
      ],
    },
    hint: 'Describe duration, effectiveness, and any issues',
  },
  {
    id: 'Q26',
    text: 'Did you experience any side effects from weight loss medications? (Select all that apply)',
    type: 'multi_select',
    section: 'Treatment History',
    required: false,
    conditionalOn: {
      Q24: [
        'Weight loss medications (Orlistat/Alli, Sibutramine, others)',
        'GLP-1 medications (Ozempic, Wegovy, Saxenda)',
      ],
    },
    options: [
      'Nausea/vomiting',
      'Diarrhea',
      'Constipation',
      'Stomach pain',
      'Headache',
      'Gallbladder issues',
      'None',
      'Other',
    ],
  },
  {
    id: 'Q27',
    text: 'Have you had blood work done in the last 12 months?',
    type: 'single_select',
    section: 'Treatment History',
    required: true,
    options: [
      'Yes, results were normal',
      'Yes, had some abnormal results',
      'No',
      "Don't remember",
    ],
    hint: 'Abnormal results may include HbA1c, thyroid, cholesterol, liver function',
  },
];

// SECTION 7: MOTIVATION & EXPECTATIONS (Q28-Q30)
const section7: WeightQuestion[] = [
  {
    id: 'Q28',
    text: "What's your biggest challenge with weight management?",
    type: 'single_select',
    section: 'Motivation & Expectations',
    required: true,
    options: [
      'Controlling hunger/cravings',
      'Staying motivated long-term',
      'Finding time for exercise',
      'Emotional/stress eating',
      'Medical condition making it harder',
      "Don't know what's working against me",
    ],
  },
  {
    id: 'Q29',
    text: 'Are you interested in medication-assisted weight loss?',
    type: 'single_select',
    section: 'Motivation & Expectations',
    required: true,
    options: [
      "Yes — I've struggled with lifestyle changes alone",
      'Open to it if the doctor recommends',
      'Prefer lifestyle-only approach',
      'Specifically interested in GLP-1 medications',
    ],
  },
  {
    id: 'Q30',
    text: 'What are your timeline expectations?',
    type: 'single_select',
    section: 'Motivation & Expectations',
    required: true,
    options: [
      'I want quick results (1-3 months)',
      'Steady progress over 6-12 months',
      'Long-term sustainable change',
      'No specific timeline',
    ],
  },
];

// Combine all sections
export const weightQuestions: WeightQuestion[] = [
  ...section1,
  ...section2,
  ...section3,
  ...section4,
  ...section5,
  ...section6,
  ...section7,
];

// Skip Logic Rules
// Spec: Q2=Male → skip Q8, Q8b; Q11="No" → Q12 still shown; Q24="None" → skip Q25, Q26
export const WEIGHT_SKIP_LOGIC: SkipLogicRule[] = [
  {
    condition: { Q2: 'Male' },
    skipQuestion: 'Q8',
  },
  {
    condition: { Q2: 'Male' },
    skipQuestion: 'Q8b',
  },
  {
    condition: { Q8: ['Yes, regular', "I don't get periods", 'Post-menopausal'] },
    skipQuestion: 'Q8b',
  },
  {
    condition: { Q24: 'None' },
    skipQuestion: 'Q25',
  },
  {
    condition: { Q24: 'None' },
    skipQuestion: 'Q26',
  },
];

// Photo Requirements - Per spec: 2 required, 1 optional
export const WEIGHT_PHOTO_REQUIREMENTS: PhotoRequirement[] = [
  {
    id: 'full_body_front',
    label: 'Full Body — Front',
    required: true,
    instructions:
      'Stand straight with arms at sides, wearing fitted clothes. Use consistent lighting and a plain background.',
  },
  {
    id: 'full_body_side',
    label: 'Full Body — Side',
    required: true,
    instructions:
      'Same position as front photo, rotated 90 degrees. This helps assess abdominal fat distribution.',
  },
  {
    id: 'waist_measurement',
    label: 'Waist Measurement Photo',
    required: false,
    instructions:
      'Close-up photo of tape measure around your waist at navel level. This helps verify your waist circumference.',
  },
];

// BMI Calculation
// BMI = weight (kg) / height (m)^2
export function calculateBMI(
  weightKg: number,
  heightCm: number,
): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

// BMI Category (Standard WHO)
export type BMICategory =
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obese_class_i'
  | 'obese_class_ii'
  | 'obese_class_iii';

export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  if (bmi < 35) return 'obese_class_i';
  if (bmi < 40) return 'obese_class_ii';
  return 'obese_class_iii';
}

// BMI Category (WHO Asian Criteria)
// Per spec: For Indian population, Overweight ≥23, Obese ≥25
export function getBMICategoryAsian(bmi: number): BMICategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 23) return 'normal';
  if (bmi < 25) return 'overweight';
  if (bmi < 30) return 'obese_class_i';
  if (bmi < 35) return 'obese_class_ii';
  return 'obese_class_iii';
}

// Waist Circumference Risk
// Per spec: Men >102cm = high, 94-102cm = elevated. Women >88cm = high, 80-88cm = elevated.
export type WaistRisk = 'normal' | 'elevated' | 'high';

export function calculateWaistRisk(
  waistCm: number | null | undefined,
  sex: 'Male' | 'Female',
): WaistRisk | null {
  if (waistCm === null || waistCm === undefined) {
    return null;
  }

  if (sex === 'Male') {
    if (waistCm > 102) return 'high';
    if (waistCm >= 94) return 'elevated';
    return 'normal';
  } else {
    // Female
    if (waistCm > 88) return 'high';
    if (waistCm >= 80) return 'elevated';
    return 'normal';
  }
}

// Eating Disorder Flag
// Per spec: Flag if history of eating disorder OR BMI <18.5 requesting weight loss
export function checkEatingDisorderFlag(
  responses: Record<string, any>,
): boolean {
  // Check Q13 for eating disorder history
  const conditions = responses.Q13 || [];
  if (Array.isArray(conditions)) {
    const hasEatingDisorder = conditions.some(
      (c: string) =>
        c.toLowerCase().includes('eating disorder') ||
        c.toLowerCase().includes('anorexia') ||
        c.toLowerCase().includes('bulimia') ||
        c.toLowerCase().includes('binge eating'),
    );
    if (hasEatingDisorder) {
      return true;
    }
  }

  // Check if underweight requesting weight loss
  const height = responses.Q5;
  const weight = responses.Q6;
  if (height && weight) {
    const bmi = calculateBMI(weight, height);
    if (bmi !== null && bmi < 18.5) {
      return true;
    }
  }

  return false;
}

// Metabolic Risk Level
// Per spec: Based on BMI, waist risk, and comorbidities
export type MetabolicRiskLevel = 'low' | 'moderate' | 'high';

export function getMetabolicRiskLevel(params: {
  bmi: number;
  waistRisk: WaistRisk | null;
  conditions: string[];
}): MetabolicRiskLevel {
  const { bmi, waistRisk, conditions } = params;

  // High risk: Class III obesity OR multiple comorbidities
  if (bmi >= 40) return 'high';

  const highRiskConditions = [
    'type 2 diabetes',
    'heart disease',
    'high blood pressure',
    'kidney disease',
  ];
  const comorbidityCount = conditions.filter((c) =>
    highRiskConditions.some((hrc) => c.toLowerCase().includes(hrc)),
  ).length;

  if (comorbidityCount >= 2) return 'high';
  if (bmi >= 35 && comorbidityCount >= 1) return 'high';
  if (bmi >= 30 && waistRisk === 'high') return 'high';

  // Moderate risk: Overweight with risk factors
  if (bmi >= 25 || waistRisk === 'elevated' || comorbidityCount >= 1) {
    return 'moderate';
  }

  return 'low';
}
