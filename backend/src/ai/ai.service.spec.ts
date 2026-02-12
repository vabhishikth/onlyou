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
  });
});
