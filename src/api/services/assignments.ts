import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { AssignmentStubResponse } from '../types';

/**
 * 과제(assignments) API — 백엔드 현재 스텁.
 * 요청/응답 스키마가 확정되면 types.ts와 함께 갱신한다.
 */
export async function getStudentStep1Api(
  assignmentId: number | string,
): Promise<AssignmentStubResponse> {
  return api.get(API_ENDPOINTS.student.assignmentStep1(assignmentId));
}

export async function postStudentStep1ChatApi(
  assignmentId: number | string,
  body?: Record<string, unknown>,
): Promise<AssignmentStubResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep1Chat(assignmentId), body ?? {});
}

export async function postStudentStep1SubmitApi(
  assignmentId: number | string,
  body?: Record<string, unknown>,
): Promise<AssignmentStubResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep1Submit(assignmentId), body ?? {});
}

export async function getStudentStep2Api(
  assignmentId: number | string,
): Promise<AssignmentStubResponse> {
  return api.get(API_ENDPOINTS.student.assignmentStep2(assignmentId));
}

export async function postStudentStep2HighlightApi(
  assignmentId: number | string,
  body?: Record<string, unknown>,
): Promise<AssignmentStubResponse> {
  return api.post(
    API_ENDPOINTS.student.assignmentStep2Highlight(assignmentId),
    body ?? {},
  );
}

export async function postStudentStep2CorrectionApi(
  assignmentId: number | string,
  body?: Record<string, unknown>,
): Promise<AssignmentStubResponse> {
  return api.post(
    API_ENDPOINTS.student.assignmentStep2Correction(assignmentId),
    body ?? {},
  );
}

export async function createTeacherAssignmentStep1Api(
  body?: Record<string, unknown>,
): Promise<AssignmentStubResponse> {
  return api.post(API_ENDPOINTS.teacher.createAssignmentStep1, body ?? {});
}

export async function createTeacherAssignmentStep2Api(
  body?: Record<string, unknown>,
): Promise<AssignmentStubResponse> {
  return api.post(API_ENDPOINTS.teacher.createAssignmentStep2, body ?? {});
}
