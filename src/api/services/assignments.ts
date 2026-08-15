import { api, apiRequest, ApiError, getAccessToken } from '../client';
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
  Stage2SetCreateResponse,
  Stage2SetDetailResponse,
  Stage2SetPublishResponse,
  Step2CorrectionRequest,
  Step2CorrectionResponse,
  Step2HighlightRequest,
  Step2HighlightResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

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

export async function fetchStudentStep2DocumentBlobApi(
  assignmentId: number | string,
): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE}${API_ENDPOINTS.student.assignmentStep2Document(assignmentId)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { detail?: unknown };
      detail = typeof body.detail === 'string' ? body.detail : '';
    } catch {
      detail = '';
    }
    throw new ApiError(detail || `PDF를 불러오지 못했습니다. (${response.status})`, response.status);
  }

  return response.blob();
}

export interface TeacherStep1CreateForm {
  class_id: number;
  subject: string;
  question: string;
  guideline: string;
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
  body.append('guideline', form.guideline);
  body.append('default_chunk_size', String(form.default_chunk_size ?? 200));
  body.append('default_top_k', String(form.default_top_k ?? 2));
  body.append('default_temperature', String(form.default_temperature ?? 0.9));
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
  body.append('expected_error_count', '1');
  body.append('file', form.file);

  return apiRequest<Stage2CreateResponse>(API_ENDPOINTS.teacher.createAssignmentStep2, {
    method: 'POST',
    body,
  });
}

export interface TeacherStep2SetCreateForm {
  title: string;
  subject: string;
  question: string;
  persona: string;
  hallucination_types: string[];
  card_count: number;
  file: File;
}

function buildTeacherStep2SetForm(form: TeacherStep2SetCreateForm): FormData {
  const body = new FormData();
  body.append('title', form.title);
  body.append('subject', form.subject);
  body.append('question', form.question);
  body.append('persona', form.persona);
  body.append('hallucination_types', JSON.stringify(form.hallucination_types));
  body.append('card_count', String(form.card_count));
  body.append('file', form.file);
  return body;
}

export async function createTeacherAssignmentStep2SetApi(
  form: TeacherStep2SetCreateForm,
): Promise<Stage2SetCreateResponse> {
  return apiRequest<Stage2SetCreateResponse>(API_ENDPOINTS.teacher.createAssignmentStep2Set, {
    method: 'POST',
    body: buildTeacherStep2SetForm(form),
  });
}

export async function fetchTeacherAssignmentStep2SetApi(
  setId: number | string,
): Promise<Stage2SetDetailResponse> {
  return api.get(API_ENDPOINTS.teacher.assignmentStep2Set(setId));
}

export async function publishTeacherAssignmentStep2SetApi(
  setId: number | string,
  assignmentIds: number[],
): Promise<Stage2SetPublishResponse> {
  return api.patch(API_ENDPOINTS.teacher.assignmentStep2Set(setId), {
    assignment_ids: assignmentIds,
  });
}
