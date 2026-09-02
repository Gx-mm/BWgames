document.addEventListener("DOMContentLoaded", () => {
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        console.error("Critical: Supabase configuration missing. Check key/key.js.");
        showNotification("System error: Missing configuration.", "error");
        return; 
    }

    initPasswordToggles();
    
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    if (loginForm) loginForm.addEventListener("submit", handleLogin);
    if (signupForm) signupForm.addEventListener("submit", handleSignup);
});

function switchTab(tabId) {
    hideNotification();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.querySelectorAll('.auth-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`${tabId}-section`).classList.add('active');
}

function initPasswordToggles() {
    const toggleBtns = document.querySelectorAll('.toggle-password');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    });
}

function setLoading(formId, isLoading) {
    const btn = document.querySelector(`#${formId} .primary-btn`);
    if (!btn) return;
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    if (isLoading) {
        btn.disabled = true;
        if (btnText) btnText.style.opacity = '0';
        if (loader) loader.classList.remove('hidden');
    } else {
        btn.disabled = false;
        if (btnText) btnText.style.opacity = '1';
        if (loader) loader.classList.add('hidden');
    }
}

function showNotification(message, type = 'error') {
    const notifyEl = document.getElementById('auth-notification');
    if (!notifyEl) return;
    notifyEl.textContent = message;
    notifyEl.className = `notification ${type}`; 
}

function hideNotification() {
    const notifyEl = document.getElementById('auth-notification');
    if (!notifyEl) return;
    notifyEl.className = 'notification hidden';
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

/**
 * ==========================================
 * 1. LOGIN LOGIC (Reads from public.users)
 * ==========================================
 */
async function handleLogin(e) {
    e.preventDefault();
    hideNotification();
    
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        showNotification("Please enter your email and password.");
        return;
    }

    setLoading('login-form', true);

    try {
        // Query users table: email, password match and fetch active status & identity
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=id,user_id,name,email,role,is_active`, 
            {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        const users = await response.json();

        if (!users || users.length === 0) {
            throw new Error("Invalid email or password.");
        }

        const user = users[0];

        if (user.is_active === false) {
            throw new Error("Your account has been deactivated. Please contact support.");
        }

        // Store user_id (e.g. "10001") in localStorage session
        localStorage.setItem('bwgames_session', user.user_id);
        localStorage.setItem('bwgames_uuid', user.id);
        localStorage.setItem('bwgames_role', user.role);

        window.location.href = 'home.html';

    } catch (error) {
        console.error("Login Error:", error);
        showNotification(error.message);
    } finally {
        setLoading('login-form', false);
    }
}

/**
 * ==========================================
 * 2. SIGNUP LOGIC (Inserts into public.users)
 * Wallet is auto-created by PostgreSQL trigger
 * ==========================================
 */
async function handleSignup(e) {
    e.preventDefault();
    hideNotification();
    
    const fullName = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const phone = document.getElementById("signup-phone").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
        showNotification("Please fill in all fields.");
        return;
    }

    if (password.length < 6) {
        showNotification("Password must be at least 6 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showNotification("Passwords do not match.");
        return;
    }

    setLoading('signup-form', true);

    try {
        // Step A: Check if Email or Phone already exists in users table
        const checkRes = await fetch(
            `${SUPABASE_URL}/rest/v1/users?or=(email.eq.${encodeURIComponent(email)},phone.eq.${encodeURIComponent(phone)})&select=id`, 
            {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        const existingUsers = await checkRes.json();
        if (existingUsers && existingUsers.length > 0) {
            throw new Error("Email or Phone number is already registered.");
        }

        // Step B: Calculate next incremental user_id (e.g. 10001, 10002)
        const userRes = await fetch(
            `${SUPABASE_URL}/rest/v1/users?select=user_id&order=created_at.desc&limit=1`, 
            {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        const lastUsers = await userRes.json();
        let nextNumericId = 10001;

        if (lastUsers && lastUsers.length > 0 && lastUsers[0].user_id) {
            const rawId = parseInt(lastUsers[0].user_id.replace(/\D/g, ''));
            if (!isNaN(rawId)) {
                nextNumericId = rawId + 1;
            }
        }
        const nextUserId = nextNumericId.toString();

        // Step C: Insert into users table (Exact 10-column matching schema)
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: nextUserId,
                name: fullName,
                email: email,
                phone: phone,
                password: password,
                role: 'user',
                is_active: true
            })
        });

        if (!insertRes.ok) {
            const errData = await insertRes.json();
            throw new Error(errData.message || "Failed to create account. Please try again.");
        }

        // Auto trigger creates corresponding row in public.wallets table
        document.getElementById("signup-form").reset();
        switchTab('login');
        showNotification("Account created successfully! Please login.", "success");

    } catch (error) {
        console.error("Signup Error:", error);
        showNotification(error.message);
    } finally {
        setLoading('signup-form', false);
    }
}
