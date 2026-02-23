// Manual Jest mock for expo-server-sdk (ESM module incompatible with Jest CJS)

const MockExpo = jest.fn().mockImplementation(() => ({
  sendPushNotificationsAsync: jest.fn().mockResolvedValue([]),
  chunkPushNotifications: jest.fn().mockImplementation((msgs) => [msgs]),
}));

(MockExpo as any).isExpoPushToken = jest.fn().mockReturnValue(true);

export default MockExpo;
