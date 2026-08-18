import { api, apiRequest } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  Stage1AssignmentDetailResponse,
  Stage1ChatRequest,
  Stage1ChatResponse,
  Stage1CreateResponse,
  Stage1SubmitRequest,
  Stage1SubmitResponse,
  Stage2AssignmentDetailResponse,
  Stage2CreateResponse,
  Stage3AssignmentDetailResponse,
  Stage3CreateRequest,
  Stage3CreateResponse,
  Stage3DebateResponse,
  Stage3FactcheckRequest,
  Stage3FactcheckResponse,
  Stage3SubmitRequest,
  Stage3SubmitResponse,
  Step2CorrectionRequest,
  Step2CorrectionResponse,
  Step2HighlightRequest,
  Step2HighlightResponse,
} from '../types';

export async function getStudentStep1Api(
  assignmentId: number | string,
): Promise<Stage1AssignmentDetailResponse> {
  return api.get(API_ENDPOINTS.student.assignmentStep1(assignmentId));
}

export async function postStudentStep1ChatApi(
  assignmentId: number | string,
  body: Stage1ChatRequest,
): Promise<Stage1ChatResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep1Chat(assignmentId), body);
}

export async function postStudentStep1SubmitApi(
  assignmentId: number | string,
  body: Stage1SubmitRequest,
): Promise<Stage1SubmitResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep1Submit(assignmentId), body);
}

export async function getStudentStep2Api(
  assignmentId: number | string,
): Promise<Stage2AssignmentDetailResponse> {
  return api.get(API_ENDPOINTS.student.assignmentStep2(assignmentId));
}

export async function postStudentStep2HighlightApi(
  assignmentId: number | string,
  body: Step2HighlightRequest,
): Promise<Step2HighlightResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep2Highlight(assignmentId), body);
}

export async function postStudentStep2CorrectionApi(
  assignmentId: number | string,
  body: Step2CorrectionRequest,
): Promise<Step2CorrectionResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep2Correction(assignmentId), body);
}

/** 백엔드 Form 필수 — 학생 채팅에 고정으로 쓰는 가이드라인 */
export const STAGE1_FIXED_GUIDELINE = '오늘 학습 주제의 내용을 전체적으로 알려줘';

export interface TeacherStep1CreateForm {
  class_id: number;
  subject: string;
  question: string;
  guideline?: string;
  /** ISO 8601 (UTC 권장) */
  due_at: string;
  default_chunk_size?: number;
  default_top_k?: number;
  default_temperature?: number;
  file: File;
}

export async function createTeacherAssignmentStep1Api(
  form: TeacherStep1CreateForm,
): Promise<Stage1CreateResponse> {
  const body = new FormData();
  body.append('class_id', String(form.class_id));
  body.append('subject', form.subject);
  body.append('question', form.question);
  body.append('guideline', form.guideline?.trim() || STAGE1_FIXED_GUIDELINE);
  body.append('due_at', form.due_at);
  body.append('default_chunk_size', String(form.default_chunk_size ?? 50));
  body.append('default_top_k', String(form.default_top_k ?? 2));
  body.append('default_temperature', String(form.default_temperature ?? 1.0));
  body.append('file', form.file);

  return apiRequest<Stage1CreateResponse>(API_ENDPOINTS.teacher.createAssignmentStep1, {
    method: 'POST',
    body,
  });
}

export interface TeacherStep2CreateForm {
  title: string;
  subject: string;
  question: string;
  persona: string;
  /** ISO 8601 (UTC 권장) */
  due_at: string;
  hallucination_types: string[];
  expected_error_count: number;
  file: File;
}

export async function createTeacherAssignmentStep2Api(
  form: TeacherStep2CreateForm,
): Promise<Stage2CreateResponse> {
  const body = new FormData();
  body.append('title', form.title);
  body.append('subject', form.subject);
  body.append('question', form.question);
  body.append('persona', form.persona);
  body.append('hallucination_types', JSON.stringify(form.hallucination_types));
  body.append('expected_error_count', String(form.expected_error_count));
  body.append('file', form.file);

  return apiRequest<Stage2CreateResponse>(API_ENDPOINTS.teacher.createAssignmentStep2, {
    method: 'POST',
    body,
  });
}

export async function createTeacherAssignmentStep3Api(
  payload: Stage3CreateRequest,
): Promise<Stage3CreateResponse> {
  return api.post(API_ENDPOINTS.teacher.createAssignmentStep3, payload);
}

export async function getStudentStep3Api(
  assignmentId: number | string,
): Promise<Stage3AssignmentDetailResponse> {
  return api.get(API_ENDPOINTS.student.assignmentStep3(assignmentId));
}

export async function postStudentStep3DebateApi(
  assignmentId: number | string,
  body: { question?: string } = {},
): Promise<Stage3DebateResponse> {
  // v2 토론은 Langflow에서 약 15초+ 소요. 짧은 타임아웃을 두면 샘플로 떨어진다.
  return apiRequest<Stage3DebateResponse>(
    API_ENDPOINTS.student.assignmentStep3Debate(assignmentId),
    {
      method: 'POST',
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    },
  );
}

export async function postStudentStep3FactcheckApi(
  assignmentId: number | string,
  body: Stage3FactcheckRequest,
): Promise<Stage3FactcheckResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep3Factcheck(assignmentId), body);
}

export async function postStudentStep3SubmitApi(
  assignmentId: number | string,
  body: Stage3SubmitRequest = {},
): Promise<Stage3SubmitResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep3Submit(assignmentId), body);
}
