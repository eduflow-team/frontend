import { api, apiRequest, apiRequestBlob } from '../client';
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
  Stage3AssignmentDetailResponse,
  Stage3CreateRequest,
  Stage3CreateResponse,
  Stage3DebateResponse,
  Stage3FactcheckRequest,
  Stage3FactcheckResponse,
  Stage3SubmitRequest,
  Stage3SubmitResponse,
  Stage4AssignmentDetailResponse,
  Stage4ChatResponse,
  Stage4CreateRequest,
  Stage4CreateResponse,
  Stage4ReportPayload,
  Stage4SubmitResponse,
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

export async function getStudentStep1DocumentBlobApi(
  assignmentId: number | string,
): Promise<Blob> {
  return apiRequestBlob(API_ENDPOINTS.student.assignmentStep1Document(assignmentId));
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
  return apiRequestBlob(API_ENDPOINTS.student.assignmentStep2Document(assignmentId));
}

export interface TeacherStep1CreateForm {
  class_id: number;
  subject: string;
  question: string;
  answer: string;
  /** ISO 8601 (UTC 권장) */
  due_at: string;
  file: File;
}

export async function createTeacherAssignmentStep1Api(
  form: TeacherStep1CreateForm,
): Promise<Stage1CreateResponse> {
  const body = new FormData();
  body.append('class_id', String(form.class_id));
  body.append('subject', form.subject);
  body.append('question', form.question);
  body.append('answer', form.answer);
  body.append('due_at', form.due_at);
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
  body.append('due_at', form.due_at);
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
  /** ISO 8601 (UTC 권장) */
  due_at: string;
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
  body.append('due_at', form.due_at);
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

export async function createTeacherAssignmentStep4Api(
  payload: Stage4CreateRequest,
): Promise<Stage4CreateResponse> {
  return api.post(API_ENDPOINTS.teacher.createAssignmentStep4, payload);
}

export async function getStudentStep4Api(
  assignmentId: number | string,
): Promise<Stage4AssignmentDetailResponse> {
  return api.get(API_ENDPOINTS.student.assignmentStep4(assignmentId));
}

export async function postStudentStep4ChatApi(
  assignmentId: number | string,
  attack_prompt: string,
): Promise<Stage4ChatResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep4Chat(assignmentId), { attack_prompt });
}

export async function postStudentStep4SubmitApi(
  assignmentId: number | string,
  report: Stage4ReportPayload,
): Promise<Stage4SubmitResponse> {
  return api.post(API_ENDPOINTS.student.assignmentStep4Submit(assignmentId), { report });
}
