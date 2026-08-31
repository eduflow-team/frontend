# EduFlow Frontend

중·고등학생 **AI 리터러시** 교육 플랫폼 **에듀플로우**의 웹 UI입니다.  
교사(출제·학급 관리)와 학생(Stage 1~4 학습) 화면을 React로 구현합니다.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=222222)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white&labelColor=222222)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=222222)](https://www.typescriptlang.org/)
[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=reactrouter&logoColor=white&labelColor=222222)](https://reactrouter.com/)

| 구분 | 내용 |
|------|------|
| 로컬 URL | `http://localhost:5173` |
| API | FastAPI 백엔드 (`/api` → `http://localhost:8000`, Vite 프록시) |
| 브랜치 | 통합 기준 `develop` |

## UI 색상

전체 톤은 **화이트 배경 + 검정 타이포**입니다. 역할(교사/학생)에 따라 사이드바·버튼 등 액센트만 바뀝니다.  
토큰 정의: `src/styles/global.css`

| 용도 | 색상 | Hex |
|------|------|-----|
| 배경 / 카드 | White | `#ffffff` |
| 기본 텍스트·브랜드 마크 | Near black | `#0d0d0d` |
| 보조 텍스트 | Gray | `#6e6e80` |
| 구분선 | Light gray | `#e5e5e5` |
| **학생** 액센트 | Emerald | `#059669` |
| **교사** 액센트 | Violet | `#7c3aed` |

- 학습 Stage(1~4) 본문은 기본적으로 모노톤(검정/화이트)을 유지하고, 레이아웃 액센트만 역할색을 씁니다.
- 폰트: **Pretendard** (`--font`)

## 빠른 시작

```bash
npm install
cp .env.example .env
npm run dev
```

| 변수 | 설명 |
|------|------|
| `VITE_API_BASE_URL` | API base path (로컬 기본 `/api/v1`) |

백엔드가 `http://localhost:8000`에서 떠 있어야 로그인·과제 API가 동작합니다.

**테스트 계정:** `teacher01@example.com` / `student01@example.com`

```bash
npm run build    # dist/ 산출
npm run preview  # 빌드 미리보기
```

## 주요 화면

### Auth
- 이메일 로그인·회원가입 (교사 / 학생), JWT 세션

### 교사
- 홈·과목별 과제 관리
- Stage 1~4 출제  
  - 1: RAG 서술형 (핵심어 채점)  
  - 2: Hallucination 탐지 세트  
  - 3: AI 토론  
  - 4: 프롬프트 인젝션 방어  
- 학생 현황·성적·출석·공지

### 학생
- 배정 과제에서 Stage 1~4 학습
- 점수·출석·공지 조회

> Stage 1 채팅, Stage 3 토론, Stage 4 공격 응답은 백엔드의 Langflow / OpenAI 설정이 필요합니다.

## 폴더 안내

```
src/
  api/          # FastAPI 클라이언트·엔드포인트
  components/   # 공통·스테이지 UI
  contexts/     # Auth 등
  layouts/      # 앱·로그인 레이아웃
  pages/        # teacher / student / auth
  styles/       # global + stage별 CSS
  types/        # 공유 타입
```

## 관련 레포

- Backend (FastAPI + PostgreSQL + pgvector)
- AI (Langflow 워크플로)
