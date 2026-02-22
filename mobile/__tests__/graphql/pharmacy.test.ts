/**
 * Spec: Phase 15 — Mobile pharmacy GraphQL operations
 */

import {
    MY_PHARMACY_ORDER_STATUS,
    MY_ACTIVE_PHARMACY_ORDERS,
    MY_AUTO_REFILLS,
    UPDATE_DELIVERY_ADDRESS,
    CREATE_AUTO_REFILL,
    CANCEL_AUTO_REFILL,
    REPORT_DAMAGED_ORDER,
    PROCESS_RETURN,
} from '../../src/graphql/pharmacy';

describe('Pharmacy GraphQL Operations', () => {
    it('should export all 3 pharmacy queries', () => {
        expect(MY_PHARMACY_ORDER_STATUS).toBeDefined();
        expect(MY_ACTIVE_PHARMACY_ORDERS).toBeDefined();
        expect(MY_AUTO_REFILLS).toBeDefined();
    });

    it('should export delivery address mutation', () => {
        expect(UPDATE_DELIVERY_ADDRESS).toBeDefined();
    });

    it('should export auto-refill mutations', () => {
        expect(CREATE_AUTO_REFILL).toBeDefined();
        expect(CANCEL_AUTO_REFILL).toBeDefined();
    });

    it('should export damage and return mutations', () => {
        expect(REPORT_DAMAGED_ORDER).toBeDefined();
        expect(PROCESS_RETURN).toBeDefined();
    });
});
