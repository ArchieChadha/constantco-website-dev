// newsletter.js
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    const overlay = document.querySelector('[data-news-overlay]');
    const modal = document.querySelector('[data-news-modal]');
    const closeBtn = document.querySelector('[data-news-close]');
    const form = document.querySelector('[data-news-form]');
    const dock = document.querySelector('[data-news-dock]');
    const dockOpen = document.querySelector('[data-news-open]');
    const dockDismiss = document.querySelector('[data-news-dismiss]');

    if (!overlay || !modal || !dock) return;

    const HIDE_KEY = 'cc_news_hide';
    const SUB_KEY = 'cc_news_sub';

    const isHidden = () => localStorage.getItem(HIDE_KEY) === '1';
    const isSub = () => localStorage.getItem(SUB_KEY) === '1';

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

    if (isHidden() || isSub()) {
        hideModal(); hideDock();
    } else {
        showDock();
        setTimeout(showModal, 700);
    }

    overlay.addEventListener('click', hideModal);
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-visible')) hideModal();
    });

    if (dockOpen) dockOpen.addEventListener('click', showModal);
    if (dockDismiss) {
        dockDismiss.addEventListener('click', () => {
            localStorage.setItem(HIDE_KEY, '1');
            hideModal(); hideDock();
        });
    }

    if (form) {
        form.addEventListener('submit', () => {
            localStorage.setItem(SUB_KEY, '1');
            hideModal(); hideDock();
        });
    }

    // A11y focus trap
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
        if (prevFocus && prevFocus.focus) prevFocus.focus();
    }
    function onTrapKeydown(e) {
        if (e.key !== 'Tab' || !focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});
