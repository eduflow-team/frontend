import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  PAGE_TITLES,
  STUDENT_NAV,
  STUDENT_SUBJECTS,
  TEACHER_NAV,
  learningModeByStage,
  subjectPageTitle,
} from '../constants/navigation';
import { normalizeSubjectKey } from '../constants/assignments';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, leaveApi } from '../api';
import { NavLinkItem } from '../components/common';
import { TopbarSearch } from '../components/TopbarSearch';
import type { SubjectKey } from '../types';

function TopbarSearchGate() {
  const { user } = useAuth();
  if (user?.isDemo) {
    return (
      <div className="topbar-search">
        <input type="text" placeholder="과제 · 학생 · 공지 검색" disabled />
      </div>
    );
  }
  return <TopbarSearch role={user?.role} />;
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
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
  const location = useLocation();
  const subjectMatch = location.pathname.match(/^\/student\/subject\/([^/]+)/);
  const activeSubject = subjectMatch?.[1] ?? null;
  const [openSubject, setOpenSubject] = useState<SubjectKey | null>(
    () => normalizeSubjectKey(activeSubject) as SubjectKey,
  );

  const isSubjectOpen = (key: SubjectKey) => openSubject === key;

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
      {STUDENT_SUBJECTS.map((subject) => {
        const open = isSubjectOpen(subject.key);
        const onSubjectPage =
          location.pathname === `/student/subject/${subject.key}` ||
          location.pathname.startsWith(`/student/${subject.key}/`);
        return (
          <div key={subject.key} className="nav-subject-group">
            <button
              type="button"
              className={`nav-subject-head${open || onSubjectPage ? ' open' : ''}`}
              onClick={() => setOpenSubject((prev) => (prev === subject.key ? null : subject.key))}
              aria-expanded={open || onSubjectPage}
            >
              <span>{subject.name}</span>
              <span className="nav-chevron" aria-hidden="true">
                ▾
              </span>
            </button>
            <div className={`nav-sub-items${open || onSubjectPage ? ' show' : ''}`}>
              <Link
                to={`/student/subject/${subject.key}`}
                className={`nav-sub-item${location.pathname === `/student/subject/${subject.key}` ? ' active' : ''}`}
              >
                과제 목록
              </Link>
              {subject.activities.map((activity) => (
                <Link
                  key={activity.id}
                  to={activity.path}
                  className={`nav-sub-item mode-nav-item${
                    location.pathname === activity.path ? ' active' : ''
                  }`}
                >
                  <span className="mode-nav-icon" aria-hidden="true">
                    {learningModeByStage(activity.stage)?.icon ?? '◇'}
                  </span>
                  <span className="mode-nav-label">{activity.title}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
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
    if (user.isDemo) return;
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
    <div className="app-shell">
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
          <button type="button" className="topbar-icon-btn" title="알림" aria-label="알림">
            <BellIcon />
            <span className="dot" />
          </button>
          {!user.isDemo && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLeave}>
              탈퇴
            </button>
          )}
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
