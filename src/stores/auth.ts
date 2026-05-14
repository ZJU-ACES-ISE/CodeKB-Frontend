import { defineStore } from 'pinia';
import type { User } from '@/types/api';
import { read, remove, write } from '@/utils/storage';

interface AuthState {
  token: string;
  user: User | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: '',
    user: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    displayName: (state) => state.user?.displayName || state.user?.username || '未登录',
  },
  actions: {
    restore() {
      this.token = read<string>('token', '');
      this.user = read<User | null>('user', null);
    },
    setAuth(token: string, user: User | null) {
      this.token = token;
      this.user = user;
      write('token', token);
      write('user', user);
    },
    logout() {
      this.token = '';
      this.user = null;
      remove('token');
      remove('user');
    },
  },
});
