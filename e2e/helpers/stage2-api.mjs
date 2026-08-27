import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const API_ROOT = (process.env.API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
export const TEACHER_CODE = process.env.TEACHER_SIGNUP_CODE || '123456';
export const FIXTURE_PATH =
  process.env.STAGE2_FIXTURE ||
  path.resolve(__dirname, '../../../backend/scripts/fixtures/2027 수능특강 동아시아사-excerpt.pdf');

const QUESTION = '명·청 교역과 관련된 내용을 설명해줘.';
const PERSONA = '청과의 교역을 과도하게 미화하는 역사 선생님';
const ALL_TYPES = ['PERSONA_BIAS', 'INFORMATION_FABRICATION', 'RETRIEVAL_ERROR'];

function defaultDueAt() {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function jsonOrThrow(res, label) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${label}: ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

export function buildReason(error, style = 'good') {
  const evidence = (error.evidence_sentence || '').trim();
  const hallucinationReason = (error.hallucination_reason || '').trim();
  if (style === 'good') {
    return (
      `참고 문서 근거 문장은 '${evidence}' 입니다. ` +
      `AI 답변의 '${error.error_sentence}' 구간은 ${hallucinationReason} ` +
      `따라서 ${error.error_type} 유형의 환각입니다.`
    );
  }
  return hallucinationReason || '문서와 다른 내용입니다.';
}

export function cardFromSingleCreate(body) {
  const error = (body.generated_errors || [])[0];
  if (!error) throw new Error(`no generated_errors on ${body.assignment_id}`);
  return {
    assignmentId: body.assignment_id,
    errorType: error.error_type,
    errorSentence: error.error_sentence,
    correctSentence: error.correct_sentence,
    reason: buildReason(error, 'good'),
  };
}

export function pickNeedleInFlawed(flawedAiResponse, errorSentence) {
  const displayed = (flawedAiResponse || '').replace(/\s+/g, ' ').trim();
  const target = (errorSentence || '').replace(/\s+/g, ' ').trim();
  if (!displayed || !target) return null;
  if (displayed.includes(target)) return target;
  for (let len = target.length; len >= 8; len -= 1) {
    const prefix = target.slice(0, len);
    if (displayed.includes(prefix)) return prefix;
  }
  for (let len = Math.min(32, target.length); len >= 8; len -= 1) {
    for (let i = 0; i <= target.length - len; i += 1) {
      const sub = target.slice(i, i + len);
      if (displayed.includes(sub)) return sub;
    }
  }
  return null;
}

export function cardsFromSetBody(setBody, limit = 2) {
  return (setBody.cards || [])
    .filter((c) => c.generation_succeeded && c.assignment_id)
    .slice(0, limit)
    .map((card) => {
      const error = (card.generated_errors || [])[0];
      if (!error) throw new Error(`no generated_errors on ${card.assignment_id}`);
      const errorSentence = error.error_sentence;
      const needle =
        pickNeedleInFlawed(card.flawed_ai_response, errorSentence) || errorSentence;
      return {
        assignmentId: card.assignment_id,
        errorType: error.error_type,
        errorSentence: needle,
        correctSentence: error.correct_sentence,
        reason: buildReason(error, 'good'),
      };
    });
}

export async function bootstrapAccounts() {
  const suffix = crypto.randomUUID().slice(0, 8);
  const classes = await jsonOrThrow(await fetch(`${API_ROOT}/auth/classes`), 'classes');
  const classId = classes.classes[0].class_id;

  const teacherEmail = `pw-t-${suffix}@example.com`;
  const studentEmail = `pw-s-${suffix}@example.com`;
  const teacherPassword = 'PwTeacher123!';
  const studentPassword = 'PwStudent456!';

  for (const [email, name, role, password, extra] of [
    [teacherEmail, 'PwTeacher', 'TEACHER', teacherPassword, { signup_code: TEACHER_CODE }],
    [studentEmail, 'PwStudent', 'STUDENT', studentPassword, {}],
  ]) {
    await jsonOrThrow(
      await fetch(`${API_ROOT}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone: '010-9999-0000',
          password,
          role,
          class_id: classId,
          ...extra,
        }),
      }),
      `signup ${role}`,
    );
  }

  return { teacherEmail, teacherPassword, studentEmail, studentPassword };
}

async function studentLoginToken(accounts) {
  return (
    await jsonOrThrow(
      await fetch(`${API_ROOT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accounts.studentEmail,
          password: accounts.studentPassword,
        }),
      }),
      'student login',
    )
  ).access_token;
}

/** 하이라이트까지 API로 완료 → 브라우저는 교정 UI만 */
export async function advanceToCorrectionViaApi(accounts, card) {
  const studentToken = await studentLoginToken(accounts);
  const detail = await jsonOrThrow(
    await fetch(`${API_ROOT}/student/assignments/${card.assignmentId}/step2`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    }),
    'step2 detail',
  );
  const highlighted =
    pickNeedleInFlawed(detail.flawed_ai_response, card.errorSentence) || card.errorSentence;
  await jsonOrThrow(
    await fetch(`${API_ROOT}/student/assignments/${card.assignmentId}/step2/highlight`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissions: [
          {
            highlighted_text: highlighted,
            student_error_type: card.errorType,
            student_reason: card.reason,
          },
        ],
      }),
    }),
    'highlight submit',
  );
  return { assignmentId: card.assignmentId, card: { ...card, errorSentence: highlighted } };
}

async function teacherLoginToken(accounts) {
  return (
    await jsonOrThrow(
      await fetch(`${API_ROOT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accounts.teacherEmail,
          password: accounts.teacherPassword,
        }),
      }),
      'teacher login',
    )
  ).access_token;
}

/** 기존 draft set 조회 — Langflow 재생성 생략 (데모 재실행용) */
export async function fetchSetDraftViaApi(accounts, setId) {
  const teacherToken = await teacherLoginToken(accounts);
  const setBody = await jsonOrThrow(
    await fetch(`${API_ROOT}/teacher/assignments/step2/set/${setId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    }),
    `fetch set ${setId}`,
  );
  const cards = (setBody.cards || []).filter((c) => c.generation_succeeded && c.assignment_id);
  if (cards.length < 2) {
    throw new Error(`set ${setId}: expected 2 cards, got ${cards.length}`);
  }
  return setBody;
}

/** Langflow 생성만 API로 (게시 X) — UI 미리보기·선택 게시 E2E용 */
export async function createSetDraftViaApi(accounts) {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error(`fixture missing: ${FIXTURE_PATH}`);
  }

  const teacherToken = await teacherLoginToken(accounts);

  const fileBuf = fs.readFileSync(FIXTURE_PATH);
  const blob = new Blob([fileBuf], { type: 'application/pdf' });
  const form = new FormData();
  form.append('title', `browser-e2e-fast-${crypto.randomUUID().slice(0, 8)}`);
  form.append('subject', 'hist');
  form.append('question', QUESTION);
  form.append('persona', PERSONA);
  form.append('due_at', defaultDueAt());
  form.append('hallucination_types', JSON.stringify(ALL_TYPES));
  form.append('card_count', '2');
  form.append('file', blob, path.basename(FIXTURE_PATH));

  const setRes = await fetch(`${API_ROOT}/teacher/assignments/step2/set`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: form,
  });
  const setBody = await jsonOrThrow(setRes, 'create set draft');

  const cards = (setBody.cards || []).filter((c) => c.generation_succeeded && c.assignment_id);
  if (cards.length < 2) {
    throw new Error(`expected 2 cards, got ${cards.length}: ${JSON.stringify(setBody)}`);
  }

  return setBody;
}

export async function bootstrapSet2() {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error(`fixture missing: ${FIXTURE_PATH}`);
  }

  const suffix = crypto.randomUUID().slice(0, 8);
  const classes = await jsonOrThrow(await fetch(`${API_ROOT}/auth/classes`), 'classes');
  const classId = classes.classes[0].class_id;

  const teacherEmail = `pw-t-${suffix}@example.com`;
  const studentEmail = `pw-s-${suffix}@example.com`;
  const teacherPassword = 'PwTeacher123!';
  const studentPassword = 'PwStudent456!';

  for (const [email, name, role, password, extra] of [
    [teacherEmail, 'PwTeacher', 'TEACHER', teacherPassword, { signup_code: TEACHER_CODE }],
    [studentEmail, 'PwStudent', 'STUDENT', studentPassword, {}],
  ]) {
    await jsonOrThrow(
      await fetch(`${API_ROOT}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone: '010-9999-0000',
          password,
          role,
          class_id: classId,
          ...extra,
        }),
      }),
      `signup ${role}`,
    );
  }

  const teacherToken = (
    await jsonOrThrow(
      await fetch(`${API_ROOT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: teacherEmail, password: teacherPassword }),
      }),
      'teacher login',
    )
  ).access_token;

  const studentToken = (
    await jsonOrThrow(
      await fetch(`${API_ROOT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail, password: studentPassword }),
      }),
      'student login',
    )
  ).access_token;

  const fileBuf = fs.readFileSync(FIXTURE_PATH);
  const blob = new Blob([fileBuf], { type: 'application/pdf' });

  let setBody;
  let lastErr = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const form = new FormData();
    form.append('title', `browser-e2e-${suffix}`);
    form.append('subject', 'hist');
    form.append('question', QUESTION);
    form.append('persona', PERSONA);
    form.append('due_at', defaultDueAt());
    form.append('hallucination_types', JSON.stringify(ALL_TYPES));
    form.append('card_count', '2');
    form.append('file', blob, path.basename(FIXTURE_PATH));

    const setRes = await fetch(`${API_ROOT}/teacher/assignments/step2/set`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: form,
    });
    if (setRes.ok) {
      setBody = await setRes.json();
      break;
    }
    lastErr = `${setRes.status} ${(await setRes.text()).slice(0, 300)}`;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 4000 * attempt));
  }
  if (!setBody) throw new Error(`create set: ${lastErr}`);

  const cards = (setBody.cards || []).filter((c) => c.generation_succeeded && c.assignment_id);
  if (cards.length < 2) {
    throw new Error(`expected 2 cards, got ${cards.length}: ${JSON.stringify(setBody.cards)}`);
  }

  const ids = cards.slice(0, 2).map((c) => c.assignment_id);
  await jsonOrThrow(
    await fetch(`${API_ROOT}/teacher/assignments/step2/set/${setBody.set_id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assignment_ids: ids }),
    }),
    'publish set',
  );

  const prepared = [];
  for (const card of cards.slice(0, 2)) {
    const detail = await jsonOrThrow(
      await fetch(`${API_ROOT}/student/assignments/${card.assignment_id}/step2`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      }),
      `detail ${card.assignment_id}`,
    );
    const error = (card.generated_errors || [])[0];
    if (!error) throw new Error(`no generated_errors on ${card.assignment_id}`);
    prepared.push({
      assignmentId: card.assignment_id,
      errorType: error.error_type,
      errorSentence: error.error_sentence,
      correctSentence: error.correct_sentence,
      reason: buildReason(error, 'good'),
      title: detail.title || `과제 ${card.assignment_id}`,
    });
  }

  return {
    setId: setBody.set_id,
    teacherEmail,
    teacherPassword,
    studentEmail,
    studentPassword,
    assignmentIds: ids,
    cards: prepared,
  };
}
