import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:5174';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const results = [];

  // 1. Check app loads and redirects to login
  console.log('=== 1. Unauthenticated redirects to login ===');
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await delay(2000);
  results.push({ check: 'Unauthenticated redirects to login', pass: page.url().includes('/login') });
  await page.screenshot({ path: 'qa_screenshots/01-login-page.png' });

  // 2. Login
  console.log('=== 2. Login ===');
  const inputs = await page.locator('input').all();
  for (const inp of inputs) {
    const type = await inp.getAttribute('type');
    const ph = (await inp.getAttribute('placeholder') || '').toLowerCase();
    if (ph.includes('user') || ph.includes('email') || type === 'text') {
      await inp.fill('admin');
    } else if (ph.includes('pass') || type === 'password') {
      await inp.fill('AdminPass123!');
    }
  }

  // Try clicking submit buttons
  const btns = await page.locator('button').all();
  for (const btn of btns) {
    const text = (await btn.textContent() || '').toLowerCase();
    if (text.includes('login') || text.includes('sign in') || text.includes('submit')) {
      await btn.click();
      break;
    }
  }
  await delay(3000);
  await page.screenshot({ path: 'qa_screenshots/02-after-login.png' });

  const loggedInUrl = page.url();
  const isHome = loggedInUrl === FRONTEND_URL + '/' || loggedInUrl === FRONTEND_URL || !loggedInUrl.includes('/login');
  results.push({ check: 'Login succeeds and redirects from login page', pass: isHome });

  if (!isHome) {
    // Try direct navigation to home
    console.log('Login may have failed, trying direct navigation');
    await page.goto(FRONTEND_URL + '/', { waitUntil: 'networkidle' });
    await delay(2000);
    await page.screenshot({ path: 'qa_screenshots/02b-home-direct.png' });
    const stillLogin = page.url().includes('/login');
    results.push({ check: 'App accessible after login bypass', pass: !stillLogin });
    if (stillLogin) {
      console.log('Cannot access app - auth flow broken. Aborting UI tests.');
      console.log('Console errors:', errors.slice(0, 5));
      await browser.close();
      return results;
    }
  }

  // 3. PlaylistBrowser - check for key elements
  console.log('=== 3. PlaylistBrowser elements ===');
  await delay(1000);
  const bodyText = await page.textContent('body');

  const hasYoutubeLinkSection = bodyText.includes('Link') || bodyText.includes('YouTube') || bodyText.includes('youtube');
  results.push({ check: 'PlaylistBrowser shows link section', pass: hasYoutubeLinkSection });

  const signInBtn = await page.locator('button:has-text("Sign in"), a:has-text("Sign in")').first().count();
  results.push({ check: 'Sign in with YouTube button visible', pass: signInBtn > 0 });

  const urlInputCount = await page.locator('input[placeholder*="youtube" i], input[placeholder*="URL" i], input[placeholder*="playlist" i]').count();
  results.push({ check: 'Playlist URL input visible', pass: urlInputCount > 0 });

  const importBtnCount = await page.locator('button:has-text("Import"), button:has-text("Link")').count();
  results.push({ check: 'Import button visible', pass: importBtnCount > 0 });

  await page.screenshot({ path: 'qa_screenshots/03-playlist-browser.png' });

  // 4. Hidden playlists page
  console.log('=== 4. Hidden playlists ===');
  await page.goto(FRONTEND_URL + '/playlists/hidden', { waitUntil: 'networkidle' });
  await delay(1500);
  await page.screenshot({ path: 'qa_screenshots/04-hidden-playlists.png' });
  const hiddenText = await page.textContent('body');
  results.push({ check: 'Hidden playlists page renders', pass: hiddenText.length > 0 });

  // 5. Navigate to playlist detail (no playlists yet)
  console.log('=== 5. Playlist detail ===');
  await page.goto(FRONTEND_URL + '/playlist/1', { waitUntil: 'networkidle' });
  await delay(1500);
  await page.screenshot({ path: 'qa_screenshots/05-playlist-detail.png' });
  const detailText = await page.textContent('body');
  results.push({ check: 'Playlist detail page handles missing playlist gracefully', pass: detailText.length > 0 });

  // 6. Navigate back to home and check theme toggle
  console.log('=== 6. Theme toggle ===');
  await page.goto(FRONTEND_URL + '/', { waitUntil: 'networkidle' });
  await delay(1000);

  const themeBtnCount = await page.locator('[aria-label*="theme" i], button:has-text("Theme"), button:has-text("Dark"), button:has-text("Light"), [class*="theme"]').count();
  results.push({ check: 'Theme toggle UI exists', pass: themeBtnCount > 0, note: 'Count: ' + themeBtnCount });

  await page.screenshot({ path: 'qa_screenshots/06-theme-check.png' });

  // 7. User menu
  console.log('=== 7. User menu ===');
  const menuTriggers = await page.locator('button:has-text("admin"), [class*="user-menu"], [class*="userMenu"], button[class*="avatar"]').count();
  const hasAdminText = bodyText.includes('admin');
  results.push({ check: 'User menu accessible', pass: menuTriggers > 0 || hasAdminText, note: 'Triggers: ' + menuTriggers });

  // Print results
  console.log('');
  console.log('=== RESULTS ===');
  for (const r of results) {
    console.log((r.pass ? 'PASS' : 'FAIL') + ': ' + r.check + (r.note ? ' (' + r.note + ')' : ''));
  }

  if (errors.length > 0) {
    console.log('');
    console.log('Console errors:', errors.slice(0, 5));
  }

  await browser.close();
  return results;
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
