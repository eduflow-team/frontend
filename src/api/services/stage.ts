import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  ApiSuccessResponse,
  Stage1SubmitRequest,
  Stage2ExplainRequest,
  StagePublishRequest,
  StagePublishResponse,
} from '../types';

export async function publishStage1Api(
  payload: StagePublishRequest,
): Promise<StagePublishResponse> {
  return api.post<StagePublishResponse>(API_ENDPOINTS.teacher.stage1Publish, payload);
}

export async function submitStage1Api(
  payload: Stage1SubmitRequest,
): Promise<ApiSuccessResponse> {
  return api.post<ApiSuccessResponse>(API_ENDPOINTS.student.stage1Submit, payload);
}

export async function explainStage2Api(
  payload: Stage2ExplainRequest,
): Promise<ApiSuccessResponse> {
  return api.post<ApiSuccessResponse>(API_ENDPOINTS.student.stage2Explain, payload);
}
