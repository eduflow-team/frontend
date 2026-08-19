# EduFlow Frontend

React + Vite frontend for **EduFlow** — teacher and student flows with routing, auth context, and a shared API client.

## Prerequisites

- Node.js 18+ (recommended)
- npm

## Setup

```bash
npm install
```

## Environment

Copy `.env.example` to `.env.local` (or `.env`) and set the backend base URL:

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base path (e.g. `/api/v1` for Vite dev proxy, or full URL in production) |

## Development

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

```bash
npm run build
```

Production output is written to `dist/`.

## 변경 요약 (2026-08-20)

GitHub `develop`의 스테이지별 최신 UI를 반영하고, FastAPI 백엔드(`/api/v1`)와 연결했습니다.

### 학생 홈
- 「학습 모드」 카드 대신 **선생님이 내신 과제 목록**을 바로 보여 줍니다.
- 과제 상태(시작하기 / 이어하기 / 결과 보기), 마감일, 점수를 표시합니다.

### Stage 1 — RAG 체험
- 교사: 퀴즈 **문제 1개 + 정답**과 학습 자료를 출제합니다. 안내 투어 팝업이 있습니다.
- 학생: 채팅·답안 제출, 학습자료(PDF 등) 보기, UX 투어/가이드 모달을 사용합니다.

### Stage 2 — Hallucination 탐지
- 교사: 단일 과제뿐 아니라 **카드 세트 생성·후보 선택 후 배포**가 가능합니다.
- 학생: 하이라이트·교정 API로 환각 검증 훈련을 진행합니다.

### Stage 3 — AI 토론
- 교사: 주제·찬반 페르소나로 토론 과제를 게시합니다.
- 학생: 토론 생성 → 발언별 팩트체크 → 제출·채점까지 백엔드 API만 사용합니다.
- 샘플 토론·sessionStorage 데모 경로는 제거했습니다.

### Stage 4 — 보안 강화
- 교사: 학급, 미션, 비밀 키, 난이도, 시도 횟수, 방어 가이드라인을 API로 출제합니다.
- 학생: 프롬프트 인젝션 공격 채팅 후, 성공 시 보안 분석 보고서를 제출합니다.
- 로컬 샘플 과제 진입은 제거했습니다.

### 개발 시 참고
- 프론트 개발 서버: `http://localhost:5173`
- 백엔드(Docker): `http://localhost:8000` — Vite 프록시가 `/api`를 백엔드로 전달합니다.
- Stage 1 채팅·Stage 3 토론·Stage 4 공격 응답은 Langflow/OpenAI 설정이 필요합니다.
