import React from 'react';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonList } from '../skeleton';

describe('Skeleton', () => {
    it('should render with animate-pulse class', () => {
        const { container } = render(<Skeleton />);
        expect(container.firstChild).toHaveClass('animate-pulse');
    });

    it('should accept custom className', () => {
        const { container } = render(<Skeleton className="w-32 h-4" />);
        expect(container.firstChild).toHaveClass('w-32');
        expect(container.firstChild).toHaveClass('h-4');
    });
});

describe('SkeletonCard', () => {
    it('should render with skeleton elements', () => {
        const { container } = render(<SkeletonCard />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
    });
});

describe('SkeletonList', () => {
    it('should render specified count of cards', () => {
        const { container } = render(<SkeletonList count={5} />);
        // Each card has a parent container
        const cards = container.querySelectorAll('.bg-white');
        expect(cards.length).toBe(5);
    });
});
