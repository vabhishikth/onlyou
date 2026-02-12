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

// Classification categories for ED (10 total)
// Spec: ED spec Section 5 — Classification Categories
export type EDClassificationCategory =
  | 'vascular_ed'
  | 'psychological_ed'
  | 'mixed_ed'
  | 'medication_induced_ed'
  | 'hormonal_ed_suspected'
  | 'neurological_ed_suspected'
  | 'peyronie_related'
  | 'cardiovascular_risk'
  | 'nitrate_contraindication'
  | 'premature_ejaculation_primary';

export const ED_CLASSIFICATIONS: EDClassificationCategory[] = [
  'vascular_ed',
  'psychological_ed',
  'mixed_ed',
  'medication_induced_ed',
  'hormonal_ed_suspected',
  'neurological_ed_suspected',
  'peyronie_related',
  'cardiovascular_risk',
  'nitrate_contraindication',
  'premature_ejaculation_primary',
];

// Classification categories for Weight Management (10 total)
// Spec: Weight Management spec Section 5 — Classification Categories
export type WeightClassificationCategory =
  | 'lifestyle_obesity'
  | 'insulin_resistant'
  | 'thyroid_suspected'
  | 'pcos_related'
  | 'medication_induced'
  | 'eating_disorder_flag'
  | 'binge_eating'
  | 'bariatric_candidate'
  | 'glp1_candidate'
  | 'underweight_concern';

export const WEIGHT_CLASSIFICATIONS: WeightClassificationCategory[] = [
  'lifestyle_obesity',
  'insulin_resistant',
  'thyroid_suspected',
  'pcos_related',
  'medication_induced',
  'eating_disorder_flag',
  'binge_eating',
  'bariatric_candidate',
  'glp1_candidate',
  'underweight_concern',
];

// Classification categories for PCOS (8 total)
// Spec: PCOS spec Section 5 — Classification Categories
export type PCOSClassificationCategory =
  | 'pcos_classic'
  | 'pcos_lean'
  | 'pcos_metabolic'
  | 'pcos_fertility_focused'
  | 'thyroid_suspected'
  | 'not_pcos_suspected'
  | 'endometriosis_possible'
  | 'needs_blood_work';

export const PCOS_CLASSIFICATIONS: PCOSClassificationCategory[] = [
  'pcos_classic',
  'pcos_lean',
  'pcos_metabolic',
  'pcos_fertility_focused',
  'thyroid_suspected',
  'not_pcos_suspected',
  'endometriosis_possible',
  'needs_blood_work',
];

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
  // Note: These will be used when Claude API integration is implemented
  // For now, this is a pre-screening rules engine without actual API calls
  constructor(
    // @ts-expect-error ConfigService reserved for future Claude API integration
    private readonly config: ConfigService,
  ) {}

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

  // ============================================
  // ED-SPECIFIC METHODS
  // Spec: ED spec Section 5 (AI Pre-Assessment)
  // ============================================

  /**
   * Get ED classification categories
   * Spec: ED spec Section 5 — 10 classification categories
   */
  getEDClassificationCategories(): EDClassificationCategory[] {
    return ED_CLASSIFICATIONS;
  }

  /**
   * Detect ED-specific red flags
   * Spec: ED spec Section 5 — Red Flags (any = HIGH or CRITICAL)
   */
  detectEDRedFlags(responses: Record<string, any>): string[] {
    const flags: string[] = [];

    // CRITICAL: Nitrates
    if (Array.isArray(responses.Q14) && responses.Q14.includes('nitrates')) {
      flags.push('Currently taking nitrates (CRITICAL — fatal interaction)');
    }

    // Recent cardiac event <6 months
    if (responses.Q16 === 'yes') {
      flags.push('Recent heart attack or stroke (<6 months)');
    }

    // Chest pain during activity
    if (responses.Q17 === 'yes') {
      flags.push('Chest pain during sexual activity');
    }

    // Heart not strong enough
    if (responses.Q18 === 'yes') {
      flags.push('Told heart not strong enough for sex');
    }

    // Severe hypotension (BP <90/50)
    if (responses.Q15) {
      const bp = this.parseBP(responses.Q15);
      if (bp && bp.systolic < 90) {
        flags.push('BP <90/50 (severe hypotension)');
      }
    }

    // Priapism history
    if (Array.isArray(responses.Q27) && responses.Q27.includes('priapism')) {
      flags.push('Priapism history');
    }

    // Sudden onset without psychological triggers
    if (
      responses.Q9 === '<3_months' &&
      responses.Q10 === 'sudden' &&
      Array.isArray(responses.Q20) &&
      responses.Q20.includes('none')
    ) {
      flags.push('Sudden onset + no psychological triggers (possible vascular event)');
    }

    // Young age <25 with severe ED and no psych factors
    const iief5Score = this.calculateIIEF5FromResponses(responses);
    if (
      responses.Q1 < 25 &&
      iief5Score !== null &&
      iief5Score <= 7 &&
      Array.isArray(responses.Q20) &&
      responses.Q20.includes('none')
    ) {
      flags.push('Age <25 with severe ED + no psychological factors');
    }

    // Vision or hearing changes from prior PDE5 use
    if (
      Array.isArray(responses.Q27) &&
      (responses.Q27.includes('vision_changes') || responses.Q27.includes('hearing_changes'))
    ) {
      flags.push('Vision or hearing changes from prior PDE5 use');
    }

    // Peyronie's disease
    if (Array.isArray(responses.Q13) && responses.Q13.includes('peyronies')) {
      flags.push("Peyronie's disease");
    }

    // Unknown BP with multiple cardiac meds
    if (
      responses.Q15 &&
      (responses.Q15.toLowerCase().includes("don't know") ||
        responses.Q15.toLowerCase().includes('unknown'))
    ) {
      const conditions = responses.Q13 || [];
      const medications = responses.Q14 || [];
      const hasCardiacConditions =
        Array.isArray(conditions) &&
        conditions.some((c: string) => ['heart_disease', 'hypertension'].includes(c));
      const hasMultipleMeds =
        Array.isArray(medications) &&
        medications.filter((m: string) => ['bp_medications', 'alpha_blockers'].includes(m))
          .length >= 2;
      if (hasCardiacConditions && hasMultipleMeds) {
        flags.push('Blood pressure unknown + on multiple cardiac meds');
      }
    }

    return flags;
  }

  /**
   * Check nitrate contraindication
   * Spec: NITRATES = ABSOLUTE CONTRAINDICATION (fatal hypotension)
   */
  checkNitrateContraindication(
    responses: Record<string, any>
  ): { safe: boolean; status?: string; action?: string; message?: string } {
    const medications = responses.Q14 || [];

    if (Array.isArray(medications) && medications.includes('nitrates')) {
      return {
        safe: false,
        status: 'BLOCKED',
        action: 'ABSOLUTE_BLOCK',
        message: 'CANNOT prescribe ANY PDE5 inhibitor. Fatal hypotension risk with nitrates.',
      };
    }

    return { safe: true, status: 'clear' };
  }

  /**
   * Assess cardiovascular risk
   * Spec: ED spec Section 5 — CV risk: low/moderate/high/contraindicated
   */
  assessCardiovascularRisk(
    responses: Record<string, any>
  ): { level: 'low' | 'moderate' | 'high' | 'contraindicated'; reasons: string[] } {
    const reasons: string[] = [];

    // Contraindicated conditions (ABSOLUTE BLOCK)
    if (Array.isArray(responses.Q14) && responses.Q14.includes('nitrates')) {
      return { level: 'contraindicated', reasons: ['On nitrates'] };
    }

    if (responses.Q16 === 'yes') {
      return { level: 'contraindicated', reasons: ['Recent cardiac hospitalization (<6 months)'] };
    }

    if (responses.Q17 === 'yes') {
      return { level: 'contraindicated', reasons: ['Chest pain during activity'] };
    }

    if (responses.Q18 === 'yes') {
      return { level: 'contraindicated', reasons: ['Heart not strong enough for sex'] };
    }

    const conditions = responses.Q13 || [];
    const medications = responses.Q14 || [];

    // High risk conditions
    const hasHeartDisease =
      Array.isArray(conditions) &&
      (conditions.includes('heart_disease') || conditions.includes('heart_failure'));
    const hasDiabetes = Array.isArray(conditions) && conditions.includes('diabetes');
    const hasHypotension = Array.isArray(conditions) && conditions.includes('hypotension');

    // Check BP for severe hypotension
    if (responses.Q15) {
      const bp = this.parseBP(responses.Q15);
      if (bp && bp.systolic < 90) {
        return { level: 'high', reasons: ['Severe hypotension (BP <90/50)'] };
      }
    }

    if (hasHeartDisease && hasDiabetes) {
      return { level: 'high', reasons: ['Heart disease with diabetes'] };
    }

    if (hasHypotension) {
      reasons.push('Hypotension');
    }

    // Moderate risk
    const hasHypertension = Array.isArray(conditions) && conditions.includes('hypertension');
    const onBPMeds = Array.isArray(medications) && medications.includes('bp_medications');

    if (hasHypertension && onBPMeds) {
      return { level: 'moderate', reasons: ['Controlled hypertension on medication'] };
    }

    if (hasHeartDisease) {
      return { level: 'moderate', reasons: ['Heart disease present'] };
    }

    // Check for no conditions
    const hasNoConditions = Array.isArray(conditions) && conditions.includes('none');
    const hasNoMeds = Array.isArray(medications) && medications.includes('none');

    if (hasNoConditions && hasNoMeds) {
      return { level: 'low', reasons: [] };
    }

    // Default to low if no concerning factors
    return { level: 'low', reasons };
  }

  /**
   * Check PDE5 inhibitor contraindications
   * Spec: ED spec Section 5 — Contraindication Matrix
   */
  checkPDE5Contraindications(
    responses: Record<string, any>
  ): ContraindicationResult {
    const concerns: string[] = [];
    let action: ContraindicationResult['action'] | undefined;

    // ABSOLUTE BLOCK: Nitrates
    if (Array.isArray(responses.Q14) && responses.Q14.includes('nitrates')) {
      return {
        safe: false,
        action: 'ABSOLUTE_BLOCK',
        concerns: ['Nitrates: ABSOLUTE CONTRAINDICATION'],
      };
    }

    // BLOCK: Recent cardiac event
    if (responses.Q16 === 'yes') {
      return {
        safe: false,
        action: 'BLOCK',
        concerns: ['Cardiology clearance required'],
      };
    }

    // BLOCK: Chest pain during activity
    if (responses.Q17 === 'yes') {
      return {
        safe: false,
        action: 'BLOCK',
        concerns: ['Chest pain during activity: cardiac evaluation needed'],
      };
    }

    // BLOCK: Heart not strong enough
    if (responses.Q18 === 'yes') {
      return {
        safe: false,
        action: 'BLOCK',
        concerns: ['Cardiology clearance required'],
      };
    }

    // BLOCK: Severe hypotension
    if (responses.Q15) {
      const bp = this.parseBP(responses.Q15);
      if (bp && bp.systolic < 90) {
        return {
          safe: false,
          action: 'BLOCK',
          concerns: ['Severe hypotension: PDE5 inhibitors too risky'],
        };
      }
    }

    // FLAG: Alpha-blockers (4hr separation)
    if (Array.isArray(responses.Q14) && responses.Q14.includes('alpha_blockers')) {
      concerns.push('Alpha-blockers: 4-hour separation, start lowest dose');
      action = 'FLAG';
    }

    // FLAG: HIV protease inhibitors
    if (Array.isArray(responses.Q14) && responses.Q14.includes('hiv_protease')) {
      concerns.push('HIV protease inhibitors: reduce PDE5 dose');
      action = action || 'FLAG';
    }

    // FLAG: Severe liver disease
    if (Array.isArray(responses.Q13) && responses.Q13.includes('liver_disease')) {
      concerns.push('Liver disease: lower dose, monitor');
      action = action || 'FLAG';
    }

    // FLAG: Severe kidney disease
    if (Array.isArray(responses.Q13) && responses.Q13.includes('kidney_disease')) {
      concerns.push('Kidney disease: lower dose');
      action = action || 'FLAG';
    }

    // FLAG: Sickle cell (priapism risk)
    if (Array.isArray(responses.Q13) && responses.Q13.includes('sickle_cell')) {
      concerns.push('Sickle cell: priapism risk');
      action = action || 'FLAG';
    }

    // FLAG: Priapism history
    if (Array.isArray(responses.Q27) && responses.Q27.includes('priapism')) {
      concerns.push('Priapism history: start lowest dose, warn patient');
      action = action || 'FLAG';
    }

    // FLAG: Heavy alcohol
    if (responses.Q22 === 'heavy') {
      concerns.push('Heavy alcohol: increased hypotension risk');
      action = action || 'FLAG';
    }

    if (concerns.length === 0) {
      return { safe: true, concerns: [] };
    }

    return { safe: false, action, concerns };
  }

  /**
   * Analyze etiology indicators (morning erections, situational patterns)
   * Spec: ED spec Section 5 — Morning erections = likely psychological
   */
  analyzeEtiologyIndicators(
    responses: Record<string, any>
  ): { morningErections: boolean; likelyEtiology: string } {
    const erectionPatterns = responses.Q11 || [];
    const consistencyPattern = responses.Q12;

    const hasMorningErections =
      Array.isArray(erectionPatterns) && erectionPatterns.includes('morning_erections');
    const hasMasturbationOnly =
      Array.isArray(erectionPatterns) && erectionPatterns.includes('masturbation_only');
    const hasRarelyNever =
      Array.isArray(erectionPatterns) && erectionPatterns.includes('rarely_never');
    const isSituational = consistencyPattern === 'situational';

    if (hasRarelyNever) {
      return { morningErections: false, likelyEtiology: 'organic' };
    }

    if (hasMasturbationOnly) {
      return { morningErections: hasMorningErections, likelyEtiology: 'performance_anxiety' };
    }

    if (hasMorningErections && isSituational) {
      return { morningErections: true, likelyEtiology: 'mixed' };
    }

    if (hasMorningErections) {
      return { morningErections: true, likelyEtiology: 'psychological' };
    }

    return { morningErections: false, likelyEtiology: 'vascular' };
  }

  /**
   * Build ED AI prompt
   * Spec: ED spec Section 5 — NO PHOTOS for ED
   */
  buildEDPrompt(responses: Record<string, any>, iief5Score: number | null): string {
    const classifications = ED_CLASSIFICATIONS.join(', ');
    const severityText = iief5Score !== null ? this.getIIEF5SeverityText(iief5Score) : 'Not calculated';

    const prompt = `You are a clinical pre-screening AI for an erectile dysfunction telehealth platform in India.
You are NOT a doctor. You screen, classify, and flag. The doctor makes all decisions.

IMPORTANT: NO PHOTOS are collected for ED consultations (privacy feature).

Given the patient's questionnaire:
1. Classify ED type (${classifications})
2. Detect red flags
3. Check nitrate_check (CRITICAL: clear or BLOCKED)
4. Assess cardiovascular_risk (low/moderate/high/contraindicated)
5. Note morning_erections indicator (psychological vs organic)
6. Suggest protocol: on_demand_sildenafil / sildenafil_high / on_demand_tadalafil / tadalafil_high / daily_tadalafil / conservative / custom
7. Rate doctor_attention_level: low/medium/high/critical

Be conservative. NITRATES = ABSOLUTE BLOCK. Cannot prescribe ANY PDE5 inhibitor if patient is on nitrates.

IIEF-5 Score: ${iief5Score !== null ? iief5Score : 'Not available'}
IIEF-5 Severity: ${severityText}

Patient data:
${JSON.stringify(responses, null, 2)}

Photo analysis: NO PHOTOS — ED consultations are questionnaire-only for privacy.

Respond ONLY with valid JSON matching this schema:
{
  "classification": {
    "likely_condition": string,
    "confidence": "high" | "medium" | "low",
    "alternative_considerations": string[]
  },
  "iief5_score": number | null,
  "iief5_severity": string,
  "likely_etiology": string,
  "cardiovascular_risk": "low" | "moderate" | "high" | "contraindicated",
  "nitrate_check": "clear" | "BLOCKED",
  "morning_erections": boolean,
  "psychological_component": "none" | "mild" | "significant" | "primary",
  "red_flags": string[],
  "contraindications": { [medication: string]: { "safe": boolean, "concerns": string[] } },
  "risk_factors": string[],
  "recommended_protocol": {
    "primary": string,
    "medications": [{ "name": string, "dose": string, "frequency": string }],
    "additional": string[]
  },
  "doctor_attention_level": "low" | "medium" | "high" | "critical",
  "summary": string
}`;

    return prompt;
  }

  /**
   * Calculate ED attention level
   * Spec: ED spec Section 5 — CRITICAL for nitrates, HIGH for CV risk
   */
  calculateEDAttentionLevel(
    assessment: Record<string, any>
  ): 'low' | 'medium' | 'high' | 'critical' {
    // CRITICAL: Nitrate contraindication
    if (
      assessment.classification?.likely_condition === 'nitrate_contraindication' ||
      assessment.nitrate_check === 'BLOCKED'
    ) {
      return 'critical';
    }

    // HIGH: Cardiovascular risk or Peyronie's
    if (
      assessment.classification?.likely_condition === 'cardiovascular_risk' ||
      assessment.classification?.likely_condition === 'peyronie_related' ||
      assessment.classification?.likely_condition === 'hormonal_ed_suspected' ||
      assessment.classification?.likely_condition === 'neurological_ed_suspected' ||
      assessment.cardiovascular_risk === 'high' ||
      assessment.cardiovascular_risk === 'contraindicated'
    ) {
      return 'high';
    }

    // HIGH: Any red flags
    if (assessment.red_flags && assessment.red_flags.length > 0) {
      return 'high';
    }

    // MEDIUM: Psychological or medication-induced
    if (
      assessment.classification?.likely_condition === 'psychological_ed' ||
      assessment.classification?.likely_condition === 'medication_induced_ed' ||
      assessment.cardiovascular_risk === 'moderate'
    ) {
      return 'medium';
    }

    // LOW: Standard vascular ED with low CV risk
    return 'low';
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Parse blood pressure string to systolic/diastolic
   */
  private parseBP(bpString: string): { systolic: number; diastolic: number } | null {
    if (!bpString || typeof bpString !== 'string') return null;

    const match = bpString.match(/(\d+)\s*[\/]\s*(\d+)/);
    if (!match) return null;

    return {
      systolic: parseInt(match[1], 10),
      diastolic: parseInt(match[2], 10),
    };
  }

  /**
   * Calculate IIEF-5 score from responses
   */
  private calculateIIEF5FromResponses(responses: Record<string, any>): number | null {
    const iief5Questions = ['Q4', 'Q5', 'Q6', 'Q7', 'Q8'];
    let total = 0;

    for (const qId of iief5Questions) {
      const value = responses[qId];
      if (value === undefined || value === null) return null;
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) return null;
      total += numValue;
    }

    return total;
  }

  /**
   * Get IIEF-5 severity text from score
   */
  private getIIEF5SeverityText(score: number): string {
    if (score >= 22) return 'none';
    if (score >= 17) return 'mild';
    if (score >= 12) return 'mild_moderate';
    if (score >= 8) return 'moderate';
    if (score >= 5) return 'severe';
    return 'invalid';
  }

  // ============================================
  // WEIGHT MANAGEMENT-SPECIFIC METHODS
  // Spec: Weight Management spec Section 5 (AI Pre-Assessment)
  // ============================================

  /**
   * Get Weight classification categories
   * Spec: Weight Management spec Section 5 — 10 classification categories
   */
  getWeightClassificationCategories(): WeightClassificationCategory[] {
    return WEIGHT_CLASSIFICATIONS;
  }

  /**
   * Detect Weight-specific red flags
   * Spec: Weight Management spec Section 5 — Red Flags
   */
  detectWeightRedFlags(responses: Record<string, any>): string[] {
    const flags: string[] = [];

    // Calculate BMI
    const height = responses.Q5;
    const weight = responses.Q6;
    let bmi: number | null = null;
    if (height && weight && height > 0) {
      const heightM = height / 100;
      bmi = weight / (heightM * heightM);
    }

    // CRITICAL: BMI <18.5 requesting weight loss
    if (bmi !== null && bmi < 18.5) {
      flags.push('BMI <18.5 requesting weight loss (eating disorder concern)');
    }

    // CRITICAL: Active or recent eating disorder
    const conditions = responses.Q13 || [];
    if (Array.isArray(conditions)) {
      const hasEatingDisorder = conditions.some(
        (c: string) =>
          c.toLowerCase().includes('eating disorder') ||
          c.toLowerCase().includes('anorexia') ||
          c.toLowerCase().includes('bulimia'),
      );
      if (hasEatingDisorder) {
        flags.push('Active or recent eating disorder');
      }
    }

    // History of pancreatitis (GLP-1 contraindicated)
    if (responses.Q16 === 'Yes') {
      flags.push('History of pancreatitis (GLP-1 contraindicated)');
    }

    // Family history of MTC/MEN2 (GLP-1 contraindicated)
    if (responses.Q17 === 'Yes') {
      flags.push('Family history of medullary thyroid carcinoma/MEN2 (GLP-1 contraindicated)');
    }

    // Pregnant or breastfeeding
    if (responses.Q2 === 'Female' && responses.Q15 === 'Yes') {
      flags.push('Pregnant or breastfeeding (weight loss meds contraindicated)');
    }

    // Very rapid weight gain
    if (
      responses.Q9 === 'Went up sharply in the last 6-12 months' &&
      responses.Q10 &&
      (responses.Q10.includes('month') || responses.Q10.includes('weeks'))
    ) {
      flags.push('Very rapid weight gain (>5kg in 1 month without explanation)');
    }

    // Gallstones + requesting medication
    if (
      Array.isArray(conditions) &&
      conditions.some(
        (c: string) => c.toLowerCase().includes('gallbladder') || c.toLowerCase().includes('gallstone'),
      )
    ) {
      flags.push('Gallstones present (Orlistat caution)');
    }

    return flags;
  }

  /**
   * Check GLP-1 eligibility
   * Spec: Weight Management spec Section 5 — GLP-1 eligibility: BMI ≥30 or ≥27 with comorbidities
   */
  checkGLP1Eligibility(responses: Record<string, any>): {
    eligible: boolean;
    reason: string;
  } {
    // Calculate BMI
    const height = responses.Q5;
    const weight = responses.Q6;
    if (!height || !weight || height <= 0) {
      return { eligible: false, reason: 'Unable to calculate BMI' };
    }
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);

    // Check contraindications first
    if (responses.Q16 === 'Yes') {
      return { eligible: false, reason: 'History of pancreatitis — GLP-1 contraindicated' };
    }

    if (responses.Q17 === 'Yes') {
      return { eligible: false, reason: 'History of thyroid cancer/MEN2 — GLP-1 contraindicated' };
    }

    if (responses.Q2 === 'Female' && responses.Q15 === 'Yes') {
      return { eligible: false, reason: 'Pregnant or breastfeeding — GLP-1 contraindicated during pregnancy' };
    }

    const conditions = responses.Q13 || [];
    if (Array.isArray(conditions)) {
      const hasEatingDisorder = conditions.some(
        (c: string) =>
          c.toLowerCase().includes('eating disorder') ||
          c.toLowerCase().includes('anorexia') ||
          c.toLowerCase().includes('bulimia'),
      );
      if (hasEatingDisorder) {
        return { eligible: false, reason: 'History of eating disorder — GLP-1 not appropriate' };
      }
    }

    // BMI ≥30 = eligible
    if (bmi >= 30) {
      return { eligible: true, reason: 'BMI ≥30 — meets GLP-1 criteria' };
    }

    // BMI ≥27 with comorbidities = eligible
    if (bmi >= 27) {
      const comorbidities = [
        'type 2 diabetes',
        'pre-diabetes',
        'insulin resistance',
        'high blood pressure',
        'high cholesterol',
        'sleep apnea',
      ];
      const hasComorbidity =
        Array.isArray(conditions) &&
        conditions.some((c: string) =>
          comorbidities.some((cm) => c.toLowerCase().includes(cm)),
        );

      if (hasComorbidity) {
        return { eligible: true, reason: 'BMI ≥27 with comorbidity — meets GLP-1 criteria' };
      }
    }

    return { eligible: false, reason: 'BMI below threshold for GLP-1 eligibility' };
  }

  /**
   * Check GLP-1 contraindications
   * Spec: Weight Management spec Section 5 — Contraindication Matrix for GLP-1
   */
  checkGLP1Contraindications(responses: Record<string, any>): ContraindicationResult {
    const concerns: string[] = [];

    // ABSOLUTE BLOCK: Pancreatitis history
    if (responses.Q16 === 'Yes') {
      concerns.push('History of pancreatitis');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // ABSOLUTE BLOCK: MTC/MEN2 history
    if (responses.Q17 === 'Yes') {
      concerns.push('History of medullary thyroid carcinoma or MEN2');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // BLOCK: Pregnancy/breastfeeding
    if (responses.Q2 === 'Female' && responses.Q15 === 'Yes') {
      concerns.push('Pregnant or breastfeeding');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Active eating disorder
    const conditions = responses.Q13 || [];
    if (Array.isArray(conditions)) {
      const hasEatingDisorder = conditions.some(
        (c: string) =>
          c.toLowerCase().includes('eating disorder') ||
          c.toLowerCase().includes('anorexia') ||
          c.toLowerCase().includes('bulimia'),
      );
      if (hasEatingDisorder) {
        concerns.push('Eating disorder history');
        return { safe: false, action: 'BLOCK', concerns };
      }
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check Orlistat contraindications
   * Spec: Weight Management spec Section 5 — Orlistat contraindications
   */
  checkOrlistatContraindications(responses: Record<string, any>): ContraindicationResult {
    const concerns: string[] = [];
    let action: ContraindicationResult['action'] | undefined;

    const conditions = responses.Q13 || [];

    // BLOCK: Chronic malabsorption syndrome
    if (
      Array.isArray(conditions) &&
      conditions.some((c: string) => c.toLowerCase().includes('malabsorption'))
    ) {
      concerns.push('Chronic malabsorption syndrome');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Cholestasis
    if (
      Array.isArray(conditions) &&
      conditions.some((c: string) => c.toLowerCase().includes('cholestasis'))
    ) {
      concerns.push('Cholestasis');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Pregnancy
    if (responses.Q2 === 'Female' && responses.Q15 === 'Yes') {
      concerns.push('Pregnant or breastfeeding');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // FLAG: Gallstones
    if (
      Array.isArray(conditions) &&
      conditions.some(
        (c: string) =>
          c.toLowerCase().includes('gallbladder') || c.toLowerCase().includes('gallstone'),
      )
    ) {
      concerns.push('Gallstones present');
      action = 'FLAG';
    }

    // FLAG: Kidney disease (oxalate stones)
    if (
      Array.isArray(conditions) &&
      conditions.some((c: string) => c.toLowerCase().includes('kidney'))
    ) {
      concerns.push('Kidney disease — oxalate stones risk');
      action = 'FLAG';
    }

    if (concerns.length > 0) {
      return { safe: false, action: action || 'FLAG', concerns };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check Metformin contraindications
   * Spec: Weight Management spec Section 5 — Metformin contraindications
   */
  checkMetforminContraindications(responses: Record<string, any>): ContraindicationResult {
    const concerns: string[] = [];

    const conditions = responses.Q13 || [];

    // BLOCK: Severe kidney disease
    if (
      Array.isArray(conditions) &&
      conditions.some((c: string) => c.toLowerCase().includes('kidney'))
    ) {
      concerns.push('Kidney disease');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Pregnancy
    if (responses.Q2 === 'Female' && responses.Q15 === 'Yes') {
      concerns.push('Pregnant or breastfeeding');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // FLAG: Liver disease
    if (
      Array.isArray(conditions) &&
      conditions.some(
        (c: string) =>
          c.toLowerCase().includes('liver') || c.toLowerCase().includes('fatty liver'),
      )
    ) {
      concerns.push('Liver disease');
      return { safe: false, action: 'FLAG', concerns };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Calculate Weight metrics from responses
   * Spec: Weight Management spec Section 5 — BMI, metabolic risk, etc.
   */
  calculateWeightMetrics(responses: Record<string, any>): {
    bmi: number | null;
    bmi_category: string;
    bmi_category_asian: string;
    waist_circumference_risk: string | null;
    insulin_resistance_likely: boolean;
    thyroid_check_recommended: boolean;
    pcos_screening_recommended: boolean;
    bariatric_discussion_warranted: boolean;
  } {
    // Calculate BMI
    const height = responses.Q5;
    const weight = responses.Q6;
    let bmi: number | null = null;
    let bmiCategory = 'unknown';
    let bmiCategoryAsian = 'unknown';

    if (height && weight && height > 0) {
      const heightM = height / 100;
      bmi = weight / (heightM * heightM);

      // Standard WHO
      if (bmi < 18.5) bmiCategory = 'underweight';
      else if (bmi < 25) bmiCategory = 'normal';
      else if (bmi < 30) bmiCategory = 'overweight';
      else if (bmi < 35) bmiCategory = 'obese_class_i';
      else if (bmi < 40) bmiCategory = 'obese_class_ii';
      else bmiCategory = 'obese_class_iii';

      // WHO Asian criteria
      if (bmi < 18.5) bmiCategoryAsian = 'underweight';
      else if (bmi < 23) bmiCategoryAsian = 'normal';
      else if (bmi < 25) bmiCategoryAsian = 'overweight';
      else if (bmi < 30) bmiCategoryAsian = 'obese_class_i';
      else if (bmi < 35) bmiCategoryAsian = 'obese_class_ii';
      else bmiCategoryAsian = 'obese_class_iii';
    }

    // Waist circumference risk
    let waistRisk: string | null = null;
    const waist = responses.Q7;
    const sex = responses.Q2;
    if (waist) {
      if (sex === 'Male') {
        if (waist > 102) waistRisk = 'high';
        else if (waist >= 94) waistRisk = 'elevated';
        else waistRisk = 'normal';
      } else if (sex === 'Female') {
        if (waist > 88) waistRisk = 'high';
        else if (waist >= 80) waistRisk = 'elevated';
        else waistRisk = 'normal';
      }
    }

    // Insulin resistance indicators
    const conditions = responses.Q13 || [];
    const insulinResistanceLikely =
      Array.isArray(conditions) &&
      conditions.some(
        (c: string) =>
          c.toLowerCase().includes('pre-diabetes') ||
          c.toLowerCase().includes('insulin resistance') ||
          c.toLowerCase().includes('type 2 diabetes'),
      );

    // Thyroid check recommended
    const thyroidCheckRecommended =
      (responses.Q9 === 'Went up sharply in the last 6-12 months' ||
        responses.Q3 === 'I have difficulty losing weight and suspect a medical reason') &&
      !(
        Array.isArray(conditions) &&
        conditions.some((c: string) => c.toLowerCase().includes('thyroid'))
      );

    // PCOS screening recommended (women with irregular periods + weight gain + hirsutism)
    const pcosScreeningRecommended =
      sex === 'Female' &&
      (responses.Q8 === 'Irregular (vary a lot)' ||
        responses.Q8 === 'Very infrequent (every few months)') &&
      responses.Q8b === 'Yes';

    // Bariatric discussion warranted
    let bariatricDiscussion = false;
    if (bmi !== null) {
      if (bmi >= 40) {
        bariatricDiscussion = true;
      } else if (bmi >= 35) {
        // BMI ≥35 with comorbidities
        const comorbidities = ['diabetes', 'blood pressure', 'sleep apnea'];
        const hasComorbidity =
          Array.isArray(conditions) &&
          conditions.some((c: string) =>
            comorbidities.some((cm) => c.toLowerCase().includes(cm)),
          );
        if (hasComorbidity) {
          bariatricDiscussion = true;
        }
      }
    }

    return {
      bmi,
      bmi_category: bmiCategory,
      bmi_category_asian: bmiCategoryAsian,
      waist_circumference_risk: waistRisk,
      insulin_resistance_likely: insulinResistanceLikely,
      thyroid_check_recommended: thyroidCheckRecommended,
      pcos_screening_recommended: pcosScreeningRecommended,
      bariatric_discussion_warranted: bariatricDiscussion,
    };
  }

  /**
   * Build Weight AI prompt
   * Spec: Weight Management spec Section 5
   */
  buildWeightPrompt(responses: Record<string, any>): string {
    const classifications = WEIGHT_CLASSIFICATIONS.join(', ');
    const metrics = this.calculateWeightMetrics(responses);
    const glp1Eligibility = this.checkGLP1Eligibility(responses);

    const prompt = `You are a clinical pre-screening AI for a weight management telehealth platform in India.
You are NOT a doctor. You screen, classify, and flag. The doctor makes all decisions.

Given the patient's questionnaire:
1. Classify weight condition type (${classifications})
2. Detect red flags
3. Check metabolic_risk_level (low/moderate/high)
4. Assess insulin_resistance_likely (true/false)
5. Note thyroid_check_recommended (true/false)
6. Note bariatric_discussion_warranted (true/false)
7. List recommended_blood_panels
8. Rate doctor_attention_level: low/medium/high/critical

Be conservative. Eating disorders = CRITICAL attention. Underweight requesting weight loss = DO NOT PRESCRIBE.

Current metrics:
BMI: ${metrics.bmi?.toFixed(1) || 'Not calculated'}
BMI Category (Asian criteria): ${metrics.bmi_category_asian}
Waist Risk: ${metrics.waist_circumference_risk || 'Not provided'}
Insulin Resistance Likely: ${metrics.insulin_resistance_likely}
GLP-1 Eligible: ${glp1Eligibility.eligible} (${glp1Eligibility.reason})

Patient data:
${JSON.stringify(responses, null, 2)}

Respond ONLY with valid JSON matching this schema:
{
  "classification": {
    "likely_condition": string,
    "confidence": "high" | "medium" | "low",
    "alternative_considerations": string[]
  },
  "bmi": number,
  "bmi_category": string,
  "waist_circumference_risk": string,
  "metabolic_risk_level": "low" | "moderate" | "high",
  "insulin_resistance_likely": boolean,
  "thyroid_check_recommended": boolean,
  "pcos_screening_recommended": boolean,
  "eating_disorder_flag": boolean,
  "glp1_eligible": boolean,
  "bariatric_discussion_warranted": boolean,
  "recommended_blood_panels": string[],
  "red_flags": string[],
  "contraindications": {
    "orlistat": { "safe": boolean, "concerns": string[] },
    "metformin": { "safe": boolean, "concerns": string[] },
    "glp1": { "safe": boolean, "concerns": string[] }
  },
  "risk_factors": string[],
  "recommended_protocol": {
    "primary": string,
    "medications": [{ "name": string, "dose": string, "frequency": string }],
    "additional": string[]
  },
  "doctor_attention_level": "low" | "medium" | "high" | "critical",
  "summary": string
}`;

    return prompt;
  }

  /**
   * Calculate Weight attention level
   * Spec: Weight Management spec Section 5
   */
  calculateWeightAttentionLevel(
    assessment: Record<string, any>
  ): 'low' | 'medium' | 'high' | 'critical' {
    const condition = assessment.classification?.likely_condition;

    // CRITICAL: Eating disorder or underweight concern
    if (condition === 'eating_disorder_flag' || condition === 'underweight_concern') {
      return 'critical';
    }

    // HIGH: Thyroid, PCOS, bariatric, medication-induced
    if (
      condition === 'thyroid_suspected' ||
      condition === 'pcos_related' ||
      condition === 'bariatric_candidate' ||
      condition === 'medication_induced' ||
      assessment.metabolic_risk_level === 'high'
    ) {
      return 'high';
    }

    // MEDIUM: Insulin resistant, binge eating, GLP-1 candidate
    if (
      condition === 'insulin_resistant' ||
      condition === 'binge_eating' ||
      condition === 'glp1_candidate'
    ) {
      return 'medium';
    }

    // LOW: Lifestyle obesity with low metabolic risk
    return 'low';
  }

  // ============================================
  // PCOS-SPECIFIC METHODS
  // Spec: PCOS spec Section 5 (AI Pre-Assessment)
  // ============================================

  /**
   * Get PCOS classification categories
   * Spec: PCOS spec Section 5 — 8 classification categories
   */
  getPCOSClassificationCategories(): PCOSClassificationCategory[] {
    return PCOS_CLASSIFICATIONS;
  }

  /**
   * Detect PCOS-specific red flags
   * Spec: PCOS spec Section 5 — Red Flags
   */
  detectPCOSRedFlags(responses: Record<string, any>): string[] {
    const flags: string[] = [];

    // Pregnant — most PCOS medications contraindicated
    if (responses.Q21 === 'Yes, pregnant') {
      flags.push('Pregnant — most PCOS medications contraindicated');
    }

    // Blood clot history + BC request
    const contraindications = responses.Q22 || [];
    if (
      Array.isArray(contraindications) &&
      contraindications.includes('Blood clot history (DVT/PE)')
    ) {
      flags.push('Blood clot history — combined BC contraindicated');
    }

    // Migraine with aura + BC request
    if (Array.isArray(contraindications) && contraindications.includes('Migraine with aura')) {
      flags.push('Migraine with aura — combined BC contraindicated');
    }

    // Trying to conceive — different treatment pathway
    if (responses.Q19 === 'Yes') {
      flags.push('Trying to conceive — different treatment pathway required');
    }

    // Rapid virilization (URGENT — rule out androgen-secreting tumor)
    const concerns = responses.Q3 || [];
    if (
      Array.isArray(concerns) &&
      (concerns.includes('Deep voice changes') || concerns.includes('Significant muscle mass'))
    ) {
      flags.push('Rapid virilization (URGENT — rule out androgen-secreting tumor)');
    }

    // Amenorrhea >6 months
    if (
      responses.Q5 === 'Absent (3+ months, not pregnant)' &&
      responses.Q4 === '3+ months ago'
    ) {
      flags.push('Amenorrhea >6 months — endometrial protection needed');
    }

    // Eating disorder
    if (Array.isArray(contraindications) && contraindications.includes('Eating disorder')) {
      flags.push('Eating disorder — careful approach needed');
    }

    return flags;
  }

  /**
   * Assess Rotterdam criteria from questionnaire responses
   * Spec: PCOS spec Section 5 — Rotterdam criteria (2 of 3)
   */
  assessRotterdamCriteria(responses: Record<string, any>): {
    oligoAnovulation: boolean;
    hyperandrogenismClinical: boolean;
    polycysticOvaries: 'unknown' | 'confirmed' | 'absent';
    criteriaMet: number;
  } {
    // Oligo/anovulation: irregular or absent periods
    const irregularPeriods = [
      'Very irregular (sometimes skip months)',
      'Absent (3+ months, not pregnant)',
      'Irregular (vary a lot)',
    ];
    const oligoAnovulation =
      responses.Q5 && irregularPeriods.some((p) => responses.Q5.includes(p.split(' ')[0]));

    // Hyperandrogenism clinical: hirsutism (Q10 + Q11 moderate+) or severe acne (Q12)
    const hirsutismAreas = responses.Q10 || [];
    const hirsutismSeverity = responses.Q11;
    const acneSeverity = responses.Q12;

    const hasHirsutism =
      Array.isArray(hirsutismAreas) &&
      hirsutismAreas.length > 0 &&
      ['Moderate', 'Severe'].includes(hirsutismSeverity);

    const hasSevereAcne = acneSeverity === 'Severe (deep/cystic)';

    const hyperandrogenismClinical = hasHirsutism || hasSevereAcne;

    // Polycystic ovaries: requires ultrasound, unknown from questionnaire
    const polycysticOvaries: 'unknown' | 'confirmed' | 'absent' = 'unknown';

    // Count criteria met
    let criteriaMet = 0;
    if (oligoAnovulation) criteriaMet++;
    if (hyperandrogenismClinical) criteriaMet++;
    // polycysticOvaries would add to count if confirmed by ultrasound

    return {
      oligoAnovulation,
      hyperandrogenismClinical,
      polycysticOvaries,
      criteriaMet,
    };
  }

  /**
   * Check combined OCP contraindications for PCOS
   * Spec: PCOS spec Section 5 — OCP contraindication matrix
   */
  checkPCOSOCPContraindications(responses: Record<string, any>): ContraindicationResult {
    const concerns: string[] = [];
    const contraindications = responses.Q22 || [];

    // ABSOLUTE BLOCK: Pregnancy
    if (responses.Q21 === 'Yes, pregnant') {
      concerns.push('Pregnancy');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // ABSOLUTE BLOCK: Blood clot history
    if (
      Array.isArray(contraindications) &&
      contraindications.includes('Blood clot history (DVT/PE)')
    ) {
      concerns.push('Blood clot history');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // ABSOLUTE BLOCK: Migraine with aura
    if (Array.isArray(contraindications) && contraindications.includes('Migraine with aura')) {
      concerns.push('Migraine with aura');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // BLOCK: Liver disease
    if (Array.isArray(contraindications) && contraindications.includes('Liver disease')) {
      concerns.push('Liver disease');
      return { safe: false, action: 'BLOCK', concerns };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check spironolactone contraindications for PCOS
   * Spec: PCOS spec Section 5 — Spironolactone is TERATOGENIC
   */
  checkPCOSSpironolactoneContraindications(
    responses: Record<string, any>
  ): ContraindicationResult {
    const concerns: string[] = [];

    // ABSOLUTE BLOCK: Pregnancy (teratogenic)
    if (responses.Q21 === 'Yes, pregnant') {
      concerns.push('Pregnancy — teratogenic');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // ABSOLUTE BLOCK: Trying to conceive
    if (responses.Q19 === 'Yes') {
      concerns.push('Trying to conceive — teratogenic, requires reliable contraception');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Determine PCOS phenotype
   * Spec: PCOS spec Section 5 — 4 phenotypes based on presentation
   */
  determinePCOSPhenotype(params: {
    oligoAnovulation: boolean;
    hyperandrogenism: boolean;
    bmi: number;
    insulinResistance: boolean;
    tryingToConceive: boolean;
  }): 'classic' | 'lean' | 'metabolic' | 'fertility_focused' {
    // Fertility focused takes priority
    if (params.tryingToConceive) {
      return 'fertility_focused';
    }

    // Metabolic: overweight/obese with insulin resistance
    if (params.bmi >= 25 && params.insulinResistance) {
      return 'metabolic';
    }

    // Lean: normal BMI
    if (params.bmi < 25) {
      return 'lean';
    }

    // Classic: standard PCOS presentation
    return 'classic';
  }

  /**
   * Build PCOS AI prompt
   * Spec: PCOS spec Section 5 — Fertility intent is CRITICAL
   */
  buildPCOSPrompt(responses: Record<string, any>): string {
    const classifications = PCOS_CLASSIFICATIONS.join(', ');
    const rotterdamResult = this.assessRotterdamCriteria(responses);

    // Determine fertility intent
    let fertilityIntent = 'not_planning';
    if (responses.Q19 === 'Yes') fertilityIntent = 'trying';
    else if (responses.Q19 === 'Planning in next 12 months') fertilityIntent = 'planning_soon';

    const prompt = `You are a clinical pre-screening AI for a PCOS telehealth platform in India.
You are NOT a doctor. You screen, classify, and flag. The doctor makes all decisions.

CRITICAL: PCOS treatment depends heavily on fertility intent. Assess this FIRST.

Given the patient's questionnaire:
1. Classify PCOS type (${classifications})
2. Assess Rotterdam criteria (need 2 of 3: oligo/anovulation, hyperandrogenism, polycystic ovaries)
3. Determine fertility_intent (trying/planning_soon/not_planning/unsure)
4. Determine pcos_phenotype (classic/lean/metabolic/fertility_focused)
5. Detect red flags
6. Check OCP and spironolactone contraindications
7. Identify insulin_resistance_likely (true/false)
8. Rate doctor_attention_level: low/medium/high/critical

Rotterdam assessment from questionnaire:
- Oligo/anovulation: ${rotterdamResult.oligoAnovulation}
- Hyperandrogenism (clinical): ${rotterdamResult.hyperandrogenismClinical}
- Polycystic ovaries: ${rotterdamResult.polycysticOvaries} (requires ultrasound)
- Criteria currently met: ${rotterdamResult.criteriaMet}/3

Fertility intent from questionnaire: ${fertilityIntent}

Patient data:
${JSON.stringify(responses, null, 2)}

Respond ONLY with valid JSON matching this schema:
{
  "classification": {
    "likely_condition": string,
    "confidence": "high" | "medium" | "low",
    "alternative_considerations": string[]
  },
  "rotterdam_criteria_met": number,
  "fertility_intent": "trying" | "planning_soon" | "not_planning" | "unsure",
  "pcos_phenotype": "classic" | "lean" | "metabolic" | "fertility_focused",
  "oligo_anovulation": boolean,
  "hyperandrogenism_clinical": boolean,
  "insulin_resistance_likely": boolean,
  "thyroid_check_recommended": boolean,
  "red_flags": string[],
  "contraindications": {
    "combined_ocp": { "safe": boolean, "concerns": string[] },
    "spironolactone": { "safe": boolean, "concerns": string[] },
    "metformin": { "safe": boolean, "concerns": string[] }
  },
  "risk_factors": string[],
  "recommended_protocol": {
    "primary": string,
    "medications": [{ "name": string, "dose": string, "frequency": string }],
    "additional": string[]
  },
  "doctor_attention_level": "low" | "medium" | "high" | "critical",
  "summary": string
}`;

    return prompt;
  }

  /**
   * Calculate PCOS attention level
   * Spec: PCOS spec Section 5 — Fertility intent affects attention
   */
  calculatePCOSAttentionLevel(
    assessment: Record<string, any>
  ): 'low' | 'medium' | 'high' | 'critical' {
    const condition = assessment.classification?.likely_condition;

    // CRITICAL: Pregnant
    if (assessment.pregnant === true) {
      return 'critical';
    }

    // HIGH: Fertility focused, thyroid suspected, endometriosis possible
    if (
      condition === 'pcos_fertility_focused' ||
      condition === 'thyroid_suspected' ||
      condition === 'endometriosis_possible' ||
      assessment.fertility_intent === 'trying'
    ) {
      return 'high';
    }

    // MEDIUM: Metabolic, needs blood work
    if (condition === 'pcos_metabolic' || condition === 'needs_blood_work') {
      return 'medium';
    }

    // LOW: Classic or lean PCOS with no red flags
    return 'low';
  }
}
