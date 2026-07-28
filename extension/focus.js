const params = new URLSearchParams(location.search);
const siteUrl = params.get('site') || 'unknown';
let currentPort = null;

async function init() {
  const port = await getPort();
  if (!port) {
    document.getElementById('balance').textContent = 'Offline';
    document.getElementById('cost').textContent = '---';
    document.getElementById('unlockBtn').disabled = true;
    return;
  }
  currentPort = port;

  document.getElementById('siteName').textContent =
    `${siteUrl} is blocked`;

  loadStatus();
  document.getElementById('unlockBtn').addEventListener('click', handleUnlock);
}

async function loadStatus() {
  try {
    const [balanceRes, sitesRes] = await Promise.all([
      fetch(`http://127.0.0.1:${currentPort}/api/points/balance`),
      fetch(`http://127.0.0.1:${currentPort}/api/sites`),
    ]);

    if (balanceRes.ok) {
      const balance = await balanceRes.json();
      document.getElementById('balance').textContent = `${balance.balance} pts`;
    }

    if (sitesRes.ok) {
      const sites = await sitesRes.json();
      const site = sites.find(s => s.url === siteUrl || s.url === `www.${siteUrl}`);
      if (site) {
        document.getElementById('cost').textContent = `${site.timed_cost} pts`;
        document.getElementById('unlockBtn').dataset.siteId = site.id;

        if (site.timed_cost > parseInt(document.getElementById('balance').textContent)) {
          document.getElementById('unlockBtn').disabled = true;
        }
      } else {
        document.getElementById('cost').textContent = 'Not configured';
        document.getElementById('unlockBtn').disabled = true;
      }
    }
  } catch (e) {
    document.getElementById('balance').textContent = 'Error';
  }
}

async function handleUnlock() {
  const siteId = document.getElementById('unlockBtn').dataset.siteId;
  if (!siteId) return;

  const btn = document.getElementById('unlockBtn');
  const statusMsg = document.getElementById('statusMsg');
  btn.disabled = true;
  statusMsg.textContent = '';

  try {
    const res = await fetch(`http://127.0.0.1:${currentPort}/api/unlock/timed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId }),
    });

    if (res.ok) {
      statusMsg.className = 'success';
      statusMsg.textContent = 'Unlocked! You can now visit this site.';
      loadStatus();
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      const text = await res.text();
      statusMsg.className = 'error';
      statusMsg.textContent = text || 'Failed to unlock';
      btn.disabled = false;
    }
  } catch (e) {
    statusMsg.className = 'error';
    statusMsg.textContent = 'Connection error';
    btn.disabled = false;
  }
}

init();
