import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { ChatRegenerateRequest, ChatRegenerateResponse } from '../types';

export async function regenerateChatApi(
  payload: ChatRegenerateRequest,
): Promise<ChatRegenerateResponse> {
  return api.post<ChatRegenerateResponse>(API_ENDPOINTS.chat.regenerate, payload);
}
