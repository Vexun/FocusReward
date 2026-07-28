let activeUnlocks = [];
let lastFetchTime = 0;
let currentPort = null;

async function fetchActiveUnlocks() {
  try {
    const port = await getPort();
    if (!port) return;
    currentPort = port;
    const res = await fetch(`http://127.0.0.1:${port}/api/extension/active-unlocks`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      activeUnlocks = await res.json();
      lastFetchTime = Date.now();
    }
  } catch (e) {
    // server not available
  }
}

function shouldBlock(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');

    for (const unlock of activeUnlocks) {
      const unlockUrl = unlock.url.replace(/^www\./, '');
      if (hostname === unlockUrl || hostname.endsWith('.' + unlockUrl)) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return true;
  }
}

function getSiteInfo(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');

    for (const unlock of activeUnlocks) {
      const unlockUrl = unlock.url.replace(/^www\./, '');
      if (hostname === unlockUrl || hostname.endsWith('.' + unlockUrl)) {
        return null;
      }
    }
    return { url: hostname };
  } catch (e) {
    return null;
  }
}

browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (Date.now() - lastFetchTime > FOCUSREWARD.SITE_CACHE_TTL) {
      await fetchActiveUnlocks();
    }

    if (shouldBlock(details.url)) {
      const siteInfo = getSiteInfo(details.url);
      const blockedUrl = siteInfo ? siteInfo.url : 'unknown';
      const redirectUrl = browser.runtime.getURL('focus.html') +
        `?site=${encodeURIComponent(blockedUrl)}`;
      return { redirectUrl };
    }

    return {};
  },
  { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame'] },
  ['blocking']
);

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'unlock') {
    unlockSite(message.siteId)
      .then(sendResponse)
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.type === 'getStatus') {
    sendResponse({
      balance: null,
      siteName: message.siteName,
    });
    return true;
  }
});

async function unlockSite(siteId) {
  const port = await getPort();
  if (!port) throw new Error('FocusReward server not found');

  const res = await fetch(`http://127.0.0.1:${port}/api/unlock/timed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: siteId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Unlock failed');
  }

  await fetchActiveUnlocks();
  return res.json();
}

// Periodic health check
setInterval(async () => {
  const port = await getPort();
  if (port) {
    currentPort = port;
    await fetchActiveUnlocks();
  } else {
    activeUnlocks = [];
  }
}, FOCUSREWARD.HEALTH_CHECK_INTERVAL);

// Initial fetch
fetchActiveUnlocks();
