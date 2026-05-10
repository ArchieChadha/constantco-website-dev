document.addEventListener('DOMContentLoaded', () => {
    const API_BASE =
        (location.protocol === 'file:' ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    const form = document.getElementById('signupForm');
    if (!form) return;
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    const signupLoginLink = document.getElementById('signupLoginLink');

    if (signupLoginLink && redirect === 'appointment-access') {
        signupLoginLink.href = 'appointment-access.html';
        signupLoginLink.textContent = 'Go back to appointment login';
    }

    let status = document.getElementById('signupStatus');
    if (!status) {
        status = document.createElement('p');
        status.id = 'signupStatus';
        status.className = 'small';
        form.appendChild(status);
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const consent = form.querySelector('#consent');

    const setStatus = (msg = '', color = '') => {
        status.textContent = msg;
        status.style.color = color;
    };

    const setBusy = (busy) => {
        if (!submitBtn) return;
        submitBtn.disabled = busy;
        submitBtn.dataset._label ??= submitBtn.textContent;
        submitBtn.textContent = busy ? 'Creating account...' : submitBtn.dataset._label;
    };

    const clearInlineError = (el) => el?.classList.remove('input-error');
    const markInlineError = (el) => el?.classList.add('input-error');

    form.addEventListener('input', () => {
        if (status.textContent) setStatus('');
    });

    consent?.addEventListener('change', () => {
        if (status.textContent) setStatus('');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = form.fullName?.value.trim() || '';
        const email = form.email?.value.trim() || '';
        const phone = form.phone?.value.trim() || '';
        const clientType = form.clientType?.value || '';
        const service = form.service?.value || '';
        const notes = form.notes?.value?.trim() || '';
        const password = form.password?.value || '';
        const confirmPassword = form.confirmPassword?.value || '';

        ['fullName', 'email', 'clientType', 'service', 'password', 'confirmPassword']
            .forEach(id => clearInlineError(form[id]));

        if (!consent?.checked) {
            setStatus('Please agree to the Terms and Privacy Policy to continue.', '#b00020');
            consent?.focus();
            return;
        }

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

            if (!res.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            setBusy(false);
            setStatus('Account created successfully!', '#1a7f37');

            try {
                sessionStorage.setItem('clientName', fullName);
            } catch { }

            let targetPage = 'login.html';

            if (redirect === 'appointment-access') {
                targetPage = 'appointment-access.html';
            }

            setTimeout(() => {
                window.location.href = targetPage;
            }, 600);

        } catch (err) {
            console.error('Signup error:', err);
            setStatus(err.message || 'Something went wrong. Please try again.', '#b00020');
            setBusy(false);
        }
    });
});