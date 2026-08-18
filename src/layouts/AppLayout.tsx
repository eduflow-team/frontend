import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  PAGE_TITLES,
  STUDENT_LEARNING_MODES,
  STUDENT_TOP_NAV,
  TEACHER_NAV,
  learningModeByStage,
} from '../constants/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, leaveApi } from '../api';
import { NavLinkItem } from '../components/common';
import { TopbarSearch } from '../components/TopbarSearch';

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

function isStudentLearnPath(pathname: string) {
  return /\/student\/(?:(?:hist|sci|soc)\/)?stage\//.test(pathname);
}

function studentLearnHref(pathname: string) {
  if (isStudentLearnPath(pathname)) {
    return pathname;
  }
  return '/student/stage/1';
}

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  if (/^\/teacher\/students\/\d+$/.test(pathname)) return '학생 리포트';

  const modeMatch = pathname.match(/^\/student\/(?:(?:hist|sci|soc)\/)?stage\/(\d)$/);
  if (modeMatch) {
    const mode = learningModeByStage(Number(modeMatch[1]));
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

  const accountActions = (
    <>
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
    </>
  );

  if (!isTeacher) {
    const learnActive = isStudentLearnPath(location.pathname);

    return (
      <div className="app-shell is-student">
        <header className="s-chrome">
          <Link to="/student" className="s-logo">
            Edu<span>flow</span>
          </Link>
          <nav className="s-pills" aria-label="학생 메뉴">
            {STUDENT_TOP_NAV.map((item) => {
              if (item.match === 'learn') {
                return (
                  <Link
                    key={item.label}
                    to={studentLearnHref(location.pathname)}
                    className={`s-pill${learnActive ? ' on' : ''}`}
                  >
                    {item.label}
                  </Link>
                );
              }
              if (item.match === 'exact') {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end
                    className={({ isActive }) => `s-pill${isActive ? ' on' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                );
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `s-pill${isActive ? ' on' : ''}`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="s-chrome-right">
            <TopbarSearchGate />
            {accountActions}
            <div className="s-chip">
              <span className="av">{avatarInitial}</span>
              <span>
                {user.name} · {userSub}
              </span>
            </div>
          </div>
        </header>

        {learnActive ? (
          <nav className="s-modebar" aria-label="학습 모드">
            {STUDENT_LEARNING_MODES.map((mode) => {
              const active =
                location.pathname === mode.path || location.pathname.endsWith(`/stage/${mode.stage}`);
              return (
                <Link key={mode.path} to={mode.path} className={`s-mode-pill${active ? ' on' : ''}`}>
                  {mode.module}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell is-teacher">
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
            {`${user.subject ?? '한국사'} · 전체 학급 관리`}
          </div>
        </div>

        <TeacherSidebar />

        <div className="sidebar-user">
          <div className="sidebar-user-inner">
            <div className="avatar">{avatarInitial}</div>
            <div className="user-info">
              <div className="user-name">{user.name} 선생님</div>
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
          {accountActions}
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
