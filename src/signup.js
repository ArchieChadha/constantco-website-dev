// signup.js
document.addEventListener('DOMContentLoaded', () => {
    // Use local API in dev (file:// or localhost); same-origin in prod
    const API_BASE =
        (location.protocol === 'file:' ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    const form = document.getElementById('signupForm');
    if (!form) return;

    // Reuse an existing status element or create one (placed at end of the form)
    let status = document.getElementById('signupStatus');
    if (!status) {
        status = document.createElement('p');
        status.id = 'signupStatus';
        status.className = 'small';
        form.appendChild(status);
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const consent = form.querySelector('#consent');

    // Helpers
    const setStatus = (msg = '', color = '') => {
        status.textContent = msg;
        status.style.color = color;
    };

    const setBusy = (busy) => {
        if (!submitBtn) return;
        submitBtn.disabled = busy;
        submitBtn.dataset._label ??= submitBtn.textContent;
        submitBtn.textContent = busy ? 'Creating account…' : submitBtn.dataset._label;
    };

    const clearInlineError = (el) => el?.classList.remove('input-error');
    const markInlineError = (el) => el?.classList.add('input-error');

    // Keep the button enabled by default; we only warn on SUBMIT if not checked
    const refreshSubmitState = () => {
        // Do NOT show any message preemptively
        if (status.textContent.includes('Privacy Policy')) setStatus('');
        if (submitBtn) submitBtn.disabled = false; // optional: leave enabled
    };
    refreshSubmitState();

    // Clear status when user interacts with the form
    form.addEventListener('input', () => {
        if (status.textContent) setStatus('');
    });
    consent?.addEventListener('change', () => {
        if (status.textContent.includes('Privacy Policy')) setStatus('');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Collect values safely
        const fullName = form.fullName?.value.trim() || '';
        const email = form.email?.value.trim() || '';
        const phone = form.phone?.value.trim() || '';
        const clientType = form.clientType?.value || '';
        const service = form.service?.value || '';
        const notes = form.notes?.value?.trim() || '';
        const password = form.password?.value || '';
        const confirmPassword = form.confirmPassword?.value || '';

        // Reset any inline error marks
        ['fullName', 'email', 'clientType', 'service', 'password', 'confirmPassword']
            .forEach(id => clearInlineError(form[id]));

        // Consent must be ticked — only warn on submit
        if (!consent?.checked) {
            setStatus('Please agree to the Terms and Privacy Policy to continue.', '#b00020');
            consent?.focus();
            return;
        }

        // Basic validations
        const emailOk = /^\S+@\S+\.\S+$/.test(email);
        const passLenOk = password.length >= 8;
        const passComplexOk = /[0-9!@#$%^&*()_\-+={}\[\]:;"'<>,.?/\\|`~]/.test(password);

        if (!fullName) {
            markInlineError(form.fullName);
            setStatus('Please enter your full name.', '#b00020');
            form.fullName?.focus();
            return;
        }
        if (!emailOk) {
            markInlineError(form.email);
            setStatus('Please enter a valid email address.', '#b00020');
            form.email?.focus();
            return;
        }
        if (!clientType) {
            markInlineError(form.clientType);
            setStatus('Please select your client type.', '#b00020');
            form.clientType?.focus();
            return;
        }
        if (!service) {
            markInlineError(form.service);
            setStatus('Please select a service.', '#b00020');
            form.service?.focus();
            return;
        }
        if (!passLenOk || !passComplexOk) {
            markInlineError(form.password);
            setStatus('Password must be at least 8 characters and include a number or symbol.', '#b00020');
            form.password?.focus();
            return;
        }
        if (password !== confirmPassword) {
            markInlineError(form.confirmPassword);
            setStatus('Passwords do not match.', '#b00020');
            form.confirmPassword?.focus();
            return;
        }

        // Everything looks good — send to backend
        const payload = {
            name: fullName,
            email,
            phone,
            client_type: clientType,
            service,
            note: notes,
            password,
            consent: true
        };

        setBusy(true);
        setStatus('');

        try {
            const res = await fetch(`${API_BASE}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Signup failed (HTTP ${res.status})`);

            setStatus('Account created successfully!', '#1a7f37');

            // Optional: store name to greet on dashboard/login
            try { sessionStorage.setItem('clientName', fullName); } catch { }

            // Redirect to login
            setTimeout(() => { window.location.href = 'login.html'; }, 900);
        } catch (err) {
            setStatus(`Error: ${err.message}`, '#b00020');
            setBusy(false);
            console.error('Signup error:', err);                       // keep
            console.error('PG code:', err.code, 'detail:', err.detail, 'message:', err.message);
            return res.status(500).json({ error: 'Server error' });
        }
    });
});
