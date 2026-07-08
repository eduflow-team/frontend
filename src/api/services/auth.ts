import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { LoginRequest, LoginResponse, SignupRequest } from '../types';

export async function loginApi(payload: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>(API_ENDPOINTS.auth.login, payload);
}

export async function signupApi(payload: SignupRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>(API_ENDPOINTS.auth.signup, payload);
}

export async function logoutApi(): Promise<void> {
  await api.post(API_ENDPOINTS.auth.logout);
}

export async function fetchMeApi(): Promise<LoginResponse['user']> {
  return api.get<LoginResponse['user']>(API_ENDPOINTS.auth.me);
}
