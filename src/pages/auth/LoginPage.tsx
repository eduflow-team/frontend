import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.ok) {
      navigate(result.role === 'teacher' ? '/teacher' : '/student');
      return;
    }
    setError(result.error);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="seg-control">
          <button type="button" className="seg-btn active">
            로그인
          </button>
          <Link to="/signup" className="seg-btn" style={{ textAlign: 'center' }}>
            회원가입
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              이메일
            </label>
            <input
              className="form-control"
              type="email"
              id="login-email"
              placeholder="e2e.teacher@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="login-password">
              비밀번호
            </label>
            <input
              className="form-control"
              type="password"
              id="login-password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p style={{ color: 'var(--negative)', fontSize: 13, marginTop: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-full btn-cta"
            style={{ marginTop: 16 }}
            disabled={submitting}
          >
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p
          className="hint"
          style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}
        >
          테스트 계정: e2e.teacher@example.com · e2e.student@example.com / Passw0rd!
        </p>
      </div>
    </div>
  );
}
