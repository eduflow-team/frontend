export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  teacher: {
    stage1Publish: '/teacher/stage1/publish',
    stage2Publish: '/teacher/stage2/publish',
    stage3Publish: '/teacher/stage3/publish',
    stage4Publish: '/teacher/stage4/publish',
    dashboard: '/teacher/dashboard',
    students: '/teacher/students',
  },
  student: {
    dashboard: '/student/dashboard',
    stage1Submit: '/student/stage1/submit',
    stage2Explain: '/student/stage2/explain',
    stage3Submit: '/student/stage3/submit',
    stage4Submit: '/student/stage4/submit',
  },
  chat: {
    regenerate: '/chat/regenerate',
    session: (sessionId: string) => `/chat/sessions/${sessionId}`,
  },
} as const;
