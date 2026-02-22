/**
 * Spec: Phase 16 — Biomarker GraphQL operations
 */

import {
    MY_BIOMARKER_HISTORY,
    MY_BIOMARKER_TREND,
    MY_LATEST_LAB_RESULTS,
    MY_CRITICAL_VALUES,
} from '../../src/graphql/biomarker';

describe('Biomarker GraphQL operations', () => {
    it('should export all 4 query operations', () => {
        expect(MY_BIOMARKER_HISTORY).toBeDefined();
        expect(MY_BIOMARKER_TREND).toBeDefined();
        expect(MY_LATEST_LAB_RESULTS).toBeDefined();
        expect(MY_CRITICAL_VALUES).toBeDefined();
    });
});
