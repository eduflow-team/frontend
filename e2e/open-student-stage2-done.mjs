/**
 * Stage2 학생 결과(완료) 단계 UI headed 미리보기
 * node e2e/open-student-stage2-done.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ctxPath = path.join(__dirname, '.meeting-demo-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));

const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:5173';
const ASSIGNMENT_ID = process.env.S2_DONE_ASSIGNMENT || '474';

const browser = await chromium.launch({ headless: false, slowMo: 30 });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/login`);
await page.locator('#login-email').fill(ctx.studentEmail);
await page.locator('#login-password').fill(ctx.studentPassword);
await page.locator('form').getByRole('button', { name: '로그인' }).click();
await page.waitForURL(/\/student/, { timeout: 20_000 });

await page.goto(
  `${BASE}/student/stage/2?assignmentId=${ASSIGNMENT_ID}&previewPhase=done`,
  { waitUntil: 'networkidle' },
);
await page.waitForSelector('.s2-student', { timeout: 30_000 });
await page.waitForSelector('.s2-done-shell .score-hero', { timeout: 20_000 });

console.log('[open-done] 결과 UI 표시 — 창을 닫으면 종료');
console.log(`[open-done] URL: ${page.url()}`);

await new Promise(() => {});
