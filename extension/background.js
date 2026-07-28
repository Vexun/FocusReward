let activeUnlocks = [];
let rewardSites = [];
let lastFetchTime = 0;
let lastSitesFetchTime = 0;
let currentPort = null;
let currentToken = null;

async function apiFetch(path, options) {
  const port = await getPort();
  if (!port) throw new Error('FocusReward server not found');
  currentPort = port;
  const headers = { 'Content-Type': 'application/json' };
  if (currentToken) {
    headers['X-FocusReward-Token'] = currentToken;
  }
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) },
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchActiveUnlocks() {
  try {
    const data = await apiFetch('/api/extension/active-unlocks');
    activeUnlocks = data;
    lastFetchTime = Date.now();
  } catch (e) {
    // server not available
  }
}

async function fetchRewardSites() {
  try {
    const data = await apiFetch('/api/sites');
    rewardSites = data;
    lastSitesFetchTime = Date.now();
  } catch (e) {
    // server not available
  }
}

function isRewardSite(hostname) {
  const h = hostname.replace(/^www\./, '');
  return rewardSites.some(site => {
    const siteUrl = site.url.replace(/^www\./, '');
    return h === siteUrl || h.endsWith('.' + siteUrl);
  });
}

function isUnlocked(hostname) {
  const h = hostname.replace(/^www\./, '');
  return activeUnlocks.some(unlock => {
    const unlockUrl = unlock.url.replace(/^www\./, '');
    return h === unlockUrl || h.endsWith('.' + unlockUrl);
  });
}

function getSiteId(hostname) {
  const h = hostname.replace(/^www\./, '');
  const site = rewardSites.find(s => {
    const siteUrl = s.url.replace(/^www\./, '');
    return h === siteUrl || h.endsWith('.' + siteUrl);
  });
  return site ? site.id : null;
}

function getSiteCost(hostname) {
  const h = hostname.replace(/^www\./, '');
  const site = rewardSites.find(s => {
    const siteUrl = s.url.replace(/^www\./, '');
    return h === siteUrl || h.endsWith('.' + siteUrl);
  });
  return site ? site.timed_cost : null;
}

function shouldBlock(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');

    if (!isRewardSite(hostname)) {
      return false;
    }

    if (isUnlocked(hostname)) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (Date.now() - lastSitesFetchTime > FOCUSREWARD.HEALTH_CHECK_INTERVAL) {
      await fetchRewardSites();
    }
    if (Date.now() - lastFetchTime > FOCUSREWARD.SITE_CACHE_TTL) {
      await fetchActiveUnlocks();
    }

    if (shouldBlock(details.url)) {
      try {
        const parsed = new URL(details.url);
        const hostname = parsed.hostname.replace(/^www\./, '');
        const redirectUrl = browser.runtime.getURL('focus.html') +
          `?site=${encodeURIComponent(hostname)}`;
        return { redirectUrl };
      } catch (e) {
        return {};
      }
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
    getStatus(message.siteUrl)
      .then(sendResponse)
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.type === 'getBalance') {
    getBalance()
      .then(sendResponse)
      .catch(e => sendResponse({ error: e.message }));
    return true;
  }
});

async function getStatus(siteUrl) {
  const hostname = siteUrl.replace(/^www\./, '');
  const cost = getSiteCost(hostname);
  const unlocked = isUnlocked(hostname);
  const siteId = getSiteId(hostname);
  let balance = null;
  try {
    const b = await apiFetch('/api/points/balance');
    balance = b.balance;
  } catch (e) {
    // offline
  }
  return { balance, cost, siteId, unlocked };
}

async function getBalance() {
  try {
    const b = await apiFetch('/api/points/balance');
    return b;
  } catch (e) {
    return { balance: null };
  }
}

async function unlockSite(siteId) {
  const data = await apiFetch('/api/unlock/timed', {
    method: 'POST',
    body: JSON.stringify({ site_id: siteId }),
  });

  await fetchActiveUnlocks();
  return data;
}

async function discoverAndInit() {
  const port = await discoverPort();
  if (!port) {
    setTimeout(discoverAndInit, 5000);
    return;
  }
  currentPort = port;
  await browser.storage.local.set({ [FOCUSREWARD.CACHE_KEY]: port });

  try {
    const health = await apiFetch('/api/health');
    if (health.token) {
      currentToken = health.token;
      await browser.storage.local.set({ 'focusreward_token': health.token });
    }
  } catch (e) {
    // token fetch failed, will retry
  }

  await Promise.all([
    fetchRewardSites(),
    fetchActiveUnlocks(),
  ]);
}

// Periodic refresh
setInterval(async () => {
  try {
    await discoverAndInit();
  } catch (e) {
    activeUnlocks = [];
    rewardSites = [];
  }
}, FOCUSREWARD.HEALTH_CHECK_INTERVAL);

// Start
discoverAndInit();
