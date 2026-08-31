import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  PAGE_TITLES,
  STUDENT_NAV,
  STUDENT_SUBJECT_NAV,
  TEACHER_NAV,
  learningModeByStage,
  subjectPageTitle,
} from '../constants/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, leaveApi } from '../api';
import { NavLinkItem } from '../components/common';
import { TopbarSearch } from '../components/TopbarSearch';

function TopbarSearchGate() {
  const { user } = useAuth();
  return <TopbarSearch role={user?.role} />;
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function TeacherSidebar() {
  return (
    <nav className="sidebar-nav">
      {TEACHER_NAV.map((section) => (
        <div key={section.label}>
          <div className="nav-section-label">{section.label}</div>
          {section.items.map((item) => (
            <NavLinkItem
              key={item.path}
              to={item.path}
              label={item.label}
              badge={item.badge}
              end={item.path === '/teacher'}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

function StudentSidebar() {
  return (
    <nav className="sidebar-nav">
      {STUDENT_NAV.map((section) => (
        <div key={section.label}>
          <div className="nav-section-label">{section.label}</div>
          {section.items.map((item) => (
            <NavLinkItem
              key={item.path}
              to={item.path}
              label={item.label}
              end={item.path === '/student'}
            />
          ))}
        </div>
      ))}

      <div className="nav-section-label">과목</div>
      {STUDENT_SUBJECT_NAV.map((item) => (
        <NavLinkItem key={item.path} to={item.path} label={item.label} />
      ))}
    </nav>
  );
}

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  if (/^\/teacher\/students\/\d+$/.test(pathname)) return '학생 리포트';

  const teacherSubjectMatch = pathname.match(/^\/teacher\/subject\/([^/]+)$/);
  if (teacherSubjectMatch) return subjectPageTitle(teacherSubjectMatch[1]);

  const studentSubjectMatch = pathname.match(/^\/student\/subject\/([^/]+)$/);
  if (studentSubjectMatch) return subjectPageTitle(studentSubjectMatch[1]);

  const modeMatch = pathname.match(/^\/student\/(?:(hist|sci|soc)\/)?stage\/(\d)$/);
  if (modeMatch) {
    const mode = learningModeByStage(Number(modeMatch[2]));
    return mode?.module ?? '학습 모드';
  }

  return '페이지';
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const isTeacher = user.role === 'teacher';
  const pageTitle = resolvePageTitle(location.pathname);
  const avatarInitial = user.name.charAt(0);
  const roleLabel = isTeacher ? '선생님' : '학생';
  const userSub = isTeacher
    ? `${user.subject ?? '한국사'} · 전체 학급`
    : (user.className ?? '3학년 2반');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLeave = async () => {
    if (!window.confirm('정말 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      await leaveApi();
      await logout();
      navigate('/login');
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '탈퇴에 실패했습니다.');
    }
  };

  return (
    <div className={`app-shell ${isTeacher ? 'role-teacher' : 'role-student'}`}>
      <aside
        className={`sidebar${sidebarOpen ? '' : ' collapsed'}${mobileOpen ? ' open-mobile' : ''}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="mark">E</div>
            <div className="name">에듀플로우</div>
          </div>
          <div className="sidebar-role-badge">{roleLabel}</div>
          <div className="sidebar-subject">
            {isTeacher ? `${user.subject ?? '한국사'} · 전체 학급 관리` : '내 학습 현황'}
          </div>
        </div>

        {isTeacher ? <TeacherSidebar /> : <StudentSidebar />}

        <div className="sidebar-user">
          <div className="sidebar-user-inner">
            <div className="avatar">{avatarInitial}</div>
            <div className="user-info">
              <div className="user-name">
                {user.name}
                {isTeacher ? ' 선생님' : ''}
              </div>
              <div className="user-sub">{userSub}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className={`main${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
        <header className="topbar">
          <button
            type="button"
            className="sidebar-toggle"
            title="메뉴"
            aria-label="메뉴"
            onClick={() => {
              if (window.innerWidth <= 760) {
                setMobileOpen((v) => !v);
              } else {
                setSidebarOpen((v) => !v);
              }
            }}
          >
            <MenuIcon />
          </button>
          <div className="topbar-title">{pageTitle}</div>
          <TopbarSearchGate />
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLeave}>
            탈퇴
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            로그아웃
          </button>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
