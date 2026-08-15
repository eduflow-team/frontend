import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchClassesApi } from '../../api';
import type { ClassItem, SocialProvider } from '../../api/types';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import { formatClassLabel } from '../../utils/labels';

const SOCIAL_PROVIDERS: SocialProvider[] = ['kakao', 'google', 'apple'];

type SignupMode = 'email' | 'social';

interface SocialSignupLocationState {
  socialProvider?: SocialProvider;
  socialToken?: string;
}

export function SignupPage() {
  const { signup, socialSignup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socialState = (location.state ?? {}) as SocialSignupLocationState;

  const [mode, setMode] = useState<SignupMode>(
    socialState.socialProvider && socialState.socialToken ? 'social' : 'email',
  );
  const [socialProvider, setSocialProvider] = useState<SocialProvider | ''>(
    socialState.socialProvider ?? '',
  );
  const [socialToken, setSocialToken] = useState(socialState.socialToken ?? '');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [classId, setClassId] = useState<number | ''>('');
  const [signupCode, setSignupCode] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesError, setClassesError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchClassesApi()
      .then((res) => {
        if (!cancelled) setClasses(res.classes);
      })
      .catch(() => {
        if (!cancelled) setClassesError('학급 목록을 불러오지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (socialState.socialProvider && socialState.socialToken) {
      setMode('social');
      setSocialProvider(socialState.socialProvider);
      setSocialToken(socialState.socialToken);
    }
  }, [socialState.socialProvider, socialState.socialToken]);

  const startSocialSignup = (provider: SocialProvider) => {
    const token = window.prompt(
      `${provider} 회원가입 토큰을 입력하세요.\n(OAuth 앱 연동 전 테스트용)`,
    );
    if (!token?.trim()) return;
    setMode('social');
    setSocialProvider(provider);
    setSocialToken(token.trim());
    setError('');
  };

  const validateCommon = (): string | null => {
    if (!name.trim() || !phone.trim()) {
      return '이름과 휴대폰 번호를 입력해 주세요.';
    }
    if (!agreed) {
      return '이용약관에 동의해 주세요.';
    }
    if (role === 'student' && classId === '') {
      return '학급을 선택해 주세요.';
    }
    if (role === 'teacher' && !signupCode.trim()) {
      return '교사 가입 코드를 입력해 주세요.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const commonError = validateCommon();
    if (commonError) {
      setError(commonError);
      return;
    }

    setSubmitting(true);

    if (mode === 'social') {
      if (!socialProvider || !socialToken.trim()) {
        setSubmitting(false);
        setError('소셜 제공자와 토큰을 입력해 주세요.');
        return;
      }

      const result = await socialSignup({
        provider: socialProvider,
        socialToken: socialToken.trim(),
        name,
        phone,
        role,
        classId: role === 'student' ? Number(classId) : null,
        signupCode: role === 'teacher' ? signupCode.trim() : null,
      });
      setSubmitting(false);

      if (result.ok) {
        navigate(result.role === 'teacher' ? '/teacher' : '/student');
        return;
      }
      setError(result.error);
      return;
    }

    if (!email.trim() || !password) {
      setSubmitting(false);
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (password !== password2) {
      setSubmitting(false);
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    const result = await signup({
      name,
      email,
      password,
      phone,
      role,
      classId: role === 'student' ? Number(classId) : null,
      signupCode: role === 'teacher' ? signupCode.trim() : null,
    });
    setSubmitting(false);

    if (result.ok) {
      navigate(result.role === 'teacher' ? '/teacher' : '/student');
      return;
    }
    setError(result.error);
  };

  const roleFields = (
    <>
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
          <label className="form-label" htmlFor="signup-code">
            교사 가입 코드
          </label>
          <input
            className="form-control"
            id="signup-code"
            placeholder="팀에서 발급한 코드"
            value={signupCode}
            onChange={(e) => setSignupCode(e.target.value)}
          />
        </div>
      ) : (
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="signup-class">
            학급
          </label>
          <select
            className="form-control"
            id="signup-class"
            value={classId}
            onChange={(e) => setClassId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">학급 선택</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {formatClassLabel(cls.grade, cls.class_number)}
              </option>
            ))}
          </select>
          {classesError && (
            <p style={{ color: 'var(--negative)', fontSize: 12, marginTop: 6 }}>{classesError}</p>
          )}
        </div>
      )}
    </>
  );

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

        <div className="seg-control" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`seg-btn${mode === 'email' ? ' active' : ''}`}
            onClick={() => setMode('email')}
          >
            이메일
          </button>
          <button
            type="button"
            className={`seg-btn${mode === 'social' ? ' active' : ''}`}
            onClick={() => setMode('social')}
          >
            소셜
          </button>
        </div>

        {mode === 'social' && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>
              소셜 계정으로 가입합니다. 로그인 시 계정이 없으면 이 화면으로 이동합니다.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {SOCIAL_PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className={`btn btn-sm ${socialProvider === provider ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => startSocialSignup(provider)}
                >
                  {provider}
                </button>
              ))}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="signup-social-token">
                소셜 토큰
              </label>
              <input
                className="form-control"
                id="signup-social-token"
                placeholder="OAuth access token 또는 ID token"
                value={socialToken}
                onChange={(e) => setSocialToken(e.target.value)}
              />
            </div>
          </div>
        )}

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

          {mode === 'email' && (
            <>
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
                  autoComplete="email"
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
                  autoComplete="new-password"
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
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="signup-phone">
              휴대폰 번호
            </label>
            <input
              className="form-control"
              type="tel"
              id="signup-phone"
              placeholder="01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {roleFields}

          <label className="auth-check" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>
              이용약관 및 개인정보 처리에 동의합니다{' '}
              <span style={{ color: 'var(--negative)' }}>(필수)</span>
            </span>
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
            {submitting ? '가입 중…' : mode === 'social' ? '소셜 가입하기' : '가입하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
