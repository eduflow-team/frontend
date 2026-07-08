import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: UserRole) => boolean;
  signup: (payload: Omit<User, 'role'> & { role: UserRole; password: string }) => boolean;
  logout: () => void;
  enterDemo: (role: UserRole) => void;
  switchRole: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USERS: Record<UserRole, User> = {
  teacher: {
    name: '김민수',
    email: 'teacher@school.kr',
    role: 'teacher',
    subject: '한국사',
  },
  student: {
    name: '이지은',
    email: 'student@school.kr',
    role: 'student',
    className: '3학년 2반',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('eduflow_user');
    return saved ? (JSON.parse(saved) as User) : null;
  });

  const persist = useCallback((next: User | null) => {
    setUser(next);
    if (next) {
      localStorage.setItem('eduflow_user', JSON.stringify(next));
    } else {
      localStorage.removeItem('eduflow_user');
    }
  }, []);

  const login = useCallback(
    (email: string, password: string, role?: UserRole) => {
      if (!email.trim() || !password) return false;
      const resolvedRole = role ?? 'teacher';
      persist({
        ...DEMO_USERS[resolvedRole],
        email: email.trim(),
      });
      return true;
    },
    [persist],
  );

  const signup = useCallback(
    (payload: Omit<User, 'role'> & { role: UserRole; password: string }) => {
      if (!payload.name.trim() || !payload.email.trim() || !payload.password) {
        return false;
      }
      persist({
        name: payload.name.trim(),
        email: payload.email.trim(),
        role: payload.role,
        subject: payload.subject,
        className: payload.className,
      });
      return true;
    },
    [persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const enterDemo = useCallback(
    (role: UserRole) => persist(DEMO_USERS[role]),
    [persist],
  );

  const switchRole = useCallback(() => {
    if (!user) return;
    const nextRole: UserRole = user.role === 'teacher' ? 'student' : 'teacher';
    persist(DEMO_USERS[nextRole]);
  }, [persist, user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      enterDemo,
      switchRole,
    }),
    [user, login, signup, logout, enterDemo, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
