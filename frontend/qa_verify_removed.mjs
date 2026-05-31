import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:5176';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  const results = [];

  // 1. LOGIN
  console.log('=== 1. Login ===');
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await delay(2000);

  const inputs = await page.locator('input').all();
  for (const inp of inputs) {
    const type = await inp.getAttribute('type');
    const ph = (await inp.getAttribute('placeholder') || '').toLowerCase();
    if (ph.includes('user') || type === 'text') {
      await inp.fill('admin');
    } else if (ph.includes('pass') || type === 'password') {
      await inp.fill('AdminPass123!');
    }
  }

  const btns = await page.locator('button').all();
  for (const btn of btns) {
    const text = (await btn.textContent() || '').toLowerCase();
    if (text.includes('login') || text.includes('sign in')) {
      await btn.click();
      break;
    }
  }
  await delay(3000);
  await page.screenshot({ path: 'qa_screenshots/01-after-login.png' });

  const loggedIn = !page.url().includes('/login');
  results.push({ check: 'Login succeeds and redirects from login page', pass: loggedIn });
  console.log('Login:', loggedIn ? 'PASS' : 'FAIL');

  if (!loggedIn) {
    console.log('Login failed. Aborting.');
    await browser.close();
    return results;
  }

  // 2. PLAYLIST BROWSER
  console.log('=== 2. PlaylistBrowser ===');
  await delay(1000);
  await page.screenshot({ path: 'qa_screenshots/02-playlist-browser.png' });
  const bodyText = await page.textContent('body');

  const hasLinkSection = bodyText.includes('Link') || bodyText.includes('YouTube');
  results.push({ check: 'PlaylistBrowser shows YouTube link section', pass: hasLinkSection });

  const hasSignInBtn = await page.locator('button:has-text("Sign in")').count() > 0
    || await page.locator('a:has-text("Sign in")').count() > 0;
  results.push({ check: 'Sign in with YouTube button visible', pass: hasSignInBtn });

  const hasUrlInput = await page.locator('input[placeholder*="youtube" i], input[placeholder*="URL" i], input[placeholder*="playlist" i]').count() > 0;
  results.push({ check: 'Playlist URL input visible', pass: hasUrlInput });

  const hasImportBtn = await page.locator('button:has-text("Import")').count() > 0;
  results.push({ check: 'Import button visible', pass: hasImportBtn });

  // 3. THEME TOGGLE
  console.log('=== 3. Theme toggle ===');
  const themeBtnCount = await page.locator('[aria-label*="theme" i], button:has-text("Theme"), button:has-text("Dark"), button:has-text("Light"), [class*="theme"]').count();
  results.push({ check: 'Theme toggle UI exists', pass: themeBtnCount > 0 });
  await page.screenshot({ path: 'qa_screenshots/03-theme-toggle.png' });

  // 4. NAVIGATE TO A PLAYLIST DETAIL
  console.log('=== 4. Playlist detail ===');
  const playlistCards = await page.locator('a[href*="/playlist/"]').all();
  if (playlistCards.length > 0) {
    await playlistCards[0].click();
    await delay(2000);
    await page.screenshot({ path: 'qa_screenshots/04-playlist-detail.png' });
    const detailText = await page.textContent('body');
    results.push({ check: 'Playlist detail page renders with content', pass: detailText.length > 100 });
    console.log('Playlist detail navigated via card click');
  } else {
    await page.goto(FRONTEND_URL + '/playlist/1', { waitUntil: 'networkidle' });
    await delay(2000);
    await page.screenshot({ path: 'qa_screenshots/04-playlist-detail.png' });
    const detailText = await page.textContent('body');
    results.push({ check: 'Playlist detail page handles missing playlist gracefully', pass: detailText.length > 0 });
    console.log('No playlist cards found, navigated directly to /playlist/1');
  }

  // 5. WATCH PAGE - REMOVED VIDEO BANNER TEST
  console.log('=== 5. WatchPage removed-video warning banner ===');

  await page.goto(FRONTEND_URL + '/playlist/1', { waitUntil: 'networkidle' });
  await delay(1500);

  // Set localStorage values for a removed video
  await page.evaluate(() => {
    localStorage.setItem('youtube-video-id', 'dQw4w9WgXcQ');
    localStorage.setItem('video-db-id', '999');
    localStorage.setItem('video-is-removed', 'true');
    localStorage.setItem('video-title', 'Test Removed Video');
  });

  await page.goto(FRONTEND_URL + '/watch/dQw4w9WgXcQ', { waitUntil: 'networkidle' });
  await delay(2000);
  await page.screenshot({ path: 'qa_screenshots/05-watch-removed-banner.png' });

  const watchBody = await page.textContent('body');
  const hasRemovedBanner = watchBody.includes('removed from the source YouTube playlist');
  results.push({ check: 'WatchPage shows removed-video warning banner with correct text', pass: hasRemovedBanner });
  console.log('Removed video banner visible:', hasRemovedBanner);

  const alertRole = await page.locator('[role="alert"]').count();
  results.push({ check: 'WatchPage removed-video banner has role="alert" for accessibility', pass: alertRole > 0 });

  const hasTitleInBanner = watchBody.includes('Test Removed Video');
  results.push({ check: 'WatchPage banner includes the video title', pass: hasTitleInBanner });

  // 6. WATCH PAGE - NO BANNER FOR NORMAL VIDEO
  console.log('=== 6. WatchPage no banner for normal video ===');
  await page.evaluate(() => {
    localStorage.setItem('video-is-removed', 'false');
    localStorage.setItem('video-title', 'Normal Video');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await delay(2000);
  await page.screenshot({ path: 'qa_screenshots/06-watch-normal-no-banner.png' });
  const watchNormalText = await page.textContent('body');
  const hasBannerWhenNotRemoved = watchNormalText.includes('removed from the source YouTube playlist');
  results.push({ check: 'WatchPage does NOT show removed banner for normal video', pass: !hasBannerWhenNotRemoved });
  console.log('No banner for normal video:', !hasBannerWhenNotRemoved);

  // 7. HIDDEN PLAYLISTS PAGE
  console.log('=== 7. Hidden playlists ===');
  await page.goto(FRONTEND_URL + '/playlists/hidden', { waitUntil: 'networkidle' });
  await delay(2000);
  await page.screenshot({ path: 'qa_screenshots/07-hidden-playlists.png' });
  const hiddenText = await page.textContent('body');
  results.push({ check: 'Hidden playlists page renders', pass: hiddenText.length > 50 });

  // 8. USER MENU
  console.log('=== 8. User menu ===');
  const hasUserMenu = await page.locator('button:has-text("admin"), [class*="user-menu"], [class*="userMenu"]').count() > 0
    || bodyText.includes('admin');
  results.push({ check: 'User menu accessible', pass: hasUserMenu });

  // 9. REGRESSION: Home navigation works
  console.log('=== 9. Regression: Home navigation ===');
  await page.goto(FRONTEND_URL + '/', { waitUntil: 'networkidle' });
  await delay(1500);
  const homeText = await page.textContent('body');
  results.push({ check: 'Home page loads after navigation', pass: homeText.length > 0 && !page.url().includes('/login') });

  // CONSOLE ERRORS
  if (errors.length > 0) {
    console.log('');
    console.log('Console errors:', errors.slice(0, 5));
  }

  // PRINTOUT
  console.log('');
  console.log('=== RESULTS ===');
  let allPass = true;
  for (const r of results) {
    console.log((r.pass ? 'PASS' : 'FAIL') + ': ' + r.check);
    if (!r.pass) allPass = false;
  }
  console.log('');
  console.log('Overall:', allPass ? 'PASS' : 'FAIL');

  await browser.close();
  return { results, allPass };
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
