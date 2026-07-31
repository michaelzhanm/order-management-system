import { defineStore } from 'pinia';
import api from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN',
  },

  actions: {
    async login(username, password) {
      const data = await api.post('/auth/login', { username, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    },

    async fetchMe() {
      try {
        const data = await api.get('/auth/me');
        this.user = { ...this.user, ...data };
        localStorage.setItem('user', JSON.stringify(this.user));
        return data;
      } catch {
        this.logout();
      }
    },

    async changePassword(oldPassword, newPassword) {
      return api.put('/auth/password', { oldPassword, newPassword });
    },

    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
