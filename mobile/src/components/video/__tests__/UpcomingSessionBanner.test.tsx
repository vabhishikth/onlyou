/**
 * UpcomingSessionBanner Component Tests
 * Phase 14 Chunk 8: Home screen banner for next video session
 * Spec: Phase 13 — Quick join CTA from home screen
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: mockPush }),
}));

import UpcomingSessionBanner from '../UpcomingSessionBanner';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('UpcomingSessionBanner', () => {
    const defaultProps = {
        videoSessionId: 'vs-1',
        scheduledTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
        doctorName: 'Dr. Sharma',
    };

    it('renders the banner with doctor name', () => {
        const { getByText } = render(<UpcomingSessionBanner {...defaultProps} />);
        expect(getByText(/Dr\. Sharma/)).toBeTruthy();
    });

    it('shows video consultation label', () => {
        const { getByText } = render(<UpcomingSessionBanner {...defaultProps} />);
        expect(getByText(/Video Consultation/i)).toBeTruthy();
    });

    it('shows Join button', () => {
        const { getByText } = render(<UpcomingSessionBanner {...defaultProps} />);
        expect(getByText('Join')).toBeTruthy();
    });

    it('navigates to video session when Join is pressed', () => {
        const { getByText } = render(<UpcomingSessionBanner {...defaultProps} />);
        fireEvent.press(getByText('Join'));
        expect(mockPush).toHaveBeenCalledWith('/video/session/vs-1');
    });

    it('shows scheduled time', () => {
        const { getByText } = render(<UpcomingSessionBanner {...defaultProps} />);
        // Should show a time string
        expect(getByText(/AM|PM|am|pm/i)).toBeTruthy();
    });

    it('renders without doctor name gracefully', () => {
        const { getByText } = render(
            <UpcomingSessionBanner {...defaultProps} doctorName={undefined} />,
        );
        expect(getByText(/Video Consultation/i)).toBeTruthy();
    });
});
