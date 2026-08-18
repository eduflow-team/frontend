/** 백엔드 `users.role` / auth 스키마와 동일한 값 */
export type ApiRole = 'STUDENT' | 'TEACHER';

export type SocialProvider = 'kakao' | 'google' | 'apple';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'PENDING';

export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

/** FastAPI 기본 에러 본문 */
export interface ApiErrorBody {
  detail: string | { msg: string }[];
}

/** 빈 JSON 객체 응답 `{}` */
export type EmptyResponse = Record<string, never>;

export type HallucinationType =
  | 'PERSONA_BIAS'
  | 'INFORMATION_FABRICATION'
  | 'RETRIEVAL_ERROR';

export const STAGE1_CHUNK_SIZE_PRESETS = [50, 200, 500, 1200, 3000] as const;

export interface Stage1Parameters {
  chunk_size: number;
  top_k: number;
  temperature: number;
}

export interface Stage1AttemptsInfo {
  max_attempts?: number;
  used_attempts: number;
  remaining_attempts: number;
}

export interface Stage1AssignmentDetailResponse {
  assignment_id: number;
  question: string;
  due_at?: string | null;
  parameter_explanations: {
    chunk_size: string;
    top_k: string;
    temperature: string;
  };
  default_parameters: Stage1Parameters;
  attempts: Stage1AttemptsInfo;
  highest_score: number | null;
  best_parameters: Stage1Parameters | null;
  document_filename?: string | null;
  document_url?: string | null;
  document_text?: string | null;
  subject?: string | null;
  is_answer_revealed?: boolean;
  correct_answer?: string | null;
}

export interface Stage1ChatRequest {
  message: string;
  parameters: Stage1Parameters;
}

export interface Stage1ChatResponse {
  ai_response: string;
  rag_process_visualization: {
    total_chunks: number;
    retrieved_chunks: number;
    vector_search_score: number;
    retrieved_chunk_previews?: string[];
    approx_context_chars?: number;
  };
}

export interface Stage1SubmitRequest {
  final_parameters: Stage1Parameters;
  student_answer: string;
}

export interface Stage1SubmitResponse {
  current_score: number;
  highest_score: number;
  is_highest_score: boolean;
  is_correct: boolean;
  evaluation_report: {
    is_correct: boolean;
    correct_score: number;
    resource_penalty: number;
    feedback: string;
  };
  attempts: {
    used_attempts: number;
    remaining_attempts: number;
  };
  correct_answer?: string | null;
}

export interface Stage1CreateResponse {
  assignment_id: number;
  created_at: string | null;
  due_at?: string | null;
  question: string;
}

export interface HallucinationTypeOption {
  value: HallucinationType | string;
  label: string;
  description: string;
}

export interface Stage2AssignmentDetailResponse {
  assignment_id: number;
  title: string;
  reference_document_text: string;
  question: string;
  flawed_ai_response: string;
  due_at?: string | null;
  expected_error_count: number;
  hallucination_type_options: HallucinationTypeOption[];
  hallucination_type_hints: string[];
  status: ProgressStatus | string;
  highlight_phase_complete: boolean;
  remaining_errors_to_find: number;
  attempts: {
    max_attempts?: number;
    used_attempts: number;
    remaining_attempts: number;
  };
  cleared_highlights: string[];
}

export interface Stage2GeneratedError {
  answer_id: number;
  error_sentence: string;
  error_type: HallucinationType | string;
  start_index: number;
  end_index: number;
  correct_sentence: string;
  hallucination_reason: string;
  evidence_sentence: string;
}

export interface Stage2CreateResponse {
  assignment_id: number;
  title: string;
  question: string;
  flawed_ai_response: string;
  due_at?: string | null;
  expected_error_count: number;
  generated_errors: Stage2GeneratedError[];
}

export interface Step2HighlightSubmission {
  highlighted_text: string;
  student_error_type: HallucinationType;
  student_reason: string;
}

export interface Step2HighlightRequest {
  submissions: Step2HighlightSubmission[];
}

export interface Step2HighlightResponse {
  is_all_correct: boolean;
  highlight_phase_complete: boolean;
  remaining_errors_to_find: number;
  results: {
    highlighted_text: string;
    student_error_type: string;
    student_reason: string;
    is_correct: boolean;
    evaluation_report?: {
      location_match_score?: number;
      error_type_match?: boolean;
      reasoning_score?: number;
      ai_feedback?: string;
    };
    correct_answer?: string;
    correct_error_type?: string;
  }[];
  attempts: {
    used_attempts: number;
    remaining_attempts: number;
  };
  cleared_highlights: string[];
}

export interface Step2CorrectionItem {
  original_highlight: string;
  student_answer: string;
}

export interface Step2CorrectionRequest {
  corrections: Step2CorrectionItem[];
}

export interface Step2CorrectionFeedbackDetail {
  student_found_error: string;
  student_answer: string;
  is_item_passed: boolean;
  hallucination_reason: string;
  reference_evidence: string;
  ai_feedback: string;
}

export interface Step2CorrectionResponse {
  is_passed: boolean;
  score: number;
  final_correct_sentence: string;
  feedback_details: Step2CorrectionFeedbackDetail[];
}

/* ── Auth ── */

export interface SignupRequest {
  email: string;
  name: string;
  phone: string;
  password: string;
  role: ApiRole;
  class_id?: number | null;
  signup_code?: string | null;
}

export interface SignupResponse {
  user_id: number;
  email: string;
  created_at: string;
}

export interface ClassItem {
  class_id: number;
  grade: number | null;
  class_number: number | null;
}

export interface ClassListResponse {
  classes: ClassItem[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user_id: number;
  role: ApiRole;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface MeResponse {
  user_id: number;
  name: string;
  email: string | null;
  role: ApiRole;
}

export interface SocialLoginRequest {
  social_token: string;
}

export interface SocialSignupRequest {
  social_token: string;
  name: string;
  phone: string;
  role: ApiRole;
  class_id?: number | null;
  signup_code?: string | null;
}

/* ── Dashboard ── */

export interface StageSummaryItem {
  stage: number;
  status: ProgressStatus;
  score?: number | null;
  remaining_attempts?: number | null;
}

export interface StudentDashboardSummary {
  student_name: string;
  total_score: number;
  attendance_rate: number;
  stage_summary: StageSummaryItem[];
}

export interface StudentAssignmentItem {
  assignment_id: number;
  title?: string | null;
  max_attempts?: number | null;
  score?: number | null;
  stage?: number | null;
  due_date?: string | null;
  status: ProgressStatus;
}

export interface StudentDashboardAssignments {
  assignments: StudentAssignmentItem[];
}

export interface StageSubmissionRate {
  stage: number;
  submitted_count: number;
  submission_rate: number;
  stage_average_score?: number | null;
}

export interface TeacherDashboardSummary {
  total_students: number;
  unsubmitted_count: number;
  class_average_score: number;
  stage_submission_rates: StageSubmissionRate[];
}

export interface UnsubmittedStudent {
  student_id: number;
  student_name: string;
  missing_stage: number[];
}

export interface TeacherUnsubmittedResponse {
  unsubmitted_students: UnsubmittedStudent[];
}

export interface TeacherAssignmentItem {
  assignment_id: number;
  stage?: number | null;
  title?: string | null;
  created_at?: string | null;
}

export interface TeacherDashboardAssignments {
  assignments: TeacherAssignmentItem[];
}

/* ── Attendance ── */

export interface AttendanceRecordItem {
  week?: string | null;
  date?: string | null;
  status: AttendanceStatus;
  note?: string | null;
}

export interface StudentAttendanceResponse {
  attendance_rate: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  attendance_records: AttendanceRecordItem[];
}

export interface TeacherStudentAttendance {
  student_id: number;
  student_name: string;
  attendance_rate: number;
  records: { date: string; status: AttendanceStatus; note?: string | null }[];
}

export interface TeacherAttendanceResponse {
  attendance_dates: string[];
  students: TeacherStudentAttendance[];
}

export interface TeacherAttendancePatchRequest {
  date: string;
  records: {
    student_id: number;
    status: AttendanceStatus;
    note?: string;
  }[];
}

/* ── Notices ── */

export interface NoticeItem {
  notice_id: number;
  title: string;
  content: string;
  author_name: string;
  created_at?: string | null;
  is_new: boolean;
}

export interface StudentNoticesResponse {
  total_count: number;
  notices: NoticeItem[];
}

export interface CreateNoticeRequest {
  title: string;
  content: string;
  class_id: number | null;
}

export interface CreateNoticeResponse {
  notice_id: number;
  created_at?: string | null;
}

/* ── Records ── */

export interface StudentRecordItem {
  stage: number;
  title?: string | null;
  highest_score?: number | null;
  attempts_count: number;
  ai_feedback?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface StudentRecordsResponse {
  class_total_average: number;
  records: StudentRecordItem[];
}

export interface StageDetail {
  score?: number | null;
  summary?: string | null;
}

export interface StageStatusDetail {
  status: ProgressStatus;
  score?: number | null;
}

export interface TeacherGradesStudent {
  student_id: number;
  student_name: string;
  average_score: number;
  stage_details: {
    stage_1?: StageDetail;
    stage_2?: StageDetail;
    stage_3?: StageDetail;
    stage_4?: StageDetail;
  };
}

export interface TeacherGradesResponse {
  stage_averages: {
    stage_1?: number | null;
    stage_2?: number | null;
    stage_3?: number | null;
    stage_4?: number | null;
    total_average: number;
  };
  students: TeacherGradesStudent[];
}

export interface TeacherRecordsStudent {
  student_id: number;
  student_name: string;
  stage_summary: {
    stage_1?: StageStatusDetail;
    stage_2?: StageStatusDetail;
    stage_3?: StageStatusDetail;
    stage_4?: StageStatusDetail;
  };
}

export interface TeacherRecordsStudentsResponse {
  students: TeacherRecordsStudent[];
}

/* ── Search ── */

export interface SearchResponse {
  keyword: string;
  search_results: {
    assignments: { assignment_id: number; title?: string | null; stage?: number | null }[];
    students: { student_id: number; student_name: string; email?: string | null }[];
    notices: { notice_id: number; title?: string | null; created_at?: string | null }[];
  };
}
