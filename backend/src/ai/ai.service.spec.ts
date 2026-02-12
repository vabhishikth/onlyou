import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AIService,
  AIAssessment,
  ClassificationCategory,
  HAIR_LOSS_RED_FLAGS,
  FINASTERIDE_CONTRAINDICATION_CHECKS,
} from './ai.service';
import { HealthVertical } from '@prisma/client';

// Spec: hair-loss spec Section 5 (AI Pre-Assessment), master spec Section 6

describe('AIService', () => {
  let service: AIService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ANTHROPIC_API_KEY') return 'test-api-key';
              if (key === 'ANTHROPIC_MODEL') return 'claude-3-sonnet-20240229';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    configService = module.get(ConfigService);
  });

  describe('Classification Categories', () => {
    // Spec: hair-loss spec Section 5 — 9 classification categories
    const expectedCategories: ClassificationCategory[] = [
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

    it('should have exactly 9 classification categories for hair loss', () => {
      const categories = service.getClassificationCategories(HealthVertical.HAIR_LOSS);
      expect(categories.length).toBe(9);
    });

    it.each(expectedCategories)('should include %s classification', (category) => {
      const categories = service.getClassificationCategories(HealthVertical.HAIR_LOSS);
      expect(categories).toContain(category);
    });
  });

  describe('Red Flags Detection', () => {
    // Spec: hair-loss spec Section 5 — 12 red flags
    it('should have exactly 12 red flags defined', () => {
      expect(HAIR_LOSS_RED_FLAGS.length).toBe(12);
    });

    it('should detect "Age <20 with rapid loss" as red flag', () => {
      const responses = {
        Q1: 19, // Age under 20
        Q5: 'rapid', // Rapid progression
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Young age (<20) with rapid hair loss');
    });

    it('should detect "Onset <6 months AND sudden/rapid" as red flag', () => {
      const responses = {
        Q4: '<3_months', // Onset less than 3 months
        Q5: 'rapid', // Rapid progression
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Recent sudden onset with rapid progression');
    });

    it('should detect patchy pattern as red flag', () => {
      const responses = {
        Q6: ['patches'], // Patchy loss
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Patchy hair loss pattern (possible alopecia areata)');
    });

    it('should detect loss on sides/back as red flag', () => {
      const responses = {
        Q6: ['sides', 'back'], // Loss on sides/back
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Unusual hair loss pattern (sides/back)');
    });

    it('should detect isotretinoin use as red flag', () => {
      const responses = {
        Q12: ['Isotretinoin'],
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('On isotretinoin (treatment should wait)');
    });

    it('should detect existing sexual dysfunction as red flag', () => {
      const responses = {
        Q14: ['Decreased sex drive', 'Erectile difficulty'],
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Existing sexual dysfunction (finasteride risk)');
    });

    it('should detect planning children as red flag', () => {
      const responses = {
        Q15: 'Yes',
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Planning children in next 12 months');
    });

    it('should detect depression with finasteride consideration as red flag', () => {
      const responses = {
        Q10: ['Depression or anxiety'],
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Depression/anxiety history (finasteride mood risk)');
    });

    it('should detect weight loss >10kg as red flag', () => {
      const responses = {
        Q11: ['Weight loss >10kg'],
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Significant recent weight loss (>10kg)');
    });

    it('should detect recent surgery/illness as red flag', () => {
      const responses = {
        Q11: ['Major surgery', 'Severe illness or high fever'],
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Recent major surgery or illness');
    });

    it('should detect scalp symptoms as red flag', () => {
      const responses = {
        Q3: 'scalp_issues', // Scalp itching/flaking
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Scalp symptoms (pain/itching/burning)');
    });

    it('should detect female of childbearing age as red flag', () => {
      const responses = {
        Q2: 'Female',
        Q1: 28, // Childbearing age
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags).toContain('Female of childbearing age');
    });

    it('should return empty array when no red flags present', () => {
      const responses = {
        Q1: 30,
        Q2: 'Male',
        Q4: '1-3_years',
        Q5: 'slow_gradual',
        Q6: ['crown_top'],
        Q10: ['None'],
        Q11: ['None'],
        Q12: ['None'],
        Q14: ['None'],
        Q15: 'No',
      };
      const flags = service.detectRedFlags(responses, HealthVertical.HAIR_LOSS);
      expect(flags.length).toBe(0);
    });
  });

  describe('Finasteride Contraindication Matrix', () => {
    // Spec: hair-loss spec Section 5 — 11 contraindication checks
    it('should have exactly 11 contraindication checks', () => {
      expect(FINASTERIDE_CONTRAINDICATION_CHECKS.length).toBe(11);
    });

    it('should BLOCK finasteride for female of childbearing age', () => {
      const responses = {
        Q2: 'Female',
        Q2b: 'No', // Not pregnant but childbearing age
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
      expect(result.concerns).toContain('Female of childbearing age');
    });

    it('should ABSOLUTE BLOCK finasteride for pregnant/breastfeeding', () => {
      const responses = {
        Q2: 'Female',
        Q2b: 'Yes', // Pregnant or breastfeeding
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
      expect(result.concerns).toContain('Pregnant, breastfeeding, or planning pregnancy');
    });

    it('should BLOCK finasteride for age under 18', () => {
      const responses = {
        Q1: 17,
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
      expect(result.concerns).toContain('Under 18 years old');
    });

    it('should FLAG liver disease for finasteride', () => {
      const responses = {
        Q2: 'Male',
        Q10: ['Liver disease'],
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Liver disease present');
    });

    it('should FLAG already on 5-ARI medication', () => {
      const responses = {
        Q2: 'Male',
        Q12: ['Finasteride'], // Already on finasteride
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Already on 5-alpha reductase inhibitor');
    });

    it('should SUGGEST minoxidil-only for previous finasteride side effects', () => {
      const responses = {
        Q2: 'Male',
        Q17: ['Finasteride'],
        Q19: ['Sexual side effects'],
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.action).toBe('SUGGEST_ALTERNATIVE');
      expect(result.suggestedAlternative).toBe('minoxidil_only');
      expect(result.concerns).toContain('Previous finasteride side effects');
    });

    it('should FLAG planning children <12 months', () => {
      const responses = {
        Q2: 'Male',
        Q15: 'Yes',
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Planning children within 12 months');
    });

    it('should FLAG current sexual dysfunction', () => {
      const responses = {
        Q2: 'Male',
        Q14: ['Erectile difficulty'],
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Existing sexual dysfunction');
    });

    it('should FLAG blood thinners interaction', () => {
      const responses = {
        Q2: 'Male',
        Q12: ['Blood thinners'],
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('On blood thinners (potential interaction)');
    });

    it('should FLAG depression with SSRIs', () => {
      const responses = {
        Q2: 'Male',
        Q10: ['Depression or anxiety'],
        Q12: ['Antidepressants'],
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Depression with SSRIs (mood risk)');
    });

    it('should FLAG daily alcohol use', () => {
      const responses = {
        Q2: 'Male',
        Q22: 'Daily',
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Daily alcohol consumption (liver concern)');
    });

    it('should return safe for male with no contraindications', () => {
      const responses = {
        Q1: 30,
        Q2: 'Male',
        Q10: ['None'],
        Q12: ['None'],
        Q14: ['None'],
        Q15: 'No',
        Q17: ['None'],
        Q22: 'Occasionally',
      };
      const result = service.checkFinasterideContraindications(responses);
      expect(result.safe).toBe(true);
      expect(result.concerns.length).toBe(0);
    });
  });

  describe('Attention Level Calculation', () => {
    // Spec: hair-loss spec Section 5 — LOW, MEDIUM, HIGH
    it('should return LOW attention for typical AGA with no flags', () => {
      const assessment: Partial<AIAssessment> = {
        classification: {
          likely_condition: 'androgenetic_alopecia',
          confidence: 'high',
          alternative_considerations: [],
        },
        red_flags: [],
        contraindications: { finasteride: { safe: true, concerns: [] } },
      };
      const level = service.calculateAttentionLevel(assessment as AIAssessment);
      expect(level).toBe('low');
    });

    it('should return MEDIUM for AGA with flagged contraindications', () => {
      const assessment: Partial<AIAssessment> = {
        classification: {
          likely_condition: 'androgenetic_alopecia',
          confidence: 'high',
          alternative_considerations: [],
        },
        red_flags: [],
        contraindications: {
          finasteride: { safe: false, concerns: ['Daily alcohol consumption'] },
        },
      };
      const level = service.calculateAttentionLevel(assessment as AIAssessment);
      expect(level).toBe('medium');
    });

    it('should return HIGH for any red flags present', () => {
      const assessment: Partial<AIAssessment> = {
        classification: {
          likely_condition: 'androgenetic_alopecia',
          confidence: 'medium',
          alternative_considerations: [],
        },
        red_flags: ['Young age (<20) with rapid hair loss'],
        contraindications: { finasteride: { safe: true, concerns: [] } },
      };
      const level = service.calculateAttentionLevel(assessment as AIAssessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for telogen_effluvium_suspected', () => {
      const assessment: Partial<AIAssessment> = {
        classification: {
          likely_condition: 'telogen_effluvium_suspected',
          confidence: 'medium',
          alternative_considerations: [],
        },
        red_flags: [],
        contraindications: { finasteride: { safe: true, concerns: [] } },
      };
      const level = service.calculateAttentionLevel(assessment as AIAssessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for alopecia_areata_suspected', () => {
      const assessment: Partial<AIAssessment> = {
        classification: {
          likely_condition: 'alopecia_areata_suspected',
          confidence: 'medium',
          alternative_considerations: [],
        },
        red_flags: [],
        contraindications: { finasteride: { safe: true, concerns: [] } },
      };
      const level = service.calculateAttentionLevel(assessment as AIAssessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for unclear_needs_examination', () => {
      const assessment: Partial<AIAssessment> = {
        classification: {
          likely_condition: 'unclear_needs_examination',
          confidence: 'low',
          alternative_considerations: ['androgenetic_alopecia', 'telogen_effluvium_suspected'],
        },
        red_flags: [],
        contraindications: { finasteride: { safe: true, concerns: [] } },
      };
      const level = service.calculateAttentionLevel(assessment as AIAssessment);
      expect(level).toBe('high');
    });

    it('should return MEDIUM for scalp_condition_suspected', () => {
      const assessment: Partial<AIAssessment> = {
        classification: {
          likely_condition: 'scalp_condition_suspected',
          confidence: 'high',
          alternative_considerations: [],
        },
        red_flags: [],
        contraindications: { finasteride: { safe: true, concerns: [] } },
      };
      const level = service.calculateAttentionLevel(assessment as AIAssessment);
      expect(level).toBe('medium');
    });
  });

  describe('buildHairLossPrompt', () => {
    it('should include classification categories in prompt', () => {
      const prompt = service.buildHairLossPrompt({ Q1: 30, Q2: 'Male' }, []);
      expect(prompt).toContain('androgenetic_alopecia');
      expect(prompt).toContain('telogen_effluvium_suspected');
      expect(prompt).toContain('alopecia_areata_suspected');
    });

    it('should include patient questionnaire data', () => {
      const responses = { Q1: 30, Q2: 'Male', Q3: 'thinning_gradually' };
      const prompt = service.buildHairLossPrompt(responses, []);
      expect(prompt).toContain('"Q1": 30');
      expect(prompt).toContain('"Q2": "Male"');
    });

    it('should include photo descriptions when provided', () => {
      const prompt = service.buildHairLossPrompt(
        { Q1: 30 },
        ['Front hairline showing recession', 'Crown with visible thinning']
      );
      expect(prompt).toContain('Front hairline showing recession');
      expect(prompt).toContain('Crown with visible thinning');
    });

    it('should request JSON response format', () => {
      const prompt = service.buildHairLossPrompt({ Q1: 30 }, []);
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('classification');
      expect(prompt).toContain('red_flags');
      expect(prompt).toContain('contraindications');
    });
  });

  describe('parseAIResponse', () => {
    it('should parse valid AI response JSON', () => {
      const rawResponse = JSON.stringify({
        classification: {
          likely_condition: 'androgenetic_alopecia',
          confidence: 'high',
          alternative_considerations: [],
        },
        red_flags: [],
        contraindications: { finasteride: { safe: true, concerns: [] } },
        risk_factors: ['Family history'],
        recommended_protocol: {
          primary: 'standard',
          medications: [{ name: 'Finasteride', dose: '1mg', frequency: 'daily' }],
          additional: [],
        },
        doctor_attention_level: 'low',
        summary: 'Typical male pattern baldness.',
      });

      const assessment = service.parseAIResponse(rawResponse);

      expect(assessment.classification.likely_condition).toBe('androgenetic_alopecia');
      expect(assessment.classification.confidence).toBe('high');
      expect(assessment.doctor_attention_level).toBe('low');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => service.parseAIResponse('not json')).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const invalidResponse = JSON.stringify({
        classification: { likely_condition: 'androgenetic_alopecia' },
        // missing other required fields
      });
      expect(() => service.parseAIResponse(invalidResponse)).toThrow();
    });

    it('should validate classification is one of allowed categories', () => {
      const invalidClassification = JSON.stringify({
        classification: {
          likely_condition: 'invalid_category',
          confidence: 'high',
          alternative_considerations: [],
        },
        red_flags: [],
        contraindications: {},
        risk_factors: [],
        recommended_protocol: { primary: 'standard', medications: [], additional: [] },
        doctor_attention_level: 'low',
        summary: 'Test',
      });
      expect(() => service.parseAIResponse(invalidClassification)).toThrow(
        'Invalid classification category'
      );
    });
  });

  describe('Doctor Routing', () => {
    // Spec: master spec Section 6 — Routing
    it('should route hair loss to dermatology and trichology', () => {
      const specializations = service.getDoctorSpecializations(HealthVertical.HAIR_LOSS);
      expect(specializations).toEqual(['DERMATOLOGY', 'TRICHOLOGY']);
    });

    it('should route ED to urology, andrology, and sexual medicine', () => {
      const specializations = service.getDoctorSpecializations(HealthVertical.SEXUAL_HEALTH);
      expect(specializations).toEqual(['UROLOGY', 'ANDROLOGY', 'SEXUAL_MEDICINE']);
    });
  });

  // ============================================
  // ED-SPECIFIC TESTS
  // Spec: ED spec Section 5 (AI Pre-Assessment)
  // ============================================
  describe('ED Classification Categories', () => {
    // Spec: ED spec Section 5 — 10 classification categories
    const expectedEDCategories = [
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

    it('should have exactly 10 classification categories for ED', () => {
      const categories = service.getEDClassificationCategories();
      expect(categories.length).toBe(10);
    });

    it.each(expectedEDCategories)('should include %s classification', (category) => {
      const categories = service.getEDClassificationCategories();
      expect(categories).toContain(category);
    });
  });

  describe('ED Red Flags Detection', () => {
    // Spec: ED spec Section 5 — Red Flags (any = HIGH or CRITICAL)
    it('should detect nitrates as CRITICAL red flag', () => {
      const responses = {
        Q14: ['nitrates'],
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Currently taking nitrates (CRITICAL — fatal interaction)');
    });

    it('should detect recent cardiac event <6 months as red flag', () => {
      const responses = {
        Q16: 'yes', // hospitalized for heart in last 6 months
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Recent heart attack or stroke (<6 months)');
    });

    it('should detect chest pain during sexual activity as red flag', () => {
      const responses = {
        Q17: 'yes',
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Chest pain during sexual activity');
    });

    it('should detect heart not strong enough for sex as red flag', () => {
      const responses = {
        Q18: 'yes',
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Told heart not strong enough for sex');
    });

    it('should detect severe hypotension as red flag', () => {
      const responses = {
        Q15: '85/50', // BP below 90/50
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('BP <90/50 (severe hypotension)');
    });

    it('should detect priapism history as red flag', () => {
      const responses = {
        Q27: ['priapism'],
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Priapism history');
    });

    it('should detect sudden onset without psychological triggers as red flag', () => {
      const responses = {
        Q9: '<3_months',
        Q10: 'sudden',
        Q20: ['none'], // No psychological factors
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Sudden onset + no psychological triggers (possible vascular event)');
    });

    it('should detect young age with severe ED and no psych factors as red flag', () => {
      const responses = {
        Q1: 22,
        Q4: 1, Q5: 1, Q6: 1, Q7: 1, Q8: 1, // IIEF-5 = 5 (severe)
        Q20: ['none'],
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Age <25 with severe ED + no psychological factors');
    });

    it('should detect vision or hearing changes from prior PDE5 use as red flag', () => {
      const responses = {
        Q27: ['vision_changes'],
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Vision or hearing changes from prior PDE5 use');
    });

    it('should detect Peyronies disease as red flag', () => {
      const responses = {
        Q13: ['peyronies'],
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain("Peyronie's disease");
    });

    it('should detect unknown BP with multiple cardiac meds as red flag', () => {
      const responses = {
        Q13: ['heart_disease', 'hypertension'],
        Q14: ['bp_medications', 'alpha_blockers'],
        Q15: "don't know",
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags).toContain('Blood pressure unknown + on multiple cardiac meds');
    });

    it('should return empty array when no red flags present', () => {
      const responses = {
        Q1: 35,
        Q4: 4, Q5: 4, Q6: 4, Q7: 4, Q8: 4, // IIEF-5 = 20 (mild)
        Q13: ['none'],
        Q14: ['none'],
        Q16: 'no',
        Q17: 'no',
        Q18: 'no',
        Q20: ['work_stress'],
        Q27: ['none'],
      };
      const flags = service.detectEDRedFlags(responses);
      expect(flags.length).toBe(0);
    });
  });

  describe('ED Nitrate Check', () => {
    // Spec: NITRATES = ABSOLUTE CONTRAINDICATION (fatal hypotension risk)
    it('should ABSOLUTE BLOCK for nitrates (nitroglycerin)', () => {
      const responses = {
        Q14: ['nitrates'],
      };
      const result = service.checkNitrateContraindication(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
      expect(result.message).toContain('CANNOT prescribe ANY PDE5 inhibitor');
    });

    it('should return clear when no nitrates', () => {
      const responses = {
        Q14: ['bp_medications', 'alpha_blockers'],
      };
      const result = service.checkNitrateContraindication(responses);
      expect(result.safe).toBe(true);
      expect(result.status).toBe('clear');
    });

    it('should return clear when Q14 is none', () => {
      const responses = {
        Q14: ['none'],
      };
      const result = service.checkNitrateContraindication(responses);
      expect(result.safe).toBe(true);
    });
  });

  describe('ED Cardiovascular Risk Assessment', () => {
    // Spec: ED spec Section 5 — Cardiovascular risk: low/moderate/high/contraindicated
    it('should return "contraindicated" for nitrates', () => {
      const responses = {
        Q14: ['nitrates'],
      };
      const result = service.assessCardiovascularRisk(responses);
      expect(result.level).toBe('contraindicated');
    });

    it('should return "contraindicated" for recent cardiac event', () => {
      const responses = {
        Q14: ['none'],
        Q16: 'yes', // hospitalized last 6 months
      };
      const result = service.assessCardiovascularRisk(responses);
      expect(result.level).toBe('contraindicated');
    });

    it('should return "contraindicated" for chest pain during activity', () => {
      const responses = {
        Q14: ['none'],
        Q16: 'no',
        Q17: 'yes',
      };
      const result = service.assessCardiovascularRisk(responses);
      expect(result.level).toBe('contraindicated');
    });

    it('should return "contraindicated" for heart not strong enough', () => {
      const responses = {
        Q14: ['none'],
        Q16: 'no',
        Q17: 'no',
        Q18: 'yes',
      };
      const result = service.assessCardiovascularRisk(responses);
      expect(result.level).toBe('contraindicated');
    });

    it('should return "high" for heart disease + diabetes', () => {
      const responses = {
        Q13: ['heart_disease', 'diabetes'],
        Q14: ['none'],
        Q16: 'no',
        Q17: 'no',
        Q18: 'no',
      };
      const result = service.assessCardiovascularRisk(responses);
      expect(result.level).toBe('high');
    });

    it('should return "high" for severe hypotension', () => {
      const responses = {
        Q13: ['hypotension'],
        Q14: ['bp_medications'],
        Q15: '85/50',
        Q16: 'no',
        Q17: 'no',
        Q18: 'no',
      };
      const result = service.assessCardiovascularRisk(responses);
      expect(result.level).toBe('high');
    });

    it('should return "moderate" for controlled hypertension', () => {
      const responses = {
        Q13: ['hypertension'],
        Q14: ['bp_medications'],
        Q15: '130/85',
        Q16: 'no',
        Q17: 'no',
        Q18: 'no',
      };
      const result = service.assessCardiovascularRisk(responses);
      expect(result.level).toBe('moderate');
    });

    it('should return "low" for no cardiovascular conditions', () => {
      const responses = {
        Q13: ['none'],
        Q14: ['none'],
        Q16: 'no',
        Q17: 'no',
        Q18: 'no',
      };
      const result = service.assessCardiovascularRisk(responses);
      expect(result.level).toBe('low');
    });
  });

  describe('ED PDE5 Contraindication Matrix', () => {
    // Spec: ED spec Section 5 — Contraindication Matrix
    it('should ABSOLUTE BLOCK for nitrates', () => {
      const responses = { Q14: ['nitrates'] };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
    });

    it('should BLOCK for recent cardiac event', () => {
      const responses = { Q14: ['none'], Q16: 'yes' };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
      expect(result.concerns).toContain('Cardiology clearance required');
    });

    it('should BLOCK for chest pain during activity', () => {
      const responses = { Q14: ['none'], Q16: 'no', Q17: 'yes' };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should BLOCK for severe hypotension', () => {
      const responses = { Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no', Q15: '85/50' };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should FLAG for alpha-blockers (4hr separation required)', () => {
      const responses = { Q14: ['alpha_blockers'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Alpha-blockers: 4-hour separation, start lowest dose');
    });

    it('should FLAG for HIV protease inhibitors (dose reduction)', () => {
      const responses = { Q14: ['hiv_protease'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('HIV protease inhibitors: reduce PDE5 dose');
    });

    it('should FLAG for severe liver disease', () => {
      const responses = { Q13: ['liver_disease'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.action).toBe('FLAG');
    });

    it('should FLAG for sickle cell disease (priapism risk)', () => {
      const responses = { Q13: ['sickle_cell'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Sickle cell: priapism risk');
    });

    it('should FLAG for priapism history', () => {
      const responses = { Q13: ['none'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no', Q27: ['priapism'] };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.action).toBe('FLAG');
    });

    it('should FLAG for heavy alcohol use', () => {
      const responses = { Q13: ['none'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no', Q22: 'heavy' };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Heavy alcohol: increased hypotension risk');
    });

    it('should return safe for no contraindications', () => {
      const responses = {
        Q13: ['none'],
        Q14: ['none'],
        Q16: 'no',
        Q17: 'no',
        Q18: 'no',
        Q22: 'occasionally',
        Q27: ['none'],
      };
      const result = service.checkPDE5Contraindications(responses);
      expect(result.safe).toBe(true);
    });
  });

  describe('ED Morning Erections Indicator', () => {
    // Spec: Morning erections present → likely psychological cause
    it('should indicate psychological cause when morning erections present', () => {
      const responses = {
        Q11: ['morning_erections'],
      };
      const result = service.analyzeEtiologyIndicators(responses);
      expect(result.morningErections).toBe(true);
      expect(result.likelyEtiology).toBe('psychological');
    });

    it('should indicate organic cause when no erections in any situation', () => {
      const responses = {
        Q11: ['rarely_never'],
      };
      const result = service.analyzeEtiologyIndicators(responses);
      expect(result.morningErections).toBe(false);
      expect(result.likelyEtiology).toBe('organic');
    });

    it('should indicate performance anxiety when masturbation works but sex doesnt', () => {
      const responses = {
        Q11: ['masturbation_only'],
      };
      const result = service.analyzeEtiologyIndicators(responses);
      expect(result.likelyEtiology).toBe('performance_anxiety');
    });

    it('should indicate mixed when situational', () => {
      const responses = {
        Q11: ['morning_erections', 'visual_stimulation'],
        Q12: 'situational',
      };
      const result = service.analyzeEtiologyIndicators(responses);
      expect(result.likelyEtiology).toBe('mixed');
    });
  });

  describe('ED AI Prompt Building', () => {
    it('should include ED classification categories in prompt', () => {
      const prompt = service.buildEDPrompt({ Q1: 35 }, null);
      expect(prompt).toContain('vascular_ed');
      expect(prompt).toContain('psychological_ed');
      expect(prompt).toContain('nitrate_contraindication');
    });

    it('should include IIEF-5 score in prompt when available', () => {
      const responses = { Q1: 35, Q4: 3, Q5: 3, Q6: 3, Q7: 3, Q8: 3 };
      const prompt = service.buildEDPrompt(responses, 15);
      expect(prompt).toContain('IIEF-5 Score: 15');
      expect(prompt).toContain('mild_moderate');
    });

    it('should request nitrate check and CV risk in JSON output', () => {
      const prompt = service.buildEDPrompt({ Q1: 35 }, null);
      expect(prompt).toContain('nitrate_check');
      expect(prompt).toContain('cardiovascular_risk');
      expect(prompt).toContain('morning_erections');
    });

    it('should indicate NO PHOTOS for ED', () => {
      const prompt = service.buildEDPrompt({ Q1: 35 }, null);
      expect(prompt).toContain('NO PHOTOS');
    });
  });

  describe('ED Attention Level Calculation', () => {
    it('should return CRITICAL for nitrate contraindication', () => {
      const assessment = {
        classification: { likely_condition: 'nitrate_contraindication' },
        nitrate_check: 'BLOCKED',
      };
      const level = service.calculateEDAttentionLevel(assessment);
      expect(level).toBe('critical');
    });

    it('should return HIGH for cardiovascular_risk', () => {
      const assessment = {
        classification: { likely_condition: 'cardiovascular_risk' },
        cardiovascular_risk: 'high',
      };
      const level = service.calculateEDAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for peyronie_related', () => {
      const assessment = {
        classification: { likely_condition: 'peyronie_related' },
      };
      const level = service.calculateEDAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return MEDIUM for psychological_ed', () => {
      const assessment = {
        classification: { likely_condition: 'psychological_ed' },
        cardiovascular_risk: 'low',
      };
      const level = service.calculateEDAttentionLevel(assessment);
      expect(level).toBe('medium');
    });

    it('should return LOW for vascular_ed with low CV risk', () => {
      const assessment = {
        classification: { likely_condition: 'vascular_ed' },
        cardiovascular_risk: 'low',
        red_flags: [],
      };
      const level = service.calculateEDAttentionLevel(assessment);
      expect(level).toBe('low');
    });
  });

  // ============================================
  // WEIGHT MANAGEMENT-SPECIFIC TESTS
  // Spec: Weight Management spec Section 5 (AI Pre-Assessment)
  // ============================================
  describe('Weight Classification Categories', () => {
    // Spec: Weight Management spec Section 5 — 10 classification categories
    const expectedWeightCategories = [
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

    it('should have exactly 10 classification categories for weight management', () => {
      const categories = service.getWeightClassificationCategories();
      expect(categories.length).toBe(10);
    });

    it.each(expectedWeightCategories)('should include %s classification', (category) => {
      const categories = service.getWeightClassificationCategories();
      expect(categories).toContain(category);
    });
  });

  describe('Weight Red Flags Detection', () => {
    // Spec: Weight Management spec Section 5 — Red Flags
    it('should detect underweight requesting weight loss as CRITICAL', () => {
      const responses = {
        Q5: 170, // height cm
        Q6: 45, // weight kg - BMI ~15.6
      };
      const flags = service.detectWeightRedFlags(responses);
      expect(flags).toContain('BMI <18.5 requesting weight loss (eating disorder concern)');
    });

    it('should detect active or recent eating disorder as CRITICAL', () => {
      const responses = {
        Q5: 170,
        Q6: 70,
        Q13: ['Eating disorder (current or past: anorexia, bulimia, binge eating)'],
      };
      const flags = service.detectWeightRedFlags(responses);
      expect(flags).toContain('Active or recent eating disorder');
    });

    it('should detect history of pancreatitis', () => {
      const responses = {
        Q5: 170,
        Q6: 85,
        Q16: 'Yes',
      };
      const flags = service.detectWeightRedFlags(responses);
      expect(flags).toContain('History of pancreatitis (GLP-1 contraindicated)');
    });

    it('should detect family history of MTC/MEN2', () => {
      const responses = {
        Q5: 170,
        Q6: 85,
        Q17: 'Yes',
      };
      const flags = service.detectWeightRedFlags(responses);
      expect(flags).toContain('Family history of medullary thyroid carcinoma/MEN2 (GLP-1 contraindicated)');
    });

    it('should detect pregnant/breastfeeding', () => {
      const responses = {
        Q2: 'Female',
        Q5: 165,
        Q6: 75,
        Q15: 'Yes',
      };
      const flags = service.detectWeightRedFlags(responses);
      expect(flags).toContain('Pregnant or breastfeeding (weight loss meds contraindicated)');
    });

    it('should detect very rapid weight gain', () => {
      const responses = {
        Q5: 170,
        Q6: 85,
        Q9: 'Went up sharply in the last 6-12 months',
        Q10: '95 kg, 2 months ago',
      };
      const flags = service.detectWeightRedFlags(responses);
      expect(flags.some(f => f.includes('rapid weight gain'))).toBe(true);
    });

    it('should detect gallstones + requesting Orlistat', () => {
      const responses = {
        Q5: 170,
        Q6: 85,
        Q13: ['Gallbladder disease / gallstones'],
        Q29: "Yes — I've struggled with lifestyle changes alone",
      };
      const flags = service.detectWeightRedFlags(responses);
      expect(flags).toContain('Gallstones present (Orlistat caution)');
    });

    it('should return empty array for healthy profile', () => {
      const responses = {
        Q2: 'Male',
        Q5: 175,
        Q6: 85, // BMI ~27.8 - overweight
        Q13: ['None of these'],
        Q16: 'No',
        Q17: 'No',
      };
      const flags = service.detectWeightRedFlags(responses);
      expect(flags.length).toBe(0);
    });
  });

  describe('GLP-1 Eligibility Check', () => {
    // Spec: Weight Management spec Section 5 — GLP-1 eligibility
    it('should be eligible for BMI ≥30', () => {
      const responses = {
        Q2: 'Male',
        Q5: 170,
        Q6: 90, // BMI ~31.1
        Q13: ['None of these'],
        Q16: 'No',
        Q17: 'No',
      };
      const result = service.checkGLP1Eligibility(responses);
      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('BMI ≥30');
    });

    it('should be eligible for BMI ≥27 with comorbidities', () => {
      const responses = {
        Q2: 'Male',
        Q5: 175,
        Q6: 85, // BMI ~27.8
        Q13: ['Type 2 diabetes'],
        Q16: 'No',
        Q17: 'No',
      };
      const result = service.checkGLP1Eligibility(responses);
      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('BMI ≥27 with comorbidity');
    });

    it('should NOT be eligible for BMI <27', () => {
      const responses = {
        Q2: 'Male',
        Q5: 175,
        Q6: 75, // BMI ~24.5
        Q13: ['None of these'],
        Q16: 'No',
        Q17: 'No',
      };
      const result = service.checkGLP1Eligibility(responses);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('BMI below threshold');
    });

    it('should NOT be eligible with pancreatitis history', () => {
      const responses = {
        Q2: 'Male',
        Q5: 170,
        Q6: 95, // BMI ~32.9
        Q13: ['History of pancreatitis'],
        Q16: 'Yes',
        Q17: 'No',
      };
      const result = service.checkGLP1Eligibility(responses);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('pancreatitis');
    });

    it('should NOT be eligible with MTC/MEN2 history', () => {
      const responses = {
        Q2: 'Male',
        Q5: 170,
        Q6: 95,
        Q13: ['None of these'],
        Q16: 'No',
        Q17: 'Yes',
      };
      const result = service.checkGLP1Eligibility(responses);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('thyroid cancer');
    });

    it('should NOT be eligible when pregnant/breastfeeding', () => {
      const responses = {
        Q2: 'Female',
        Q5: 165,
        Q6: 85, // BMI ~31.2
        Q13: ['None of these'],
        Q15: 'Yes',
        Q16: 'No',
        Q17: 'No',
      };
      const result = service.checkGLP1Eligibility(responses);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('pregnancy');
    });

    it('should NOT be eligible with eating disorder', () => {
      const responses = {
        Q2: 'Female',
        Q5: 165,
        Q6: 85,
        Q13: ['Eating disorder (current or past: anorexia, bulimia, binge eating)'],
        Q15: 'No',
        Q16: 'No',
        Q17: 'No',
      };
      const result = service.checkGLP1Eligibility(responses);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('eating disorder');
    });
  });

  describe('GLP-1 Contraindication Matrix', () => {
    // Spec: Weight Management spec Section 5 — Contraindication Matrix for GLP-1
    it('should ABSOLUTE BLOCK for pancreatitis history', () => {
      const responses = { Q16: 'Yes' };
      const result = service.checkGLP1Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
      expect(result.concerns).toContain('History of pancreatitis');
    });

    it('should ABSOLUTE BLOCK for MTC/MEN2 history', () => {
      const responses = { Q16: 'No', Q17: 'Yes' };
      const result = service.checkGLP1Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
      expect(result.concerns).toContain('History of medullary thyroid carcinoma or MEN2');
    });

    it('should BLOCK for pregnancy/breastfeeding', () => {
      const responses = { Q2: 'Female', Q15: 'Yes', Q16: 'No', Q17: 'No' };
      const result = service.checkGLP1Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should BLOCK for active eating disorder', () => {
      const responses = {
        Q13: ['Eating disorder (current or past: anorexia, bulimia, binge eating)'],
        Q16: 'No',
        Q17: 'No',
      };
      const result = service.checkGLP1Contraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should return safe with no contraindications', () => {
      const responses = {
        Q2: 'Male',
        Q13: ['None of these'],
        Q16: 'No',
        Q17: 'No',
      };
      const result = service.checkGLP1Contraindications(responses);
      expect(result.safe).toBe(true);
    });
  });

  describe('Orlistat Contraindication Matrix', () => {
    // Spec: Weight Management spec Section 5 — Orlistat contraindications
    it('should BLOCK for chronic malabsorption syndrome', () => {
      const responses = { Q13: ['Chronic malabsorption syndrome'] };
      const result = service.checkOrlistatContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should BLOCK for cholestasis', () => {
      const responses = { Q13: ['Cholestasis'] };
      const result = service.checkOrlistatContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should BLOCK for pregnancy', () => {
      const responses = { Q2: 'Female', Q15: 'Yes', Q13: ['None of these'] };
      const result = service.checkOrlistatContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should FLAG for gallstones', () => {
      const responses = { Q13: ['Gallbladder disease / gallstones'] };
      const result = service.checkOrlistatContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('FLAG');
      expect(result.concerns).toContain('Gallstones present');
    });

    it('should FLAG for oxalate kidney stones', () => {
      const responses = { Q13: ['Kidney disease'] };
      const result = service.checkOrlistatContraindications(responses);
      expect(result.action).toBe('FLAG');
    });

    it('should return safe with no contraindications', () => {
      const responses = { Q2: 'Male', Q13: ['None of these'] };
      const result = service.checkOrlistatContraindications(responses);
      expect(result.safe).toBe(true);
    });
  });

  describe('Metformin Contraindication Matrix', () => {
    // Spec: Weight Management spec Section 5 — Metformin contraindications
    it('should BLOCK for severe kidney disease', () => {
      const responses = { Q13: ['Kidney disease'] };
      const result = service.checkMetforminContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
      expect(result.concerns).toContain('Kidney disease');
    });

    it('should BLOCK for severe liver disease', () => {
      const responses = { Q13: ['Fatty liver disease'] };
      const result = service.checkMetforminContraindications(responses);
      expect(result.action).toBe('FLAG');
    });

    it('should BLOCK for pregnancy', () => {
      const responses = { Q2: 'Female', Q15: 'Yes', Q13: ['None of these'] };
      const result = service.checkMetforminContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should return safe with no contraindications', () => {
      const responses = { Q2: 'Male', Q13: ['None of these'] };
      const result = service.checkMetforminContraindications(responses);
      expect(result.safe).toBe(true);
    });
  });

  describe('Weight BMI and Metabolic Risk Assessment', () => {
    // Spec: Weight Management spec Section 5 — BMI and metabolic risk
    it('should calculate BMI from responses', () => {
      const responses = {
        Q5: 170, // height cm
        Q6: 70, // weight kg
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.bmi).toBeCloseTo(24.22, 1);
    });

    it('should use WHO Asian criteria for BMI category', () => {
      const responses = {
        Q5: 170,
        Q6: 70, // BMI ~24.22
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.bmi_category_asian).toBe('overweight'); // 23-24.9 is overweight in Asian criteria
    });

    it('should assess waist circumference risk for men', () => {
      const responses = {
        Q2: 'Male',
        Q5: 175,
        Q6: 85,
        Q7: 105, // >102cm = high risk
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.waist_circumference_risk).toBe('high');
    });

    it('should assess waist circumference risk for women', () => {
      const responses = {
        Q2: 'Female',
        Q5: 165,
        Q6: 75,
        Q7: 90, // >88cm = high risk
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.waist_circumference_risk).toBe('high');
    });

    it('should detect insulin resistance indicators', () => {
      const responses = {
        Q2: 'Male',
        Q5: 170,
        Q6: 90,
        Q13: ['Pre-diabetes / insulin resistance'],
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.insulin_resistance_likely).toBe(true);
    });

    it('should recommend thyroid check when suspected', () => {
      const responses = {
        Q2: 'Female',
        Q5: 165,
        Q6: 85,
        Q9: 'Went up sharply in the last 6-12 months',
        Q3: 'I have difficulty losing weight and suspect a medical reason',
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.thyroid_check_recommended).toBe(true);
    });

    it('should recommend PCOS screening for women with irregular periods + weight gain', () => {
      const responses = {
        Q2: 'Female',
        Q5: 165,
        Q6: 85,
        Q8: 'Irregular (vary a lot)',
        Q8b: 'Yes',
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.pcos_screening_recommended).toBe(true);
    });

    it('should flag bariatric discussion for BMI ≥40', () => {
      const responses = {
        Q2: 'Male',
        Q5: 170,
        Q6: 120, // BMI ~41.5
        Q13: ['None of these'],
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.bariatric_discussion_warranted).toBe(true);
    });

    it('should flag bariatric discussion for BMI ≥35 with comorbidities', () => {
      const responses = {
        Q2: 'Male',
        Q5: 175,
        Q6: 110, // BMI ~35.9
        Q13: ['Type 2 diabetes', 'High blood pressure'],
      };
      const result = service.calculateWeightMetrics(responses);
      expect(result.bariatric_discussion_warranted).toBe(true);
    });
  });

  describe('Weight AI Prompt Building', () => {
    it('should include weight classification categories in prompt', () => {
      const responses = { Q1: 35, Q5: 170, Q6: 85 };
      const prompt = service.buildWeightPrompt(responses);
      expect(prompt).toContain('lifestyle_obesity');
      expect(prompt).toContain('insulin_resistant');
      expect(prompt).toContain('glp1_candidate');
    });

    it('should include BMI and metrics in prompt', () => {
      const responses = { Q1: 35, Q5: 170, Q6: 85, Q2: 'Male' };
      const prompt = service.buildWeightPrompt(responses);
      expect(prompt).toContain('BMI');
      expect(prompt).toContain('29.4'); // 85 / (1.7)^2
    });

    it('should include GLP-1 eligibility in prompt', () => {
      const responses = { Q1: 35, Q5: 170, Q6: 95, Q2: 'Male', Q13: ['None of these'], Q16: 'No', Q17: 'No' };
      const prompt = service.buildWeightPrompt(responses);
      expect(prompt).toContain('GLP-1');
    });

    it('should request JSON response format with weight-specific fields', () => {
      const responses = { Q1: 35, Q5: 170, Q6: 85 };
      const prompt = service.buildWeightPrompt(responses);
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('metabolic_risk_level');
      expect(prompt).toContain('insulin_resistance_likely');
      expect(prompt).toContain('recommended_blood_panels');
    });
  });

  describe('Weight Attention Level Calculation', () => {
    it('should return CRITICAL for eating_disorder_flag', () => {
      const assessment = {
        classification: { likely_condition: 'eating_disorder_flag' },
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('critical');
    });

    it('should return CRITICAL for underweight_concern', () => {
      const assessment = {
        classification: { likely_condition: 'underweight_concern' },
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('critical');
    });

    it('should return HIGH for thyroid_suspected', () => {
      const assessment = {
        classification: { likely_condition: 'thyroid_suspected' },
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for bariatric_candidate', () => {
      const assessment = {
        classification: { likely_condition: 'bariatric_candidate' },
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for pcos_related', () => {
      const assessment = {
        classification: { likely_condition: 'pcos_related' },
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for medication_induced', () => {
      const assessment = {
        classification: { likely_condition: 'medication_induced' },
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return MEDIUM for insulin_resistant', () => {
      const assessment = {
        classification: { likely_condition: 'insulin_resistant' },
        metabolic_risk_level: 'moderate',
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('medium');
    });

    it('should return MEDIUM for binge_eating', () => {
      const assessment = {
        classification: { likely_condition: 'binge_eating' },
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('medium');
    });

    it('should return MEDIUM for glp1_candidate', () => {
      const assessment = {
        classification: { likely_condition: 'glp1_candidate' },
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('medium');
    });

    it('should return LOW for lifestyle_obesity', () => {
      const assessment = {
        classification: { likely_condition: 'lifestyle_obesity' },
        metabolic_risk_level: 'low',
        red_flags: [],
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('low');
    });

    it('should upgrade to HIGH if metabolic_risk_level is high', () => {
      const assessment = {
        classification: { likely_condition: 'lifestyle_obesity' },
        metabolic_risk_level: 'high',
        red_flags: [],
      };
      const level = service.calculateWeightAttentionLevel(assessment);
      expect(level).toBe('high');
    });
  });

  // ============================================
  // PCOS-SPECIFIC TESTS
  // Spec: PCOS spec Section 5 (AI Pre-Assessment)
  // ============================================
  describe('PCOS Classification Categories', () => {
    // Spec: PCOS spec Section 5 — 8 classification categories
    const expectedPCOSCategories = [
      'pcos_classic',
      'pcos_lean',
      'pcos_metabolic',
      'pcos_fertility_focused',
      'thyroid_suspected',
      'not_pcos_suspected',
      'endometriosis_possible',
      'needs_blood_work',
    ];

    it('should have exactly 8 classification categories for PCOS', () => {
      const categories = service.getPCOSClassificationCategories();
      expect(categories.length).toBe(8);
    });

    it.each(expectedPCOSCategories)('should include %s classification', (category) => {
      const categories = service.getPCOSClassificationCategories();
      expect(categories).toContain(category);
    });
  });

  describe('PCOS Red Flags Detection', () => {
    // Spec: PCOS spec Section 5 — Red Flags
    it('should detect pregnant requesting PCOS meds as red flag', () => {
      const responses = { Q21: 'Yes, pregnant' };
      const flags = service.detectPCOSRedFlags(responses);
      expect(flags).toContain('Pregnant — most PCOS medications contraindicated');
    });

    it('should detect blood clot history + BC request as red flag', () => {
      const responses = { Q22: ['Blood clot history (DVT/PE)'] };
      const flags = service.detectPCOSRedFlags(responses);
      expect(flags).toContain('Blood clot history — combined BC contraindicated');
    });

    it('should detect migraine with aura + BC request as red flag', () => {
      const responses = { Q22: ['Migraine with aura'] };
      const flags = service.detectPCOSRedFlags(responses);
      expect(flags).toContain('Migraine with aura — combined BC contraindicated');
    });

    it('should detect trying to conceive as high priority flag', () => {
      const responses = { Q19: 'Yes' };
      const flags = service.detectPCOSRedFlags(responses);
      expect(flags).toContain('Trying to conceive — different treatment pathway required');
    });

    it('should detect rapid virilization as URGENT flag', () => {
      const responses = { Q3: ['Deep voice changes', 'Significant muscle mass'] };
      const flags = service.detectPCOSRedFlags(responses);
      expect(flags.some(f => f.includes('URGENT'))).toBe(true);
    });

    it('should detect amenorrhea >6 months as flag', () => {
      const responses = { Q5: 'Absent (3+ months, not pregnant)', Q4: '3+ months ago' };
      const flags = service.detectPCOSRedFlags(responses);
      expect(flags).toContain('Amenorrhea >6 months — endometrial protection needed');
    });

    it('should detect eating disorder as flag', () => {
      const responses = { Q22: ['Eating disorder'] };
      const flags = service.detectPCOSRedFlags(responses);
      expect(flags).toContain('Eating disorder — careful approach needed');
    });

    it('should return empty array for healthy profile', () => {
      const responses = {
        Q19: 'No',
        Q21: 'No',
        Q22: ['None'],
        Q5: 'Somewhat irregular (varies by a week+)',
      };
      const flags = service.detectPCOSRedFlags(responses);
      expect(flags.length).toBe(0);
    });
  });

  describe('PCOS Rotterdam Criteria Assessment', () => {
    it('should detect oligo/anovulation from irregular periods', () => {
      const responses = { Q5: 'Very irregular (sometimes skip months)' };
      const result = service.assessRotterdamCriteria(responses);
      expect(result.oligoAnovulation).toBe(true);
    });

    it('should detect hyperandrogenism from hirsutism', () => {
      const responses = { Q10: ['Upper lip/chin', 'Chest'], Q11: 'Moderate' };
      const result = service.assessRotterdamCriteria(responses);
      expect(result.hyperandrogenismClinical).toBe(true);
    });

    it('should detect hyperandrogenism from cystic acne', () => {
      const responses = { Q12: 'Severe (deep/cystic)' };
      const result = service.assessRotterdamCriteria(responses);
      expect(result.hyperandrogenismClinical).toBe(true);
    });

    it('should return 2 criteria met for classic PCOS', () => {
      const responses = {
        Q5: 'Very irregular (sometimes skip months)',
        Q10: ['Upper lip/chin'],
        Q11: 'Moderate',
      };
      const result = service.assessRotterdamCriteria(responses);
      expect(result.criteriaMet).toBe(2);
    });

    it('should indicate polycystic ovaries as unknown', () => {
      const responses = {};
      const result = service.assessRotterdamCriteria(responses);
      expect(result.polycysticOvaries).toBe('unknown');
    });
  });

  describe('PCOS Contraindication Matrix', () => {
    it('should BLOCK combined OCP for blood clot history', () => {
      const responses = { Q22: ['Blood clot history (DVT/PE)'] };
      const result = service.checkPCOSOCPContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
    });

    it('should BLOCK combined OCP for migraine with aura', () => {
      const responses = { Q22: ['Migraine with aura'] };
      const result = service.checkPCOSOCPContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
    });

    it('should BLOCK combined OCP for liver disease', () => {
      const responses = { Q22: ['Liver disease'] };
      const result = service.checkPCOSOCPContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('BLOCK');
    });

    it('should BLOCK combined OCP for pregnancy', () => {
      const responses = { Q21: 'Yes, pregnant' };
      const result = service.checkPCOSOCPContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
    });

    it('should return safe for combined OCP with no contraindications', () => {
      const responses = { Q21: 'No', Q22: ['None'] };
      const result = service.checkPCOSOCPContraindications(responses);
      expect(result.safe).toBe(true);
    });

    it('should ABSOLUTE BLOCK spironolactone for pregnancy', () => {
      const responses = { Q21: 'Yes, pregnant' };
      const result = service.checkPCOSSpironolactoneContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
      expect(result.concerns).toContain('Pregnancy — teratogenic');
    });

    it('should ABSOLUTE BLOCK spironolactone for trying to conceive', () => {
      const responses = { Q19: 'Yes', Q21: 'No' };
      const result = service.checkPCOSSpironolactoneContraindications(responses);
      expect(result.safe).toBe(false);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
    });

    it('should return safe for spironolactone with reliable contraception', () => {
      const responses = { Q19: 'No', Q21: 'No', Q23: ['Birth control'] };
      const result = service.checkPCOSSpironolactoneContraindications(responses);
      expect(result.safe).toBe(true);
    });
  });

  describe('PCOS Phenotype Determination', () => {
    it('should determine classic phenotype', () => {
      const params = {
        oligoAnovulation: true,
        hyperandrogenism: true,
        bmi: 28,
        insulinResistance: false,
        tryingToConceive: false,
      };
      const phenotype = service.determinePCOSPhenotype(params);
      expect(phenotype).toBe('classic');
    });

    it('should determine lean phenotype for normal BMI', () => {
      const params = {
        oligoAnovulation: true,
        hyperandrogenism: true,
        bmi: 22,
        insulinResistance: false,
        tryingToConceive: false,
      };
      const phenotype = service.determinePCOSPhenotype(params);
      expect(phenotype).toBe('lean');
    });

    it('should determine metabolic phenotype for overweight with IR', () => {
      const params = {
        oligoAnovulation: true,
        hyperandrogenism: true,
        bmi: 32,
        insulinResistance: true,
        tryingToConceive: false,
      };
      const phenotype = service.determinePCOSPhenotype(params);
      expect(phenotype).toBe('metabolic');
    });

    it('should prioritize fertility_focused when trying to conceive', () => {
      const params = {
        oligoAnovulation: true,
        hyperandrogenism: true,
        bmi: 28,
        insulinResistance: false,
        tryingToConceive: true,
      };
      const phenotype = service.determinePCOSPhenotype(params);
      expect(phenotype).toBe('fertility_focused');
    });
  });

  describe('PCOS AI Prompt Building', () => {
    it('should include PCOS classification categories in prompt', () => {
      const responses = { Q2: 28, Q5: 'Very irregular' };
      const prompt = service.buildPCOSPrompt(responses);
      expect(prompt).toContain('pcos_classic');
      expect(prompt).toContain('pcos_lean');
      expect(prompt).toContain('pcos_fertility_focused');
    });

    it('should include Rotterdam criteria in prompt', () => {
      const responses = { Q2: 28, Q5: 'Very irregular', Q10: ['Upper lip/chin'], Q11: 'Moderate' };
      const prompt = service.buildPCOSPrompt(responses);
      expect(prompt).toContain('Rotterdam');
      expect(prompt).toContain('oligo');
      expect(prompt).toContain('hyperandrogenism');
    });

    it('should include fertility intent prominently', () => {
      const responses = { Q2: 28, Q19: 'Yes' };
      const prompt = service.buildPCOSPrompt(responses);
      expect(prompt).toContain('fertility');
      expect(prompt).toContain('trying');
    });

    it('should request JSON response format with PCOS-specific fields', () => {
      const responses = { Q2: 28 };
      const prompt = service.buildPCOSPrompt(responses);
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('rotterdam_criteria_met');
      expect(prompt).toContain('fertility_intent');
      expect(prompt).toContain('pcos_phenotype');
    });
  });

  describe('PCOS Attention Level Calculation', () => {
    it('should return CRITICAL for pregnant', () => {
      const assessment = {
        classification: { likely_condition: 'pcos_classic' },
        pregnant: true,
      };
      const level = service.calculatePCOSAttentionLevel(assessment);
      expect(level).toBe('critical');
    });

    it('should return HIGH for fertility_focused', () => {
      const assessment = {
        classification: { likely_condition: 'pcos_fertility_focused' },
        fertility_intent: 'trying',
      };
      const level = service.calculatePCOSAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for thyroid_suspected', () => {
      const assessment = {
        classification: { likely_condition: 'thyroid_suspected' },
      };
      const level = service.calculatePCOSAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return HIGH for endometriosis_possible', () => {
      const assessment = {
        classification: { likely_condition: 'endometriosis_possible' },
      };
      const level = service.calculatePCOSAttentionLevel(assessment);
      expect(level).toBe('high');
    });

    it('should return MEDIUM for pcos_metabolic', () => {
      const assessment = {
        classification: { likely_condition: 'pcos_metabolic' },
      };
      const level = service.calculatePCOSAttentionLevel(assessment);
      expect(level).toBe('medium');
    });

    it('should return MEDIUM for needs_blood_work', () => {
      const assessment = {
        classification: { likely_condition: 'needs_blood_work' },
      };
      const level = service.calculatePCOSAttentionLevel(assessment);
      expect(level).toBe('medium');
    });

    it('should return LOW for pcos_classic', () => {
      const assessment = {
        classification: { likely_condition: 'pcos_classic' },
        pregnant: false,
        fertility_intent: 'not_planning',
        red_flags: [],
      };
      const level = service.calculatePCOSAttentionLevel(assessment);
      expect(level).toBe('low');
    });

    it('should return LOW for pcos_lean', () => {
      const assessment = {
        classification: { likely_condition: 'pcos_lean' },
        pregnant: false,
        fertility_intent: 'not_planning',
        red_flags: [],
      };
      const level = service.calculatePCOSAttentionLevel(assessment);
      expect(level).toBe('low');
    });
  });
});
