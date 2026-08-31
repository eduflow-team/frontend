import { api, clearTokens, setTokens } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  ClassListResponse,
  EmptyResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  MeResponse,
  RefreshRequest,
  RefreshResponse,
  SignupRequest,
  SignupResponse,
} from '../types';

export async function loginApi(payload: LoginRequest): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>(API_ENDPOINTS.auth.login, payload, {
    skipAuth: true,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function signupApi(payload: SignupRequest): Promise<SignupResponse> {
  return api.post<SignupResponse>(API_ENDPOINTS.auth.signup, payload, {
    skipAuth: true,
  });
}

export async function fetchClassesApi(): Promise<ClassListResponse> {
  return api.get<ClassListResponse>(API_ENDPOINTS.auth.classes, { skipAuth: true });
}

export async function logoutApi(payload: LogoutRequest): Promise<EmptyResponse> {
  try {
    return await api.post<EmptyResponse>(API_ENDPOINTS.auth.logout, payload);
  } finally {
    clearTokens();
  }
}

export async function fetchMeApi(): Promise<MeResponse> {
  return api.get<MeResponse>(API_ENDPOINTS.auth.me);
}

export async function leaveApi(): Promise<EmptyResponse> {
  const data = await api.delete<EmptyResponse>(API_ENDPOINTS.auth.leave);
  clearTokens();
  return data;
}

export async function refreshTokenApi(
  payload: RefreshRequest,
): Promise<RefreshResponse> {
  const data = await api.post<RefreshResponse>(
    API_ENDPOINTS.auth.refresh,
    payload,
    { skipAuth: true },
  );
  setTokens(data.access_token, data.refresh_token);
  return data;
}
