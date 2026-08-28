import { Link } from 'react-router-dom';
import { SUBJECT_OPTIONS } from '../../constants/assignments';

interface SubjectTabsProps {
  basePath: '/teacher' | '/student';
  activeSubject?: string | null;
  showAll?: boolean;
}

export function SubjectTabs({ basePath, activeSubject, showAll = true }: SubjectTabsProps) {
  return (
    <div className="subject-tabs" role="tablist" aria-label="과목 선택">
      {showAll ? (
        <Link
          to={basePath}
          className={`subject-tab${!activeSubject ? ' active' : ''}`}
          role="tab"
          aria-selected={!activeSubject}
        >
          전체
        </Link>
      ) : null}
      {SUBJECT_OPTIONS.map((subject) => (
        <Link
          key={subject.value}
          to={`${basePath}/subject/${subject.value}`}
          className={`subject-tab${activeSubject === subject.value ? ' active' : ''}`}
          role="tab"
          aria-selected={activeSubject === subject.value}
        >
          {subject.label}
        </Link>
      ))}
    </div>
  );
}
