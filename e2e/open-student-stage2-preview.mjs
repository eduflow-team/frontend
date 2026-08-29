/**
 * Stage2 학생 UI 미리보기 (채점 ? + 환각 유형)
 * node e2e/open-student-stage2-preview.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ctxPath = path.join(__dirname, '.meeting-demo-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));

const BASE = 'http://127.0.0.1:5173';
const ASSIGNMENT_ID = process.env.S2_SHOT_ASSIGNMENT || 'demo';
const OPEN_RUBRIC = process.env.S2_OPEN_RUBRIC === '1';

async function loginStudent(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('#login-email').fill(ctx.studentEmail);
  await page.locator('#login-password').fill(ctx.studentPassword);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/student/, { timeout: 25_000 });
  await page.waitForTimeout(800);
  if (page.url().includes('/login')) {
    const err = await page.locator('form p').first().textContent().catch(() => '');
    throw new Error(`로그인 실패: ${err || '로그인 페이지에 머물러 있습니다.'}`);
  }
}

const browser = await chromium.launch({ headless: false, slowMo: 40 });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await loginStudent(page);

await page.goto(`${BASE}/student/stage/2?assignmentId=${ASSIGNMENT_ID}`, { waitUntil: 'networkidle' });
await page.waitForSelector('.s2-student .play-grid', { timeout: 30_000 });

const skip = page.locator('.s1-tour .btn-ghost').filter({ hasText: '건너뛰기' });
if (await skip.isVisible({ timeout: 4000 }).catch(() => false)) {
  await skip.click();
}

if (OPEN_RUBRIC) {
  await page.locator('.card-help-btn').click();
}

console.log(`[preview] 로그인: ${ctx.studentEmail}`);
console.log(`[preview] URL: ${page.url()}`);
console.log('[preview] Stage2 UI — 창을 닫으면 종료');
await new Promise(() => {});
