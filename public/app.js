const state = { token: localStorage.getItem('savleyToken'), user: JSON.parse(localStorage.getItem('savleyUser') || 'null'), signUp: false };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
function initPublicAnimations() {
  if (document.body.dataset.page === 'admin' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const revealTargets = document.querySelectorAll('.stats-bar, .intro, .showcase-heading, .showcase-feature, .mini-feature, .properties-section, .contact-band, .property-card');
  revealTargets.forEach((target, index) => {
    target.classList.add('public-reveal');
    if (target.classList.contains('property-card') || target.classList.contains('mini-feature')) target.classList.add(`public-reveal-delay-${(index % 4) + 1}`);
  });
  document.querySelectorAll('.showcase-feature, .mini-feature, .property-card').forEach((target) => target.classList.add('public-reveal-image'));
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: .14 });
  revealTargets.forEach((target) => observer.observe(target));
}
async function api(url, options = {}) { const response = await fetch(url, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Something went wrong.'); return data; }
function propertyCard(property) { const image = property.images?.[0] || property.image; const type = property.type ? property.type : 'house'; const location = property.location || 'Nigeria'; const mediaNote = property.videos?.length ? `<span class="media-note">▶ ${property.videos.length} video${property.videos.length > 1 ? 's' : ''}</span>` : ''; return `<article class="property-card"><div class="property-media"><img class="property-image" src="${image}" alt="${property.title}" loading="lazy"><span class="type-badge">${type}</span>${mediaNote}</div><div class="property-info"><p class="location">${location}</p><h3>${property.title}</h3><div class="price">${money(property.price)}</div><p class="description">${property.description}</p></div></article>`; }
let allProperties = [];
function renderProperties(properties) {
  const countTarget = $('#property-count');
  const gridTarget = $('#property-grid');
  if (!countTarget || !gridTarget) return;
  countTarget.textContent = `${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`;
  gridTarget.innerHTML = properties.length ? properties.map(propertyCard).join('') : '<div class="loading">No matching properties yet. Try another search.</div>';
  if (document.body.dataset.page !== 'admin') initPublicAnimations();
}
function renderDashboard(properties) {
  const dashboardRoot = $('#dashboard-table-body');
  if (!dashboardRoot) return;

  const totalPortfolio = properties.reduce((sum, property) => sum + Number(property.price || 0), 0);
  const activeListings = properties.length;
  const occupiedListings = properties.filter((property) => property.status === 'sold' || property.status === 'rented').length;
  const occupancy = activeListings ? Math.round((occupiedListings / activeListings) * 100) : 0;
  const qualifiedLeads = properties.reduce((sum, property) => sum + Number(property.qualifiedLeads || 0), 0);

  const portfolioTarget = $('#kpi-portfolio');
  const listingsTarget = $('#kpi-listings');
  const occupancyTarget = $('#kpi-occupancy');
  const leadsTarget = $('#kpi-leads');

  if (portfolioTarget) portfolioTarget.textContent = money(totalPortfolio);
  if (listingsTarget) listingsTarget.textContent = String(activeListings);
  if (occupancyTarget) occupancyTarget.textContent = occupiedListings ? `${occupancy}%` : '—';
  if (leadsTarget) leadsTarget.textContent = String(qualifiedLeads);

  if (!properties.length) {
    dashboardRoot.innerHTML = '<tr><td colspan="6" class="loading">No listings yet. Add your first property.</td></tr>';
    return;
  }

  const rows = properties.map((property, index) => {
    const image = property.images?.[0] || property.image || 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=600&q=90';
    const interest = Number(property.interest || 0);
    const status = property.status || 'active';
    const updated = new Date(Date.now() - index * 86400000).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
    return `
      <tr>
        <td>
          <div class="property-cell">
            <img src="${image}" alt="${property.title}">
            <div>
              <strong>${property.title}</strong>
              <span>${property.location || 'Nigeria'}</span>
            </div>
          </div>
        </td>
        <td><span class="status-chip ${status === 'pending' ? 'pending' : ''}">${status}</span></td>
        <td>${money(property.price)}</td>
        <td>${interest ? `${interest}%` : '—'}</td>
        <td>${updated}</td>
        <td><button type="button" class="delete-listing" data-delete-property="${property.id}" aria-label="Delete ${property.title}">Delete</button></td>
      </tr>
    `;
  }).join('');
  dashboardRoot.innerHTML = rows;
}
async function handleDelete(propertyId, button) {
  const property = allProperties.find((candidate) => candidate.id === propertyId);
  if (!property || !window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;
  button.disabled = true;
  try {
    await api(`/api/properties/${encodeURIComponent(propertyId)}`, { method: 'DELETE' });
    await loadProperties();
  } catch (error) {
    window.alert(error.message);
    button.disabled = false;
  }
}
async function loadProperties() { allProperties = await api('/api/properties'); renderProperties(allProperties); renderDashboard(allProperties); }
function openModal(id) { const modal = $(id); if (!modal) return; modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { const modal = $(id); if (!modal) return; modal.classList.add('hidden'); document.body.style.overflow = ''; }
function setAuthMode(signUp) { state.signUp = signUp; const title = $('#auth-title'); const nameField = $('#name-field'); const switchButton = $('#auth-switch'); const message = $('#auth-message'); if (title) title.textContent = signUp ? 'Create account' : 'Sign in'; if (nameField) { nameField.classList.toggle('hidden', !signUp); const input = nameField.querySelector('input'); if (input) input.required = signUp; } if (switchButton) switchButton.textContent = signUp ? 'I already have an account' : 'Create an account'; if (message) message.textContent = ''; }
async function handleAuth(event) { event.preventDefault(); const form = new FormData(event.target); const payload = Object.fromEntries(form.entries()); try { const data = await api(`/api/auth/${state.signUp ? 'signup' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) }); state.token = data.token; state.user = data.user; localStorage.setItem('savleyToken', state.token); localStorage.setItem('savleyUser', JSON.stringify(state.user)); closeModal('#auth-modal'); event.target.reset(); if (state.user.role === 'admin') { window.location.assign('/admin'); return; } } catch (error) { const message = $('#auth-message'); if (message) message.textContent = error.message; } }
async function handleAdminLogin(event) { event.preventDefault(); const form = new FormData(event.target); const payload = Object.fromEntries(form.entries()); const button = event.target.querySelector('button[type="submit"]'); const message = $('#admin-auth-message'); if (button) button.disabled = true; if (message) message.textContent = ''; try { const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }); if (data.user.role !== 'admin') throw new Error('This account does not have admin access.'); state.token = data.token; state.user = data.user; localStorage.setItem('savleyToken', state.token); localStorage.setItem('savleyUser', JSON.stringify(state.user)); window.location.reload(); } catch (error) { if (message) message.textContent = error.message; if (button) button.disabled = false; } }
async function handleProperty(event) { event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true; const message = $('#property-message'); if (message) message.textContent = ''; try { await api('/api/properties', { method: 'POST', body: new FormData(event.target) }); event.target.reset(); closeModal('#admin-modal'); await loadProperties(); } catch (error) { if (message) message.textContent = error.message; } finally { button.disabled = false; } }
if ($('#auth-form')) $('#auth-form').addEventListener('submit', handleAuth);
if ($('#admin-auth-form')) $('#admin-auth-form').addEventListener('submit', handleAdminLogin);
if ($('#property-form')) $('#property-form').addEventListener('submit', handleProperty);
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-property]');
  if (button) handleDelete(button.dataset.deleteProperty, button);
});
if ($('#auth-switch')) $('#auth-switch').addEventListener('click', () => setAuthMode(!state.signUp));
document.querySelectorAll('[data-open-auth]').forEach((button) => button.addEventListener('click', () => { setAuthMode(false); const mobileNav = document.querySelector('.mobile-nav'); if (mobileNav) mobileNav.classList.remove('is-open'); const menuButton = document.querySelector('.menu-button'); if (menuButton) menuButton.setAttribute('aria-expanded', 'false'); openModal('#auth-modal'); }));
document.querySelectorAll('[data-open-admin]').forEach((button) => button.addEventListener('click', () => openModal('#admin-modal')));
document.querySelectorAll('[data-open-contact]').forEach((button) => button.addEventListener('click', () => openModal('#contact-modal')));
if ($('[data-close-auth]')) $('[data-close-auth]').addEventListener('click', () => closeModal('#auth-modal'));
if ($('[data-close-admin]')) $('[data-close-admin]').addEventListener('click', () => closeModal('#admin-modal'));
if ($('[data-close-contact]')) document.querySelectorAll('[data-close-contact]').forEach((button) => button.addEventListener('click', () => closeModal('#contact-modal')));
const menuButton = document.querySelector('.menu-button');
if (menuButton) { menuButton.addEventListener('click', () => { const menu = document.querySelector('.mobile-nav'); const isOpen = menu ? menu.classList.toggle('is-open') : false; menuButton.setAttribute('aria-expanded', String(isOpen)); }); }
document.querySelectorAll('.mobile-nav a').forEach((link) => link.addEventListener('click', () => { const menu = document.querySelector('.mobile-nav'); if (menu) menu.classList.remove('is-open'); const button = document.querySelector('.menu-button'); if (button) button.setAttribute('aria-expanded', 'false'); }));
if (document.body.dataset.page === 'admin') {
  const adminAccess = state.user?.role === 'admin' && state.token;
  if (!adminAccess) {
    $('#admin-auth-gate')?.classList.remove('hidden');
  } else {
    $('#admin-auth-gate')?.classList.add('hidden');
    $('#admin-shell')?.classList.remove('hidden');
    loadProperties().catch(() => { const target = $('#dashboard-table-body'); if (target) target.innerHTML = '<tr><td colspan="6" class="loading">Unable to load portfolio. Please refresh.</td></tr>'; });
  }
  document.getElementById('logout-admin')?.addEventListener('click', () => {
    localStorage.removeItem('savleyToken');
    localStorage.removeItem('savleyUser');
    window.location.href = '/';
  });
} else {
  loadProperties().catch(() => { const target = $('#property-grid'); if (target) target.innerHTML = '<div class="loading">Unable to load properties. Is the server running?</div>'; });
  const finder = $('#property-finder');
  if (finder) {
    finder.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      const type = form.get('type');
      const location = form.get('location').toLowerCase().trim();
      const filtered = allProperties.filter((property) => (type === 'all' || (property.type || 'house') === type) && (!location || (property.location || 'Nigeria').toLowerCase().includes(location)));
      renderProperties(filtered);
      const target = document.querySelector('#properties');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
