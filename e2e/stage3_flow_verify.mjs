/**
 * Stage3 teacher preview + student sources API verification.
 * Usage: node frontend/e2e/stage3_flow_verify.mjs
 */
import {
  API_ROOT,
  TEACHER_CODE,
  bootstrapAccounts,
} from './helpers/stage2-api.mjs';

const NEEDS_CHECK = new Set(['exaggerated', 'unsupported', 'false']);
const TOPIC = '생성형 AI를 교육 현장에 도입해야 하는가?';
const DUE_AT = new Date(Date.now() + 7 * 864e5).toISOString().replace(/\.\d{3}Z$/, 'Z');

async function jsonOrThrow(res, label) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${label}: ${res.status} ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function login(email, password) {
  return (
    await jsonOrThrow(
      await fetch(`${API_ROOT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
      `login ${email}`,
    )
  ).access_token;
}

async function pickClassId(teacherToken) {
  const teacherClasses = await jsonOrThrow(
    await fetch(`${API_ROOT}/teacher/classes`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    }),
    'teacher classes',
  );
  if (teacherClasses.classes?.length) {
    return teacherClasses.classes[0].class_id;
  }
  const all = await jsonOrThrow(await fetch(`${API_ROOT}/auth/classes`), 'auth classes');
  return all.classes[0].class_id;
}

function flawedFromPreview(debate) {
  const rows = [];
  for (const turn of debate.turns || []) {
    for (const c of turn.claims || []) {
      if (NEEDS_CHECK.has((c.verdict || '').toLowerCase())) {
        rows.push({
          turnId: turn.id,
          side: turn.side,
          round: turn.round,
          claim: c.claim,
          verdict: c.verdict,
          reason: c.reason,
        });
      }
    }
    const v = (turn.verdict || '').toLowerCase();
    if (NEEDS_CHECK.has(v)) {
      rows.push({
        turnId: turn.id,
        side: turn.side,
        round: turn.round,
        claim: turn.claim || turn.text?.slice(0, 80),
        verdict: turn.verdict,
        reason: turn.why,
      });
    }
  }
  return rows;
}

async function main() {
  console.log('API:', API_ROOT);
  const accounts = await bootstrapAccounts();
  const teacherToken = await login(accounts.teacherEmail, accounts.teacherPassword);
  const studentToken = await login(accounts.studentEmail, accounts.studentPassword);
  const classId = await pickClassId(teacherToken);
  console.log('class_id:', classId);

  const created = await jsonOrThrow(
    await fetch(`${API_ROOT}/teacher/assignments/step3`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        class_id: classId,
        topic: TOPIC,
        title: `[E2E] ${TOPIC.slice(0, 24)}`,
        subject: 'AI·미디어 리터러시',
        pro_persona: '교육 혁신을 강조하는 찬성 AI',
        con_persona: '프라이버시와 편향을 우려하는 반대 AI',
        fact_persona: '뉴스 근거를 중시하는 팩트체커',
        debate_mode: 'v2',
        due_at: DUE_AT,
      }),
    }),
    'create step3',
  );
  console.log('assignment_id:', created.assignment_id);

  console.log('\n--- Teacher preview (Langflow debate generation) ---');
  const t0 = Date.now();
  const preview = await jsonOrThrow(
    await fetch(`${API_ROOT}/teacher/assignments/${created.assignment_id}/step3/preview-debate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
    }),
    'preview debate',
  );
  console.log(`preview elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s, reused=${preview.reused}`);

  const flawed = flawedFromPreview(preview.debate);
  console.log(`flawed claims in preview: ${flawed.length}`);
  flawed.slice(0, 5).forEach((f, i) => {
    console.log(`  [${i + 1}] ${f.verdict} | ${f.claim.slice(0, 70)}...`);
    if (f.reason) console.log(`       why: ${f.reason.slice(0, 90)}`);
  });

  if (flawed.length < 2) {
    console.warn('WARN: expected at least 2 flawed claims for teacher preview');
  }

  console.log('\n--- Student debate start ---');
  const debate = await jsonOrThrow(
    await fetch(`${API_ROOT}/student/assignments/${created.assignment_id}/step3/debate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }),
    'start debate',
  );
  console.log(`student turns: ${debate.debate.turns.length}, attempt=${debate.attempt_number}`);

  console.log('\n--- Student source lookup (flawed claims) ---');
  const sample = flawed.slice(0, 3);
  if (!sample.length) {
    const turn = debate.debate.turns[0];
    sample.push({
      turnId: turn.id,
      claim: turn.claim || turn.text?.slice(0, 60),
    });
  }

  let okArticles = 0;
  for (const item of sample) {
    const sources = await jsonOrThrow(
      await fetch(`${API_ROOT}/student/assignments/${created.assignment_id}/step3/sources`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turn_id: item.turnId,
          claim: item.claim,
        }),
      }),
      `sources ${item.turnId}`,
    );
    const n = sources.articles?.length || 0;
    const broad = sources.searches?.length || 0;
    console.log(`\n  turn ${item.turnId} | articles=${n} searches=${broad}`);
    console.log(`  claim: ${item.claim.slice(0, 80)}`);
    (sources.articles || []).slice(0, 2).forEach((a, i) => {
      console.log(`    [${i + 1}] ${a.title.slice(0, 72)} (${a.source})`);
      console.log(`        ${a.url.slice(0, 90)}`);
    });
    if (n >= 1 && broad === 0) okArticles += 1;
  }

  const pass =
    flawed.length >= 2 &&
    okArticles >= Math.min(2, sample.length) &&
    debate.debate.turns.length >= 4;

  console.log('\n=== RESULT ===');
  console.log(JSON.stringify({
    pass,
    assignment_id: created.assignment_id,
    teacherEmail: accounts.teacherEmail,
    teacherPassword: accounts.teacherPassword,
    studentEmail: accounts.studentEmail,
    studentPassword: accounts.studentPassword,
    flawed_count: flawed.length,
    source_checks_ok: okArticles,
  }, null, 2));

  if (!pass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
