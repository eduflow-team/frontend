/**
 * Stage2 학생 2문제 풀이만 브라우저 데모 (과제 생성·게시는 API)
 */
import { test, expect } from '@playwright/test';
import { bootstrapSet2 } from './helpers/stage2-api.mjs';

const DEMO_SLOW_STUDENT_MS = Number(process.env.DEMO_SLOW_STUDENT_MS || 600);

async function demoPause(page) {
  if (DEMO_SLOW_STUDENT_MS > 0) await page.waitForTimeout(DEMO_SLOW_STUDENT_MS);
}

async function loginViaUI(page, email, password) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('form').getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/student/, { timeout: 20_000 });
}

async function dismissStageGuide(page) {
  const title = page.locator('#stage-guide-title');
  if (!(await title.isVisible({ timeout: 5000 }).catch(() => false))) return;
  const goPick = page.getByRole('button', { name: '과제 고르러 가기' });
  if (await goPick.isVisible().catch(() => false)) {
    await goPick.click();
    return;
  }
  await page.locator('.stage-flow-modal-foot .btn-primary').click();
}

async function dismissTour(page) {
  const skip = page.locator('.s1-tour .btn-ghost').filter({ hasText: '건너뛰기' });
  if (await skip.isVisible({ timeout: 2500 }).catch(() => false)) {
    await skip.click();
  }
}

const ERROR_TYPE_LABELS = {
  PERSONA_BIAS: '페르소나 편향',
  INFORMATION_FABRICATION: '정보 날조',
  RETRIEVAL_ERROR: '잘못된 문서 검색',
};

async function openStudentAssignment(page, ctx, assignmentId, { relogin = false } = {}) {
  if (relogin) {
    await page.evaluate(() => localStorage.clear());
    await loginViaUI(page, ctx.studentEmail, ctx.studentPassword);
  }

  await page.goto(`/student/stage/2?assignmentId=${assignmentId}`);
  if (await page.locator('#login-email').isVisible({ timeout: 3000 }).catch(() => false)) {
    await loginViaUI(page, ctx.studentEmail, ctx.studentPassword);
    await page.goto(`/student/stage/2?assignmentId=${assignmentId}`);
  }

  // assignmentId 있으면 guide/select를 건너뛰고 learn으로 진입 (StudentStagePage)
  await expect(page.locator('.s2-student')).toBeVisible({ timeout: 60_000 });
  await dismissTour(page);
  await expect(page.locator('.s2-student .ai-response-text')).toBeVisible({ timeout: 45_000 });
}

async function selectErrorText(page, errorSentence) {
  const ok = await page.evaluate((text) => {
    const container = document.querySelector('.s2-student .ai-response-text');
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
  await expect(page.locator('.selected-segment-chip')).toBeVisible({ timeout: 10_000 });
}

async function pickErrorType(page, errorType) {
  const label = ERROR_TYPE_LABELS[errorType] || errorType;
  const segment = page.locator('.type-segment').filter({ hasText: label });
  if (await segment.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await segment.first().click();
    return;
  }
  await page.locator('#s2-error-type').selectOption(errorType);
}

async function solveAssignmentInBrowser(page, ctx, card, index) {
  console.log(`[student] 문제 ${index + 1} — assignment ${card.assignmentId} (${card.errorType})`);
  await openStudentAssignment(page, ctx, card.assignmentId, { relogin: index > 0 });
  await dismissTour(page);
  await demoPause(page);

  const pdfBtn = page.locator('[data-tour="s2-tour-pdf"] button').filter({ hasText: '보기' });
  if (await pdfBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pdfBtn.click();
    await expect(page.locator('iframe.pdf-frame, .pdf-modal-placeholder')).toBeVisible({ timeout: 15_000 });
    await demoPause(page);
    await page.locator('.pdf-modal-header').getByRole('button', { name: '닫기' }).click();
  }

  await selectErrorText(page, card.errorSentence);
  await demoPause(page);
  await pickErrorType(page, card.errorType);
  await page.locator('#s2-reason').fill(card.reason);
  await demoPause(page);
  await page.getByRole('button', { name: '제출 및 피드백 받기' }).click();

  await expect(page.locator('.feedback-bar.success, .decide-bar.success')).toBeVisible({
    timeout: 90_000,
  });

  const toCorrectBtn = page.getByRole('button', { name: '교정 단계로 이동' });
  if (await toCorrectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await toCorrectBtn.click();
  }

  await dismissTour(page);
  await expect(page.getByRole('button', { name: '교정 최종 제출' })).toBeVisible({ timeout: 15_000 });
  await demoPause(page);
  const correctionText = card.correctionAnswer || card.correctSentence;
  await page.locator('#s2-correction-0').fill(correctionText);
  await page.getByRole('button', { name: '교정 최종 제출' }).click();
  await demoPause(page);
  await page.getByRole('button', { name: '최종 제출', exact: true }).click();

  await expect(page.locator('.s2-done-shell')).toBeVisible({ timeout: 90_000 });
  const scoreText =
    (await page.locator('.s2-done-shell .score-ring strong').first().textContent())?.trim() ||
    (await page.locator('.s2-done-shell .s2-done-badge').first().textContent())?.trim() ||
    '';
  return { assignmentId: card.assignmentId, errorType: card.errorType, scoreText };
}

test('Stage2: 학생 2문제 풀이만 (브라우저 데모)', async ({ page }) => {
  test.setTimeout(600_000);

  let ctx;
  await test.step('API — 과제 생성·게시', async () => {
    console.log('[setup] API: Langflow 2카드 생성 + 게시…');
    ctx = await bootstrapSet2();
    console.log(`[setup] assignments: ${ctx.assignmentIds.join(', ')}`);
  });

  await test.step('학생 로그인', async () => {
    await loginViaUI(page, ctx.studentEmail, ctx.studentPassword);
  });

  const results = [];
  for (let i = 0; i < ctx.cards.length; i += 1) {
    await test.step(`학생 문제 ${i + 1} UI 풀이`, async () => {
      const row = await solveAssignmentInBrowser(page, ctx, ctx.cards[i], i);
      results.push(row);
      expect(row.scoreText).toMatch(/\d+|통과|✓/);
    });
  }

  console.log('\n=== Stage2 학생 풀이 데모 ===');
  for (const r of results) {
    console.log(`  #${r.assignmentId} | ${r.errorType} | ${r.scoreText}`);
  }
  console.log('============================\n');
});
