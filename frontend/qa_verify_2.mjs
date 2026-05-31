
import { chromium } from 'playwright';
const FRONTEND_URL = 'http://localhost:5174';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // LOGIN
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  for (const inp of await page.locator('input').all()) {
    const type = await inp.getAttribute('type');
    const ph = (await inp.getAttribute('placeholder') || '').toLowerCase();
    if (ph.includes('user') || type === 'text') await inp.fill('admin');
    else if (ph.includes('pass') || type === 'password') await inp.fill('AdminPass123!');
  }
  for (const btn of await page.locator('button').all()) {
    const text = (await btn.textContent() || '').toLowerCase();
    if (text.includes('login') || text.includes('sign in') || text.includes('submit')) { await btn.click(); break; }
  }
  await page.waitForTimeout(3000);

  // Check Disconnect YouTube in UserMenu
  const bodyText = await page.textContent('body');
  console.log('Body text contains Disconnect YouTube:', bodyText.includes('Disconnect YouTube'));
  console.log('Body text contains Disconnect:', bodyText.includes('Disconnect'));
  
  // Check Logout button - it's the user menu trigger
  const logoutBtn = page.locator('button:has-text("Logout")');
  if (await logoutBtn.count() > 0) {
    // The user menu area includes username, email, and actions
    const userArea = await page.locator('text=admin@test.com').first();
    const userAreaParent = await userArea.locator('..');
    const userAreaText = await userAreaParent.textContent();
    console.log('User area text:', userAreaText);
  }

  // Navigate to hidden playlists
  console.log('
=== Hidden Playlists ===');
  await page.goto(FRONTEND_URL + '/playlists/hidden', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const hiddenBody = await page.textContent('body');
  console.log('Hidden page text:', hiddenBody.substring(0, 1000));

  // Navigate to playlist 2 detail and hide it
  console.log('
=== Hide Playlist via UI ===');
  await page.goto(FRONTEND_URL + '/playlist/2', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const hideBtn = page.locator('button:has-text("Hide playlist")');
  if (await hideBtn.count() > 0) {
    await hideBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'qa_screenshots/13-after-hide.png' });
    const afterHide = await page.textContent('body');
    console.log('After hide click:', afterHide.substring(0, 500));
  } else {
    console.log('Hide playlist button not found');
  }

  // Watch page
  console.log('
=== Watch Page ===');
  await page.goto(FRONTEND_URL + '/watch/2', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'qa_screenshots/14-watch-page.png' });
  const watchBody = await page.textContent('body');
  console.log('Watch page (first 500):', watchBody.substring(0, 500));

  await browser.close();
}
main().catch(err => { console.error(err); process.exit(1); });
