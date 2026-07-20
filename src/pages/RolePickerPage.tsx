import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandFooter, BrandHeader } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

export function RolePickerPage() {
  const { enterDemo, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !user.isDemo) {
      navigate(user.role === 'teacher' ? '/teacher' : '/student', { replace: true });
    }
  }, [navigate, user]);

  const handleEnter = (role: UserRole) => {
    if (!user) enterDemo(role);
    navigate(role === 'teacher' ? '/teacher' : '/student');
  };

  return (
    <div className="role-picker">
      <BrandHeader />
      <div className="role-question">어떤 분이신가요?</div>
      <div className="role-cards">
        <button type="button" className="role-card" onClick={() => handleEnter('teacher')}>
          <h2>선생님</h2>
          <p>문서 관리, 과제 출제, 전체 학급 학생 현황 관리</p>
          <div className="role-cta">선생님으로 시작하기</div>
        </button>
        <button type="button" className="role-card" onClick={() => handleEnter('student')}>
          <h2>학생</h2>
          <p>AI 답변을 분석하고, 파라미터를 실험하며 비판적으로 학습합니다</p>
          <div className="role-cta">학생으로 시작하기</div>
        </button>
      </div>
      <BrandFooter />
    </div>
  );
}
