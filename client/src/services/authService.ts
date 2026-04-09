import api from './api';

export async function login(username: string, password: string, role: string) {
  const { data } = await api.post('/auth/login', { username, password, role });
  return data;
}

export async function adminLogin(username: string, password: string) {
  const { data } = await api.post('/auth/admin-login', { username, password });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data.user;
}
