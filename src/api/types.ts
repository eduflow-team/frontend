import type { SubjectKey, UserRole } from '../types';

export interface ApiErrorBody {
  message: string;
  code?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginResponse {
  user: {
    name: string;
    email: string;
    role: UserRole;
    subject?: string;
    className?: string;
  };
  tokens: AuthTokens;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  subject?: string;
  className?: string;
}

export interface StagePublishRequest {
  subject: SubjectKey;
  title: string;
  materials: string[];
  persona?: string;
}

export interface StagePublishResponse {
  stageId: string;
  publishedAt: string;
}

export interface ChatRegenerateRequest {
  sessionId: string;
  message: string;
  params?: Record<string, number>;
}

export interface ChatRegenerateResponse {
  reply: string;
  sessionId: string;
}

export interface Stage1SubmitRequest {
  stageId: string;
  answer: string;
  diffNotes?: string;
}

export interface Stage2ExplainRequest {
  stageId: string;
  claimId: string;
  explanation: string;
}

export interface ApiSuccessResponse {
  ok: boolean;
  message?: string;
}
