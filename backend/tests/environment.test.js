const { validateEnv } = require('../src/config/environment');

const original = { ...process.env };

beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost/x';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
});

describe('validateEnv', () => {
    it('requires a secret', () => {
        delete process.env.JWT_SECRET;
        expect(validateEnv).toThrow(/JWT_SECRET/);
    });

    it.each(['short', 'your-secret-key-your-secret-key-your-secret', 'REPLACE_WITH_A_STRONG_RANDOM_SECRET_VALUE'])(
        'refuses a weak secret in production, and warns otherwise: %s',
        (secret) => {
            process.env.JWT_SECRET = secret;
            process.env.NODE_ENV = 'production';
            expect(validateEnv).toThrow(/random value/);
            process.env.NODE_ENV = 'development';
            expect(validateEnv).not.toThrow();
            expect(console.warn).toHaveBeenCalled();
        }
    );

    it('accepts a strong secret in production', () => {
        process.env.JWT_SECRET = 'f3'.repeat(32);
        process.env.NODE_ENV = 'production';
        expect(validateEnv).not.toThrow();
    });
});
