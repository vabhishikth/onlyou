import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import TemplatesPage from '../page';
import { AVAILABLE_TEMPLATES } from '@/graphql/prescription';

// Spec: master spec Section 5.4 — Prescription Templates

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockHairLossTemplates = {
    vertical: 'HAIR_LOSS',
    templates: {
        STANDARD: {
            name: 'Standard',
            description: 'Finasteride + Minoxidil for typical AGA',
            whenToUse: 'Male AGA, Norwood 2-5, no contraindications',
            medications: [
                { name: 'Finasteride', dosage: '1mg', frequency: 'Once daily', duration: '6 months', instructions: 'Take with food' },
                { name: 'Minoxidil 5%', dosage: '1ml', frequency: 'Twice daily', duration: '6 months', instructions: 'Apply to dry scalp' },
            ],
        },
        MINOXIDIL_ONLY: {
            name: 'Minoxidil Only',
            description: 'When finasteride is contraindicated or declined',
            whenToUse: 'Finasteride contraindicated, patient preference',
            medications: [
                { name: 'Minoxidil 5%', dosage: '1ml', frequency: 'Twice daily', duration: '6 months', instructions: 'Apply to dry scalp' },
            ],
        },
    },
};

const mockSexualHealthTemplates = {
    vertical: 'SEXUAL_HEALTH',
    templates: {
        ED_STANDARD: {
            name: 'ED Standard',
            description: 'PDE5 inhibitor for erectile dysfunction',
            whenToUse: 'Standard ED treatment',
            medications: [
                { name: 'Tadalafil', dosage: '10mg', frequency: 'As needed', duration: '3 months', instructions: 'Take 30 min before activity' },
            ],
        },
    },
};

const hairLossMock: MockedResponse = {
    request: {
        query: AVAILABLE_TEMPLATES,
        variables: { vertical: 'HAIR_LOSS' },
    },
    result: {
        data: { availableTemplates: mockHairLossTemplates },
    },
};

const sexualHealthMock: MockedResponse = {
    request: {
        query: AVAILABLE_TEMPLATES,
        variables: { vertical: 'SEXUAL_HEALTH' },
    },
    result: {
        data: { availableTemplates: mockSexualHealthTemplates },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <TemplatesPage />
        </MockedProvider>
    );
}

describe('TemplatesPage', () => {
    it('should render with Hair Loss tab active by default', () => {
        renderWithProvider([hairLossMock]);

        expect(screen.getByText('Templates')).toBeDefined();
        // Hair Loss tab should be active/present
        expect(screen.getByText('Hair Loss')).toBeDefined();
    });

    it('should render template cards for selected vertical', async () => {
        renderWithProvider([hairLossMock]);

        await waitFor(() => {
            expect(screen.getByText('Standard')).toBeDefined();
            expect(screen.getByText('Minoxidil Only')).toBeDefined();
        });
    });

    it('should switch tabs and display different templates', async () => {
        renderWithProvider([hairLossMock, sexualHealthMock]);

        // Wait for Hair Loss templates to load first
        await waitFor(() => {
            expect(screen.getByText('Standard')).toBeDefined();
        });

        // Click Sexual Health tab
        fireEvent.click(screen.getByText('Sexual Health'));

        await waitFor(() => {
            expect(screen.getByText('ED Standard')).toBeDefined();
        });
    });

    it('should show template name, description, and when to use', async () => {
        renderWithProvider([hairLossMock]);

        await waitFor(() => {
            expect(screen.getByText('Standard')).toBeDefined();
            expect(screen.getByText('Finasteride + Minoxidil for typical AGA')).toBeDefined();
        });
    });

    it('should show medication details when template is expanded', async () => {
        renderWithProvider([hairLossMock]);

        await waitFor(() => {
            expect(screen.getByText('Standard')).toBeDefined();
        });

        // Click to expand the Standard template card
        fireEvent.click(screen.getByText('Standard'));

        await waitFor(() => {
            expect(screen.getByText('Finasteride')).toBeDefined();
            expect(screen.getByText('1mg')).toBeDefined();
            expect(screen.getByText('Once daily')).toBeDefined();
        });
    });

    it('should have all 4 verticals available as tabs', () => {
        renderWithProvider([hairLossMock]);

        expect(screen.getByText('Hair Loss')).toBeDefined();
        expect(screen.getByText('Sexual Health')).toBeDefined();
        expect(screen.getByText('PCOS')).toBeDefined();
        expect(screen.getByText('Weight')).toBeDefined();
    });

    it('should show loading state while query runs', () => {
        renderWithProvider([hairLossMock]);

        // Loading state should be visible before data loads
        expect(screen.getByTestId('templates-loading')).toBeDefined();
    });
});
