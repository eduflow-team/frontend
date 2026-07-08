export type UserRole = 'teacher' | 'student';

export type SubjectKey = 'hist' | 'sci' | 'soc';

export interface User {
  name: string;
  email: string;
  role: UserRole;
  subject?: string;
  className?: string;
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
