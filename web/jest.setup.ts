import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

afterEach(async () => {
    cleanup();
    // Flush pending microtasks/timers between tests to prevent leakage
    await new Promise((resolve) => setTimeout(resolve, 0));
});
