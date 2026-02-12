// Spec: onlyou-spec-pcos.md Section 3 — PCOS Questionnaire
// 32 questions, Rotterdam criteria, fertility intent

export interface PCOSQuestion {
  id: string;
  text: string;
  type:
    | 'number'
    | 'single_select'
    | 'multi_select'
    | 'text'
    | 'date'
    | 'height_weight'
    | 'measurement'
    | 'ranking';
  section: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
  };
  conditionalOn?: Record<string, string | string[]>;
  defaultValue?: string;
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

// SECTION 1: BASICS (Q1-Q3)
const section1: PCOSQuestion[] = [
  {
    id: 'Q1',
    text: 'What is your biological sex?',
    type: 'single_select',
    section: 'Basics',
    required: true,
    options: ['Female'],
    defaultValue: 'Female',
    hint: 'This program is designed for women. Males will be redirected.',
  },
  {
    id: 'Q2',
    text: 'What is your age?',
    type: 'number',
    section: 'Basics',
    required: true,
    validation: { min: 18, max: 55 },
    hint: 'You must be 18-55 years old. Post-menopausal women may need different evaluation.',
  },
  {
    id: 'Q3',
    text: 'What brought you here today? (Select all that apply)',
    type: 'multi_select',
    section: 'Basics',
    required: true,
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
  },
];

// SECTION 2: MENSTRUAL CYCLE (Q4-Q9)
const section2: PCOSQuestion[] = [
  {
    id: 'Q4',
    text: 'When was your last period?',
    type: 'single_select',
    section: 'Menstrual Cycle',
    required: true,
    options: [
      'Last week',
      '2-3 weeks ago',
      '1-2 months ago',
      '3+ months ago',
      'Can\'t remember',
    ],
  },
  {
    id: 'Q5',
    text: 'How would you describe your periods?',
    type: 'single_select',
    section: 'Menstrual Cycle',
    required: true,
    options: [
      'Regular (24-35 days, predictable)',
      'Somewhat irregular (varies by a week+)',
      'Very irregular (sometimes skip months)',
      'Infrequent (few times a year)',
      'Absent (3+ months, not pregnant)',
      'On birth control so hard to tell',
    ],
  },
  {
    id: 'Q6',
    text: 'How long have your periods been irregular?',
    type: 'single_select',
    section: 'Menstrual Cycle',
    required: true,
    conditionalOn: {
      Q5: [
        'Somewhat irregular (varies by a week+)',
        'Very irregular (sometimes skip months)',
        'Infrequent (few times a year)',
        'Absent (3+ months, not pregnant)',
      ],
    },
    options: [
      'Since puberty',
      'Last 1-2 years',
      'Last 6-12 months',
      'Recently',
    ],
  },
  {
    id: 'Q7',
    text: 'Are your periods heavy or painful?',
    type: 'single_select',
    section: 'Menstrual Cycle',
    required: true,
    conditionalOn: {
      Q5: [
        'Somewhat irregular (varies by a week+)',
        'Very irregular (sometimes skip months)',
        'Infrequent (few times a year)',
      ],
    },
    options: [
      'Light',
      'Normal',
      'Heavy',
      'Very heavy with large clots',
      'Varies',
    ],
  },
  {
    id: 'Q8',
    text: 'Have you been evaluated for the cause of irregular periods?',
    type: 'single_select',
    section: 'Menstrual Cycle',
    required: true,
    conditionalOn: {
      Q5: [
        'Somewhat irregular (varies by a week+)',
        'Very irregular (sometimes skip months)',
        'Infrequent (few times a year)',
        'Absent (3+ months, not pregnant)',
      ],
    },
    options: [
      'Yes, diagnosed PCOS',
      'Yes, no diagnosis',
      'No',
      'Not sure',
    ],
  },
  {
    id: 'Q9',
    text: 'What symptoms do you experience around your period? (Select all)',
    type: 'multi_select',
    section: 'Menstrual Cycle',
    required: false,
    conditionalOn: {
      Q5: [
        'Somewhat irregular (varies by a week+)',
        'Very irregular (sometimes skip months)',
        'Infrequent (few times a year)',
      ],
    },
    options: [
      'Severe cramps',
      'Bloating',
      'Mood swings',
      'Heavy bleeding',
      'Spotting between periods',
      'None',
    ],
  },
];

// SECTION 3: HYPERANDROGENISM SYMPTOMS (Q10-Q14)
const section3: PCOSQuestion[] = [
  {
    id: 'Q10',
    text: 'Where do you experience excess hair growth? (Select all)',
    type: 'multi_select',
    section: 'Hyperandrogenism Symptoms',
    required: true,
    options: [
      'Upper lip/chin',
      'Cheeks/sideburns',
      'Chest',
      'Abdomen',
      'Back',
      'Upper arms/thighs',
      'None',
    ],
  },
  {
    id: 'Q11',
    text: 'How would you rate your unwanted hair growth?',
    type: 'single_select',
    section: 'Hyperandrogenism Symptoms',
    required: true,
    options: ['None', 'Mild', 'Moderate', 'Severe'],
  },
  {
    id: 'Q12',
    text: 'Do you currently have acne?',
    type: 'single_select',
    section: 'Hyperandrogenism Symptoms',
    required: true,
    options: [
      'No',
      'Mild',
      'Moderate',
      'Severe (deep/cystic)',
      'Currently treating',
    ],
  },
  {
    id: 'Q13',
    text: 'Do you have scalp hair thinning?',
    type: 'single_select',
    section: 'Hyperandrogenism Symptoms',
    required: true,
    options: [
      'No',
      'Mild at part line',
      'Noticeable',
      'Significant/bald patches',
    ],
  },
  {
    id: 'Q14',
    text: 'Do you have skin darkening in any areas? (Select all)',
    type: 'multi_select',
    section: 'Hyperandrogenism Symptoms',
    required: true,
    options: [
      'Back of neck',
      'Armpits',
      'Under breasts',
      'Groin/thighs',
      'None',
    ],
    hint: 'Dark, velvety patches (acanthosis nigricans) may indicate insulin resistance',
  },
];

// SECTION 4: WEIGHT & METABOLISM (Q15-Q18)
const section4: PCOSQuestion[] = [
  {
    id: 'Q15',
    text: 'What is your height and weight?',
    type: 'height_weight',
    section: 'Weight & Metabolism',
    required: true,
    hint: 'This helps us calculate your BMI',
  },
  {
    id: 'Q16',
    text: 'Have you experienced recent weight gain?',
    type: 'single_select',
    section: 'Weight & Metabolism',
    required: true,
    options: [
      'No',
      '5-10 kg in the last year',
      '10+ kg',
      'Always overweight',
      'Struggle to lose',
    ],
  },
  {
    id: 'Q17',
    text: 'Where do you tend to carry your weight?',
    type: 'single_select',
    section: 'Weight & Metabolism',
    required: true,
    options: [
      'Evenly',
      'Mainly belly (apple)',
      'Mainly hips/thighs (pear)',
      'Not overweight',
    ],
  },
  {
    id: 'Q18',
    text: 'What is your waist circumference?',
    type: 'measurement',
    section: 'Weight & Metabolism',
    required: false,
    hint: 'Measure around your belly button. >88cm indicates elevated metabolic risk.',
  },
];

// SECTION 5: FERTILITY & REPRODUCTIVE (Q19-Q21)
const section5: PCOSQuestion[] = [
  {
    id: 'Q19',
    text: 'Are you currently trying to get pregnant?',
    type: 'single_select',
    section: 'Fertility & Reproductive',
    required: true,
    options: [
      'Yes',
      'No',
      'Planning in next 12 months',
      'Not sure',
    ],
    hint: 'This is important as it affects which treatments are safe',
  },
  {
    id: 'Q20',
    text: 'How long have you been trying to conceive?',
    type: 'single_select',
    section: 'Fertility & Reproductive',
    required: true,
    conditionalOn: { Q19: 'Yes' },
    options: [
      '<6 months',
      '6-12 months',
      '1-2 years',
      '2+ years',
    ],
  },
  {
    id: 'Q21',
    text: 'Are you currently pregnant or breastfeeding?',
    type: 'single_select',
    section: 'Fertility & Reproductive',
    required: true,
    options: [
      'Yes, pregnant',
      'Yes, breastfeeding',
      'No',
    ],
  },
];

// SECTION 6: MEDICAL SCREENING (Q22-Q26)
const section6: PCOSQuestion[] = [
  {
    id: 'Q22',
    text: 'Do you have any of these medical conditions? (Select all)',
    type: 'multi_select',
    section: 'Medical Screening',
    required: true,
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
  },
  {
    id: 'Q23',
    text: 'What medications are you currently taking? (Select all)',
    type: 'multi_select',
    section: 'Medical Screening',
    required: true,
    options: [
      'Birth control',
      'Metformin',
      'Thyroid medication',
      'Antidepressants',
      'Blood pressure medication',
      'Spironolactone',
      'None',
      'Other',
    ],
  },
  {
    id: 'Q24',
    text: 'Do you have any drug allergies?',
    type: 'text',
    section: 'Medical Screening',
    required: false,
    hint: 'Enter "None" if no known allergies',
  },
  {
    id: 'Q25',
    text: 'Is there a family history of PCOS, diabetes, or thyroid issues?',
    type: 'multi_select',
    section: 'Medical Screening',
    required: true,
    options: [
      'Mother has PCOS',
      'Sister has PCOS',
      'Family diabetes',
      'Family thyroid',
      'None',
      'Not sure',
    ],
  },
  {
    id: 'Q26',
    text: 'Have you had blood work done in the last 12 months?',
    type: 'single_select',
    section: 'Medical Screening',
    required: true,
    options: [
      'Yes, results normal',
      'Yes, some abnormal results',
      'No',
      "Don't remember",
    ],
  },
];

// SECTION 7: TREATMENT HISTORY (Q27-Q29)
const section7: PCOSQuestion[] = [
  {
    id: 'Q27',
    text: 'What PCOS treatments have you tried before? (Select all)',
    type: 'multi_select',
    section: 'Treatment History',
    required: true,
    options: [
      'Combined birth control pills',
      'Progesterone-only pills',
      'Metformin',
      'Spironolactone',
      'Letrozole/Clomiphene (fertility)',
      'Anti-acne medications',
      'Laser hair removal',
      'Supplements (inositol, berberine)',
      'Lifestyle changes only',
      'None',
    ],
  },
  {
    id: 'Q28',
    text: 'What side effects did you experience from previous treatments?',
    type: 'text',
    section: 'Treatment History',
    required: false,
    conditionalOn: {
      Q27: [
        'Combined birth control pills',
        'Progesterone-only pills',
        'Metformin',
        'Spironolactone',
        'Letrozole/Clomiphene (fertility)',
        'Anti-acne medications',
      ],
    },
  },
  {
    id: 'Q29',
    text: 'What concerns you MOST about your condition? (Rank top 3)',
    type: 'ranking',
    section: 'Treatment History',
    required: true,
    options: [
      'Irregular periods',
      'Fertility',
      'Acne',
      'Excess hair',
      'Weight',
      'Hair thinning',
      'Mood',
      'Long-term health',
    ],
    hint: 'This helps us prioritize your treatment approach',
  },
];

// SECTION 8: LIFESTYLE (Q30-Q32)
const section8: PCOSQuestion[] = [
  {
    id: 'Q30',
    text: 'How would you describe your exercise level?',
    type: 'single_select',
    section: 'Lifestyle',
    required: true,
    options: ['Sedentary', 'Light', 'Moderate', 'Active'],
  },
  {
    id: 'Q31',
    text: 'How would you describe your diet?',
    type: 'single_select',
    section: 'Lifestyle',
    required: true,
    options: ['Balanced', 'Vegetarian', 'Vegan', 'Irregular', 'Low-carb'],
  },
  {
    id: 'Q32',
    text: 'How would you rate your stress level?',
    type: 'single_select',
    section: 'Lifestyle',
    required: true,
    options: ['Low', 'Moderate', 'High', 'Very high'],
  },
];

// Combine all sections
export const pcosQuestions: PCOSQuestion[] = [
  ...section1,
  ...section2,
  ...section3,
  ...section4,
  ...section5,
  ...section6,
  ...section7,
  ...section8,
];

// Skip Logic Rules
// Spec: Q5 = "Regular" → skip Q6, Q7, Q9; Q19 = "No" → skip Q20; Q27 = "None" → skip Q28, Q29
export const PCOS_SKIP_LOGIC: SkipLogicRule[] = [
  {
    condition: { Q5: 'Regular (24-35 days, predictable)' },
    skipQuestion: 'Q6',
  },
  {
    condition: { Q5: 'Regular (24-35 days, predictable)' },
    skipQuestion: 'Q7',
  },
  {
    condition: { Q5: 'Regular (24-35 days, predictable)' },
    skipQuestion: 'Q9',
  },
  {
    condition: { Q5: 'On birth control so hard to tell' },
    skipQuestion: 'Q6',
  },
  {
    condition: { Q5: 'On birth control so hard to tell' },
    skipQuestion: 'Q7',
  },
  {
    condition: { Q5: 'On birth control so hard to tell' },
    skipQuestion: 'Q9',
  },
  {
    condition: { Q19: 'No' },
    skipQuestion: 'Q20',
  },
  {
    condition: { Q19: 'Not sure' },
    skipQuestion: 'Q20',
  },
  {
    condition: { Q27: 'None' },
    skipQuestion: 'Q28',
  },
  {
    condition: { Q27: 'None' },
    skipQuestion: 'Q29',
  },
];

// Photo Requirements - Per spec: Optional, doctor-requested
// No upfront photo requirements for PCOS
export const PCOS_PHOTO_REQUIREMENTS: PhotoRequirement[] = [];

// Rotterdam Criteria Check
// Spec: 2 of 3 criteria = PCOS likely
// 1. Oligo/anovulation (irregular/infrequent/absent periods)
// 2. Hyperandrogenism (clinical: hirsutism, acne, hair loss OR biochemical: blood test)
// 3. Polycystic ovaries (cannot assess via telehealth)
export interface RotterdamCriteriaResult {
  oligoAnovulation: boolean;
  hyperandrogenismClinical: boolean;
  polycysticOvaries: 'unknown' | 'yes' | 'no';
  criteriaMet: number;
}

export function checkRotterdamCriteria(
  responses: Record<string, any>,
): RotterdamCriteriaResult {
  // Check oligo/anovulation
  const irregularPeriods = [
    'Somewhat irregular (varies by a week+)',
    'Very irregular (sometimes skip months)',
    'Infrequent (few times a year)',
    'Absent (3+ months, not pregnant)',
  ];
  const oligoAnovulation =
    responses.Q5 && irregularPeriods.includes(responses.Q5);

  // Check clinical hyperandrogenism
  let hyperandrogenismClinical = false;

  // Hirsutism (Q10-Q11)
  const hasHirsutism =
    Array.isArray(responses.Q10) &&
    !responses.Q10.includes('None') &&
    responses.Q10.length > 0 &&
    responses.Q11 &&
    responses.Q11 !== 'None';

  // Acne (Q12) - moderate or severe counts
  const hasSignificantAcne =
    responses.Q12 &&
    (responses.Q12.toLowerCase().includes('moderate') ||
      responses.Q12.toLowerCase().includes('severe') ||
      responses.Q12.toLowerCase().includes('cystic'));

  // Hair loss (Q13) - noticeable or worse
  const hasHairLoss =
    responses.Q13 &&
    (responses.Q13.toLowerCase().includes('noticeable') ||
      responses.Q13.toLowerCase().includes('significant'));

  if (hasHirsutism || hasSignificantAcne || hasHairLoss) {
    hyperandrogenismClinical = true;
  }

  // Polycystic ovaries - cannot assess via telehealth
  const polycysticOvaries: 'unknown' | 'yes' | 'no' = 'unknown';

  // Count criteria met
  let criteriaMet = 0;
  if (oligoAnovulation) criteriaMet++;
  if (hyperandrogenismClinical) criteriaMet++;
  // polycysticOvaries cannot be counted (unknown)

  return {
    oligoAnovulation,
    hyperandrogenismClinical,
    polycysticOvaries,
    criteriaMet,
  };
}

// Fertility Intent
// Spec: CRITICAL - Changes entire treatment pathway
export type FertilityIntent = 'trying' | 'planning_soon' | 'not_planning' | 'unsure';

export function determineFertilityIntent(
  responses: Record<string, any>,
): FertilityIntent {
  const q19 = responses.Q19;
  if (q19 === 'Yes') return 'trying';
  if (q19 === 'Planning in next 12 months') return 'planning_soon';
  if (q19 === 'No') return 'not_planning';
  return 'unsure';
}

// Insulin Resistance Indicators
export interface InsulinResistanceIndicators {
  hasAcanthosisNigricans: boolean;
  hasCentralObesity: boolean;
  strugglingToLose: boolean;
  likely: boolean;
}

export function checkInsulinResistanceIndicators(
  responses: Record<string, any>,
): InsulinResistanceIndicators {
  // Acanthosis nigricans (Q14)
  const hasAcanthosisNigricans =
    Array.isArray(responses.Q14) &&
    !responses.Q14.includes('None') &&
    responses.Q14.length > 0;

  // Central obesity (Q17)
  const hasCentralObesity =
    responses.Q17 === 'Mainly belly (apple)' ||
    (responses.Q15?.weight && responses.Q15?.height &&
      responses.Q15.weight / ((responses.Q15.height / 100) ** 2) >= 30);

  // Struggling to lose weight (Q16)
  const strugglingToLose = responses.Q16 === 'Struggle to lose';

  // Likely if any indicator present
  const likely = hasAcanthosisNigricans || hasCentralObesity || strugglingToLose;

  return {
    hasAcanthosisNigricans,
    hasCentralObesity,
    strugglingToLose,
    likely,
  };
}

// PCOS Phenotype
export type PCOSPhenotype = 'classic' | 'lean' | 'metabolic' | 'fertility_focused' | 'unclear';

export function determinePCOSPhenotype(params: {
  oligoAnovulation: boolean;
  hyperandrogenism: boolean;
  bmi: number;
  insulinResistance: boolean;
  tryingToConceive: boolean;
}): PCOSPhenotype {
  const { oligoAnovulation, hyperandrogenism, bmi, insulinResistance, tryingToConceive } = params;

  // If trying to conceive, that's the primary focus
  if (tryingToConceive) {
    return 'fertility_focused';
  }

  // Need at least one Rotterdam criterion to classify
  if (!oligoAnovulation && !hyperandrogenism) {
    return 'unclear';
  }

  // Lean PCOS: normal BMI
  if (bmi < 25 && (oligoAnovulation || hyperandrogenism)) {
    return 'lean';
  }

  // Metabolic PCOS: overweight with insulin resistance
  if ((bmi >= 25 || insulinResistance) && insulinResistance) {
    return 'metabolic';
  }

  // Classic PCOS: irregular periods + androgen signs
  if (oligoAnovulation && hyperandrogenism) {
    return 'classic';
  }

  // Default to classic if any criteria met
  if (oligoAnovulation || hyperandrogenism) {
    return 'classic';
  }

  return 'unclear';
}
