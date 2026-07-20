import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { SearchResponse } from '../types';

export async function searchApi(keyword: string): Promise<SearchResponse> {
  const query = new URLSearchParams({ keyword });
  return api.get(`${API_ENDPOINTS.search}?${query.toString()}`);
}
