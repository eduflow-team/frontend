import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  EmptyResponse,
  StudentAttendanceResponse,
  TeacherAttendancePatchRequest,
  TeacherAttendanceResponse,
} from '../types';

export async function fetchStudentAttendanceApi(): Promise<StudentAttendanceResponse> {
  return api.get(API_ENDPOINTS.student.attendance);
}

export async function fetchTeacherAttendanceApi(params?: {
  from?: string;
  to?: string;
}): Promise<TeacherAttendanceResponse> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const qs = query.toString();
  const path = qs
    ? `${API_ENDPOINTS.teacher.attendance}?${qs}`
    : API_ENDPOINTS.teacher.attendance;
  return api.get(path);
}

export async function patchTeacherAttendanceApi(
  payload: TeacherAttendancePatchRequest,
): Promise<EmptyResponse> {
  return api.patch(API_ENDPOINTS.teacher.attendance, payload);
}
