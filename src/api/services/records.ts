import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  StudentRecordsResponse,
  TeacherGradesResponse,
  TeacherRecordsStudentsResponse,
} from '../types';

export async function fetchStudentRecordsApi(): Promise<StudentRecordsResponse> {
  return api.get(API_ENDPOINTS.student.records);
}

export async function fetchTeacherGradesApi(): Promise<TeacherGradesResponse> {
  return api.get(API_ENDPOINTS.teacher.recordsGrades);
}

export async function fetchTeacherRecordsStudentsApi(): Promise<TeacherRecordsStudentsResponse> {
  return api.get(API_ENDPOINTS.teacher.recordsStudents);
}
