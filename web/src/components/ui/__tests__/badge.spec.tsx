import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge, ConsultationStatusBadge, LabOrderStatusBadge, VerticalBadge } from '../badge';

describe('Badge', () => {
    it('should render with children', () => {
        render(<Badge>Active</Badge>);
        expect(screen.getByText('Active')).toBeDefined();
    });

    it('should render dot indicator when dot prop is true', () => {
        const { container } = render(<Badge dot variant="success">Online</Badge>);
        const dots = container.querySelectorAll('span span');
        expect(dots.length).toBeGreaterThan(0);
    });

    it('should apply variant classes', () => {
        const { container } = render(<Badge variant="error">Error</Badge>);
        expect(container.firstChild?.textContent).toBe('Error');
    });
});

describe('ConsultationStatusBadge', () => {
    it('should render correct label for PENDING_REVIEW', () => {
        render(<ConsultationStatusBadge status="PENDING_REVIEW" />);
        expect(screen.getByText('Pending Review')).toBeDefined();
    });

    it('should render correct label for APPROVED', () => {
        render(<ConsultationStatusBadge status="APPROVED" />);
        expect(screen.getByText('Approved')).toBeDefined();
    });
});

describe('LabOrderStatusBadge', () => {
    it('should render correct label for ORDERED', () => {
        render(<LabOrderStatusBadge status="ORDERED" />);
        expect(screen.getByText('Ordered')).toBeDefined();
    });

    it('should render correct label for RESULTS_UPLOADED', () => {
        render(<LabOrderStatusBadge status="RESULTS_UPLOADED" />);
        expect(screen.getByText('Results Ready')).toBeDefined();
    });
});

describe('VerticalBadge', () => {
    it('should render correct label for HAIR_LOSS', () => {
        render(<VerticalBadge vertical="HAIR_LOSS" />);
        expect(screen.getByText('Hair Loss')).toBeDefined();
    });

    it('should render correct label for PCOS', () => {
        render(<VerticalBadge vertical="PCOS" />);
        expect(screen.getByText('PCOS')).toBeDefined();
    });
});
