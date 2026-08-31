/**
 * Browser check: student Stage3 source modal for 2 assignments.
 * Usage: node frontend/e2e/stage3_student_sources_ui.mjs
 */
import { chromium } from 'playwright';

const STUDENT = {
  email: process.env.STAGE3_STUDENT_EMAIL || 's3-2s-63f1c701@example.com',
  password: process.env.STAGE3_STUDENT_PASSWORD || 'PwStudent456!',
};
const ASSIGNMENTS = (
  process.env.STAGE3_ASSIGNMENT_IDS || '44,45'
).split(',').map((v) => v.trim());

async function loginStudent(page) {
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.getByLabel('이메일').fill(STUDENT.email);
  await page.getByLabel('비밀번호').fill(STUDENT.password);
  await page.locator('form').getByRole('button', { name: '로그인' }).click();
  await page.waitForURL(/\/student/, { timeout: 15000 });
}

async function checkAssignment(page, assignmentId) {
  const url = `http://localhost:5173/student/stage/3?assignmentId=${assignmentId}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const startBtn = page.getByRole('button', { name: /토론 시작|시작|입장|활동 시작/ });
  if (await startBtn.count()) {
    await startBtn.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  const sourceBtn = page.getByRole('button', { name: '출처 확인' });
  await sourceBtn.first().waitFor({ state: 'visible', timeout: 120000 });
  await sourceBtn.first().click();

  const modal = page.locator('.modal-card').filter({ hasText: '근거 출처 확인' });
  await modal.waitFor({ state: 'visible', timeout: 30000 });

  const loading = modal.getByText('관련 뉴스·기사·인터뷰를 찾는 중');
  if (await loading.count()) {
    await loading.waitFor({ state: 'hidden', timeout: 30000 });
  }

  const empty = modal.getByText('관련 기사를 찾지 못했습니다');
  const items = modal.locator('.source-item');
  const count = await items.count();
  const titles = [];
  for (let i = 0; i < Math.min(count, 3); i += 1) {
    titles.push((await items.nth(i).locator('.title').innerText()).trim());
  }

  const hasPlaceholder = titles.some((t) => t.includes('(예시)'));
  await modal.getByRole('button', { name: '확인' }).click();

  return {
    assignmentId,
    articleCount: count,
    emptyShown: (await empty.count()) > 0,
    hasPlaceholder,
    titles,
    pass: count > 0 && !hasPlaceholder,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  try {
    await loginStudent(page);
    for (const assignmentId of ASSIGNMENTS) {
      results.push(await checkAssignment(page, assignmentId));
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ results, allPass: results.every((r) => r.pass) }, null, 2));
  if (!results.every((r) => r.pass)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
