const params = new URLSearchParams(location.search);
const siteUrl = params.get('site');
const isPopup = !siteUrl;

async function init() {
  const paired = await browser.runtime.sendMessage({ type: 'isPaired' });

  if (isPopup) {
    document.getElementById('popupMode').style.display = 'block';

    if (!paired.paired) {
      document.getElementById('pairingSection').style.display = 'block';
      document.getElementById('blockSection').style.display = 'none';
      document.getElementById('pairBtn').addEventListener('click', handlePair);
    } else {
      document.getElementById('pairingSection').style.display = 'none';
      document.getElementById('blockSection').style.display = 'block';
      document.getElementById('popupSiteName').textContent =
        'FocusReward is active.';
      loadPopupStatus();
    }
    return;
  }

  // Block page mode
  document.getElementById('blockPageMode').style.display = 'block';

  if (!paired.paired) {
    document.getElementById('blockSiteName').textContent =
      'Extension not paired';
    document.getElementById('blockMessage').textContent =
      'Open the desktop app Settings page and pair this extension.';
    document.getElementById('unlockBtn').disabled = true;
    return;
  }

  document.getElementById('blockSiteName').textContent =
    `${siteUrl} is blocked`;
  document.getElementById('unlockBtn').addEventListener('click', handleUnlock);
  loadBlockStatus();
}

async function loadPopupStatus() {
  try {
    const b = await browser.runtime.sendMessage({ type: 'getBalance' });
    document.getElementById('popupBalance').textContent =
      b.balance !== null ? `${b.balance} pts` : 'Offline';
  } catch (e) {
    document.getElementById('popupBalance').textContent = 'Error';
  }
}

async function loadBlockStatus() {
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
      loadBlockStatus();
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

async function handlePair() {
  const pinInput = document.getElementById('pinInput');
  const statusMsg = document.getElementById('pairStatusMsg');
  const pairBtn = document.getElementById('pairBtn');
  const pin = pinInput.value.trim();

  if (!pin) {
    statusMsg.className = 'error';
    statusMsg.textContent = 'Enter the pin from the Settings page.';
    return;
  }

  pairBtn.disabled = true;
  statusMsg.textContent = '';

  try {
    const result = await browser.runtime.sendMessage({
      type: 'pair',
      pin: pin,
    });

    if (result.error) {
      statusMsg.className = 'error';
      statusMsg.textContent = result.error || 'Pairing failed';
      pairBtn.disabled = false;
    } else {
      statusMsg.className = 'success';
      statusMsg.textContent = 'Paired successfully!';
      setTimeout(() => {
        document.getElementById('pairingSection').style.display = 'none';
        document.getElementById('blockSection').style.display = 'block';
        document.getElementById('popupSiteName').textContent =
          'FocusReward is active.';
        loadPopupStatus();
      }, 1500);
    }
  } catch (e) {
    statusMsg.className = 'error';
    statusMsg.textContent = 'Connection error';
    pairBtn.disabled = false;
  }
}

init();
