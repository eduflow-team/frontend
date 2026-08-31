import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  clearTokens,
  fetchMeApi,
  fromApiRole,
  getAccessToken,
  getRefreshToken,
  loginApi,
  logoutApi,
  signupApi,
  toApiRole,
} from '../api';
import type { MeResponse, SignupRequest } from '../api/types';
import type { User, UserRole } from '../types';

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  classId?: number | null;
  signupCode?: string | null;
}

type AuthResult = { ok: true; role: UserRole } | { ok: false; error: string };

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (payload: SignupPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;
  syncSession: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function meToUser(me: MeResponse): User {
  return {
    userId: me.user_id,
    name: me.name,
    email: me.email ?? '',
    role: fromApiRole(me.role),
  };
}

function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('eduflow_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved) as User;
    } catch {
      return null;
    }
  });
  const [authReady, setAuthReady] = useState(false);

  const persist = useCallback((next: User | null) => {
    setUser(next);
    if (next) {
      localStorage.setItem('eduflow_user', JSON.stringify(next));
    } else {
      localStorage.removeItem('eduflow_user');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          // 토큰 없이 user만 남은 경우 API 401 방지
          persist(null);
          setAuthReady(true);
        }
        return;
      }

      try {
        const me = await fetchMeApi();
        if (!cancelled) persist(meToUser(me));
      } catch {
        clearTokens();
        if (!cancelled) persist(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [persist]);

  useEffect(() => {
    const onExpired = () => {
      clearTokens();
      persist(null);
    };
    window.addEventListener('eduflow:auth-expired', onExpired);
    return () => window.removeEventListener('eduflow:auth-expired', onExpired);
  }, [persist]);

  const applyRemoteUser = useCallback(
    (me: MeResponse) => {
      const nextUser = meToUser(me);
      persist(nextUser);
      return nextUser;
    },
    [persist],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!email.trim() || !password) {
        return { ok: false, error: '이메일과 비밀번호를 입력해 주세요.' };
      }

      try {
        await loginApi({ email: email.trim(), password });
        const me = await fetchMeApi();
        const nextUser = applyRemoteUser(me);
        return { ok: true, role: nextUser.role };
      } catch (error) {
        clearTokens();
        return { ok: false, error: authErrorMessage(error) };
      }
    },
    [applyRemoteUser],
  );

  const signup = useCallback(
    async (payload: SignupPayload): Promise<AuthResult> => {
      if (
        !payload.name.trim() ||
        !payload.email.trim() ||
        !payload.password ||
        !payload.phone.trim()
      ) {
        return { ok: false, error: '필수 항목을 모두 입력해 주세요.' };
      }

      const body: SignupRequest = {
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        password: payload.password,
        role: toApiRole(payload.role),
        class_id: payload.role === 'student' ? (payload.classId ?? null) : null,
        signup_code: payload.role === 'teacher' ? (payload.signupCode ?? null) : null,
      };

      try {
        await signupApi(body);
        await loginApi({ email: body.email, password: payload.password });
        const me = await fetchMeApi();
        const nextUser = meToUser(me);
        persist(nextUser);
        return { ok: true, role: nextUser.role };
      } catch (error) {
        clearTokens();
        return { ok: false, error: authErrorMessage(error) };
      }
    },
    [persist],
  );

  const syncSession = useCallback(async (): Promise<AuthResult> => {
    try {
      const me = await fetchMeApi();
      const nextUser = applyRemoteUser(me);
      return { ok: true, role: nextUser.role };
    } catch (error) {
      clearTokens();
      persist(null);
      return { ok: false, error: authErrorMessage(error) };
    }
  }, [applyRemoteUser, persist]);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await logoutApi({ refresh_token: refresh });
      } catch {
        // 로컬 세션은 항상 정리
      }
    }
    clearTokens();
    persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      authReady,
      login,
      signup,
      logout,
      syncSession,
    }),
    [user, authReady, login, signup, logout, syncSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
