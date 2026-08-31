import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  ClassListResponse,
  EmptyResponse,
  StudentDashboardAssignments,
  StudentDashboardSummary,
  TeacherDashboardAssignments,
  TeacherDashboardSummary,
  TeacherUnsubmittedResponse,
} from '../types';

export async function fetchTeacherClassesApi(): Promise<ClassListResponse> {
  return api.get(API_ENDPOINTS.teacher.classes);
}

export async function fetchStudentDashboardSummaryApi(): Promise<StudentDashboardSummary> {
  return api.get(API_ENDPOINTS.student.dashboardSummary);
}

export async function fetchStudentDashboardAssignmentsApi(): Promise<StudentDashboardAssignments> {
  return api.get(API_ENDPOINTS.student.dashboardAssignments);
}

export async function fetchTeacherDashboardSummaryApi(): Promise<TeacherDashboardSummary> {
  return api.get(API_ENDPOINTS.teacher.dashboardSummary);
}

export async function fetchTeacherUnsubmittedApi(): Promise<TeacherUnsubmittedResponse> {
  return api.get(API_ENDPOINTS.teacher.dashboardUnsubmitted);
}

export async function fetchTeacherDashboardAssignmentsApi(): Promise<TeacherDashboardAssignments> {
  return api.get(API_ENDPOINTS.teacher.dashboardAssignments);
}

export async function deleteTeacherAssignmentApi(
  assignmentId: number | string,
): Promise<EmptyResponse> {
  return api.delete(API_ENDPOINTS.teacher.deleteAssignment(assignmentId));
}
