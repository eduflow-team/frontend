import type { UserRole } from '../types';
import type { ApiRole } from './types';

/** UI 역할 → 백엔드 role */
export function toApiRole(role: UserRole): ApiRole {
  return role === 'teacher' ? 'TEACHER' : 'STUDENT';
}

/** 백엔드 role → UI 역할 */
export function fromApiRole(role: ApiRole): UserRole {
  return role === 'TEACHER' ? 'teacher' : 'student';
}
