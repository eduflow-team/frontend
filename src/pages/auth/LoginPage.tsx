import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, socialLoginApi } from '../../api';
import type { SocialProvider } from '../../api/types';
import { useAuth } from '../../contexts/AuthContext';
import { fromApiRole } from '../../api';

const SOCIAL_PROVIDERS: SocialProvider[] = ['kakao', 'google', 'apple'];

export function LoginPage() {
  const { login, enterDemo, syncSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);

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

  const handleSocial = async (provider: SocialProvider) => {
    const token = window.prompt(
      `${provider} 로그인 토큰을 입력하세요.\n(OAuth 앱 연동 전 테스트용)`,
    );
    if (!token?.trim()) return;
    setSocialBusy(true);
    setError('');
    try {
      const data = await socialLoginApi(provider, { social_token: token.trim() });
      const synced = await syncSession();
      if (!synced.ok) {
        setError(synced.error);
        return;
      }
      navigate(fromApiRole(data.role) === 'teacher' ? '/teacher' : '/student');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate('/signup', {
          state: { socialProvider: provider, socialToken: token.trim() },
        });
        return;
      }
      setError(err instanceof ApiError ? err.message : '소셜 로그인에 실패했습니다.');
    } finally {
      setSocialBusy(false);
    }
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
              placeholder="school@example.com"
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
          <label className="auth-check">
            <input type="checkbox" />
            <span>로그인 상태 유지</span>
          </label>
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

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {SOCIAL_PROVIDERS.map((provider) => (
            <button
              key={provider}
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={socialBusy}
              onClick={() => void handleSocial(provider)}
            >
              {provider}
            </button>
          ))}
        </div>

        <span className="auth-link">비밀번호를 잊으셨나요?</span>
        <div className="auth-demo">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              enterDemo('teacher');
              navigate('/teacher');
            }}
          >
            교사 데모
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              enterDemo('student');
              navigate('/student');
            }}
          >
            학생 데모
          </button>
        </div>
      </div>
    </div>
  );
}
