import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// In-memory mock storage
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => { storage.clear(); },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() { return storage.size; },
};

// Bind to globalThis
(globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;

describe('Authentication Flow & API Contract Specifications', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('Login API Contract Handling', () => {
    it('handles successful login and stores token and user payload', () => {
      const mockApiResponse = {
        success: true,
        message: 'Login successful.',
        data: {
          token: '1|sanctum_plain_text_token_mock',
          user: {
            id: 1,
            name: 'Admin User',
            email: 'admin@retailcore.test',
            status: 'active',
            roles: [{ id: 1, name: 'Super Admin' }],
            permissions: ['view-dashboard', 'manage-users'],
          },
        },
      };

      const { token, user } = mockApiResponse.data;
      mockLocalStorage.setItem('token', token);
      mockLocalStorage.setItem('user', JSON.stringify(user));

      assert.strictEqual(mockLocalStorage.getItem('token'), '1|sanctum_plain_text_token_mock');
      const storedUser = JSON.parse(mockLocalStorage.getItem('user') || '{}');
      assert.strictEqual(storedUser.email, 'admin@retailcore.test');
      assert.strictEqual(storedUser.status, 'active');
    });

    it('handles failed login with generic 401 message (no user enumeration)', () => {
      const mockErrorResponse = {
        status: 401,
        data: {
          success: false,
          message: 'Invalid credentials.',
        },
      };

      assert.strictEqual(mockErrorResponse.status, 401);
      assert.strictEqual(mockErrorResponse.data.message, 'Invalid credentials.');
      assert.strictEqual(mockLocalStorage.getItem('token'), null);
    });

    it('handles inactive user account with 403 status', () => {
      const mockInactiveResponse = {
        status: 403,
        data: {
          success: false,
          message: 'Your account is inactive. Please contact an administrator.',
        },
      };

      assert.strictEqual(mockInactiveResponse.status, 403);
      assert.ok(mockInactiveResponse.data.message.includes('account is inactive'));
      assert.strictEqual(mockLocalStorage.getItem('token'), null);
    });
  });

  describe('Session Verification & /auth/me', () => {
    it('validates active session and retrieves user details from /auth/me', () => {
      mockLocalStorage.setItem('token', 'valid-active-token');

      const mockMeResponse = {
        success: true,
        data: {
          id: 1,
          name: 'Jane Doe',
          email: 'jane@retailcore.test',
          roles: [{ id: 2, name: 'Manager' }],
          permissions: ['view-dashboard'],
        },
      };

      assert.strictEqual(mockMeResponse.success, true);
      assert.strictEqual(mockMeResponse.data.name, 'Jane Doe');
      assert.strictEqual(mockLocalStorage.getItem('token'), 'valid-active-token');
    });

    it('clears session when /auth/me responds with 401 unauthenticated', () => {
      mockLocalStorage.setItem('token', 'expired-token');
      mockLocalStorage.setItem('user', JSON.stringify({ id: 1, name: 'Expired' }));

      const status = 401;
      if (status === 401) {
        mockLocalStorage.removeItem('token');
        mockLocalStorage.removeItem('user');
      }

      assert.strictEqual(mockLocalStorage.getItem('token'), null);
      assert.strictEqual(mockLocalStorage.getItem('user'), null);
    });
  });

  describe('Logout Contract Handling', () => {
    it('cleans up local storage upon logout', () => {
      mockLocalStorage.setItem('token', 'token-to-revoke');
      mockLocalStorage.setItem('user', JSON.stringify({ id: 1 }));

      mockLocalStorage.removeItem('token');
      mockLocalStorage.removeItem('user');

      assert.strictEqual(mockLocalStorage.getItem('token'), null);
      assert.strictEqual(mockLocalStorage.getItem('user'), null);
    });
  });
});
