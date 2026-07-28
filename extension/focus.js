const params = new URLSearchParams(location.search);
const siteUrl = params.get('site') || 'unknown';

async function init() {
  document.getElementById('siteName').textContent =
    `${siteUrl} is blocked`;

  loadStatus();
  document.getElementById('unlockBtn').addEventListener('click', handleUnlock);
}

async function loadStatus() {
  try {
    const status = await browser.runtime.sendMessage({
      type: 'getStatus',
      siteUrl: siteUrl,
    });

    if (status.error) {
      document.getElementById('balance').textContent = 'Error';
      document.getElementById('cost').textContent = 'Error';
      return;
    }

    document.getElementById('balance').textContent =
      status.balance !== null ? `${status.balance} pts` : 'Offline';

    if (status.cost !== null) {
      document.getElementById('cost').textContent = `${status.cost} pts`;
      document.getElementById('unlockBtn').dataset.siteId = status.siteId;

      if (status.balance !== null && status.cost > status.balance) {
        document.getElementById('unlockBtn').disabled = true;
      }
    } else {
      document.getElementById('cost').textContent = 'Not configured';
      document.getElementById('unlockBtn').disabled = true;
    }
  } catch (e) {
    document.getElementById('balance').textContent = 'Error';
    document.getElementById('cost').textContent = 'Error';
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
    const result = await browser.runtime.sendMessage({
      type: 'unlock',
      siteId: siteId,
    });

    if (result.error) {
      statusMsg.className = 'error';
      statusMsg.textContent = result.error || 'Failed to unlock';
      btn.disabled = false;
    } else {
      statusMsg.className = 'success';
      statusMsg.textContent = 'Unlocked! You can now visit this site.';
      loadStatus();
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  } catch (e) {
    statusMsg.className = 'error';
    statusMsg.textContent = 'Connection error';
    btn.disabled = false;
  }
}

init();
