// Spec: ED spec Section 3 — 28 questions with skip logic
// ~6-8 minutes completion time
// Most patients answer 22-25 questions after skip logic

import { Question, SkipLogicRule, QuestionOption } from './hair-loss';

// Skip Logic Rules per ED spec Section 3
// - Q3 = "Never able" → skip Q4, Q5 (already maximum severity)
// - Q14 = "None" → skip Q15 (no BP reading needed)
// - Q25 = "None" → skip Q26, Q27 (no treatment history)
// - Q13 = "None" → Q14 optional (no CV conditions)
export const ED_SKIP_LOGIC: SkipLogicRule[] = [
  // Q3 = "never_able" → skip Q4 (IIEF-5 Q1)
  {
    questionId: 'Q4',
    type: 'show',
    condition: {
      dependsOn: 'Q3',
      operator: 'notEquals',
      value: 'never_able',
    },
  },
  // Q3 = "never_able" → skip Q5 (IIEF-5 Q2)
  {
    questionId: 'Q5',
    type: 'show',
    condition: {
      dependsOn: 'Q3',
      operator: 'notEquals',
      value: 'never_able',
    },
  },
  // Q14 = "none" → skip Q15 (BP reading conditional on BP meds)
  {
    questionId: 'Q15',
    type: 'show',
    condition: {
      dependsOn: 'Q14',
      operator: 'notIncludes',
      value: 'none',
    },
  },
  // Q25 = "none" → skip Q26 (treatment response)
  {
    questionId: 'Q26',
    type: 'show',
    condition: {
      dependsOn: 'Q25',
      operator: 'notIncludes',
      value: 'none',
    },
  },
  // Q25 = "none" → skip Q27 (side effects)
  {
    questionId: 'Q27',
    type: 'show',
    condition: {
      dependsOn: 'Q25',
      operator: 'notIncludes',
      value: 'none',
    },
  },
  // Q13 = "none" → Q14 becomes optional
  {
    questionId: 'Q14',
    type: 'optional',
    condition: {
      dependsOn: 'Q13',
      operator: 'includes',
      value: 'none',
    },
  },
];

// Scale 1-5 options for IIEF-5 questions
const SCALE_1_5_CONFIDENCE: QuestionOption[] = [
  { value: '1', label: 'Very low' },
  { value: '2', label: 'Low' },
  { value: '3', label: 'Moderate' },
  { value: '4', label: 'High' },
  { value: '5', label: 'Very high' },
];

const SCALE_1_5_FREQUENCY: QuestionOption[] = [
  { value: '1', label: 'Almost never or never' },
  { value: '2', label: 'A few times (less than half)' },
  { value: '3', label: 'Sometimes (about half)' },
  { value: '4', label: 'Most times (more than half)' },
  { value: '5', label: 'Almost always or always' },
];

const SCALE_1_5_DIFFICULTY: QuestionOption[] = [
  { value: '1', label: 'Extremely difficult' },
  { value: '2', label: 'Very difficult' },
  { value: '3', label: 'Difficult' },
  { value: '4', label: 'Slightly difficult' },
  { value: '5', label: 'Not difficult' },
];

// All 28 questions per ED spec Section 3
export const edQuestions: Question[] = [
  // ============================================
  // SECTION 1: BASICS (Q1-Q3)
  // ============================================
  {
    id: 'Q1',
    section: 'basics',
    type: 'number',
    question: 'What is your age?',
    required: true,
    validation: { min: 18, max: 80 },
    aiUse: 'Age affects treatment approach. >65 = more conservative dosing.',
  },
  {
    id: 'Q2',
    section: 'basics',
    type: 'single_choice',
    question: 'What is your biological sex?',
    options: [{ value: 'Male', label: 'Male' }],
    required: true,
    aiUse: 'ED vertical is male-only. Female redirects to PCOS or other vertical.',
  },
  {
    id: 'Q3',
    section: 'basics',
    type: 'single_choice',
    question: 'Which best describes your situation?',
    options: [
      { value: 'trouble_maintaining', label: 'I can get an erection but have trouble maintaining it' },
      { value: 'difficulty_getting', label: 'I have difficulty getting an erection at all' },
      { value: 'not_firm_enough', label: "I sometimes get erections but they're not firm enough for sex" },
      { value: 'inconsistent', label: "I get erections but only occasionally — it's inconsistent" },
      { value: 'never_able', label: "I've never been able to get an erection adequate for sex" },
      { value: 'low_libido', label: "I'm experiencing reduced sex drive / low libido" },
      { value: 'premature_ejaculation', label: "I'm experiencing premature ejaculation" },
    ],
    required: true,
    aiUse: 'Primary classification. "never_able" = may need in-person urology referral. "low_libido" = may be hormonal, not vascular.',
  },

  // ============================================
  // SECTION 2: IIEF-5 SEVERITY ASSESSMENT (Q4-Q8)
  // Spec: International Index of Erectile Function
  // ============================================
  {
    id: 'Q4',
    section: 'iief5',
    type: 'single_choice',
    question: 'Over the past 6 months, how do you rate your confidence that you could get and keep an erection?',
    options: SCALE_1_5_CONFIDENCE,
    required: true,
    aiUse: 'IIEF-5 Q1. Score 1-5.',
  },
  {
    id: 'Q5',
    section: 'iief5',
    type: 'single_choice',
    question: 'When you had erections with sexual stimulation, how often were your erections hard enough for penetration?',
    options: SCALE_1_5_FREQUENCY,
    required: true,
    aiUse: 'IIEF-5 Q2. Score 1-5.',
  },
  {
    id: 'Q6',
    section: 'iief5',
    type: 'single_choice',
    question: 'During sexual intercourse, how often were you able to maintain your erection after penetration?',
    options: SCALE_1_5_FREQUENCY,
    required: true,
    aiUse: 'IIEF-5 Q3. Score 1-5.',
  },
  {
    id: 'Q7',
    section: 'iief5',
    type: 'single_choice',
    question: 'During sexual intercourse, how difficult was it to maintain your erection to completion?',
    options: SCALE_1_5_DIFFICULTY,
    required: true,
    aiUse: 'IIEF-5 Q4. Score 1-5.',
  },
  {
    id: 'Q8',
    section: 'iief5',
    type: 'single_choice',
    question: 'When you attempted sexual intercourse, how often was it satisfactory?',
    options: SCALE_1_5_FREQUENCY,
    required: true,
    aiUse: 'IIEF-5 Q5. Score 1-5.',
  },

  // ============================================
  // SECTION 3: ONSET & PATTERN (Q9-Q12)
  // ============================================
  {
    id: 'Q9',
    section: 'onset_pattern',
    type: 'single_choice',
    question: 'When did you first notice erectile difficulty?',
    options: [
      { value: '<3_months', label: 'Less than 3 months ago' },
      { value: '3-6_months', label: '3-6 months ago' },
      { value: '6-12_months', label: '6-12 months ago' },
      { value: '1-3_years', label: '1-3 years ago' },
      { value: '3+_years', label: 'More than 3 years ago' },
      { value: 'always', label: 'As long as I can remember' },
    ],
    required: true,
    aiUse: 'Sudden onset (<3 months) = possible vascular event, medication side effect, or psychological trigger. Gradual = likely organic/vascular.',
  },
  {
    id: 'Q10',
    section: 'onset_pattern',
    type: 'single_choice',
    question: 'How did the problem start?',
    options: [
      { value: 'gradual', label: 'Gradually got worse over time' },
      { value: 'sudden', label: "Suddenly — it was fine and then it wasn't" },
      { value: 'after_medication', label: 'After starting a new medication' },
      { value: 'after_stress', label: 'After a stressful life event' },
      { value: 'after_surgery', label: 'After surgery or injury' },
    ],
    required: true,
    aiUse: '"Sudden" = possible psychological or medication cause. "After medication" = review meds. "After surgery" = may need in-person.',
  },
  {
    id: 'Q11',
    section: 'onset_pattern',
    type: 'multi_choice',
    question: 'Do you get erections at other times?',
    options: [
      { value: 'morning_erections', label: 'Morning erections (wake up with erection)' },
      { value: 'masturbation_only', label: 'Erections when masturbating (but not during sex)' },
      { value: 'visual_stimulation', label: 'Erections from visual stimulation but lose them during sex' },
      { value: 'rarely_never', label: 'Rarely/never get erections in any situation' },
    ],
    required: true,
    aiUse: 'CRITICAL. Morning erections present = likely psychological cause (the plumbing works). No erections at all = likely organic/vascular. Masturbation only = performance anxiety.',
  },
  {
    id: 'Q12',
    section: 'onset_pattern',
    type: 'single_choice',
    question: 'Is the problem consistent or situational?',
    options: [
      { value: 'every_time', label: 'Every time — regardless of partner or situation' },
      { value: 'situational', label: 'Situational — works sometimes but not others' },
      { value: 'specific_partner', label: 'Only with a specific partner' },
      { value: 'intercourse_only', label: 'Only during intercourse (fine during foreplay/oral)' },
    ],
    required: true,
    aiUse: 'Situational/partner-specific = likely significant psychological component.',
  },

  // ============================================
  // SECTION 4: CARDIOVASCULAR SCREENING (Q13-Q19)
  // CRITICAL: PDE5 inhibitors + nitrates = fatal interaction
  // ============================================
  {
    id: 'Q13',
    section: 'cardiovascular',
    type: 'multi_choice',
    question: 'Do you have any of these conditions? (Select all)',
    options: [
      { value: 'heart_disease', label: 'Heart disease / history of heart attack' },
      { value: 'stroke', label: 'Stroke / history of stroke' },
      { value: 'hypertension', label: 'High blood pressure (hypertension)' },
      { value: 'hypotension', label: 'Low blood pressure (hypotension)' },
      { value: 'arrhythmia', label: 'Irregular heartbeat (arrhythmia)' },
      { value: 'angina', label: 'Chest pain (angina)' },
      { value: 'heart_failure', label: 'Heart failure' },
      { value: 'diabetes', label: 'Diabetes (Type 1 or Type 2)' },
      { value: 'high_cholesterol', label: 'High cholesterol' },
      { value: 'peyronies', label: "Peyronie's disease (curved penis)" },
      { value: 'prostate', label: 'Prostate problems (BPH, prostatitis, prostate cancer treatment)' },
      { value: 'kidney_disease', label: 'Kidney disease' },
      { value: 'liver_disease', label: 'Liver disease' },
      { value: 'sickle_cell', label: 'Sickle cell disease' },
      { value: 'blood_disorder', label: 'Blood disorder (leukemia, multiple myeloma)' },
      { value: 'none', label: 'None of these' },
    ],
    required: true,
    aiUse: 'Heart disease + nitrates = ABSOLUTE block for PDE5 inhibitors. Diabetes = very common co-factor. Peyronies = may need specialist. Low BP = dose adjustment needed.',
  },
  {
    id: 'Q14',
    section: 'cardiovascular',
    type: 'multi_choice',
    question: 'Do you currently take any of these medications? (Select all)',
    options: [
      { value: 'nitrates', label: 'Nitrates (nitroglycerin, isosorbide, amyl nitrite "poppers")' },
      { value: 'bp_medications', label: 'Blood pressure medications' },
      { value: 'alpha_blockers', label: 'Alpha-blockers (tamsulosin, alfuzosin — for prostate)' },
      { value: 'hiv_protease', label: 'HIV protease inhibitors (ritonavir, saquinavir)' },
      { value: 'antifungals', label: 'Antifungals (ketoconazole, itraconazole)' },
      { value: 'antidepressants', label: 'Antidepressants (SSRIs, SNRIs)' },
      { value: 'anti_anxiety', label: 'Anti-anxiety medications' },
      { value: 'blood_thinners', label: 'Blood thinners (warfarin)' },
      { value: 'other_ed_meds', label: 'Other erectile dysfunction medications' },
      { value: 'recreational', label: 'Recreational drugs (cocaine, marijuana, MDMA)' },
      { value: 'none', label: 'None' },
    ],
    required: true,
    aiUse: 'NITRATES = ABSOLUTE CONTRAINDICATION. Fatal hypotension risk. Alpha-blockers = dose adjustment and 4hr separation. SSRIs commonly cause ED.',
  },
  {
    id: 'Q15',
    section: 'cardiovascular',
    type: 'text',
    question: 'Do you know your most recent blood pressure reading?',
    required: false,
    conditional: { questionId: 'Q14', notValue: 'none' },
    aiUse: 'BP <90/50 = PDE5 inhibitors risky. BP >180/110 = needs stabilization first.',
  },
  {
    id: 'Q16',
    section: 'cardiovascular',
    type: 'single_choice',
    question: 'Have you been hospitalized for a heart-related issue in the last 6 months?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    required: true,
    aiUse: 'Recent cardiac event = BLOCK PDE5 inhibitors. Needs cardiology clearance.',
  },
  {
    id: 'Q17',
    section: 'cardiovascular',
    type: 'single_choice',
    question: 'Do you experience chest pain during physical activity or sexual activity?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'sometimes', label: 'Sometimes' },
    ],
    required: true,
    aiUse: 'Yes = unstable angina risk. MUST be evaluated before prescribing. Possible referral.',
  },
  {
    id: 'Q18',
    section: 'cardiovascular',
    type: 'single_choice',
    question: 'Have you ever been told your heart is not strong enough for sexual activity?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    required: true,
    aiUse: 'Yes = BLOCK. Needs cardiology clearance.',
  },
  {
    id: 'Q19',
    section: 'cardiovascular',
    type: 'multi_choice',
    question: 'Do you have any drug allergies?',
    options: [
      { value: 'sildenafil', label: 'Sildenafil (Viagra)' },
      { value: 'tadalafil', label: 'Tadalafil (Cialis)' },
      { value: 'vardenafil', label: 'Vardenafil (Levitra)' },
      { value: 'none', label: 'No known allergies' },
    ],
    required: true,
    aiUse: 'Direct treatment safety.',
  },

  // ============================================
  // SECTION 5: PSYCHOLOGICAL & LIFESTYLE (Q20-Q24)
  // ============================================
  {
    id: 'Q20',
    section: 'psychological_lifestyle',
    type: 'multi_choice',
    question: 'Are you currently experiencing any of these? (Select all)',
    options: [
      { value: 'work_stress', label: 'Stress at work or home' },
      { value: 'relationship_problems', label: 'Relationship problems' },
      { value: 'performance_anxiety', label: 'Performance anxiety about sex' },
      { value: 'depression', label: 'Depression' },
      { value: 'anxiety', label: 'Anxiety disorder' },
      { value: 'body_image', label: 'Low self-esteem / body image issues' },
      { value: 'porn_concerns', label: 'Pornography-related concerns' },
      { value: 'sleep_problems', label: 'Sleep problems' },
      { value: 'none', label: 'None of these' },
    ],
    required: true,
    aiUse: 'Psychological causes are VERY common in younger men. Multiple psych factors + morning erections = primarily psychological ED.',
  },
  {
    id: 'Q21',
    section: 'psychological_lifestyle',
    type: 'single_choice',
    question: 'Do you smoke?',
    options: [
      { value: 'yes_daily', label: 'Yes, daily' },
      { value: 'occasionally', label: 'Occasionally' },
      { value: 'no', label: 'No' },
      { value: 'quit_recently', label: 'Quit recently' },
    ],
    required: true,
    aiUse: 'Smoking is a major risk factor for vascular ED. Cessation counseling.',
  },
  {
    id: 'Q22',
    section: 'psychological_lifestyle',
    type: 'single_choice',
    question: 'Alcohol consumption?',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'occasionally', label: 'Occasionally' },
      { value: 'regularly', label: 'Regularly (2-3 times/week)' },
      { value: 'daily', label: 'Daily' },
      { value: 'heavy', label: 'Heavy (>4 drinks/session)' },
    ],
    required: true,
    aiUse: 'Heavy drinking causes ED. Also interacts with PDE5 inhibitors (increased side effects).',
  },
  {
    id: 'Q23',
    section: 'psychological_lifestyle',
    type: 'single_choice',
    question: 'Exercise frequency?',
    options: [
      { value: 'never', label: 'Never' },
      { value: '1-2_week', label: '1-2 times/week' },
      { value: '3-4_week', label: '3-4 times/week' },
      { value: '5+_week', label: '5+ times/week' },
    ],
    required: true,
    aiUse: 'Sedentary lifestyle = ED risk factor. Exercise improves ED outcomes.',
  },
  {
    id: 'Q24',
    section: 'psychological_lifestyle',
    type: 'number',
    question: 'What is your weight in kg?',
    required: true,
    validation: { min: 30, max: 300 },
    aiUse: 'BMI >30 = obesity is significant ED risk factor. May recommend weight management alongside ED treatment.',
  },

  // ============================================
  // SECTION 6: TREATMENT HISTORY (Q25-Q28)
  // ============================================
  {
    id: 'Q25',
    section: 'treatment_history',
    type: 'multi_choice',
    question: 'Have you tried any ED treatments before? (Select all)',
    options: [
      { value: 'sildenafil', label: 'Sildenafil (Viagra)' },
      { value: 'tadalafil', label: 'Tadalafil (Cialis)' },
      { value: 'vardenafil', label: 'Vardenafil (Levitra)' },
      { value: 'herbal', label: 'Herbal/ayurvedic supplements' },
      { value: 'vacuum_pump', label: 'Vacuum pump' },
      { value: 'counseling', label: 'Counseling/therapy' },
      { value: 'none', label: 'None' },
    ],
    required: true,
    aiUse: 'Prior medication response informs dosing.',
  },
  {
    id: 'Q26',
    section: 'treatment_history',
    type: 'single_choice',
    question: 'What happened with previous ED medication?',
    options: [
      { value: 'worked_well', label: 'Worked well — I want to continue with it' },
      { value: 'worked_side_effects', label: 'Worked but gave me side effects (headache, flushing, stuffy nose)' },
      { value: 'didnt_work', label: "Didn't work at all" },
      { value: 'insufficient_trial', label: "Didn't work at first but I only tried once or twice" },
      { value: 'stopped_working', label: 'Worked initially but stopped working over time' },
    ],
    required: true,
    conditional: { questionId: 'Q25', notValue: 'none' },
    aiUse: '"Didnt work" = may need higher dose. "Only tried 1-2 times" = insufficient trial (need 6-8 attempts). "Stopped working" = may need evaluation.',
  },
  {
    id: 'Q27',
    section: 'treatment_history',
    type: 'multi_choice',
    question: 'Any side effects from previous treatments?',
    options: [
      { value: 'headache', label: 'Headache' },
      { value: 'flushing', label: 'Facial flushing' },
      { value: 'nasal_congestion', label: 'Nasal congestion' },
      { value: 'vision_changes', label: 'Vision changes (blue tint)' },
      { value: 'back_pain', label: 'Back pain' },
      { value: 'muscle_pain', label: 'Muscle pain' },
      { value: 'dizziness', label: 'Dizziness' },
      { value: 'priapism', label: 'Priapism (erection >4 hours)' },
      { value: 'hearing_changes', label: 'Hearing changes' },
      { value: 'none', label: 'None' },
    ],
    required: true,
    conditional: { questionId: 'Q25', notValue: 'none' },
    aiUse: 'Vision or hearing changes = flag for doctor (rare but serious). Priapism history = extra caution.',
  },
  {
    id: 'Q28',
    section: 'treatment_history',
    type: 'single_choice',
    question: 'What are you hoping for from treatment?',
    options: [
      { value: 'reliable_erections', label: 'Reliable erections for intercourse' },
      { value: 'confidence', label: 'Improved confidence and reduced anxiety about performance' },
      { value: 'spontaneity', label: "Better spontaneity (don't want to plan around taking a pill)" },
      { value: 'overall_health', label: 'Overall sexual health improvement including libido' },
    ],
    required: true,
    aiUse: '"Spontaneity" = suggest daily low-dose tadalafil (works 24/7) instead of on-demand sildenafil.',
  },
];

// IIEF-5 Score Calculation
// Spec: Sum of Q4-Q8 scores (5-25)
export function calculateIIEF5Score(responses: Record<string, any>): number | null {
  const iief5Questions = ['Q4', 'Q5', 'Q6', 'Q7', 'Q8'];

  // Check if all IIEF-5 questions are answered
  for (const qId of iief5Questions) {
    if (responses[qId] === undefined || responses[qId] === null) {
      return null;
    }
  }

  // Sum up the scores (values are stored as strings "1"-"5")
  let total = 0;
  for (const qId of iief5Questions) {
    const value = parseInt(responses[qId], 10);
    if (isNaN(value)) {
      return null;
    }
    total += value;
  }

  return total;
}

// IIEF-5 Severity Classification
// Spec: 22-25: No ED, 17-21: Mild, 12-16: Mild-Moderate, 8-11: Moderate, 5-7: Severe
export type IIEF5Severity = 'none' | 'mild' | 'mild_moderate' | 'moderate' | 'severe';

export function getIIEF5Severity(score: number): IIEF5Severity | null {
  if (score < 5 || score > 25) {
    return null;
  }

  if (score >= 22) return 'none';
  if (score >= 17) return 'mild';
  if (score >= 12) return 'mild_moderate';
  if (score >= 8) return 'moderate';
  return 'severe';
}

// Photo Requirements
// Spec: NO photos required for ED consultations (privacy feature)
export const ED_PHOTO_REQUIREMENTS: any[] = [];
