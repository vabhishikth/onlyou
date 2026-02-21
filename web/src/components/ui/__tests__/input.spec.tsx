import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
    it('should render with placeholder', () => {
        render(<Input placeholder="Enter text" />);
        expect(screen.getByPlaceholderText('Enter text')).toBeDefined();
    });

    it('should handle value changes', () => {
        const onChange = jest.fn();
        render(<Input onChange={onChange} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
        expect(onChange).toHaveBeenCalled();
    });

    it('should display error message', () => {
        render(<Input error="Required field" />);
        expect(screen.getByText('Required field')).toBeDefined();
    });

    it('should apply error styling when error present', () => {
        const { container } = render(<Input error="Invalid" />);
        const input = container.querySelector('input');
        expect(input?.className).toContain('border-destructive');
    });
});
