export type UserRole = 'teacher' | 'student';

export type SubjectKey = 'hist' | 'sci' | 'soc';

export interface User {
  userId?: number;
  name: string;
  email: string;
  role: UserRole;
  subject?: string;
  className?: string;
  /** 백엔드 없이 UI만 볼 때 */
  isDemo?: boolean;
}

export interface NavItem {
  label: string;
  path: string;
  badge?: number;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface StudentActivity {
  id: string;
  stage: number;
  title: string;
  path: string;
}

export interface StudentSubject {
  key: SubjectKey;
  name: string;
  activities: StudentActivity[];
}
