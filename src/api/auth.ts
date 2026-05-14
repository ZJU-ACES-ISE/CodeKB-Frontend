import client from './client';
import type { LoginResponse, User } from '@/types/api';

export const authApi = {
  login(username: string, password: string) {
    return client.post<LoginResponse, LoginResponse>('/auth/login', { username, password });
  },
  me() {
    return client.get<User, User>('/auth/me');
  },
  logout() {
    return client.post<void, void>('/auth/logout');
  },
};
