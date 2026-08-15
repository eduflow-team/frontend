import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  CreateNoticeRequest,
  CreateNoticeResponse,
  EmptyResponse,
  StudentNoticesResponse,
} from '../types';

export async function fetchStudentNoticesApi(params?: {
  page?: number;
  size?: number;
}): Promise<StudentNoticesResponse> {
  const query = new URLSearchParams();
  if (params?.page != null) query.set('page', String(params.page));
  if (params?.size != null) query.set('size', String(params.size));
  const qs = query.toString();
  const path = qs
    ? `${API_ENDPOINTS.student.notices}?${qs}`
    : API_ENDPOINTS.student.notices;
  return api.get(path);
}

export async function fetchTeacherNoticesApi(params?: {
  page?: number;
  size?: number;
}): Promise<StudentNoticesResponse> {
  const query = new URLSearchParams();
  if (params?.page != null) query.set('page', String(params.page));
  if (params?.size != null) query.set('size', String(params.size));
  const qs = query.toString();
  const path = qs
    ? `${API_ENDPOINTS.teacher.notices}?${qs}`
    : API_ENDPOINTS.teacher.notices;
  return api.get(path);
}

export async function createTeacherNoticeApi(
  payload: CreateNoticeRequest,
): Promise<CreateNoticeResponse> {
  return api.post(API_ENDPOINTS.teacher.notices, payload);
}

export async function deleteTeacherNoticeApi(
  noticeId: number | string,
): Promise<EmptyResponse> {
  return api.delete(API_ENDPOINTS.teacher.deleteNotice(noticeId));
}
