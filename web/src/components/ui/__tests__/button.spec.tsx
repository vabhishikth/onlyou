import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
    it('should render with children', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
    });

    it('should call onClick when clicked', () => {
        const onClick = jest.fn();
        render(<Button onClick={onClick}>Click</Button>);
        fireEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
        render(<Button disabled>Click</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when loading', () => {
        render(<Button loading>Submit</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show spinner SVG when loading', () => {
        const { container } = render(<Button loading>Submit</Button>);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
    });
});
