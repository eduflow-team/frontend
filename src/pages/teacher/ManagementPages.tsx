import { useEffect, useState } from 'react';
import {
  ApiError,
  createTeacherNoticeApi,
  deleteTeacherNoticeApi,
  fetchStudentNoticesApi,
  fetchTeacherAttendanceApi,
  fetchTeacherGradesApi,
  fetchTeacherRecordsStudentsApi,
  fetchTeacherUnsubmittedApi,
  patchTeacherAttendanceApi,
} from '../../api';
import type { AttendanceStatus, ClassItem } from '../../api/types';
import { fetchClassesApi } from '../../api';
import { ApiStateBody, PageHero, PlaceholderCard } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { formatClassLabel, PROGRESS_LABELS } from '../../utils/labels';

interface TeacherSimplePageProps {
  title: string;
  description: string;
  cardTitle: string;
}

function TeacherSimplePage({ title, description, cardTitle }: TeacherSimplePageProps) {
  return (
    <>
      <PageHero title={title} description={description} />
      <PlaceholderCard title={cardTitle} />
    </>
  );
}

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: '출석' },
  { value: 'LATE', label: '지각' },
  { value: 'ABSENT', label: '결석' },
  { value: 'PENDING', label: '미정' },
];

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function TeacherMaterialsPage() {
  return (
    <TeacherSimplePage
      title="자료 관리"
      description="교과 PDF, 참고 자료를 업로드하고 관리합니다."
      cardTitle="자료 목록 · 업로드"
    />
  );
}

export function TeacherStudentsPage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const unsubmitted = useFetch(fetchTeacherUnsubmittedApi, [], Boolean(useApi));
  const students = useFetch(fetchTeacherRecordsStudentsApi, [], Boolean(useApi));

  if (!useApi) {
    return (
      <TeacherSimplePage
        title="학생 현황"
        description="학급별 제출 현황과 학습 진도를 확인합니다."
        cardTitle="학생 목록 · 제출 상태"
      />
    );
  }

  return (
    <>
      <PageHero title="학생 현황" description="제출 현황과 단계별 진행 상태" />
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">미제출 학생</span>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={unsubmitted.loading}
              error={unsubmitted.error}
              isEmpty={!unsubmitted.data?.unsubmitted_students.length}
              emptyMessage="미제출 학생이 없습니다."
            >
              {unsubmitted.data?.unsubmitted_students.map((s) => (
                <div
                  key={s.student_id}
                  style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}
                >
                  <div style={{ fontWeight: 600 }}>{s.student_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                    미완료 {s.missing_stage.join(', ')}단계
                  </div>
                </div>
              ))}
            </ApiStateBody>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">학생별 진행</span>
          </div>
          <div className="card-body">
            <ApiStateBody
              loading={students.loading}
              error={students.error}
              isEmpty={!students.data?.students.length}
            >
              {students.data?.students.map((s) => (
                <div
                  key={s.student_id}
                  style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.student_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                    {[1, 2, 3, 4].map((stage) => {
                      const key = `stage_${stage}` as keyof typeof s.stage_summary;
                      const detail = s.stage_summary[key];
                      if (!detail) return null;
                      return (
                        <span key={stage} style={{ marginRight: 10 }}>
                          {stage}단계: {PROGRESS_LABELS[detail.status]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </ApiStateBody>
          </div>
        </div>
      </div>
    </>
  );
}

export function TeacherGradesPage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const { data, loading, error } = useFetch(fetchTeacherGradesApi, [], Boolean(useApi));

  if (!useApi) {
    return (
      <TeacherSimplePage
        title="성적 관리"
        description="단계별 점수와 평균을 관리합니다."
        cardTitle="성적표 · 통계"
      />
    );
  }

  return (
    <>
      <PageHero
        title="학습 결과"
        description={`학급 평균 ${data?.stage_averages.total_average ?? 0}점`}
      />
      <div className="card">
        <div className="card-header">
          <span className="card-title">학생별 성적</span>
        </div>
        <div className="card-body">
          <ApiStateBody loading={loading} error={error} isEmpty={!data?.students.length}>
            {data?.students.map((student) => (
              <div
                key={student.student_id}
                style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{student.student_name}</span>
                  <span>{student.average_score}점</span>
                </div>
              </div>
            ))}
          </ApiStateBody>
        </div>
      </div>
    </>
  );
}

export function TeacherAttendancePage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const { data, loading, error } = useFetch(
    () => fetchTeacherAttendanceApi({ from: date, to: date }),
    [date, reloadKey],
    Boolean(useApi),
  );

  const students = data?.students ?? [];

  useEffect(() => {
    if (!data?.students?.length) return;
    const next: Record<number, AttendanceStatus> = {};
    for (const s of data.students) {
      const record = s.records.find((r) => r.date === date);
      next[s.student_id] = record?.status ?? 'PENDING';
    }
    setStatuses(next);
  }, [data, date]);

  if (!useApi) {
    return (
      <TeacherSimplePage
        title="출석 관리"
        description="수업 참여 및 출석 현황을 기록합니다."
        cardTitle="출석부"
      />
    );
  }

  const handleSave = async () => {
    if (!students.length) return;
    setSaving(true);
    setMessage('');
    setSaveError('');
    try {
      await patchTeacherAttendanceApi({
        date,
        records: students.map((s) => ({
          student_id: s.student_id,
          status: statuses[s.student_id] ?? 'PENDING',
          note: '',
        })),
      });
      setMessage('출석이 저장되었습니다.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHero title="출석 관리" description={`학생 ${students.length}명`} />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">날짜 선택</span>
        </div>
        <div className="card-body">
          <div className="form-group" style={{ marginBottom: 0, maxWidth: 220 }}>
            <label className="form-label" htmlFor="attendance-date">
              출석 일자
            </label>
            <input
              id="attendance-date"
              className="form-control"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">출석부</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || loading || !students.length}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
        <div className="card-body">
          <ApiStateBody loading={loading} error={error} isEmpty={!students.length}>
            {students.map((student) => (
              <div
                key={student.student_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 14,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{student.student_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                    출석률 {Math.round(student.attendance_rate * 100)}%
                  </div>
                </div>
                <select
                  className="form-control"
                  style={{ width: 120 }}
                  value={statuses[student.student_id] ?? 'PENDING'}
                  onChange={(e) =>
                    setStatuses((prev) => ({
                      ...prev,
                      [student.student_id]: e.target.value as AttendanceStatus,
                    }))
                  }
                >
                  {ATTENDANCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </ApiStateBody>
          {message && <p className="inline-alert ok">{message}</p>}
          {saveError && <p className="inline-alert error">{saveError}</p>}
        </div>
      </div>
    </>
  );
}

export function TeacherNoticesPage() {
  const { user } = useAuth();
  const useApi = user && !user.isDemo;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [classId, setClassId] = useState<number | ''>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [formOk, setFormOk] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const { data, loading, error } = useFetch(
    () => fetchStudentNoticesApi({ page: 1, size: 50 }),
    [reloadKey],
    Boolean(useApi),
  );

  useEffect(() => {
    if (!useApi) return;
    fetchClassesApi()
      .then((res) => setClasses(res.classes))
      .catch(() => setClasses([]));
  }, [useApi]);

  if (!useApi) {
    return (
      <TeacherSimplePage
        title="공지사항"
        description="학급 공지를 작성하고 관리합니다."
        cardTitle="공지 목록"
      />
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormOk('');
    if (!title.trim() || !content.trim()) {
      setFormError('제목과 내용을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await createTeacherNoticeApi({
        title: title.trim(),
        content: content.trim(),
        class_id: classId === '' ? null : Number(classId),
      });
      setTitle('');
      setContent('');
      setClassId('');
      setFormOk('공지가 등록되었습니다.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noticeId: number) => {
    if (!window.confirm('이 공지를 삭제할까요?')) return;
    setDeletingId(noticeId);
    setFormError('');
    try {
      await deleteTeacherNoticeApi(noticeId);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHero title="공지사항" description="학급 공지를 작성하고 관리합니다." />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">새 공지 작성</span>
        </div>
        <div className="card-body">
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label" htmlFor="notice-title">
                제목
              </label>
              <input
                id="notice-title"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지 제목"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="notice-content">
                내용
              </label>
              <textarea
                id="notice-content"
                className="form-control"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공지 내용"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="notice-class">
                대상 학급 (선택)
              </label>
              <select
                id="notice-class"
                className="form-control"
                value={classId}
                onChange={(e) => setClassId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">전체</option>
                {classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {formatClassLabel(cls.grade, cls.class_number)}
                  </option>
                ))}
              </select>
            </div>
            {formError && <p className="inline-alert error">{formError}</p>}
            {formOk && <p className="inline-alert ok">{formOk}</p>}
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? '등록 중…' : '공지 업로드'}
            </button>
          </form>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">공지 목록</span>
        </div>
        <div className="card-body">
          <ApiStateBody loading={loading} error={error} isEmpty={!data?.notices.length}>
            {data?.notices.map((notice) => (
              <div
                key={notice.notice_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{notice.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                    {notice.author_name}
                    {notice.created_at
                      ? ` · ${new Date(notice.created_at).toLocaleDateString()}`
                      : ''}
                  </div>
                  <p style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{notice.content}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ flexShrink: 0, color: 'var(--negative)' }}
                  disabled={deletingId === notice.notice_id}
                  onClick={() => handleDelete(notice.notice_id)}
                >
                  삭제
                </button>
              </div>
            ))}
          </ApiStateBody>
        </div>
      </div>
    </>
  );
}

export function TeacherMessagesPage() {
  return (
    <TeacherSimplePage
      title="메시지함"
      description="학생 및 학부모와의 메시지를 확인합니다."
      cardTitle="메시지 목록"
    />
  );
}
