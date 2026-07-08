import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [subject, setSubject] = useState('한국사');
  const [className, setClassName] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) return;
    if (!agreed) return;
    if (
      signup({
        name,
        email,
        password,
        role,
        subject: role === 'teacher' ? subject : undefined,
        className: role === 'student' ? className : undefined,
      })
    ) {
      navigate('/role-picker');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="seg-control">
          <Link to="/login" className="seg-btn" style={{ textAlign: 'center' }}>
            로그인
          </Link>
          <button type="button" className="seg-btn active">
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">
              이름
            </label>
            <input
              className="form-control"
              id="signup-name"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">
              이메일
            </label>
            <input
              className="form-control"
              type="email"
              id="signup-email"
              placeholder="school@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">
              비밀번호
            </label>
            <input
              className="form-control"
              type="password"
              id="signup-password"
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-password2">
              비밀번호 확인
            </label>
            <input
              className="form-control"
              type="password"
              id="signup-password2"
              placeholder="비밀번호 재입력"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-role">
              역할
            </label>
            <select
              className="form-control"
              id="signup-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="teacher">선생님</option>
              <option value="student">학생</option>
            </select>
          </div>

          {role === 'teacher' ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="signup-subject">
                담당 교과
              </label>
              <select
                className="form-control"
                id="signup-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option>한국사</option>
                <option>과학</option>
                <option>사회</option>
                <option>국어</option>
                <option>영어</option>
                <option>수학</option>
              </select>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="signup-class">
                학년 · 반
              </label>
              <input
                className="form-control"
                id="signup-class"
                placeholder="3학년 2반"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </div>
          )}

          <label className="auth-check" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>
              이용약관 및 개인정보 처리에 동의합니다{' '}
              <span style={{ color: 'var(--negative)' }}>(필수)</span>
            </span>
          </label>
          <button type="submit" className="btn btn-primary btn-full btn-cta" style={{ marginTop: 16 }}>
            가입하기
          </button>
        </form>
      </div>
    </div>
  );
}
