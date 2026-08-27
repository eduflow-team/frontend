/**
 * 학생 교정 단계 UI만 브라우저 데모 (하이라이트는 API로 선행)
 */
import { test, expect } from '@playwright/test';
import {
  advanceToCorrectionViaApi,
  bootstrapSet2,
} from './helpers/stage2-api.mjs';

test('Stage2: 교정 단계 UI 데모', async ({ page }) => {
  test.setTimeout(300_000);

  console.log('[setup] 과제 생성·게시 + 하이라이트(API)…');
  const ctx = await bootstrapSet2();
  const card = ctx.cards[0];
  await advanceToCorrectionViaApi(ctx, card);

  await page.goto('/login');
  await page.locator('#login-email').fill(ctx.studentEmail);
  await page.locator('#login-password').fill(ctx.studentPassword);
  await page.locator('form').getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/student/, { timeout: 20_000 });

  await page.goto(`/student/stage/2?assignmentId=${card.assignmentId}`);

  const guide = page.locator('#stage-guide-title');
  if (await guide.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.locator('.stage-flow-modal-foot .btn-primary').click();
  }

  const row = page.locator('.stage-assign-row').filter({ hasText: String(card.assignmentId) });
  if (await row.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await row.first().click();
  }

  await expect(page.locator('.correction-form')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.ai-block-v2.ai-block-readonly')).toBeVisible();
  await expect(page.locator('.side-panel .doc-text')).toBeVisible();

  console.log('[demo] 교정 화면 — AI 지문·교과 발췌 확인. 45초간 표시…');
  await page.waitForTimeout(45_000);
});
