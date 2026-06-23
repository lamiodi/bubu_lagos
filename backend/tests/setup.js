import { beforeAll, afterAll, vi } from 'vitest';

vi.mock('../src/db.js', () => ({
  query: vi.fn()
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn().mockReturnValue({ userId: 'test-id', type: 'customer' })
  }
}));

process.env.JWT_SECRET = 'test-secret-key';
process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
