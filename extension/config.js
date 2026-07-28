const FOCUSREWARD = {
  PORT_RANGE_START: 41000,
  PORT_RANGE_END: 41004,
  HEALTH_CHECK_INTERVAL: 60000,
  CACHE_KEY: 'focusreward_port',
  SITE_CACHE_KEY: 'focusreward_active_sites',
  SITE_CACHE_TTL: 10000,
};

async function discoverPort() {
  for (let port = FOCUSREWARD.PORT_RANGE_START; port <= FOCUSREWARD.PORT_RANGE_END; port++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.app === 'focusreward') {
          return port;
        }
      }
    } catch (e) {
      // port not available, try next
    }
  }
  return null;
}

async function getPort() {
  let port = parseInt(await browser.storage.local.get(FOCUSREWARD.CACHE_KEY)
    .then(r => r[FOCUSREWARD.CACHE_KEY]));

  if (port) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return port;
    } catch (e) {
      // cached port failed, re-discover
    }
  }

  port = await discoverPort();
  if (port) {
    await browser.storage.local.set({ [FOCUSREWARD.CACHE_KEY]: port });
  }
  return port;
}
