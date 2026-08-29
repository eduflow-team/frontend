/**
 * Stage2 학생 UI 스모크 (탐지·교정·결과 미리보기)
 * 이번 브랜치 UI 회귀용 — API 풀이 없이 DEV previewPhase로 화면 계약 확인
 *
 * npx playwright test e2e/stage2_ui_smoke.spec.mjs --config=playwright.config.mjs
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ctx = JSON.parse(fs.readFileSync(path.join(__dirname, '.meeting-demo-context.json'), 'utf8'));
const ASSIGNMENT_ID = process.env.S2_SMOKE_ASSIGNMENT || '474';

async function loginStudent(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(ctx.studentEmail);
  await page.locator('#login-password').fill(ctx.studentPassword);
  await page.locator('form').getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/student/, { timeout: 20_000 });
}

async function dismissOverlays(page) {
  const guide = page.locator('#stage-guide-title');
  if (await guide.isVisible({ timeout: 4000 }).catch(() => false)) {
    const goPick = page.getByRole('button', { name: '과제 고르러 가기' });
    if (await goPick.isVisible().catch(() => false)) {
      await goPick.click();
    } else {
      await page.locator('.stage-flow-modal-foot .btn-primary').click().catch(() => {});
    }
  }
  const skip = page.locator('.s1-tour .btn-ghost').filter({ hasText: '건너뛰기' });
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skip.click();
  }
}

test.describe('Stage2 student UI smoke (previewPhase)', () => {
  test.beforeEach(async ({ page }) => {
    await loginStudent(page);
  });

  test('탐지(find): 워크플로·AI블록·사이드바', async ({ page }) => {
    await page.goto(`/student/stage/2?assignmentId=${ASSIGNMENT_ID}&previewPhase=find`);
    await page.waitForSelector('.s2-student', { timeout: 30_000 });
    await dismissOverlays(page);

    await expect(page.locator('.s2-student .shell.wide')).toBeVisible();
    await expect(page.locator('.s2-student .ai-block-v2, .s2-student .ai-response-text').first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.locator('.s2-student .steps')).toBeVisible();
    // 결과 전용 화면이 아님
    await expect(page.locator('.s2-done-shell')).toHaveCount(0);
  });

  test('교정(correct): 교정 폼 노출', async ({ page }) => {
    await page.goto(`/student/stage/2?assignmentId=${ASSIGNMENT_ID}&previewPhase=correct`);
    await page.waitForSelector('.s2-student', { timeout: 30_000 });
    await dismissOverlays(page);

    await expect(page.locator('.s2-student')).toBeVisible();
    await expect(page.getByRole('button', { name: '교정 최종 제출' })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('.s2-student .progress-wrap .pill')).toHaveText('교정');
    await expect(page.locator('.s2-done-shell')).toHaveCount(0);
  });

  test('결과(done): 전용 결과 화면 P1~P3', async ({ page }) => {
    await page.goto(`/student/stage/2?assignmentId=${ASSIGNMENT_ID}&previewPhase=done`);
    await page.waitForSelector('.s2-student', { timeout: 30_000 });

    await expect(page.locator('.s2-done-shell')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('.s2-done-shell .score-hero')).toBeVisible();
    await expect(page.locator('.s2-done-shell .tally')).toBeVisible();
    await expect(page.locator('.s2-done-shell .s2-done-rubric-card')).toBeVisible();
    await expect(page.locator('.s2-done-shell .review')).toBeVisible();
    await expect(page.locator('.s2-done-shell .s2-done-actions .btn-primary')).toBeVisible();
    // 구형 인라인 완료 폼 없음
    await expect(page.locator('.done-form')).toHaveCount(0);
  });
});
