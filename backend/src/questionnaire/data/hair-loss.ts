// Spec: hair-loss spec Section 3 — 25 questions with skip logic
// ~5-7 minutes completion time
// Most male patients answer 20-22 questions after skip logic

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export interface QuestionConditional {
  questionId: string;
  value?: string; // Show if answer equals this value
  notValue?: string; // Show if answer does NOT equal this value
  includes?: string; // Show if multi-select includes this value
}

export interface Question {
  id: string;
  section: string;
  type: 'number' | 'single_choice' | 'multi_choice' | 'visual_select' | 'text';
  question: string;
  options?: QuestionOption[];
  required: boolean;
  validation?: QuestionValidation;
  conditional?: QuestionConditional;
  aiUse?: string; // How AI uses this response
}

export interface SkipLogicRule {
  questionId: string; // Question this rule applies to
  type: 'show' | 'optional'; // What this rule does
  condition: {
    dependsOn: string; // Which question's answer to check
    operator: 'equals' | 'notEquals' | 'includes' | 'notIncludes';
    value: string | string[];
  };
}

// Skip Logic Rules per spec Section 3
export const HAIR_LOSS_SKIP_LOGIC: SkipLogicRule[] = [
  // Q2 = Female → add Q2b (pregnancy/breastfeeding)
  {
    questionId: 'Q2b',
    type: 'show',
    condition: {
      dependsOn: 'Q2',
      operator: 'equals',
      value: 'Female',
    },
  },
  // Q10 includes scalp condition → add Q10b
  {
    questionId: 'Q10b',
    type: 'show',
    condition: {
      dependsOn: 'Q10',
      operator: 'includes',
      value: 'Scalp psoriasis or eczema',
    },
  },
  // Q10 = "None" → Q11 becomes optional
  {
    questionId: 'Q11',
    type: 'optional',
    condition: {
      dependsOn: 'Q10',
      operator: 'includes',
      value: 'None',
    },
  },
  // Q17 = "None" → skip Q18
  {
    questionId: 'Q18',
    type: 'show',
    condition: {
      dependsOn: 'Q17',
      operator: 'notIncludes',
      value: 'None',
    },
  },
  // Q17 = "None" → skip Q19
  {
    questionId: 'Q19',
    type: 'show',
    condition: {
      dependsOn: 'Q17',
      operator: 'notIncludes',
      value: 'None',
    },
  },
];

// All 25 questions per spec Section 3
export const hairLossQuestions: Question[] = [
  // ============================================
  // SECTION 1: BASICS (Q1-Q3, +Q2b conditional)
  // ============================================
  {
    id: 'Q1',
    section: 'basics',
    type: 'number',
    question: 'What is your age?',
    required: true,
    validation: { min: 18, max: 80 },
    aiUse: 'Age-appropriate treatment. <25 = more conservative.',
  },
  {
    id: 'Q2',
    section: 'basics',
    type: 'single_choice',
    question: 'What is your biological sex?',
    options: [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' },
    ],
    required: true,
    aiUse: 'Finasteride contraindicated in women of childbearing age.',
  },
  {
    id: 'Q2b',
    section: 'basics',
    type: 'single_choice',
    question: 'Are you currently pregnant, breastfeeding, or planning pregnancy in next 12 months?',
    options: [
      { value: 'Yes', label: 'Yes' },
      { value: 'No', label: 'No' },
    ],
    required: true,
    conditional: { questionId: 'Q2', value: 'Female' },
    aiUse: 'Yes = ABSOLUTE finasteride block.',
  },
  {
    id: 'Q3',
    section: 'basics',
    type: 'single_choice',
    question: 'What is your primary concern?',
    options: [
      { value: 'thinning_gradually', label: 'My hair is thinning gradually' },
      { value: 'hairline_receding', label: 'My hairline is receding' },
      { value: 'bald_patches', label: 'I have bald patches/spots' },
      { value: 'sudden_shedding', label: "I'm shedding a lot of hair suddenly" },
      { value: 'scalp_issues', label: 'I have scalp itching/flaking along with hair loss' },
      { value: 'unsure', label: 'Not sure — I want professional guidance' },
    ],
    required: true,
    aiUse: '"Bald patches" = possible alopecia areata. "Sudden shedding" = possible telogen effluvium.',
  },

  // ============================================
  // SECTION 2: HAIR LOSS PATTERN (Q4-Q9)
  // ============================================
  {
    id: 'Q4',
    section: 'hair_loss_pattern',
    type: 'single_choice',
    question: 'When did you first notice hair loss?',
    options: [
      { value: '<3_months', label: 'Less than 3 months ago' },
      { value: '3-6_months', label: '3-6 months ago' },
      { value: '6-12_months', label: '6-12 months ago' },
      { value: '1-3_years', label: '1-3 years ago' },
      { value: '3-5_years', label: '3-5 years ago' },
      { value: '5+_years', label: 'More than 5 years ago' },
    ],
    required: true,
    aiUse: '<6 months + sudden = red flag for TE.',
  },
  {
    id: 'Q5',
    section: 'hair_loss_pattern',
    type: 'single_choice',
    question: 'How would you describe the progression?',
    options: [
      { value: 'slow_gradual', label: 'Slow and gradual' },
      { value: 'steady', label: 'Steady — noticeable every few months' },
      { value: 'rapid', label: 'Rapid — significant change recently' },
      { value: 'comes_goes', label: 'Comes and goes' },
    ],
    required: true,
    aiUse: '"Rapid" or "comes and goes" = NOT typical AGA.',
  },
  {
    id: 'Q6',
    section: 'hair_loss_pattern',
    type: 'multi_choice',
    question: 'Where are you losing hair? (Select all that apply)',
    options: [
      { value: 'hairline_forehead', label: 'Hairline/forehead receding' },
      { value: 'crown_top', label: 'Crown/top thinning' },
      { value: 'temples', label: 'Temples thinning' },
      { value: 'overall', label: 'Overall thinning everywhere' },
      { value: 'patches', label: 'Specific patches/spots' },
      { value: 'sides', label: 'Sides of head' },
      { value: 'back', label: 'Back of head' },
    ],
    required: true,
    aiUse: 'Hairline + Crown + Temples = AGA. Patches = alopecia areata. Sides/Back = unusual.',
  },
  {
    id: 'Q7',
    section: 'hair_loss_pattern',
    type: 'visual_select',
    question: 'Which image best matches your hair loss?',
    options: [
      { value: 'I', label: 'Norwood I - Minimal or no recession' },
      { value: 'II', label: 'Norwood II - Minor recession at temples' },
      { value: 'III', label: 'Norwood III - Deeper recession at temples' },
      { value: 'III_vertex', label: 'Norwood III Vertex - Crown thinning begins' },
      { value: 'IV', label: 'Norwood IV - Further recession and crown thinning' },
      { value: 'V', label: 'Norwood V - Crown and hairline almost connected' },
      { value: 'VI', label: 'Norwood VI - Large bald area on top' },
      { value: 'VII', label: 'Norwood VII - Only hair on sides and back' },
      { value: 'none_match', label: "None of these match my pattern" },
    ],
    required: true,
    aiUse: 'Severity assessment. Cross-referenced with photos.',
  },
  {
    id: 'Q8',
    section: 'hair_loss_pattern',
    type: 'multi_choice',
    question: 'Does anyone in your family have hair loss?',
    options: [
      { value: 'father', label: 'Father' },
      { value: 'maternal_grandfather', label: 'Maternal grandfather' },
      { value: 'maternal_uncles', label: 'Maternal uncles' },
      { value: 'brothers', label: 'Brothers' },
      { value: 'no_one', label: 'No one' },
      { value: 'not_sure', label: 'Not sure' },
    ],
    required: true,
    aiUse: 'Both sides = high AGA likelihood. Maternal grandfather strongest predictor.',
  },
  {
    id: 'Q9',
    section: 'hair_loss_pattern',
    type: 'single_choice',
    question: 'Has hair loss affected your confidence?',
    options: [
      { value: 'not_at_all', label: 'Not at all' },
      { value: 'slightly', label: 'Slightly' },
      { value: 'moderately', label: 'Moderately' },
      { value: 'significantly', label: 'Significantly' },
    ],
    required: true,
    aiUse: 'Helps doctor personalize message. Not clinical.',
  },

  // ============================================
  // SECTION 3: MEDICAL SCREENING (Q10-Q16, +Q10b conditional)
  // ============================================
  {
    id: 'Q10',
    section: 'medical_screening',
    type: 'multi_choice',
    question: 'Do you have any of these conditions? (Select all that apply)',
    options: [
      { value: 'Thyroid disorder', label: 'Thyroid disorder' },
      { value: 'Diabetes', label: 'Diabetes' },
      { value: 'Autoimmune condition', label: 'Autoimmune condition' },
      { value: 'Iron deficiency/anemia', label: 'Iron deficiency/anemia' },
      { value: 'Scalp psoriasis or eczema', label: 'Scalp psoriasis or eczema' },
      { value: 'Liver disease', label: 'Liver disease' },
      { value: 'Kidney disease', label: 'Kidney disease' },
      { value: 'Depression or anxiety', label: 'Depression or anxiety' },
      { value: 'Heart condition', label: 'Heart condition' },
      { value: 'None', label: 'None' },
    ],
    required: true,
    aiUse: 'Thyroid + iron = independent hair loss causes. Liver = finasteride caution. Depression = mood risk flag.',
  },
  {
    id: 'Q10b',
    section: 'medical_screening',
    type: 'single_choice',
    question: 'How severe is your scalp condition?',
    options: [
      { value: 'mild', label: 'Mild' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'severe', label: 'Severe' },
    ],
    required: true,
    conditional: { questionId: 'Q10', includes: 'Scalp psoriasis or eczema' },
    aiUse: 'Severe may need treatment before hair loss protocol.',
  },
  {
    id: 'Q11',
    section: 'medical_screening',
    type: 'multi_choice',
    question: 'Have you experienced any of these in the last 6 months? (Select all that apply)',
    options: [
      { value: 'Major surgery', label: 'Major surgery' },
      { value: 'Severe illness or high fever', label: 'Severe illness or high fever' },
      { value: 'Weight loss >10kg', label: 'Weight loss greater than 10kg' },
      { value: 'Major stress', label: 'Major stress' },
      { value: 'New medication', label: 'New medication' },
      { value: 'Crash diet', label: 'Crash diet' },
      { value: 'None', label: 'None' },
    ],
    required: true, // Becomes optional if Q10 = None (handled by skip logic)
    aiUse: 'ANY = telogen effluvium risk. Combined with sudden onset = likely TE, not AGA.',
  },
  {
    id: 'Q12',
    section: 'medical_screening',
    type: 'multi_choice',
    question: 'What medications are you currently taking? (Select all that apply)',
    options: [
      { value: 'Blood thinners', label: 'Blood thinners' },
      { value: 'BP meds', label: 'Blood pressure medications' },
      { value: 'Antidepressants', label: 'Antidepressants' },
      { value: 'Steroids', label: 'Steroids' },
      { value: 'Isotretinoin', label: 'Isotretinoin (Accutane)' },
      { value: 'Testosterone/anabolic steroids', label: 'Testosterone/anabolic steroids' },
      { value: 'Thyroid meds', label: 'Thyroid medications' },
      { value: 'Diabetes meds', label: 'Diabetes medications' },
      { value: 'Statins', label: 'Statins' },
      { value: 'None', label: 'None' },
      { value: 'Other', label: 'Other' },
    ],
    required: true,
    aiUse: 'Drug interactions. Isotretinoin = wait. Testosterone = may worsen AGA.',
  },
  {
    id: 'Q13',
    section: 'medical_screening',
    type: 'multi_choice',
    question: 'Do you have any drug allergies? (Select all that apply)',
    options: [
      { value: 'Minoxidil', label: 'Minoxidil' },
      { value: 'Finasteride', label: 'Finasteride' },
      { value: 'Propylene glycol', label: 'Propylene glycol' },
      { value: 'Sulfa drugs', label: 'Sulfa drugs' },
      { value: 'None', label: 'None' },
      { value: 'Other', label: 'Other' },
    ],
    required: true,
    aiUse: 'Minoxidil allergy = alternative formulation. Propylene glycol = foam instead of solution.',
  },
  {
    id: 'Q14',
    section: 'medical_screening',
    type: 'multi_choice',
    question: 'Have you experienced any of these? (Select all that apply)',
    options: [
      { value: 'Decreased sex drive', label: 'Decreased sex drive' },
      { value: 'Erectile difficulty', label: 'Erectile difficulty' },
      { value: 'Breast tenderness', label: 'Breast tenderness' },
      { value: 'Mood changes from medication', label: 'Mood changes from medication' },
      { value: 'None', label: 'None' },
    ],
    required: true,
    aiUse: 'CRITICAL for finasteride safety. Existing issues = finasteride may worsen.',
  },
  {
    id: 'Q15',
    section: 'medical_screening',
    type: 'single_choice',
    question: 'Are you planning to have children in the next 12 months?',
    options: [
      { value: 'Yes', label: 'Yes' },
      { value: 'No', label: 'No' },
      { value: 'Not sure', label: 'Not sure' },
    ],
    required: true,
    aiUse: 'Finasteride affects sperm. Not absolute block but doctor must discuss.',
  },
  {
    id: 'Q16',
    section: 'medical_screening',
    type: 'single_choice',
    question: 'Have you had blood work done in the last 12 months?',
    options: [
      { value: 'Yes', label: 'Yes' },
      { value: 'No', label: 'No' },
    ],
    required: true,
    aiUse: 'No recent blood work + suspected thyroid/nutritional = recommend panel.',
  },

  // ============================================
  // SECTION 4: TREATMENT HISTORY (Q17-Q20)
  // ============================================
  {
    id: 'Q17',
    section: 'treatment_history',
    type: 'multi_choice',
    question: 'Have you tried any of these treatments before? (Select all that apply)',
    options: [
      { value: 'Minoxidil', label: 'Minoxidil (Rogaine)' },
      { value: 'Finasteride', label: 'Finasteride (Propecia)' },
      { value: 'Dutasteride', label: 'Dutasteride' },
      { value: 'Hair oils', label: 'Hair oils' },
      { value: 'Ayurvedic', label: 'Ayurvedic treatments' },
      { value: 'Biotin supplements', label: 'Biotin supplements' },
      { value: 'PRP', label: 'PRP therapy' },
      { value: 'Hair transplant', label: 'Hair transplant' },
      { value: 'Ketoconazole shampoo', label: 'Ketoconazole shampoo' },
      { value: 'LLLT', label: 'LLLT (laser therapy)' },
      { value: 'None', label: 'None' },
    ],
    required: true,
    aiUse: 'Prior response informs protocol.',
  },
  {
    id: 'Q18',
    section: 'treatment_history',
    type: 'single_choice',
    question: 'How long did you use these treatments?',
    options: [
      { value: '<1_month', label: 'Less than 1 month' },
      { value: '1-3_months', label: '1-3 months' },
      { value: '3-6_months', label: '3-6 months' },
      { value: '6-12_months', label: '6-12 months' },
      { value: '>1_year', label: 'More than 1 year' },
    ],
    required: true,
    conditional: { questionId: 'Q17', notValue: 'None' },
    aiUse: '<6 months = insufficient trial.',
  },
  {
    id: 'Q19',
    section: 'treatment_history',
    type: 'multi_choice',
    question: 'Did you experience any side effects from previous treatments? (Select all that apply)',
    options: [
      { value: 'Scalp irritation', label: 'Scalp irritation' },
      { value: 'Unwanted facial hair', label: 'Unwanted facial hair' },
      { value: 'Initial shedding', label: 'Initial shedding' },
      { value: 'Sexual side effects', label: 'Sexual side effects' },
      { value: 'Mood changes', label: 'Mood changes' },
      { value: 'Breast tenderness', label: 'Breast tenderness' },
      { value: 'No side effects', label: 'No side effects' },
      { value: 'Other', label: 'Other' },
    ],
    required: true,
    conditional: { questionId: 'Q17', notValue: 'None' },
    aiUse: 'Previous finasteride side effects = minoxidil-only protocol.',
  },
  {
    id: 'Q20',
    section: 'treatment_history',
    type: 'single_choice',
    question: 'What are your expectations from treatment?',
    options: [
      { value: 'stop_loss', label: 'Stop further hair loss' },
      { value: 'regrow_some', label: 'Regrow some hair' },
      { value: 'full_restoration', label: 'Full hair restoration' },
      { value: 'want_guidance', label: 'I want professional guidance' },
    ],
    required: true,
    aiUse: 'Norwood V+ wanting "full restoration" = expectations need adjustment.',
  },

  // ============================================
  // SECTION 5: LIFESTYLE (Q21-Q25)
  // ============================================
  {
    id: 'Q21',
    section: 'lifestyle',
    type: 'single_choice',
    question: 'Do you smoke?',
    options: [
      { value: 'Yes daily', label: 'Yes, daily' },
      { value: 'Occasionally', label: 'Occasionally' },
      { value: 'No', label: 'No' },
      { value: 'Quit recently', label: 'Quit recently' },
    ],
    required: true,
    aiUse: 'Reduces scalp blood flow, affects minoxidil efficacy.',
  },
  {
    id: 'Q22',
    section: 'lifestyle',
    type: 'single_choice',
    question: 'How often do you consume alcohol?',
    options: [
      { value: 'Never', label: 'Never' },
      { value: 'Occasionally', label: 'Occasionally' },
      { value: 'Regularly', label: 'Regularly' },
      { value: 'Daily', label: 'Daily' },
    ],
    required: true,
    aiUse: 'Daily = liver flag for finasteride.',
  },
  {
    id: 'Q23',
    section: 'lifestyle',
    type: 'single_choice',
    question: 'How would you describe your diet?',
    options: [
      { value: 'Balanced', label: 'Balanced with variety' },
      { value: 'Mostly vegetarian', label: 'Mostly vegetarian' },
      { value: 'Strictly vegetarian/vegan', label: 'Strictly vegetarian/vegan' },
      { value: 'Irregular/fast food', label: 'Irregular/fast food' },
      { value: 'Restrictive diet', label: 'Restrictive diet' },
    ],
    required: true,
    aiUse: 'Vegetarian/vegan in India = iron, zinc, B12 deficiency risk. Restrictive = TE trigger.',
  },
  {
    id: 'Q24',
    section: 'lifestyle',
    type: 'single_choice',
    question: 'How would you rate your current stress level?',
    options: [
      { value: 'Low', label: 'Low' },
      { value: 'Moderate', label: 'Moderate' },
      { value: 'High', label: 'High' },
      { value: 'Very high', label: 'Very high' },
    ],
    required: true,
    aiUse: 'Chronic high stress = TE risk factor.',
  },
  {
    id: 'Q25',
    section: 'lifestyle',
    type: 'single_choice',
    question: 'How many hours do you typically sleep per night?',
    options: [
      { value: '<5', label: 'Less than 5 hours' },
      { value: '5-6', label: '5-6 hours' },
      { value: '6-7', label: '6-7 hours' },
      { value: '7-8', label: '7-8 hours' },
      { value: '>8', label: 'More than 8 hours' },
    ],
    required: true,
    aiUse: 'Chronic sleep deprivation affects hair growth cycle.',
  },
];
