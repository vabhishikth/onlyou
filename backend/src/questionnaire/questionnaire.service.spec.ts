import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireService } from './questionnaire.service';
import { hairLossQuestions, HAIR_LOSS_SKIP_LOGIC } from './data/hair-loss';

// Spec: hair-loss spec Section 3 (Questionnaire), master spec Section 4

describe('QuestionnaireService', () => {
  let service: QuestionnaireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionnaireService],
    }).compile();

    service = module.get<QuestionnaireService>(QuestionnaireService);
  });

  describe('Hair Loss Questionnaire Data', () => {
    it('should have 27 total question definitions (25 base + Q2b + Q10b conditionals)', () => {
      // Spec: 25 base questions (Q1-Q25) plus Q2b and Q10b conditional sub-questions
      // Q2b is added for females, Q10b is added for scalp conditions
      expect(hairLossQuestions.length).toBe(27);
    });

    it('should have correct question IDs Q1 through Q25', () => {
      const questionIds = hairLossQuestions.map((q) => q.id);
      const expectedIds = [
        'Q1', 'Q2', 'Q2b', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9',
        'Q10', 'Q10b', 'Q11', 'Q12', 'Q13', 'Q14', 'Q15', 'Q16',
        'Q17', 'Q18', 'Q19', 'Q20', 'Q21', 'Q22', 'Q23', 'Q24', 'Q25',
      ];
      expect(questionIds).toEqual(expectedIds);
    });

    it('should have 5 sections: Basics, Hair Loss Pattern, Medical Screening, Treatment History, Lifestyle', () => {
      const sections = [...new Set(hairLossQuestions.map((q) => q.section))];
      expect(sections).toEqual([
        'basics',
        'hair_loss_pattern',
        'medical_screening',
        'treatment_history',
        'lifestyle',
      ]);
    });

    it('Q1 should be age input with validation 18-80', () => {
      const q1 = hairLossQuestions.find((q) => q.id === 'Q1');
      expect(q1).toBeDefined();
      expect(q1?.type).toBe('number');
      expect(q1?.validation?.min).toBe(18);
      expect(q1?.validation?.max).toBe(80);
    });

    it('Q2b should be conditional on Q2=Female', () => {
      const q2b = hairLossQuestions.find((q) => q.id === 'Q2b');
      expect(q2b).toBeDefined();
      expect(q2b?.conditional).toEqual({ questionId: 'Q2', value: 'Female' });
    });

    it('Q10b should be conditional on Q10 including scalp condition', () => {
      const q10b = hairLossQuestions.find((q) => q.id === 'Q10b');
      expect(q10b).toBeDefined();
      expect(q10b?.conditional?.questionId).toBe('Q10');
      expect(q10b?.conditional?.includes).toBe('Scalp psoriasis or eczema');
    });

    it('Q18 should be conditional on Q17 not being None', () => {
      const q18 = hairLossQuestions.find((q) => q.id === 'Q18');
      expect(q18).toBeDefined();
      expect(q18?.conditional).toEqual({ questionId: 'Q17', notValue: 'None' });
    });

    it('Q19 should be conditional on Q17 not being None', () => {
      const q19 = hairLossQuestions.find((q) => q.id === 'Q19');
      expect(q19).toBeDefined();
      expect(q19?.conditional).toEqual({ questionId: 'Q17', notValue: 'None' });
    });
  });

  describe('Skip Logic Processor', () => {
    it('should show Q2b when Q2 = Female', () => {
      const responses = { Q2: 'Female' };
      const result = service.evaluateSkipLogic('Q2b', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(true);
    });

    it('should hide Q2b when Q2 = Male', () => {
      const responses = { Q2: 'Male' };
      const result = service.evaluateSkipLogic('Q2b', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(false);
    });

    it('should show Q10b when Q10 includes scalp condition', () => {
      const responses = { Q10: ['Scalp psoriasis or eczema', 'Diabetes'] };
      const result = service.evaluateSkipLogic('Q10b', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(true);
    });

    it('should hide Q10b when Q10 does not include scalp condition', () => {
      const responses = { Q10: ['Diabetes', 'None'] };
      const result = service.evaluateSkipLogic('Q10b', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(false);
    });

    it('should make Q11 optional when Q10 = None', () => {
      const responses = { Q10: ['None'] };
      const result = service.evaluateSkipLogic('Q11', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(true);
      expect(result.optional).toBe(true);
    });

    it('should keep Q11 required when Q10 has conditions', () => {
      const responses = { Q10: ['Thyroid disorder'] };
      const result = service.evaluateSkipLogic('Q11', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(true);
      expect(result.optional).toBe(false);
    });

    it('should hide Q18 when Q17 = None', () => {
      const responses = { Q17: ['None'] };
      const result = service.evaluateSkipLogic('Q18', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(false);
    });

    it('should show Q18 when Q17 has treatments', () => {
      const responses = { Q17: ['Minoxidil', 'Finasteride'] };
      const result = service.evaluateSkipLogic('Q18', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(true);
    });

    it('should hide Q19 when Q17 = None', () => {
      const responses = { Q17: ['None'] };
      const result = service.evaluateSkipLogic('Q19', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(false);
    });

    it('should show Q19 when Q17 has treatments', () => {
      const responses = { Q17: ['Biotin supplements'] };
      const result = service.evaluateSkipLogic('Q19', responses, HAIR_LOSS_SKIP_LOGIC);
      expect(result.show).toBe(true);
    });
  });

  describe('Question Flow for Male Patient', () => {
    // Spec: Male patients with no conditions and no previous treatments
    // 27 total - Q2b(female) - Q10b(no scalp) - Q18(no treatments) - Q19(no treatments) = 23
    it('should return 23 questions for male patient with no conditions and no treatments', () => {
      const maleResponses = {
        Q2: 'Male',
        Q10: ['None'], // No conditions → Q10b hidden, Q11 optional
        Q17: ['None'], // No treatments → Q18, Q19 hidden
      };

      const questions = service.getActiveQuestions(
        hairLossQuestions,
        maleResponses,
        HAIR_LOSS_SKIP_LOGIC
      );

      // Male: Q2b hidden (1 less), Q10b hidden (1 less), Q18+Q19 hidden (2 less)
      // 27 - 4 = 23 questions
      expect(questions.length).toBe(23);
    });

    it('should exclude Q2b for male patients', () => {
      const maleResponses = { Q2: 'Male' };
      const questions = service.getActiveQuestions(
        hairLossQuestions,
        maleResponses,
        HAIR_LOSS_SKIP_LOGIC
      );
      const questionIds = questions.map((q) => q.id);
      expect(questionIds).not.toContain('Q2b');
    });

    it('should include all 27 questions for female patient with scalp condition and treatments', () => {
      const femaleResponses = {
        Q2: 'Female',
        Q10: ['Scalp psoriasis or eczema'], // Adds Q10b
        Q17: ['Minoxidil'], // Adds Q18, Q19
      };

      const questions = service.getActiveQuestions(
        hairLossQuestions,
        femaleResponses,
        HAIR_LOSS_SKIP_LOGIC
      );

      // Female with scalp condition and treatments should see all 27 questions
      expect(questions.length).toBe(27);
    });
  });

  describe('getNextQuestion', () => {
    it('should return the first question when no responses', () => {
      const responses = {};
      const nextQuestion = service.getNextQuestion(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );
      expect(nextQuestion?.id).toBe('Q1');
    });

    it('should skip Q2b when Q2 = Male', () => {
      const responses = {
        Q1: 25,
        Q2: 'Male',
      };
      const nextQuestion = service.getNextQuestion(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );
      // Q2b should be skipped, next should be Q3
      expect(nextQuestion?.id).toBe('Q3');
    });

    it('should return Q2b when Q2 = Female', () => {
      const responses = {
        Q1: 30,
        Q2: 'Female',
      };
      const nextQuestion = service.getNextQuestion(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );
      expect(nextQuestion?.id).toBe('Q2b');
    });

    it('should return null when all questions answered', () => {
      // Complete responses for male patient
      const responses: Record<string, any> = {
        Q1: 30,
        Q2: 'Male',
        Q3: 'My hair is thinning gradually',
        Q4: '1-3 years',
        Q5: 'Slow and gradual',
        Q6: ['Crown/top thinning'],
        Q7: 'III',
        Q8: ['Father'],
        Q9: 'Moderately',
        Q10: ['None'],
        Q11: ['None'],
        Q12: ['None'],
        Q13: ['None'],
        Q14: ['None'],
        Q15: 'No',
        Q16: 'No',
        Q17: ['None'],
        Q20: 'Stop further loss',
        Q21: 'No',
        Q22: 'Occasionally',
        Q23: 'Balanced',
        Q24: 'Moderate',
        Q25: '7-8',
      };

      const nextQuestion = service.getNextQuestion(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );
      expect(nextQuestion).toBeNull();
    });
  });

  describe('calculateProgress', () => {
    it('should return 0% progress when no responses', () => {
      const responses = {};
      const progress = service.calculateProgress(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );
      expect(progress.percentage).toBe(0);
      expect(progress.answered).toBe(0);
    });

    it('should calculate correct progress for partial responses', () => {
      const responses = {
        Q1: 25,
        Q2: 'Male',
        Q3: 'My hair is thinning gradually',
        Q4: '1-3 years',
        Q5: 'Slow and gradual',
      };

      const progress = service.calculateProgress(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );

      expect(progress.answered).toBe(5);
      expect(progress.percentage).toBeGreaterThan(0);
      expect(progress.percentage).toBeLessThan(100);
    });

    it('should return 100% when all required questions answered', () => {
      // All required questions for male patient
      const responses: Record<string, any> = {
        Q1: 30,
        Q2: 'Male',
        Q3: 'My hair is thinning gradually',
        Q4: '1-3 years',
        Q5: 'Slow and gradual',
        Q6: ['Crown/top thinning'],
        Q7: 'III',
        Q8: ['Father'],
        Q9: 'Moderately',
        Q10: ['None'],
        Q11: ['None'],
        Q12: ['None'],
        Q13: ['None'],
        Q14: ['None'],
        Q15: 'No',
        Q16: 'No',
        Q17: ['None'],
        Q20: 'Stop further loss',
        Q21: 'No',
        Q22: 'Occasionally',
        Q23: 'Balanced',
        Q24: 'Moderate',
        Q25: '7-8',
      };

      const progress = service.calculateProgress(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );

      expect(progress.percentage).toBe(100);
    });
  });

  describe('validateResponses', () => {
    it('should return invalid for missing required questions', () => {
      const responses = {
        Q1: 25,
        Q2: 'Male',
        // Missing Q3 and other required questions
      };

      const validation = service.validateResponses(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );

      expect(validation.valid).toBe(false);
      expect(validation.missingRequired.length).toBeGreaterThan(0);
    });

    it('should return invalid for age under 18', () => {
      const responses = {
        Q1: 16, // Under 18
        Q2: 'Male',
      };

      const validation = service.validateResponses(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Age must be between 18 and 80');
    });

    it('should return valid for complete male responses', () => {
      const responses: Record<string, any> = {
        Q1: 30,
        Q2: 'Male',
        Q3: 'My hair is thinning gradually',
        Q4: '1-3 years',
        Q5: 'Slow and gradual',
        Q6: ['Crown/top thinning'],
        Q7: 'III',
        Q8: ['Father'],
        Q9: 'Moderately',
        Q10: ['None'],
        Q11: ['None'],
        Q12: ['None'],
        Q13: ['None'],
        Q14: ['None'],
        Q15: 'No',
        Q16: 'No',
        Q17: ['None'],
        Q20: 'Stop further loss',
        Q21: 'No',
        Q22: 'Occasionally',
        Q23: 'Balanced',
        Q24: 'Moderate',
        Q25: '7-8',
      };

      const validation = service.validateResponses(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );

      expect(validation.valid).toBe(true);
      expect(validation.missingRequired.length).toBe(0);
      expect(validation.errors.length).toBe(0);
    });

    it('should require Q2b for female patients', () => {
      const responses: Record<string, any> = {
        Q1: 30,
        Q2: 'Female',
        Q3: 'My hair is thinning gradually',
        // Missing Q2b
      };

      const validation = service.validateResponses(
        hairLossQuestions,
        responses,
        HAIR_LOSS_SKIP_LOGIC
      );

      expect(validation.valid).toBe(false);
      expect(validation.missingRequired).toContain('Q2b');
    });
  });
});
