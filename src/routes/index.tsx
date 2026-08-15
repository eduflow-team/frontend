import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { RolePickerPage } from '../pages/RolePickerPage';
import { StudentDashboardPage } from '../pages/student/DashboardPage';
import {
  StudentAttendancePage,
  StudentNoticesPage,
  StudentResultsPage,
  StudentStagePage,
} from '../pages/student/StudentPages';
import { TeacherDashboardPage } from '../pages/teacher/DashboardPage';
import {
  TeacherAttendancePage,
  TeacherGradesPage,
  TeacherMaterialsPage,
  TeacherMessagesPage,
  TeacherNoticesPage,
  TeacherStudentsPage,
} from '../pages/teacher/ManagementPages';
import { TeacherStudentReportPage } from '../pages/teacher/TeacherStudentReportPage';
import { TeacherStagePage } from '../pages/teacher/StagePage';
import { GuestRoute, ProtectedRoute, RootRedirect } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/role-picker', element: <RolePickerPage /> }],
  },
  {
    element: <ProtectedRoute allowedRole="teacher" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/teacher', element: <TeacherDashboardPage /> },
          { path: '/teacher/stage/:stage', element: <TeacherStagePage /> },
          { path: '/teacher/materials', element: <TeacherMaterialsPage /> },
          { path: '/teacher/students', element: <TeacherStudentsPage /> },
          { path: '/teacher/students/:studentId', element: <TeacherStudentReportPage /> },
          { path: '/teacher/grades', element: <TeacherGradesPage /> },
          { path: '/teacher/attendance', element: <TeacherAttendancePage /> },
          { path: '/teacher/notices', element: <TeacherNoticesPage /> },
          { path: '/teacher/messages', element: <TeacherMessagesPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRole="student" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/student', element: <StudentDashboardPage /> },
          { path: '/student/stage/:stage', element: <StudentStagePage /> },
          { path: '/student/:subject/stage/:stage', element: <StudentStagePage /> },
          { path: '/student/results', element: <StudentResultsPage /> },
          { path: '/student/attendance', element: <StudentAttendancePage /> },
          { path: '/student/notices', element: <StudentNoticesPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
