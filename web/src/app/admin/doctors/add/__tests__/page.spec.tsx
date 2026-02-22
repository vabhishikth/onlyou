/**
 * Admin Add Doctor Page Tests
 * Phase 12: Add doctor form validation tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import AddDoctorPage from '../page';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('next/link', () => {
    return ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>;
});

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

function renderWithProvider() {
    return render(
        <MockedProvider mocks={[]} addTypename={false}>
            <AddDoctorPage />
        </MockedProvider>
    );
}

describe('AddDoctorPage', () => {
    it('should render form with all required fields', () => {
        renderWithProvider();

        expect(screen.getByText('Add New Doctor')).toBeDefined();
        expect(screen.getByPlaceholderText('Dr. Ramesh Kumar')).toBeDefined();
        expect(screen.getByPlaceholderText('+919876543210')).toBeDefined();
        expect(screen.getByPlaceholderText('KA/12345/2020')).toBeDefined();
        expect(screen.getByPlaceholderText('MBBS, MD Dermatology')).toBeDefined();
        expect(screen.getByText('Create Doctor')).toBeDefined();
    });

    it('should render all specialization options', () => {
        renderWithProvider();

        expect(screen.getByText('Dermatology')).toBeDefined();
        expect(screen.getByText('Trichology')).toBeDefined();
        expect(screen.getByText('Urology')).toBeDefined();
        expect(screen.getByText('Andrology')).toBeDefined();
        expect(screen.getByText('Sexology')).toBeDefined();
        expect(screen.getByText('Endocrinology')).toBeDefined();
        expect(screen.getByText('Bariatrics')).toBeDefined();
        expect(screen.getByText('Gynecology')).toBeDefined();
        expect(screen.getByText('Reproductive Medicine')).toBeDefined();
    });

    it('should render all vertical options', () => {
        renderWithProvider();

        expect(screen.getByText('Hair Loss')).toBeDefined();
        expect(screen.getByText('Sexual Health')).toBeDefined();
        expect(screen.getByText('PCOS')).toBeDefined();
        expect(screen.getByText('Weight Management')).toBeDefined();
    });

    it('should show validation errors on empty submit', () => {
        renderWithProvider();

        fireEvent.click(screen.getByText('Create Doctor'));

        expect(screen.getByText('Name is required')).toBeDefined();
        expect(screen.getByText('Phone is required')).toBeDefined();
        expect(screen.getByText('NMC registration is required')).toBeDefined();
    });

    it('should toggle specialization selection', () => {
        renderWithProvider();

        const dermatologyBtn = screen.getByText('Dermatology');
        fireEvent.click(dermatologyBtn);

        // After clicking, the button should have primary styling (bg-primary)
        expect(dermatologyBtn.className).toContain('bg-primary');
    });

    it('should show vertical-specialization consistency warning', () => {
        renderWithProvider();

        // Select Sexual Health vertical without selecting matching specializations
        fireEvent.click(screen.getByText('Sexual Health'));

        // Should show warning about required specializations
        expect(screen.getByText(/Requires: Urology or Andrology or Sexology/)).toBeDefined();
    });

    it('should have senior doctor checkbox', () => {
        renderWithProvider();
        expect(screen.getByText('Senior Doctor (priority for high-risk cases)')).toBeDefined();
    });
});
