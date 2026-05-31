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
  await delay(1500);
  await page.screenshot({ path: 'qa_screenshots/02-playlist-browser.png' });
  const bodyText = await page.textContent('body');

  const hasLinkSection = bodyText.includes('Link') || bodyText.includes('YouTube');
  results.push({ check: 'PlaylistBrowser shows YouTube link section', pass: hasLinkSection });

  // 3. WATCH PAGE - REMOVED VIDEO BANNER TEST (primary fix verification)
  console.log('=== 3. WatchPage removed-video warning banner ===');

  await page.evaluate(() => {
    localStorage.setItem('youtube-video-id', 'dQw4w9WgXcQ');
    localStorage.setItem('video-db-id', '999');
    localStorage.setItem('video-is-removed', 'true');
    localStorage.setItem('video-title', 'Test Removed Video');
  });

  await page.goto(FRONTEND_URL + '/watch/dQw4w9WgXcQ', { waitUntil: 'networkidle' });
  await delay(2000);
  await page.screenshot({ path: 'qa_screenshots/03-watch-removed-banner.png' });

  const watchBody = await page.textContent('body');
  const hasRemovedBanner = watchBody.includes('removed from the source YouTube playlist');
  results.push({ check: 'WatchPage shows removed-video warning banner with correct text', pass: hasRemovedBanner });
  console.log('Removed video banner visible:', hasRemovedBanner);

  const alertRole = await page.locator('[role="alert"]').count();
  results.push({ check: 'WatchPage removed-video banner has role="alert" for accessibility', pass: alertRole > 0 });

  const hasTitleInBanner = watchBody.includes('Test Removed Video');
  results.push({ check: 'WatchPage banner includes the video title', pass: hasTitleInBanner });

  // 4. WATCH PAGE - NO BANNER FOR NORMAL VIDEO
  console.log('=== 4. WatchPage no banner for normal video ===');
  await page.evaluate(() => {
    localStorage.setItem('video-is-removed', 'false');
    localStorage.setItem('video-title', 'Normal Video');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await delay(2000);
  await page.screenshot({ path: 'qa_screenshots/04-watch-normal-no-banner.png' });
  const watchNormalText = await page.textContent('body');
  const hasBannerWhenNotRemoved = watchNormalText.includes('removed from the source YouTube playlist');
  results.push({ check: 'WatchPage does NOT show removed banner for normal video', pass: !hasBannerWhenNotRemoved });
  console.log('No banner for normal video:', !hasBannerWhenNotRemoved);

  // 5. WATCH PAGE - EDGE: empty video title
  console.log('=== 5. WatchPage edge: empty video title ===');
  await page.evaluate(() => {
    localStorage.setItem('video-is-removed', 'true');
    localStorage.setItem('video-title', '');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await delay(1500);
  const watchEmptyTitle = await page.textContent('body');
  const bannerWithoutTitle = watchEmptyTitle.includes('removed from the source YouTube playlist');
  results.push({ check: 'WatchPage shows banner even when video title is empty', pass: bannerWithoutTitle });
  console.log('Banner visible with empty title:', bannerWithoutTitle);

  // 6. HIDDEN PLAYLISTS PAGE
  console.log('=== 6. Hidden playlists ===');
  await page.goto(FRONTEND_URL + '/playlists/hidden', { waitUntil: 'networkidle' });
  await delay(2000);
  await page.screenshot({ path: 'qa_screenshots/06-hidden-playlists.png' });
  const hiddenText = await page.textContent('body');
  results.push({ check: 'Hidden playlists page renders', pass: hiddenText.length > 50 });

  // 7. REGRESSION: Playlist detail
  console.log('=== 7. Regression: Playlist detail ===');
  await page.goto(FRONTEND_URL + '/playlist/1', { waitUntil: 'networkidle' });
  await delay(2000);
  await page.screenshot({ path: 'qa_screenshots/07-playlist-detail.png' });
  const detailText = await page.textContent('body');
  results.push({ check: 'Playlist detail page renders', pass: detailText.length > 50 });

  // 8. REGRESSION: Home page
  console.log('=== 8. Regression: Home page ===');
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
