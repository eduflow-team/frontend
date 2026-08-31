/** 백엔드 FastAPI `/api/v1` 경로 (API_BASE에 prefix 포함) */
export const API_ENDPOINTS = {
  auth: {
    signup: '/auth/signup',
    classes: '/auth/classes',
    login: '/auth/login',
    social: (provider: string) => `/auth/social/${provider}`,
    socialSignup: (provider: string) => `/auth/social/${provider}/signup`,
    logout: '/auth/logout',
    me: '/auth/me',
    leave: '/auth/leave',
    refresh: '/auth/refresh',
  },
  student: {
    dashboardSummary: '/student/dashboard/summary',
    dashboardAssignments: '/student/dashboard/assignments',
    attendance: '/student/attendance',
    notices: '/student/notices',
    records: '/student/records',
    assignmentStep1: (id: number | string) => `/student/assignments/${id}/step1`,
    assignmentStep1Document: (id: number | string) =>
      `/student/assignments/${id}/step1/document`,
    assignmentStep1Chat: (id: number | string) => `/student/assignments/${id}/step1/chat`,
    assignmentStep1Submit: (id: number | string) => `/student/assignments/${id}/step1/submit`,
    assignmentStep2: (id: number | string) => `/student/assignments/${id}/step2`,
    assignmentStep2Document: (id: number | string) =>
      `/student/assignments/${id}/step2/document`,
    assignmentStep2Highlight: (id: number | string) =>
      `/student/assignments/${id}/step2/highlight`,
    assignmentStep2Correction: (id: number | string) =>
      `/student/assignments/${id}/step2/correction`,
    assignmentStep4: (id: number | string) => `/student/assignments/${id}/step4`,
    assignmentStep4Set: (id: number | string) => `/student/assignments/${id}/step4/set`,
    assignmentStep4Chat: (id: number | string) => `/student/assignments/${id}/step4/chat`,
    assignmentStep4Submit: (id: number | string) => `/student/assignments/${id}/step4/submit`,
  },
  teacher: {
    dashboardSummary: '/teacher/dashboard/summary',
    dashboardUnsubmitted: '/teacher/dashboard/students/unsubmitted',
    dashboardAssignments: '/teacher/dashboard/assignments',
    deleteAssignment: (id: number | string) => `/teacher/dashboard/assignments/${id}`,
    attendance: '/teacher/attendance',
    notices: '/teacher/notices',
    deleteNotice: (id: number | string) => `/teacher/notices/${id}`,
    recordsGrades: '/teacher/records/grades',
    recordsStudents: '/teacher/records/students',
    createAssignmentStep1: '/teacher/assignments/step1',
    createAssignmentStep2: '/teacher/assignments/step2',
    createAssignmentStep2Set: '/teacher/assignments/step2/set',
    assignmentStep2Set: (id: number | string) => `/teacher/assignments/step2/set/${id}`,
    createAssignmentStep4: '/teacher/assignments/step4',
  },
  search: '/search',
} as const;
