import { apiFetch } from '@/common/lib/apiClient';
import { API } from '@/common/routes';
import type { SessionUser } from '@/common/types';
import type { LoginInput, SignupInput } from './auth.schemas';

export const authService = {
  login: (input: LoginInput) =>
    apiFetch<{ user: SessionUser }>(API.login, { method: 'POST', body: JSON.stringify(input) }),
  signup: (input: SignupInput) =>
    apiFetch<{ user: SessionUser }>(API.signup, { method: 'POST', body: JSON.stringify(input) }),
  logout: () => apiFetch<{ ok: true }>(API.logout, { method: 'POST' }),
};
