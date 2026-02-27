/**
 * Video Session Screen — DEV BYPASS Tests
 *
 * Full video session tests are commented out while HMS integration is
 * being stabilised. These tests verify the bypass screen renders correctly.
 *
 * When video is re-enabled, restore from git:
 *   git checkout HEAD~1 -- mobile/app/video/session/__tests__/videoSessionId.test.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useLocalSearchParams: () => ({ videoSessionId: 'vs-1' }),
}));

jest.mock('@/theme', () => ({
    colors: { background: '#fff', text: '#000', textSecondary: '#666', primary: '#000', primaryText: '#fff', success: '#059669' },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    borderRadius: { full: 999 },
    typography: { headingSmall: {}, bodySmall: {}, button: {} },
}));

import VideoSessionScreen from '../[videoSessionId]';

describe('VideoSessionScreen (dev bypass)', () => {
    beforeEach(() => { mockPush.mockClear(); });

    it('renders the bypass completed screen', () => {
        const { getByText } = render(<VideoSessionScreen />);
        expect(getByText('Video Consultation')).toBeTruthy();
        expect(getByText('Completed')).toBeTruthy();
    });

    it('shows an informational message', () => {
        const { getByText } = render(<VideoSessionScreen />);
        expect(getByText(/Your doctor will review your case/i)).toBeTruthy();
    });

    it('navigates home when Return Home is tapped', () => {
        const { getByText } = render(<VideoSessionScreen />);
        fireEvent.press(getByText('Return Home'));
        expect(mockPush).toHaveBeenCalledWith('/(tabs)');
    });
});
