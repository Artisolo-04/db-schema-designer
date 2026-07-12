import { api } from './client.js';

export async function register(email, password) {
  const res = await api.post('/auth/register', { email, password });
  return res.data;
}

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function fetchMe() {
  const res = await api.get('/auth/me');
  return res.data;
}
