import {
  VALID_LAB_ORDER_TRANSITIONS,
  LAB_ORDER_TIMESTAMP_MAP,
  isValidLabOrderTransition,
  FASTING_REQUIRED_TESTS,
  requiresFasting,
  LAB_SLA_HOURS,
  GLP1_PROTOCOL_TESTS,
  PCOS_PROTOCOL_TESTS,
  CRITICAL_VALUE_THRESHOLDS,
  isCriticalValue,
  determineResultStatus,
} from './constants';

// Spec: Phase 16 Chunk 2 — Lab Automation Constants

describe('Lab Automation Constants', () => {
  // ========================================
  // Status Transitions
  // ========================================

  describe('VALID_LAB_ORDER_TRANSITIONS', () => {
    it('should have entries for all active statuses', () => {
      const statuses = Object.keys(VALID_LAB_ORDER_TRANSITIONS);
      expect(statuses.length).toBeGreaterThanOrEqual(20);
    });

    it('should have ORDERED → [PAYMENT_PENDING, SLOT_BOOKED, CANCELLED] as valid transitions', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS['ORDERED']).toContain('PAYMENT_PENDING');
      expect(VALID_LAB_ORDER_TRANSITIONS['ORDERED']).toContain('CANCELLED');
    });

    it('should have SLOT_BOOKED → PHLEBOTOMIST_ASSIGNED as valid', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS['SLOT_BOOKED']).toContain('PHLEBOTOMIST_ASSIGNED');
    });

    it('should have PHLEBOTOMIST_ASSIGNED → PHLEBOTOMIST_EN_ROUTE as valid', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS['PHLEBOTOMIST_ASSIGNED']).toContain('PHLEBOTOMIST_EN_ROUTE');
    });

    it('should have terminal states with no valid transitions', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS['CLOSED']).toEqual([]);
      expect(VALID_LAB_ORDER_TRANSITIONS['EXPIRED']).toEqual([]);
    });

    it('should not allow direct ORDERED → DELIVERED_TO_LAB', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS['ORDERED']).not.toContain('DELIVERED_TO_LAB');
    });
  });

  describe('isValidLabOrderTransition', () => {
    it('should return true for valid transition', () => {
      expect(isValidLabOrderTransition('ORDERED', 'PAYMENT_PENDING')).toBe(true);
    });

    it('should return false for invalid transition', () => {
      expect(isValidLabOrderTransition('ORDERED', 'DELIVERED_TO_LAB')).toBe(false);
    });

    it('should return false for unknown source status', () => {
      expect(isValidLabOrderTransition('UNKNOWN', 'ORDERED')).toBe(false);
    });
  });

  describe('LAB_ORDER_TIMESTAMP_MAP', () => {
    it('should map all active statuses to timestamp field names', () => {
      const entries = Object.keys(LAB_ORDER_TIMESTAMP_MAP);
      expect(entries.length).toBeGreaterThanOrEqual(15);
    });

    it('should map ORDERED to orderedAt', () => {
      expect(LAB_ORDER_TIMESTAMP_MAP['ORDERED']).toBe('orderedAt');
    });

    it('should map SAMPLE_COLLECTED to sampleCollectedAt', () => {
      expect(LAB_ORDER_TIMESTAMP_MAP['SAMPLE_COLLECTED']).toBe('sampleCollectedAt');
    });

    it('should map PHLEBOTOMIST_EN_ROUTE to phlebotomistEnRouteAt', () => {
      expect(LAB_ORDER_TIMESTAMP_MAP['PHLEBOTOMIST_EN_ROUTE']).toBe('phlebotomistEnRouteAt');
    });
  });

  // ========================================
  // Fasting Detection
  // ========================================

  describe('FASTING_REQUIRED_TESTS', () => {
    it('should include fasting_glucose and lipid_panel', () => {
      expect(FASTING_REQUIRED_TESTS).toContain('fasting_glucose');
      expect(FASTING_REQUIRED_TESTS).toContain('lipid_panel');
    });
  });

  describe('requiresFasting', () => {
    it('should return true for fasting_glucose', () => {
      expect(requiresFasting(['CBC', 'fasting_glucose', 'TSH'])).toBe(true);
    });

    it('should return true for lipid_panel', () => {
      expect(requiresFasting(['lipid_panel', 'CBC'])).toBe(true);
    });

    it('should return false for non-fasting tests', () => {
      expect(requiresFasting(['CBC', 'TSH', 'amylase'])).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(requiresFasting([])).toBe(false);
    });
  });

  // ========================================
  // Protocol Tests
  // ========================================

  describe('GLP1_PROTOCOL_TESTS', () => {
    it('should include amylase, lipase, HbA1c, fasting_glucose, lipid_panel, CBC, TSH', () => {
      expect(GLP1_PROTOCOL_TESTS).toContain('amylase');
      expect(GLP1_PROTOCOL_TESTS).toContain('lipase');
      expect(GLP1_PROTOCOL_TESTS).toContain('HbA1c');
      expect(GLP1_PROTOCOL_TESTS).toContain('fasting_glucose');
      expect(GLP1_PROTOCOL_TESTS).toContain('lipid_panel');
      expect(GLP1_PROTOCOL_TESTS).toContain('CBC');
      expect(GLP1_PROTOCOL_TESTS).toContain('TSH');
    });
  });

  describe('PCOS_PROTOCOL_TESTS', () => {
    it('should include FSH, LH, testosterone, TSH, fasting_glucose, insulin, lipid_panel', () => {
      expect(PCOS_PROTOCOL_TESTS).toContain('FSH');
      expect(PCOS_PROTOCOL_TESTS).toContain('LH');
      expect(PCOS_PROTOCOL_TESTS).toContain('testosterone');
      expect(PCOS_PROTOCOL_TESTS).toContain('TSH');
      expect(PCOS_PROTOCOL_TESTS).toContain('fasting_glucose');
      expect(PCOS_PROTOCOL_TESTS).toContain('insulin');
      expect(PCOS_PROTOCOL_TESTS).toContain('lipid_panel');
    });
  });

  // ========================================
  // SLA Hours
  // ========================================

  describe('LAB_SLA_HOURS', () => {
    it('should have standard result SLA of 48 hours', () => {
      expect(LAB_SLA_HOURS.RESULTS_STANDARD).toBe(48);
    });

    it('should have escalation at 72 hours', () => {
      expect(LAB_SLA_HOURS.RESULTS_ESCALATION).toBe(72);
    });

    it('should have critical acknowledgment of 1 hour', () => {
      expect(LAB_SLA_HOURS.CRITICAL_ACKNOWLEDGMENT).toBe(1);
    });
  });

  // ========================================
  // Critical Value Detection
  // ========================================

  describe('CRITICAL_VALUE_THRESHOLDS', () => {
    it('should have thresholds for TSH', () => {
      expect(CRITICAL_VALUE_THRESHOLDS['TSH']).toBeDefined();
      expect(CRITICAL_VALUE_THRESHOLDS['TSH'].criticalLow).toBe(0.1);
      expect(CRITICAL_VALUE_THRESHOLDS['TSH'].criticalHigh).toBe(10);
    });

    it('should have thresholds for fasting_glucose', () => {
      expect(CRITICAL_VALUE_THRESHOLDS['fasting_glucose']).toBeDefined();
      expect(CRITICAL_VALUE_THRESHOLDS['fasting_glucose'].criticalLow).toBe(50);
      expect(CRITICAL_VALUE_THRESHOLDS['fasting_glucose'].criticalHigh).toBe(300);
    });
  });

  describe('isCriticalValue', () => {
    it('should detect critical low TSH', () => {
      expect(isCriticalValue('TSH', 0.05)).toBe(true);
    });

    it('should detect critical high TSH', () => {
      expect(isCriticalValue('TSH', 15)).toBe(true);
    });

    it('should return false for normal TSH', () => {
      expect(isCriticalValue('TSH', 2.5)).toBe(false);
    });

    it('should detect critical high fasting_glucose', () => {
      expect(isCriticalValue('fasting_glucose', 350)).toBe(true);
    });

    it('should return false for unknown test code', () => {
      expect(isCriticalValue('unknown_test', 999)).toBe(false);
    });
  });

  describe('determineResultStatus', () => {
    it('should return NORMAL when within range', () => {
      expect(determineResultStatus('TSH', 2.5, 0.4, 4.0)).toBe('NORMAL');
    });

    it('should return LOW when below range', () => {
      expect(determineResultStatus('TSH', 0.2, 0.4, 4.0)).toBe('LOW');
    });

    it('should return HIGH when above range', () => {
      expect(determineResultStatus('TSH', 6.0, 0.4, 4.0)).toBe('HIGH');
    });

    it('should return CRITICAL_LOW for critically low values', () => {
      expect(determineResultStatus('TSH', 0.05, 0.4, 4.0)).toBe('CRITICAL_LOW');
    });

    it('should return CRITICAL_HIGH for critically high values', () => {
      expect(determineResultStatus('TSH', 15, 0.4, 4.0)).toBe('CRITICAL_HIGH');
    });

    it('should fall back to reference range for unknown test codes', () => {
      expect(determineResultStatus('unknown', 5, 2, 8)).toBe('NORMAL');
      expect(determineResultStatus('unknown', 1, 2, 8)).toBe('LOW');
      expect(determineResultStatus('unknown', 10, 2, 8)).toBe('HIGH');
    });
  });
});
