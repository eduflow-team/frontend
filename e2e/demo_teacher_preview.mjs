/**
 * 교사 미리보기 UI 데모 — 브라우저만 띄우고 30초 대기
 */
import { chromium } from '@playwright/test';
import { FIXTURE_PATH, bootstrapAccounts } from './helpers/stage2-api.mjs';

const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const slowMo = Number(process.env.DEMO_SLOW_MO || 500);

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('form').getByRole('button', { name: '로그인' }).click();
  await page.waitForURL(/\/(teacher|student)/, { timeout: 20_000 });
}

async function runWizardToPreview(page) {
  await page.goto(`${BASE}/teacher/stage/2`);
  await page.locator('#teacher-doc-file').setInputFiles(FIXTURE_PATH);
  await page.getByRole('button', { name: '다음' }).click();
  await page.locator('#teacher-persona').fill('청과의 교역을 과도하게 미화하는 역사 선생님');
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('checkbox', { name: '페르소나 편향' }).check();
  await page.getByRole('checkbox', { name: '정보 날조' }).check();
  await page.getByRole('button', { name: '다음' }).click();
  await page.locator('#teacher-question').fill('명·청 교역과 관련된 내용을 설명해줘.');
  await page.getByRole('button', { name: '다음' }).click();
  await page.locator('#candidate-count').selectOption('2');

  const createResPromise = page.waitForResponse(
    (r) => r.url().includes('/teacher/assignments/step2/set') && r.request().method() === 'POST',
    { timeout: 300_000 },
  );
  await page.getByRole('button', { name: 'AI 후보 생성' }).click();
  const createRes = await createResPromise;
  if (!createRes.ok()) throw new Error(await createRes.text());
  await page.locator('.teacher-preview-stack').waitFor({ timeout: 120_000 });
  await page.locator('.verify-error-span.is-hit').first().waitFor({ timeout: 10_000 });
}

const ctx = await bootstrapAccounts();
const browser = await chromium.launch({ headless: false, slowMo });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await login(page, ctx.teacherEmail, ctx.teacherPassword);
  await runWizardToPreview(page);
  console.log('[demo] 미리보기 화면 — 60초간 브라우저 유지');
  await page.waitForTimeout(60_000);
} finally {
  await browser.close();
}
