document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('profile-root');
  if (!root) return;

  const rawName = getQueryParam('name');
  if (!rawName) {
    root.innerHTML = `<div class="error">No dApp specified. Go back to the <a href="index.html">Atlas</a>.</div>`;
    return;
  }

  const decodedName = decodeURIComponent(rawName);

  fetch('all_dapps_main.json')
    .then(res => res.json())
    .then(dapps => {
      const dapp = (dapps || []).find(d => (d.name || '') === decodedName);
      if (!dapp) {
        root.innerHTML = `<div class="error">Could not find dApp "${escapeHtml(decodedName)}".</div>`;
        return;
      }
      renderProfile(root, dapp);
    })
    .catch(err => {
      root.innerHTML = `<div class="error">
        Failed to load dApp profile.<br><small>${String(err)}</small>
      </div>`;
    });
});

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function renderProfile(root, dapp) {
  const avatar = dapp.pfp || '';
  const categories = dapp.categories || [];
  const primaryCategory = categories.length ? getPrimaryCategory(categories[0]) : 'Uncategorized';
  const statusLabel = dapp.live ? 'Live on Monad' : 'Inactive';
  const statusClass = dapp.live ? 'status-pill--live' : 'status-pill--inactive';

  const categoriesHtml = categories
    .map(cat => {
      const short = cat.replace('::', ' › ');
      return `<span class="category-pill">${escapeHtml(short)}</span>`;
    })
    .join('');

  const links = dapp.links || {};
  const hasLinks = Object.keys(links).length > 0;

  const addresses = dapp.addresses || {};
  const addressKeys = Object.keys(addresses);

  root.innerHTML = `
    <article class="profile-card">
      <header class="profile-header">
        <div class="profile-logo">
          ${avatar
            ? `<img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(dapp.name || 'dApp')}" onerror="this.style.display='none'" />`
            : `<div class="profile-logo-placeholder">◎</div>`}
        </div>
        <div class="profile-title-block">
          <h1 class="profile-title">${escapeHtml(dapp.name || 'Unnamed dApp')}</h1>
          <div class="profile-subtitle">
            <span class="status-pill ${statusClass}">${statusLabel}</span>
            <span class="profile-dot">•</span>
            <span class="profile-primary-category">${escapeHtml(primaryCategory)}</span>
          </div>
          ${categoriesHtml
            ? `<div class="profile-categories">${categoriesHtml}</div>`
            : ''}
        </div>
      </header>



      <section class="profile-section">
        <h2 class="profile-section-title">Overview</h2>
        <p class="profile-description">
          ${escapeHtml(dapp.description || 'No description provided yet.')}
        </p>
      </section>

      ${
        hasLinks
          ? renderLinksSection(links)
          : ''
      }

      ${
        addressKeys.length
          ? renderAddressesSection(addressKeys, addresses)
          : ''
      }
    </article>
  `;

  attachAddressCopyHandlers(root);
}

function renderLinksSection(links) {
  const map = [
    { key: 'project', label: 'Website', emoji: '🌐' },
    { key: 'docs', label: 'Docs', emoji: '📚' },
    { key: 'twitter', label: 'X / Twitter', emoji: '𝕏' },
    { key: 'github', label: 'GitHub', emoji: '💻' },
    { key: 'discord', label: 'Discord', emoji: '💬' }
  ];

  const items = map
    .filter(entry => links[entry.key])
    .map(entry => {
      const url = links[entry.key];
      return `
        <a class="link-pill" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">
          <span class="link-pill-emoji">${entry.emoji}</span>
          <span>${escapeHtml(entry.label)}</span>
        </a>
      `;
    })
    .join('');

  if (!items) return '';

  return `
    <section class="profile-section">
      <h2 class="profile-section-title">Links</h2>
      <div class="links-list">
        ${items}
      </div>
    </section>
  `;
}

function renderAddressesSection(addressKeys, addresses) {
  const rows = addressKeys
    .map(key => {
      const value = addresses[key];
      return `
        <div class="address-row">
          <div class="address-label">${escapeHtml(key)}</div>
          <div class="address-value">${escapeHtml(value)}</div>
          <button class="address-copy-btn" data-address="${escapeAttribute(value)}">Copy</button>
        </div>
      `;
    })
    .join('');

  if (!rows) return '';

  return `
    <section class="profile-section">
      <h2 class="profile-section-title">Addresses</h2>
      <div class="addresses-list">
        ${rows}
      </div>
    </section>
  `;
}

function attachAddressCopyHandlers(root) {
  root.addEventListener('click', event => {
    const btn = event.target.closest('.address-copy-btn');
    if (!btn) return;
    const value = btn.getAttribute('data-address') || '';
    if (!value) return;

    navigator.clipboard
      .writeText(value)
      .then(() => {
        btn.classList.add('copied');
        btn.textContent = 'Copied';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = 'Copy';
        }, 1200);
      })
      .catch(() => {
        // ignore
      });
  });
}

function getPrimaryCategory(cat) {
  if (!cat) return '';
  const parts = String(cat).split('::');
  return parts[0];
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(str) {
  return String(str)
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
