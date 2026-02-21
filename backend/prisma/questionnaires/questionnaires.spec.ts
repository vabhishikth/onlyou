import {
  hairLossQuestionnaire,
  sexualHealthQuestionnaire,
  pcosQuestionnaire,
  weightManagementQuestionnaire,
} from './index';

// Helper: flatten all questions from sections
function flattenQuestions(questionnaire: any): any[] {
  return questionnaire.sections.flatMap((s: any) => s.questions);
}

// Helper: get all question IDs
function getQuestionIds(questionnaire: any): string[] {
  return flattenQuestions(questionnaire).map((q: any) => q.id);
}

describe('Questionnaire Data Validation', () => {
  // Spec: Each vertical spec Section 3 defines exact question counts
  describe('Question Counts', () => {
    // Counts include conditional sub-questions (Q2b, Q10b, Q8b)
    // Spec titles say 25/28/32/30 but actual content adds sub-questions
    it('Hair Loss should have 27 questions (25 main + Q2b + Q10b)', () => {
      expect(flattenQuestions(hairLossQuestionnaire).length).toBe(27);
    });

    it('Sexual Health should have exactly 28 questions', () => {
      expect(flattenQuestions(sexualHealthQuestionnaire).length).toBe(28);
    });

    it('PCOS should have exactly 32 questions', () => {
      expect(flattenQuestions(pcosQuestionnaire).length).toBe(32);
    });

    it('Weight Management should have 31 questions (30 main + Q8b)', () => {
      expect(flattenQuestions(weightManagementQuestionnaire).length).toBe(31);
    });
  });

  describe('Question Structure', () => {
    const allQuestionnaires = [
      { name: 'Hair Loss', data: hairLossQuestionnaire },
      { name: 'Sexual Health', data: sexualHealthQuestionnaire },
      { name: 'PCOS', data: pcosQuestionnaire },
      { name: 'Weight Management', data: weightManagementQuestionnaire },
    ];

    it.each(allQuestionnaires)(
      '$name: all questions have id, type, question, required',
      ({ data }) => {
        const questions = flattenQuestions(data);
        for (const q of questions) {
          expect(q).toHaveProperty('id');
          expect(typeof q.id).toBe('string');
          expect(q).toHaveProperty('type');
          expect(['single_choice', 'multiple_choice', 'text', 'number', 'scale']).toContain(q.type);
          expect(q).toHaveProperty('question');
          expect(typeof q.question).toBe('string');
          expect(q).toHaveProperty('required');
          expect(typeof q.required).toBe('boolean');
        }
      },
    );

    it.each(allQuestionnaires)(
      '$name: all question IDs start with Q followed by a number',
      ({ data }) => {
        const ids = getQuestionIds(data);
        for (const id of ids) {
          expect(id).toMatch(/^Q\d+b?$/);
        }
      },
    );

    it.each(allQuestionnaires)(
      '$name: no duplicate question IDs',
      ({ data }) => {
        const ids = getQuestionIds(data);
        expect(new Set(ids).size).toBe(ids.length);
      },
    );

    it.each(allQuestionnaires)(
      '$name: choice questions have options array',
      ({ data }) => {
        const questions = flattenQuestions(data);
        for (const q of questions) {
          if (q.type === 'single_choice' || q.type === 'multiple_choice') {
            expect(Array.isArray(q.options)).toBe(true);
            expect(q.options.length).toBeGreaterThan(0);
          }
        }
      },
    );
  });

  describe('Skip Logic Validity', () => {
    const allQuestionnaires = [
      { name: 'Hair Loss', data: hairLossQuestionnaire },
      { name: 'Sexual Health', data: sexualHealthQuestionnaire },
      { name: 'PCOS', data: pcosQuestionnaire },
      { name: 'Weight Management', data: weightManagementQuestionnaire },
    ];

    it.each(allQuestionnaires)(
      '$name: skip logic references existing question IDs',
      ({ data }) => {
        const ids = new Set(getQuestionIds(data));
        const questions = flattenQuestions(data);
        for (const q of questions) {
          if (q.skipLogic?.showIf?.questionId) {
            expect(ids).toContain(q.skipLogic.showIf.questionId);
          }
        }
      },
    );
  });

  describe('Hair Loss Sections', () => {
    it('should have 5 sections', () => {
      expect(hairLossQuestionnaire.sections.length).toBe(5);
    });

    it('should have 4 photo requirements', () => {
      expect(hairLossQuestionnaire.photoRequirements.length).toBe(4);
    });

    // Backend AI service references these IDs — they must exist
    it('should contain all IDs referenced by AI/Prescription services', () => {
      const ids = new Set(getQuestionIds(hairLossQuestionnaire));
      const requiredIds = [
        'Q1', 'Q2', 'Q2b', 'Q3', 'Q4', 'Q5', 'Q6',
        'Q10', 'Q10b', 'Q11', 'Q12', 'Q14', 'Q15', 'Q17', 'Q19', 'Q22',
      ];
      for (const id of requiredIds) {
        expect(ids).toContain(id);
      }
    });
  });

  describe('Sexual Health Sections', () => {
    it('should have 6 sections', () => {
      expect(sexualHealthQuestionnaire.sections.length).toBe(6);
    });

    it('should have 0 photo requirements (max privacy)', () => {
      expect(sexualHealthQuestionnaire.photoRequirements.length).toBe(0);
    });

    it('should contain IIEF-5 questions (Q4-Q8)', () => {
      const ids = new Set(getQuestionIds(sexualHealthQuestionnaire));
      for (const id of ['Q4', 'Q5', 'Q6', 'Q7', 'Q8']) {
        expect(ids).toContain(id);
      }
    });

    it('should contain all IDs referenced by AI/Prescription services', () => {
      const ids = new Set(getQuestionIds(sexualHealthQuestionnaire));
      const requiredIds = [
        'Q1', 'Q3', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q14',
        'Q15', 'Q16', 'Q17', 'Q18', 'Q20', 'Q22', 'Q27',
      ];
      for (const id of requiredIds) {
        expect(ids).toContain(id);
      }
    });
  });

  describe('PCOS Sections', () => {
    it('should have 8 sections', () => {
      expect(pcosQuestionnaire.sections.length).toBe(8);
    });

    it('should have 0 photo requirements (optional, doctor-requested)', () => {
      expect(pcosQuestionnaire.photoRequirements.length).toBe(0);
    });

    it('should contain all IDs referenced by AI/Prescription services', () => {
      const ids = new Set(getQuestionIds(pcosQuestionnaire));
      const requiredIds = [
        'Q2', 'Q3', 'Q4', 'Q5', 'Q10', 'Q11', 'Q12',
        'Q19', 'Q21', 'Q22',
      ];
      for (const id of requiredIds) {
        expect(ids).toContain(id);
      }
    });
  });

  describe('Weight Management Sections', () => {
    it('should have 7 sections', () => {
      expect(weightManagementQuestionnaire.sections.length).toBe(7);
    });

    it('should have 3 photo requirements (2 required + 1 optional)', () => {
      expect(weightManagementQuestionnaire.photoRequirements.length).toBe(3);
      const required = weightManagementQuestionnaire.photoRequirements.filter(
        (p: any) => p.required,
      );
      expect(required.length).toBe(2);
    });

    it('should contain all IDs referenced by AI/Prescription services', () => {
      const ids = new Set(getQuestionIds(weightManagementQuestionnaire));
      const requiredIds = [
        'Q2', 'Q5', 'Q6', 'Q7', 'Q8', 'Q8b', 'Q9', 'Q10',
        'Q13', 'Q15', 'Q16', 'Q17',
      ];
      for (const id of requiredIds) {
        expect(ids).toContain(id);
      }
    });
  });
});
