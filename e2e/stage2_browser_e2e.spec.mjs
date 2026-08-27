/**
 * Stage2 브라우저 E2E (풀 UI 데모)
 * 1) 후보 1개 → 자동 게시 → 학생 1문제
 * 2) 후보 2개 → 미리보기·그리드 선택 → 2개 게시 → 학생 2문제
 */
import { test, expect } from '@playwright/test';
import {
  FIXTURE_PATH,
  bootstrapAccounts,
  cardFromSingleCreate,
  cardsFromSetBody,
  createSetDraftViaApi,
  fetchSetDraftViaApi,
} from './helpers/stage2-api.mjs';

/** @type {Awaited<ReturnType<typeof bootstrapAccounts>>} */
let ctx;

/** 학생 풀이 구간만 지연 (ms). DEMO_SLOW_MO 대신 이걸 쓰면 생성·교사 UI는 빠름 */
const DEMO_SLOW_STUDENT_MS = Number(process.env.DEMO_SLOW_STUDENT_MS || 0);
/** 교사 wizard·미리보기·게시 구간 지연 (ms) */
const DEMO_SLOW_TEACHER_MS = Number(process.env.DEMO_SLOW_TEACHER_MS || 0);

async function demoPause(page, ms = DEMO_SLOW_STUDENT_MS) {
  if (ms > 0) await page.waitForTimeout(ms);
}

async function teacherDemoPause(page) {
  await demoPause(page, DEMO_SLOW_TEACHER_MS);
}

test.describe.configure({ mode: 'serial', timeout: 600_000 });

test.beforeAll(async () => {
  console.log('[setup] API: 교사/학생 계정만 생성…');
  ctx = await bootstrapAccounts();
});

async function logoutViaUI(page) {
  const logoutBtn = page.getByRole('button', { name: '로그아웃' });
  if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    return;
  }
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
}

async function loginViaUI(page, email, password) {
  await page.goto('/login');
  await expect(page.locator('#login-email')).toBeVisible({ timeout: 15_000 });
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('form').getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/(teacher|student)/, { timeout: 20_000 });
}

async function dismissStageGuide(page) {
  const title = page.locator('#stage-guide-title');
  if (!(await title.isVisible().catch(() => false))) return;
  await page.locator('.stage-flow-modal-foot .btn-primary').click();
}

async function fillTeacherWizardThroughQuestion(page) {
  await page.goto('/teacher/stage/2');
  await expect(page.getByRole('heading', { name: 'Hallucination 탐지' })).toBeVisible();
  await teacherDemoPause(page);

  await page.locator('#teacher-doc-file').setInputFiles(FIXTURE_PATH);
  await teacherDemoPause(page);
  await page.getByRole('button', { name: '다음' }).click();

  await page.locator('#teacher-persona').fill('청과의 교역을 과도하게 미화하는 역사 선생님');
  await teacherDemoPause(page);
  await page.getByRole('button', { name: '다음' }).click();

  await page.getByRole('checkbox', { name: '페르소나 편향' }).check();
  await page.getByRole('checkbox', { name: '정보 날조' }).check();
  await teacherDemoPause(page);
  await page.getByRole('button', { name: '다음' }).click();

  await page.locator('#teacher-question').fill('명·청 교역과 관련된 내용을 설명해줘.');
  await teacherDemoPause(page);
  await page.getByRole('button', { name: '다음' }).click();
}

/** wizard 1~5 UI (천천히) → API 생성 완료 후 미리보기. Langflow는 wizard 중 백그라운드 실행 */
async function runTeacherWizardDemoThenPreview(page, apiCreatePromise) {
  await fillTeacherWizardThroughQuestion(page);
  await page.locator('#candidate-count').selectOption('2');
  await teacherDemoPause(page);

  console.log('[teacher] wizard 5단계 완료 — Langflow 생성 대기…');
  const setBody = await apiCreatePromise;
  console.log(`[teacher] set_id=${setBody.set_id} cards=${setBody.cards?.length}`);

  await page.goto(`/teacher/stage/2?setId=${setBody.set_id}`);
  await expect(page.locator('.teacher-preview')).toBeVisible({ timeout: 20_000 });
  await teacherDemoPause(page);
  return setBody;
}

async function createSingleCandidateViaTeacherWizard(page) {
  await fillTeacherWizardThroughQuestion(page);
  await page.locator('#candidate-count').selectOption('1');

  const createResPromise = page.waitForResponse(
    (r) =>
      r.url().includes('/teacher/assignments/step2') &&
      !r.url().includes('/set') &&
      r.request().method() === 'POST',
    { timeout: 300_000 },
  );
  await page.getByRole('button', { name: 'AI 후보 생성' }).click();
  const createRes = await createResPromise;
  expect(createRes.status(), await createRes.text()).toBe(201);
  const body = await createRes.json();

  await expect(page.getByText('과제를 게시했습니다.')).toBeVisible({ timeout: 120_000 });

  const card = cardFromSingleCreate(body);
  console.log(`[teacher] single assignment_id=${card.assignmentId}`);
  return { cards: [card] };
}

async function ensureCandidatesPicked(page, expectedCount) {
  // 로컬 feature UI: 후보 그리드 카드 클릭으로 선택
  const cards = page.locator('.teacher-candidate-grid .teacher-candidate-card:not([disabled])');
  await expect(cards).toHaveCount(expectedCount, { timeout: 10_000 });

  for (let i = 0; i < expectedCount; i += 1) {
    const card = cards.nth(i);
    if (!(await card.evaluate((el) => el.classList.contains('picked')))) {
      await card.click();
    }
    await expect(card).toHaveClass(/picked/);
  }

  await expect(page.locator('.teacher-preview-box')).toBeVisible();
  await expect(page.getByRole('button', { name: `선택한 ${expectedCount}개 게시` })).toBeEnabled();
}

async function createTwoCandidateSetViaTeacherWizard(page) {
  await fillTeacherWizardThroughQuestion(page);
  await page.locator('#candidate-count').selectOption('2');

  console.log('[teacher] UI: AI 후보 생성 클릭 — Langflow 대기…');
  const [createRes] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('step2/set') &&
        r.request().method() === 'POST' &&
        !/\/set\/\d+/.test(r.url()),
      { timeout: 180_000 },
    ),
    page.getByRole('button', { name: 'AI 후보 생성' }).click(),
  ]);
  expect(createRes.status(), await createRes.text()).toBe(201);
  const setBody = await createRes.json();
  console.log(`[teacher] UI: set_id=${setBody.set_id} cards=${setBody.cards?.length}`);

  await expect(page.locator('.teacher-preview')).toBeVisible({ timeout: 15_000 });
  return publishTwoCandidatesInTeacherUI(page, setBody);
}

async function openTeacherSetPreview(page, setId) {
  await page.goto(`/teacher/stage/2?setId=${setId}`);
  await expect(page.locator('.teacher-preview')).toBeVisible({ timeout: 20_000 });
}

async function publishTwoCandidatesInTeacherUI(page, setBody) {
  await expect(page.locator('.teacher-candidate-grid .teacher-candidate-card')).toHaveCount(2, {
    timeout: 10_000,
  });
  await expect(page.locator('.teacher-preview-box')).toBeVisible();

  await ensureCandidatesPicked(page, 2);
  await teacherDemoPause(page);
  await page.getByRole('button', { name: '선택한 2개 게시' }).click();
  await expect(page.getByText('과제를 게시했습니다.')).toBeVisible({ timeout: 30_000 });

  const cards = cardsFromSetBody(setBody, 2);
  console.log(`[teacher] set_id=${setBody.set_id}, published=${cards.map((c) => c.assignmentId).join(', ')}`);
  expect(cards).toHaveLength(2);
  return { setId: setBody.set_id, cards };
}

async function openStudentAssignment(page, assignmentId, { relogin = false } = {}) {
  if (relogin) {
    await page.evaluate(() => localStorage.clear());
    await loginViaUI(page, ctx.studentEmail, ctx.studentPassword);
  }

  await page.goto(`/student/stage/2?assignmentId=${assignmentId}`);

  if (await page.locator('#login-email').isVisible({ timeout: 3000 }).catch(() => false)) {
    await loginViaUI(page, ctx.studentEmail, ctx.studentPassword);
    await page.goto(`/student/stage/2?assignmentId=${assignmentId}`);
  }

  await dismissStageGuide(page);

  const selectHeading = page.getByRole('heading', { name: '과제 선택' });
  if (!(await selectHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
    await page.goto('/student/stage/2');
    await dismissStageGuide(page);
  }

  await expect(selectHeading).toBeVisible({ timeout: 20_000 });

  const row = page.locator('.stage-assign-row').filter({ hasText: String(assignmentId) });
  if (await row.first().isVisible({ timeout: 8000 }).catch(() => false)) {
    await row.first().click();
  } else {
    await page.locator('#stage-assignment-id').fill(String(assignmentId));
    await page.getByRole('button', { name: '열기' }).click();
  }
  await expect(page.locator('.ai-block-v2')).toBeVisible({ timeout: 45_000 });
}

async function selectErrorText(page, errorSentence) {
  const ok = await page.evaluate((text) => {
    const container = document.querySelector('.ai-block-v2');
    if (!container) return false;

    const displayed = (container.innerText || '').replace(/\s+/g, ' ').trim();
    const target = text.replace(/\s+/g, ' ').trim();

    const pickNeedle = () => {
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
    };

    const needle = pickNeedle();
    if (!needle) return false;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const nodeText = node.textContent || '';
      let localIdx = nodeText.indexOf(needle);
      let len = needle.length;
      if (localIdx < 0) {
        for (let l = needle.length; l >= 8; l -= 1) {
          localIdx = nodeText.indexOf(needle.slice(0, l));
          if (localIdx >= 0) {
            len = l;
            break;
          }
        }
      }
      if (localIdx < 0) continue;
      const range = document.createRange();
      range.setStart(node, localIdx);
      range.setEnd(node, localIdx + len);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      container.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      return (sel?.toString().trim().length ?? 0) > 0;
    }
    return false;
  }, errorSentence);

  expect(ok, `AI 답변에서 오류 문장 선택 실패: ${errorSentence.slice(0, 40)}`).toBeTruthy();
  await expect(page.locator('.find-form')).toBeVisible({ timeout: 10_000 });
}

async function solveAssignmentInBrowser(page, card, index) {
  console.log(`[student] 문제 ${index + 1} — assignment ${card.assignmentId} (${card.errorType})`);
  await openStudentAssignment(page, card.assignmentId, { relogin: index > 0 });
  await demoPause(page);

  await page.getByRole('button', { name: 'PDF 원문 보기' }).click();
  await expect(page.locator('iframe.pdf-frame')).toBeVisible({ timeout: 15_000 });
  await demoPause(page);
  await page.locator('.pdf-modal-header').getByRole('button', { name: '닫기' }).click();

  await selectErrorText(page, card.errorSentence);
  await demoPause(page);
  await page.locator('#s2-error-type').selectOption(card.errorType);
  await page.locator('#s2-reason').fill(card.reason);
  await demoPause(page);
  await page.getByRole('button', { name: '제출 및 피드백 받기' }).click();

  await expect(page.locator('.feedback-panel.success').filter({ hasText: /맞았습니다/ })).toBeVisible({
    timeout: 90_000,
  });

  const toCorrectBtn = page.getByRole('button', { name: '교정 단계로 이동' });
  if (await toCorrectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await toCorrectBtn.click();
  }

  await expect(page.locator('.correction-form')).toBeVisible({ timeout: 15_000 });
  await demoPause(page);
  await page.locator('#s2-correction-0').fill(card.correctSentence);
  await page.getByRole('button', { name: '교정 최종 제출' }).click();
  await demoPause(page);
  await page.getByRole('button', { name: '최종 제출', exact: true }).click();

  await expect(page.locator('.feedback-panel').filter({ hasText: /교정 결과|통과|100/ })).toBeVisible({
    timeout: 90_000,
  });

  const scoreText = await page.locator('.feedback-panel strong').first().textContent();
  return { assignmentId: card.assignmentId, errorType: card.errorType, scoreText: scoreText?.trim() || '' };
}

async function runStudentSolveLoop(page, cards) {
  const results = [];
  for (let i = 0; i < cards.length; i += 1) {
    await test.step(`학생 문제 ${i + 1} UI 풀이`, async () => {
      const row = await solveAssignmentInBrowser(page, cards[i], i);
      results.push(row);
      expect(row.scoreText).toMatch(/100|통과/);
    });
  }
  return results;
}

test('Stage2: 후보 1개 생성 → 학생 1문제 풀이', async ({ page }) => {
  test.skip(process.env.STAGE2_E2E_FAST === '1', 'STAGE2_E2E_FAST=1 — 2후보만 실행');
  let cards = [];

  await test.step('교사 UI — 후보 1개 생성·게시', async () => {
    await loginViaUI(page, ctx.teacherEmail, ctx.teacherPassword);
    ({ cards } = await createSingleCandidateViaTeacherWizard(page));
    expect(cards).toHaveLength(1);
  });

  await test.step('학생 로그인', async () => {
    await logoutViaUI(page);
    await loginViaUI(page, ctx.studentEmail, ctx.studentPassword);
  });

  const results = await runStudentSolveLoop(page, cards);

  console.log('\n=== Stage2 E2E (1후보) ===');
  for (const r of results) {
    console.log(`  #${r.assignmentId} | ${r.errorType} | ${r.scoreText}`);
  }
  console.log('========================\n');
});

test('Stage2: 후보 2개 미리보기·선택 게시 → 학생 2문제 풀이', async ({ page }) => {
  let cards = [];
  let prebuiltSetBody;
  const reuseSetId = process.env.STAGE2_DEMO_SET_ID;

  await test.step('교사 UI — wizard·미리보기·선택·게시', async () => {
    const apiCreatePromise = reuseSetId
      ? fetchSetDraftViaApi(ctx, reuseSetId)
      : (console.log('[teacher] Langflow 백그라운드 생성 시작 (wizard 중 진행)'),
        createSetDraftViaApi(ctx));

    await loginViaUI(page, ctx.teacherEmail, ctx.teacherPassword);
    prebuiltSetBody = await runTeacherWizardDemoThenPreview(page, apiCreatePromise);
    ({ cards } = await publishTwoCandidatesInTeacherUI(page, prebuiltSetBody));
    expect(cards).toHaveLength(2);
  });

  await test.step('학생 로그인', async () => {
    await logoutViaUI(page);
    await loginViaUI(page, ctx.studentEmail, ctx.studentPassword);
  });

  const results = await runStudentSolveLoop(page, cards);

  console.log('\n=== Stage2 E2E (2후보) ===');
  for (const r of results) {
    console.log(`  #${r.assignmentId} | ${r.errorType} | ${r.scoreText}`);
  }
  console.log('========================\n');

  expect(results).toHaveLength(2);
});

test('Stage2: wizard 풀 UI — 후보 2개 생성·선택 게시 → 학생 2문제', async ({ page }) => {
  test.skip(process.env.STAGE2_E2E_FULL_UI !== '1', 'STAGE2_E2E_FULL_UI=1 일 때만 실행');
  let cards = [];

  await test.step('교사 UI — wizard·AI 후보 생성·선택·게시', async () => {
    await loginViaUI(page, ctx.teacherEmail, ctx.teacherPassword);
    ({ cards } = await createTwoCandidateSetViaTeacherWizard(page));
    expect(cards).toHaveLength(2);
  });

  await test.step('학생 로그인', async () => {
    await logoutViaUI(page);
    await loginViaUI(page, ctx.studentEmail, ctx.studentPassword);
  });

  const results = await runStudentSolveLoop(page, cards);

  console.log('\n=== Stage2 E2E (wizard 풀 UI) ===');
  for (const r of results) {
    console.log(`  #${r.assignmentId} | ${r.errorType} | ${r.scoreText}`);
  }
  console.log('================================\n');

  expect(results).toHaveLength(2);
});
