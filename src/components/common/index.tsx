import { NavLink } from 'react-router-dom';

export function BrandHeader() {
  return (
    <div className="role-brand">
      <div className="role-mark">E</div>
      <h1>에듀플로우</h1>
      <p>생성형 AI 리터러시 교육 플랫폼</p>
    </div>
  );
}

export function BrandFooter() {
  return <div className="role-foot">© 2026 에듀플로우 · v1.0</div>;
}

interface PageHeroProps {
  title: string;
  description?: string;
}

export function PageHero({ title, description }: PageHeroProps) {
  return (
    <div className="page-hero">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

interface PlaceholderCardProps {
  title: string;
  message?: string;
}

export function PlaceholderCard({
  title,
  message = '이 화면의 상세 UI는 다음 단계에서 구현됩니다.',
}: PlaceholderCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{title}</span>
      </div>
      <div className="placeholder-body">{message}</div>
    </div>
  );
}

interface NavLinkItemProps {
  to: string;
  label: string;
  badge?: number;
  end?: boolean;
}

export function NavLinkItem({ to, label, badge, end }: NavLinkItemProps) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      {label}
      {badge !== undefined && <span className="nav-badge">{badge}</span>}
    </NavLink>
  );
}
