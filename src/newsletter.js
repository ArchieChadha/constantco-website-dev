// newsletter.js  — full, corrected

// One single API base that also works when the page is opened from file://
const API_BASE =
    (location.protocol === 'file:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1')
        ? 'http://localhost:3001'
        : '';

// Helper to POST the subscription
async function postNewsletter(email) {
    const url = `${API_BASE}/api/newsletter`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const j = await res.json();
            if (j?.error) msg += ` - ${j.error}`;
        } catch { }
        throw new Error(msg);
    }
    return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    const overlay = document.querySelector('[data-news-overlay]');
    const modal = document.querySelector('[data-news-modal]');
    const closeBtn = document.querySelector('[data-news-close]');
    const dock = document.querySelector('[data-news-dock]');
    const dockOpen = document.querySelector('[data-news-open]');
    const dockDismiss = document.querySelector('[data-news-dismiss]');

    if (!overlay || !modal || !dock) return;

    function showModal() {
        body.classList.add('show-newsletter');
        overlay.classList.add('is-visible');
        modal.classList.add('is-visible');
        trapFocus(modal);
    }
    function hideModal() {
        body.classList.remove('show-newsletter');
        overlay.classList.remove('is-visible');
        modal.classList.remove('is-visible');
        releaseFocus();
    }
    function showDock() { dock.classList.remove('is-hidden'); }
    function hideDock() { dock.classList.add('is-hidden'); }

    // Show dock and timed modal on load
    showDock();
    setTimeout(showModal, 600);

    // Close interactions
    overlay.addEventListener('click', hideModal);
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-visible')) hideModal();
    });

    // Dock actions
    if (dockOpen) dockOpen.addEventListener('click', showModal);
    if (dockDismiss) dockDismiss.addEventListener('click', () => { hideModal(); hideDock(); });

    // Attach to BOTH: modal form [data-news-form] AND inline section form.newsletter
    const forms = Array.from(document.querySelectorAll('[data-news-form], form.newsletter'));
    forms.forEach((f) => {
        f.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = f.querySelector('input[type="email"]');
            const submitBtn = f.querySelector('button[type="submit"]');
            const email = (emailInput?.value || '').trim();

            const emailOk = /^\S+@\S+\.\S+$/.test(email);
            if (!emailOk) { emailInput?.focus(); return; }

            // Minimal visual state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.dataset._label = submitBtn.textContent;
                submitBtn.textContent = 'Subscribing…';
            }

            // Per-form status line
            let statusEl = f.querySelector('[data-news-status]');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.setAttribute('data-news-status', '');
                statusEl.style.fontSize = '.9rem';
                statusEl.style.marginTop = '8px';
                statusEl.style.opacity = '0.9';
                f.appendChild(statusEl);
            }
            statusEl.textContent = '';

            try {
                await postNewsletter(email);
                statusEl.textContent = 'Subscribed. Thanks!';
                statusEl.style.color = '#1a7f37';
                f.reset();
            } catch (err) {
                console.error('Newsletter subscribe error:', err);
                statusEl.textContent = 'Could not subscribe. Please try again.';
                statusEl.style.color = '#b00020';
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitBtn.dataset._label || 'Subscribe';
                    delete submitBtn.dataset._label;
                }
                // If submitted from the modal, close UI
                if (f.hasAttribute('data-news-form')) {
                    hideModal();
                    hideDock();
                }
            }
        });
    });

    // ---------- A11y: simple focus trap ----------
    let prevFocus = null;
    let focusables = [];
    function trapFocus(container) {
        prevFocus = document.activeElement;
        focusables = Array.from(container.querySelectorAll(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.disabled && el.offsetParent !== null);
        if (focusables.length) focusables[0].focus();
        container.addEventListener('keydown', onTrapKeydown);
    }
    function releaseFocus() {
        modal.removeEventListener('keydown', onTrapKeydown);
        if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    }
    function onTrapKeydown(e) {
        if (e.key !== 'Tab' || !focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});
