import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, searchApi } from '../api';
import type { SearchResponse } from '../api/types';
import type { UserRole } from '../types';

export function TopbarSearch({ role }: { role?: UserRole }) {
  const noticesPath = role === 'teacher' ? '/teacher/notices' : '/student/notices';
  const studentsPath = role === 'teacher' ? '/teacher/students' : '/student';

  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResult(null);
      setError(q.trim() ? '검색어는 2자 이상 입력해 주세요.' : '');
      setOpen(Boolean(q.trim()));
      return;
    }
    setLoading(true);
    setError('');
    setOpen(true);
    try {
      const data = await searchApi(q.trim());
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : '검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onChange = (value: string) => {
    setKeyword(value);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => runSearch(value), 300);
  };

  const assignments = result?.search_results.assignments ?? [];
  const students = result?.search_results.students ?? [];
  const notices = result?.search_results.notices ?? [];
  const empty =
    !loading &&
    !error &&
    result &&
    assignments.length === 0 &&
    students.length === 0 &&
    notices.length === 0;

  return (
    <div className="topbar-search" ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="과제 · 학생 · 공지 검색"
        value={keyword}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (keyword.trim().length >= 2 || error) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (timerRef.current) window.clearTimeout(timerRef.current);
            runSearch(keyword);
          }
        }}
      />
      {open && (
        <div className="search-dropdown">
          {loading && <div className="search-dropdown-msg">검색 중…</div>}
          {error && <div className="search-dropdown-msg search-dropdown-error">{error}</div>}
          {empty && <div className="search-dropdown-msg">검색 결과가 없습니다.</div>}
          {!loading && !error && result && (
            <>
              {assignments.length > 0 && (
                <div className="search-group">
                  <div className="search-group-label">과제</div>
                  {assignments.map((a) => (
                    <div key={a.assignment_id} className="search-item">
                      {a.title ?? `과제 #${a.assignment_id}`}
                      {a.stage != null ? ` · ${a.stage}단계` : ''}
                    </div>
                  ))}
                </div>
              )}
              {students.length > 0 && (
                <div className="search-group">
                  <div className="search-group-label">학생</div>
                  {students.map((s) => (
                    <Link
                      key={s.student_id}
                      to={studentsPath}
                      className="search-item"
                      onClick={() => setOpen(false)}
                    >
                      {s.student_name}
                      {s.email ? ` · ${s.email}` : ''}
                    </Link>
                  ))}
                </div>
              )}
              {notices.length > 0 && (
                <div className="search-group">
                  <div className="search-group-label">공지</div>
                  {notices.map((n) => (
                    <Link
                      key={n.notice_id}
                      to={noticesPath}
                      className="search-item"
                      onClick={() => setOpen(false)}
                    >
                      {n.title ?? `공지 #${n.notice_id}`}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
