import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, SearchEmptyState } from '../empty-state';

describe('EmptyState', () => {
    it('should render default title and message', () => {
        render(<EmptyState />);
        expect(screen.getByText('No data yet')).toBeDefined();
        expect(screen.getByText('There is nothing to display here at the moment.')).toBeDefined();
    });

    it('should render custom title and message', () => {
        render(<EmptyState title="Custom Title" message="Custom message" />);
        expect(screen.getByText('Custom Title')).toBeDefined();
        expect(screen.getByText('Custom message')).toBeDefined();
    });

    it('should render action button when provided', () => {
        const onClick = jest.fn();
        render(<EmptyState action={{ label: 'Add Item', onClick }} />);
        const button = screen.getByRole('button', { name: 'Add Item' });
        expect(button).toBeDefined();
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should render compact variant', () => {
        const { container } = render(<EmptyState compact />);
        // Compact variant uses flex row layout
        expect(container.querySelector('.flex.items-center')).not.toBeNull();
    });

    it('should render type-specific content', () => {
        render(<EmptyState type="messages" />);
        expect(screen.getByText('No messages')).toBeDefined();
    });
});

describe('SearchEmptyState', () => {
    it('should include search query in message', () => {
        render(<SearchEmptyState query="test" />);
        expect(screen.getByText(/test/)).toBeDefined();
    });

    it('should show clear button when onClear provided', () => {
        const onClear = jest.fn();
        render(<SearchEmptyState query="test" onClear={onClear} />);
        const button = screen.getByRole('button', { name: 'Clear search' });
        fireEvent.click(button);
        expect(onClear).toHaveBeenCalled();
    });
});
