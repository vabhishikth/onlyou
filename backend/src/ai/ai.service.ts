import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthVertical } from '@prisma/client';

// Spec: hair-loss spec Section 5, master spec Section 6

// Classification categories for hair loss (9 total)
export type ClassificationCategory =
  | 'androgenetic_alopecia'
  | 'telogen_effluvium_suspected'
  | 'alopecia_areata_suspected'
  | 'scalp_condition_suspected'
  | 'medication_induced_suspected'
  | 'nutritional_deficiency_suspected'
  | 'hormonal_suspected'
  | 'traction_alopecia_suspected'
  | 'unclear_needs_examination';

export const HAIR_LOSS_CLASSIFICATIONS: ClassificationCategory[] = [
  'androgenetic_alopecia',
  'telogen_effluvium_suspected',
  'alopecia_areata_suspected',
  'scalp_condition_suspected',
  'medication_induced_suspected',
  'nutritional_deficiency_suspected',
  'hormonal_suspected',
  'traction_alopecia_suspected',
  'unclear_needs_examination',
];

// Red flags for hair loss (12 total)
// Spec: hair-loss spec Section 5 — Red Flags (any = HIGH attention)
export const HAIR_LOSS_RED_FLAGS = [
  { id: 'young_rapid', description: 'Young age (<20) with rapid hair loss' },
  { id: 'sudden_onset', description: 'Recent sudden onset with rapid progression' },
  { id: 'patchy', description: 'Patchy hair loss pattern (possible alopecia areata)' },
  { id: 'unusual_pattern', description: 'Unusual hair loss pattern (sides/back)' },
  { id: 'isotretinoin', description: 'On isotretinoin (treatment should wait)' },
  { id: 'sexual_dysfunction', description: 'Existing sexual dysfunction (finasteride risk)' },
  { id: 'planning_children', description: 'Planning children in next 12 months' },
  { id: 'depression', description: 'Depression/anxiety history (finasteride mood risk)' },
  { id: 'weight_loss', description: 'Significant recent weight loss (>10kg)' },
  { id: 'surgery_illness', description: 'Recent major surgery or illness' },
  { id: 'scalp_symptoms', description: 'Scalp symptoms (pain/itching/burning)' },
  { id: 'female_childbearing', description: 'Female of childbearing age' },
];

// Finasteride contraindication checks (11 total)
// Spec: hair-loss spec Section 5 — Contraindication Matrix
export const FINASTERIDE_CONTRAINDICATION_CHECKS = [
  { id: 'female_childbearing', source: ['Q2', 'Q2b'], action: 'BLOCK' },
  { id: 'under_18', source: ['Q1'], action: 'BLOCK' },
  { id: 'pregnant_breastfeeding', source: ['Q2b'], action: 'ABSOLUTE_BLOCK' },
  { id: 'liver_disease', source: ['Q10'], action: 'FLAG' },
  { id: 'already_on_5ari', source: ['Q12'], action: 'FLAG' },
  { id: 'previous_side_effects', source: ['Q19'], action: 'SUGGEST_ALTERNATIVE' },
  { id: 'planning_children', source: ['Q15'], action: 'FLAG' },
  { id: 'sexual_dysfunction', source: ['Q14'], action: 'FLAG' },
  { id: 'blood_thinners', source: ['Q12'], action: 'FLAG' },
  { id: 'depression_ssri', source: ['Q10', 'Q12'], action: 'FLAG' },
  { id: 'daily_alcohol', source: ['Q22'], action: 'FLAG' },
];

// Doctor routing per vertical
// Spec: master spec Section 6 — Routing
const DOCTOR_SPECIALIZATIONS: Record<HealthVertical, string[]> = {
  [HealthVertical.HAIR_LOSS]: ['DERMATOLOGY', 'TRICHOLOGY'],
  [HealthVertical.SEXUAL_HEALTH]: ['UROLOGY', 'ANDROLOGY', 'SEXUAL_MEDICINE'],
  [HealthVertical.WEIGHT_MANAGEMENT]: ['ENDOCRINOLOGY', 'INTERNAL_MEDICINE', 'BARIATRIC'],
  [HealthVertical.PCOS]: ['GYNECOLOGY', 'ENDOCRINOLOGY', 'REPRODUCTIVE_MEDICINE'],
};

// High attention classifications
const HIGH_ATTENTION_CLASSIFICATIONS: ClassificationCategory[] = [
  'telogen_effluvium_suspected',
  'alopecia_areata_suspected',
  'medication_induced_suspected',
  'hormonal_suspected',
  'unclear_needs_examination',
];

// Medium attention classifications
const MEDIUM_ATTENTION_CLASSIFICATIONS: ClassificationCategory[] = [
  'scalp_condition_suspected',
  'nutritional_deficiency_suspected',
  'traction_alopecia_suspected',
];

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
}

export interface AIAssessment {
  classification: {
    likely_condition: string;
    confidence: 'high' | 'medium' | 'low';
    alternative_considerations: string[];
  };
  red_flags: string[];
  contraindications: Record<string, { safe: boolean; concerns: string[] }>;
  risk_factors: string[];
  recommended_protocol: {
    primary: string;
    medications: Medication[];
    additional: string[];
  };
  doctor_attention_level: 'low' | 'medium' | 'high';
  summary: string;
}

export interface ContraindicationResult {
  safe: boolean;
  action?: 'BLOCK' | 'ABSOLUTE_BLOCK' | 'FLAG' | 'SUGGEST_ALTERNATIVE';
  concerns: string[];
  suggestedAlternative?: string;
}

@Injectable()
export class AIService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY') || '';
    this.model = this.config.get<string>('ANTHROPIC_MODEL') || 'claude-3-sonnet-20240229';
  }

  /**
   * Get classification categories for a vertical
   */
  getClassificationCategories(vertical: HealthVertical): ClassificationCategory[] {
    if (vertical === HealthVertical.HAIR_LOSS) {
      return HAIR_LOSS_CLASSIFICATIONS;
    }
    // Other verticals would have their own classifications
    return [];
  }

  /**
   * Get doctor specializations for routing
   */
  getDoctorSpecializations(vertical: HealthVertical): string[] {
    return DOCTOR_SPECIALIZATIONS[vertical] || [];
  }

  /**
   * Detect red flags from questionnaire responses
   * Spec: hair-loss spec Section 5 — Red Flags
   */
  detectRedFlags(
    responses: Record<string, any>,
    vertical: HealthVertical
  ): string[] {
    if (vertical !== HealthVertical.HAIR_LOSS) {
      return [];
    }

    const flags: string[] = [];

    // Age <20 with rapid loss
    if (responses.Q1 < 20 && responses.Q5 === 'rapid') {
      flags.push('Young age (<20) with rapid hair loss');
    }

    // Onset <6 months AND sudden/rapid
    const recentOnset = ['<3_months', '3-6_months'].includes(responses.Q4);
    if (recentOnset && responses.Q5 === 'rapid') {
      flags.push('Recent sudden onset with rapid progression');
    }

    // Patchy pattern
    if (Array.isArray(responses.Q6) && responses.Q6.includes('patches')) {
      flags.push('Patchy hair loss pattern (possible alopecia areata)');
    }

    // Loss on sides/back
    if (
      Array.isArray(responses.Q6) &&
      (responses.Q6.includes('sides') || responses.Q6.includes('back'))
    ) {
      flags.push('Unusual hair loss pattern (sides/back)');
    }

    // On isotretinoin
    if (Array.isArray(responses.Q12) && responses.Q12.includes('Isotretinoin')) {
      flags.push('On isotretinoin (treatment should wait)');
    }

    // Existing sexual dysfunction
    if (
      Array.isArray(responses.Q14) &&
      (responses.Q14.includes('Decreased sex drive') ||
        responses.Q14.includes('Erectile difficulty'))
    ) {
      flags.push('Existing sexual dysfunction (finasteride risk)');
    }

    // Planning children
    if (responses.Q15 === 'Yes') {
      flags.push('Planning children in next 12 months');
    }

    // Depression history
    if (
      Array.isArray(responses.Q10) &&
      responses.Q10.includes('Depression or anxiety')
    ) {
      flags.push('Depression/anxiety history (finasteride mood risk)');
    }

    // Weight loss >10kg
    if (Array.isArray(responses.Q11) && responses.Q11.includes('Weight loss >10kg')) {
      flags.push('Significant recent weight loss (>10kg)');
    }

    // Recent surgery/illness
    if (
      Array.isArray(responses.Q11) &&
      (responses.Q11.includes('Major surgery') ||
        responses.Q11.includes('Severe illness or high fever'))
    ) {
      flags.push('Recent major surgery or illness');
    }

    // Scalp symptoms
    if (responses.Q3 === 'scalp_issues') {
      flags.push('Scalp symptoms (pain/itching/burning)');
    }

    // Female of childbearing age
    if (responses.Q2 === 'Female' && responses.Q1 >= 18 && responses.Q1 <= 50) {
      flags.push('Female of childbearing age');
    }

    return flags;
  }

  /**
   * Check finasteride contraindications
   * Spec: hair-loss spec Section 5 — Contraindication Matrix
   */
  checkFinasterideContraindications(
    responses: Record<string, any>
  ): ContraindicationResult {
    const concerns: string[] = [];
    let action: ContraindicationResult['action'] | undefined;
    let suggestedAlternative: string | undefined;

    // ABSOLUTE BLOCK: Pregnant/breastfeeding
    if (responses.Q2b === 'Yes') {
      concerns.push('Pregnant, breastfeeding, or planning pregnancy');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // BLOCK: Female of childbearing age
    if (responses.Q2 === 'Female') {
      concerns.push('Female of childbearing age');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Under 18
    if (responses.Q1 < 18) {
      concerns.push('Under 18 years old');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // FLAG: Liver disease
    if (Array.isArray(responses.Q10) && responses.Q10.includes('Liver disease')) {
      concerns.push('Liver disease present');
      action = 'FLAG';
    }

    // FLAG: Already on 5-ARI
    if (
      Array.isArray(responses.Q12) &&
      (responses.Q12.includes('Finasteride') || responses.Q12.includes('Dutasteride'))
    ) {
      concerns.push('Already on 5-alpha reductase inhibitor');
      action = action || 'FLAG';
    }

    // SUGGEST ALTERNATIVE: Previous finasteride side effects
    if (
      Array.isArray(responses.Q17) &&
      responses.Q17.includes('Finasteride') &&
      Array.isArray(responses.Q19) &&
      responses.Q19.some((s: string) =>
        ['Sexual side effects', 'Mood changes', 'Breast tenderness'].includes(s)
      )
    ) {
      concerns.push('Previous finasteride side effects');
      action = 'SUGGEST_ALTERNATIVE';
      suggestedAlternative = 'minoxidil_only';
    }

    // FLAG: Planning children
    if (responses.Q15 === 'Yes') {
      concerns.push('Planning children within 12 months');
      action = action || 'FLAG';
    }

    // FLAG: Sexual dysfunction
    if (
      Array.isArray(responses.Q14) &&
      (responses.Q14.includes('Decreased sex drive') ||
        responses.Q14.includes('Erectile difficulty'))
    ) {
      concerns.push('Existing sexual dysfunction');
      action = action || 'FLAG';
    }

    // FLAG: Blood thinners
    if (Array.isArray(responses.Q12) && responses.Q12.includes('Blood thinners')) {
      concerns.push('On blood thinners (potential interaction)');
      action = action || 'FLAG';
    }

    // FLAG: Depression with SSRIs
    if (
      Array.isArray(responses.Q10) &&
      responses.Q10.includes('Depression or anxiety') &&
      Array.isArray(responses.Q12) &&
      responses.Q12.includes('Antidepressants')
    ) {
      concerns.push('Depression with SSRIs (mood risk)');
      action = action || 'FLAG';
    }

    // FLAG: Daily alcohol
    if (responses.Q22 === 'Daily') {
      concerns.push('Daily alcohol consumption (liver concern)');
      action = action || 'FLAG';
    }

    if (concerns.length === 0) {
      return { safe: true, concerns: [] };
    }

    return {
      safe: false,
      action,
      concerns,
      ...(suggestedAlternative && { suggestedAlternative }),
    };
  }

  /**
   * Calculate doctor attention level
   * Spec: hair-loss spec Section 5 — Classification → Attention mapping
   */
  calculateAttentionLevel(assessment: AIAssessment): 'low' | 'medium' | 'high' {
    // Any red flags = HIGH
    if (assessment.red_flags && assessment.red_flags.length > 0) {
      return 'high';
    }

    // High attention classifications
    if (
      HIGH_ATTENTION_CLASSIFICATIONS.includes(
        assessment.classification.likely_condition as ClassificationCategory
      )
    ) {
      return 'high';
    }

    // Medium attention classifications
    if (
      MEDIUM_ATTENTION_CLASSIFICATIONS.includes(
        assessment.classification.likely_condition as ClassificationCategory
      )
    ) {
      return 'medium';
    }

    // Flagged contraindications = MEDIUM
    const hasContraindicationConcerns = Object.values(assessment.contraindications).some(
      (c) => c.concerns && c.concerns.length > 0
    );
    if (hasContraindicationConcerns) {
      return 'medium';
    }

    // Default for androgenetic_alopecia with no flags = LOW
    return 'low';
  }

  /**
   * Build AI prompt for hair loss assessment
   * Spec: hair-loss spec Section 5 — AI Prompt Template
   */
  buildHairLossPrompt(
    responses: Record<string, any>,
    photoDescriptions: string[]
  ): string {
    const classifications = HAIR_LOSS_CLASSIFICATIONS.join(', ');

    const prompt = `You are a clinical pre-screening AI for a hair loss telehealth platform in India.
You are NOT a doctor. You screen, classify, and flag. The doctor makes all decisions.

Given the patient's questionnaire and photo descriptions:
1. Classify hair loss type (${classifications})
2. Detect red flags
3. Check finasteride and minoxidil contraindications
4. Identify risk factors
5. Suggest protocol: conservative / standard / minoxidil_only / combination_plus / custom
6. Rate doctor_attention_level: low/medium/high

Be conservative. When in doubt, flag for doctor.
Never classify as androgenetic_alopecia with high confidence if onset is sudden (<6 months), pattern is patchy, or patient has recent major health events.

Patient data:
${JSON.stringify(responses, null, 2)}

Photo analysis:
${photoDescriptions.length > 0 ? photoDescriptions.join('\n') : 'No photos provided'}

Respond ONLY with valid JSON matching this schema:
{
  "classification": {
    "likely_condition": string,
    "confidence": "high" | "medium" | "low",
    "alternative_considerations": string[]
  },
  "red_flags": string[],
  "contraindications": { [medication: string]: { "safe": boolean, "concerns": string[] } },
  "risk_factors": string[],
  "recommended_protocol": {
    "primary": string,
    "medications": [{ "name": string, "dose": string, "frequency": string }],
    "additional": string[]
  },
  "doctor_attention_level": "low" | "medium" | "high",
  "summary": string
}`;

    return prompt;
  }

  /**
   * Parse and validate AI response
   */
  parseAIResponse(rawResponse: string): AIAssessment {
    let parsed: any;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      throw new BadRequestException('Invalid JSON response from AI');
    }

    // Validate required fields
    if (
      !parsed.classification ||
      !parsed.classification.likely_condition ||
      !parsed.classification.confidence
    ) {
      throw new BadRequestException('Missing required classification fields');
    }

    if (!parsed.red_flags || !Array.isArray(parsed.red_flags)) {
      throw new BadRequestException('Missing or invalid red_flags array');
    }

    if (!parsed.contraindications || typeof parsed.contraindications !== 'object') {
      throw new BadRequestException('Missing or invalid contraindications object');
    }

    if (!parsed.recommended_protocol) {
      throw new BadRequestException('Missing recommended_protocol');
    }

    if (!parsed.doctor_attention_level) {
      throw new BadRequestException('Missing doctor_attention_level');
    }

    if (!parsed.summary) {
      throw new BadRequestException('Missing summary');
    }

    // Validate classification is one of allowed categories
    if (!HAIR_LOSS_CLASSIFICATIONS.includes(parsed.classification.likely_condition)) {
      throw new BadRequestException('Invalid classification category');
    }

    return parsed as AIAssessment;
  }
}
