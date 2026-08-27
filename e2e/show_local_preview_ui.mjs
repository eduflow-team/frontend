/**
 * 로컬 미리보기 UI만 표시 — develop/체크박스 스택 (Langflow 생성 없음)
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { bootstrapAccounts } from './helpers/stage2-api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const OUT = path.join(__dirname, 'local-preview-checkbox.png');

const mockSet = {
  set_id: 999001,
  cards: [
    {
      assignment_id: 9001,
      card_index: 0,
      title: '미리보기 카드 1',
      flawed_ai_response:
        '청과의 교역은 조선에 일방적으로 유리했으며, 은 유입으로 경제가 급성장했다고 볼 수 있다. 다만 이는 교과 서술과 어긋날 수 있는 과장된 해석이다.',
      expected_error_count: 1,
      generation_error_type: 'PERSONA_BIAS',
      generated_errors: [
        {
          answer_id: 1,
          error_type: 'PERSONA_BIAS',
          error_sentence: '청과의 교역은 조선에 일방적으로 유리했으며',
          correct_sentence: '청과의 교역은 상호 필요에 따라 이루어졌다',
          evidence_sentence: '명·청 교역은 공무역과 사무역이 병행되었다.',
          hallucination_reason: '페르소나에 맞춘 과도한 미화',
        },
      ],
      publish_status: 'DRAFT',
      generation_succeeded: true,
      failure_codes: [],
    },
    {
      assignment_id: 9002,
      card_index: 1,
      title: '미리보기 카드 2',
      flawed_ai_response:
        '17세기 동아시아에서는 은본위제가 완전히 정착되어 모든 국가가 동일한 환율로 교역했다고 설명되기도 한다. 이 문장은 사실 확인이 필요하다.',
      expected_error_count: 1,
      generation_error_type: 'INFORMATION_FABRICATION',
      generated_errors: [
        {
          answer_id: 2,
          error_type: 'INFORMATION_FABRICATION',
          error_sentence: '모든 국가가 동일한 환율로 교역했다고',
          correct_sentence: '국가·시기별로 교역 조건이 달랐다',
          evidence_sentence: '은 유통은 지역별로 편차가 있었다.',
          hallucination_reason: '근거 없는 일반화',
        },
      ],
      publish_status: 'DRAFT',
      generation_succeeded: true,
      failure_codes: [],
    },
  ],
};

const ctx = await bootstrapAccounts();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.route('**/api/v1/teacher/assignments/step2/set/**', async (route) => {
  if (route.request().method() === 'GET') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSet),
    });
    return;
  }
  await route.continue();
});

await page.goto(`${BASE}/login`);
await page.locator('#login-email').fill(ctx.teacherEmail);
await page.locator('#login-password').fill(ctx.teacherPassword);
await page.locator('form').getByRole('button', { name: '로그인' }).click();
await page.waitForURL(/\/teacher/, { timeout: 20_000 });

await page.goto(`${BASE}/teacher/stage/2?setId=${mockSet.set_id}`);
await page.locator('.teacher-preview-stack').waitFor({ timeout: 20_000 });
await page.locator('.teacher-preview-box input[type="checkbox"]').first().waitFor();
await page.screenshot({ path: OUT, fullPage: true });
console.log(`OK: ${OUT}`);
await browser.close();
