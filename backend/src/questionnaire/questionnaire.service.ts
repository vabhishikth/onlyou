import { Injectable } from '@nestjs/common';
import { Question, SkipLogicRule } from './data/hair-loss';

// Spec: hair-loss spec Section 3, master spec Section 4

export interface SkipLogicResult {
  show: boolean;
  optional: boolean;
}

export interface ProgressResult {
  percentage: number;
  answered: number;
  total: number;
}

export interface ValidationResult {
  valid: boolean;
  missingRequired: string[];
  errors: string[];
}

@Injectable()
export class QuestionnaireService {
  /**
   * Evaluate skip logic for a specific question
   * Returns whether the question should be shown and if it's optional
   */
  evaluateSkipLogic(
    questionId: string,
    responses: Record<string, any>,
    skipLogicRules: SkipLogicRule[]
  ): SkipLogicResult {
    // Find all rules that apply to this question
    const rules = skipLogicRules.filter((r) => r.questionId === questionId);

    // Default: show required
    let show = true;
    let optional = false;

    for (const rule of rules) {
      const dependsOnValue = responses[rule.condition.dependsOn];

      // Skip evaluation if the dependent question hasn't been answered
      if (dependsOnValue === undefined) {
        // For 'show' rules, default to hide until the condition can be evaluated
        if (rule.type === 'show') {
          show = false;
        }
        continue;
      }

      const conditionMet = this.evaluateCondition(
        dependsOnValue,
        rule.condition.operator,
        rule.condition.value
      );

      if (rule.type === 'show') {
        // Show rule: show only if condition is met
        show = conditionMet;
      } else if (rule.type === 'optional') {
        // Optional rule: make optional if condition is met
        if (conditionMet) {
          optional = true;
        }
      }
    }

    return { show, optional };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    actualValue: any,
    operator: 'equals' | 'notEquals' | 'includes' | 'notIncludes',
    expectedValue: string | string[]
  ): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;

      case 'notEquals':
        return actualValue !== expectedValue;

      case 'includes':
        // For multi-select questions (array of values)
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue as string);
        }
        return actualValue === expectedValue;

      case 'notIncludes':
        // For multi-select questions (array of values)
        if (Array.isArray(actualValue)) {
          return !actualValue.includes(expectedValue as string);
        }
        return actualValue !== expectedValue;

      default:
        return false;
    }
  }

  /**
   * Get all questions that should be shown based on current responses
   */
  getActiveQuestions(
    questions: Question[],
    responses: Record<string, any>,
    skipLogicRules: SkipLogicRule[]
  ): Question[] {
    return questions.filter((q) => {
      // Check if question has conditional rules in the skip logic
      const hasSkipLogicRule = skipLogicRules.some((r) => r.questionId === q.id && r.type === 'show');

      if (hasSkipLogicRule) {
        const result = this.evaluateSkipLogic(q.id, responses, skipLogicRules);
        return result.show;
      }

      // Check if question has inline conditional
      if (q.conditional) {
        const dependsOnValue = responses[q.conditional.questionId];
        if (dependsOnValue === undefined) {
          return false; // Don't show until condition can be evaluated
        }

        if (q.conditional.value) {
          return dependsOnValue === q.conditional.value;
        }
        if (q.conditional.notValue) {
          if (Array.isArray(dependsOnValue)) {
            return !dependsOnValue.includes(q.conditional.notValue);
          }
          return dependsOnValue !== q.conditional.notValue;
        }
        if (q.conditional.includes) {
          if (Array.isArray(dependsOnValue)) {
            return dependsOnValue.includes(q.conditional.includes);
          }
          return dependsOnValue === q.conditional.includes;
        }
      }

      return true;
    });
  }

  /**
   * Get the next unanswered question
   */
  getNextQuestion(
    questions: Question[],
    responses: Record<string, any>,
    skipLogicRules: SkipLogicRule[]
  ): Question | null {
    const activeQuestions = this.getActiveQuestions(questions, responses, skipLogicRules);

    for (const q of activeQuestions) {
      // Check if this question has been answered
      if (responses[q.id] === undefined) {
        return q;
      }
    }

    return null;
  }

  /**
   * Calculate progress through the questionnaire
   */
  calculateProgress(
    questions: Question[],
    responses: Record<string, any>,
    skipLogicRules: SkipLogicRule[]
  ): ProgressResult {
    const activeQuestions = this.getActiveQuestions(questions, responses, skipLogicRules);
    const answeredCount = activeQuestions.filter((q) => responses[q.id] !== undefined).length;
    const total = activeQuestions.length;

    return {
      percentage: total > 0 ? Math.round((answeredCount / total) * 100) : 0,
      answered: answeredCount,
      total,
    };
  }

  /**
   * Validate all responses
   */
  validateResponses(
    questions: Question[],
    responses: Record<string, any>,
    skipLogicRules: SkipLogicRule[]
  ): ValidationResult {
    const errors: string[] = [];
    const missingRequired: string[] = [];

    const activeQuestions = this.getActiveQuestions(questions, responses, skipLogicRules);

    for (const q of activeQuestions) {
      const value = responses[q.id];
      const skipResult = this.evaluateSkipLogic(q.id, responses, skipLogicRules);

      // Check if required question is missing
      const isRequired = q.required && !skipResult.optional;
      if (isRequired && value === undefined) {
        missingRequired.push(q.id);
        continue;
      }

      // Validate specific question types
      if (q.id === 'Q1' && value !== undefined) {
        // Age validation
        if (q.validation) {
          if (q.validation.min !== undefined && value < q.validation.min) {
            errors.push(`Age must be between ${q.validation.min} and ${q.validation.max}`);
          }
          if (q.validation.max !== undefined && value > q.validation.max) {
            errors.push(`Age must be between ${q.validation.min} and ${q.validation.max}`);
          }
        }
      }
    }

    return {
      valid: missingRequired.length === 0 && errors.length === 0,
      missingRequired,
      errors,
    };
  }
}
