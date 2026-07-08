import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const { login, enterDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate('/role-picker');
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
            />
          </div>
          <label className="auth-check">
            <input type="checkbox" />
            <span>로그인 상태 유지</span>
          </label>
          <button type="submit" className="btn btn-primary btn-full btn-cta" style={{ marginTop: 16 }}>
            로그인
          </button>
        </form>

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
