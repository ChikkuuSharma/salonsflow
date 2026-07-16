// Global setup file for Jest unit testing
jest.mock('@whiskeysockets/baileys', () => {
  return {
    __esModule: true,
    default: jest.fn().mockReturnValue({
      ev: {
        on: jest.fn(),
      },
      end: jest.fn(),
      logout: jest.fn(),
    }),
    DisconnectReason: {
      loggedOut: 401,
      timedOut: 408,
      connectionLost: 408,
      connectionClosed: 428,
      connectionReplaced: 440,
      restartRequired: 515,
    },
    initAuthCreds: jest.fn().mockReturnValue({}),
    BufferJSON: {
      replacer: jest.fn(),
      reviver: jest.fn(),
    },
  };
});
