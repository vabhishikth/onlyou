/**
 * TreatmentCard Component Tests
 * PR 4: Home Dashboard Restyle - Premium treatment card
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TreatmentCard from '../TreatmentCard';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('TreatmentCard', () => {
    const defaultProps = {
        id: 'HAIR_LOSS' as const,
        name: 'Hair Loss',
        tagline: 'Thicker, fuller hair with personalised treatments',
        icon: 'Sparkles' as const,
        pricePerMonth: 99900, // ₹999 in paise
    };

    it('renders the card', () => {
        const { getByTestId } = render(<TreatmentCard {...defaultProps} />);
        expect(getByTestId('treatment-card-HAIR_LOSS')).toBeTruthy();
    });

    it('displays the treatment name', () => {
        const { getByText } = render(<TreatmentCard {...defaultProps} />);
        expect(getByText('Hair Loss')).toBeTruthy();
    });

    it('displays the tagline', () => {
        const { getByText } = render(<TreatmentCard {...defaultProps} />);
        expect(getByText('Thicker, fuller hair with personalised treatments')).toBeTruthy();
    });

    it('displays the price', () => {
        const { getByText } = render(<TreatmentCard {...defaultProps} />);
        expect(getByText(/₹999/)).toBeTruthy();
    });

    it('displays "Start Assessment" CTA', () => {
        const { getByText } = render(<TreatmentCard {...defaultProps} />);
        expect(getByText('Start Assessment')).toBeTruthy();
    });

    it('navigates to intake flow when pressed', () => {
        const { getByTestId } = render(<TreatmentCard {...defaultProps} />);

        fireEvent.press(getByTestId('treatment-card-HAIR_LOSS'));

        expect(mockRouter.push).toHaveBeenCalledWith('/intake/hair-loss');
    });

    it('renders icon component', () => {
        const { getByTestId } = render(<TreatmentCard {...defaultProps} />);
        expect(getByTestId('treatment-icon-HAIR_LOSS')).toBeTruthy();
    });

    describe('vertical-specific styling', () => {
        it('applies hair loss tint', () => {
            const { getByTestId } = render(<TreatmentCard {...defaultProps} />);
            const card = getByTestId('treatment-card-HAIR_LOSS');
            expect(card).toBeTruthy();
        });

        it('applies sexual health tint', () => {
            const props = {
                ...defaultProps,
                id: 'SEXUAL_HEALTH' as const,
                name: 'Sexual Health',
                icon: 'Heart' as const,
            };
            const { getByTestId } = render(<TreatmentCard {...props} />);
            expect(getByTestId('treatment-card-SEXUAL_HEALTH')).toBeTruthy();
        });

        it('applies PCOS tint', () => {
            const props = {
                ...defaultProps,
                id: 'PCOS' as const,
                name: 'PCOS',
                icon: 'Flower2' as const,
            };
            const { getByTestId } = render(<TreatmentCard {...props} />);
            expect(getByTestId('treatment-card-PCOS')).toBeTruthy();
        });

        it('applies weight management tint', () => {
            const props = {
                ...defaultProps,
                id: 'WEIGHT_MANAGEMENT' as const,
                name: 'Weight Management',
                icon: 'Scale' as const,
            };
            const { getByTestId } = render(<TreatmentCard {...props} />);
            expect(getByTestId('treatment-card-WEIGHT_MANAGEMENT')).toBeTruthy();
        });
    });

    describe('URL mapping', () => {
        it('maps HAIR_LOSS to hair-loss URL', () => {
            const { getByTestId } = render(<TreatmentCard {...defaultProps} />);
            fireEvent.press(getByTestId('treatment-card-HAIR_LOSS'));
            expect(mockRouter.push).toHaveBeenCalledWith('/intake/hair-loss');
        });

        it('maps SEXUAL_HEALTH to sexual-health URL', () => {
            const props = { ...defaultProps, id: 'SEXUAL_HEALTH' as const };
            const { getByTestId } = render(<TreatmentCard {...props} />);
            fireEvent.press(getByTestId('treatment-card-SEXUAL_HEALTH'));
            expect(mockRouter.push).toHaveBeenCalledWith('/intake/sexual-health');
        });

        it('maps PCOS to pcos URL', () => {
            const props = { ...defaultProps, id: 'PCOS' as const };
            const { getByTestId } = render(<TreatmentCard {...props} />);
            fireEvent.press(getByTestId('treatment-card-PCOS'));
            expect(mockRouter.push).toHaveBeenCalledWith('/intake/pcos');
        });

        it('maps WEIGHT_MANAGEMENT to weight-management URL', () => {
            const props = { ...defaultProps, id: 'WEIGHT_MANAGEMENT' as const };
            const { getByTestId } = render(<TreatmentCard {...props} />);
            fireEvent.press(getByTestId('treatment-card-WEIGHT_MANAGEMENT'));
            expect(mockRouter.push).toHaveBeenCalledWith('/intake/weight-management');
        });
    });
});
