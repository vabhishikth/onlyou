import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import InventoryPage from '../page';
import { PHARMACY_UPDATE_INVENTORY } from '@/graphql/pharmacy-portal';

// Spec: Phase 15 — Pharmacy inventory management

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <InventoryPage />
        </MockedProvider>
    );
}

describe('Pharmacy Inventory Page', () => {
    it('should render inventory page header', () => {
        renderWithProvider();
        expect(screen.getByText(/Inventory/i)).toBeDefined();
    });

    it('should show add medication form', () => {
        renderWithProvider();
        expect(screen.getByTestId('add-medication-button')).toBeDefined();
    });

    it('should show medication input fields when adding', () => {
        renderWithProvider();
        fireEvent.click(screen.getByTestId('add-medication-button'));

        expect(screen.getByTestId('med-name-input')).toBeDefined();
        expect(screen.getByTestId('med-quantity-input')).toBeDefined();
        expect(screen.getByTestId('med-stock-toggle')).toBeDefined();
    });

    it('should render save inventory button', () => {
        renderWithProvider();
        fireEvent.click(screen.getByTestId('add-medication-button'));
        expect(screen.getByTestId('save-inventory-button')).toBeDefined();
    });

    it('should show empty state message initially', () => {
        renderWithProvider();
        expect(screen.getByText(/no inventory items/i)).toBeDefined();
    });
});
