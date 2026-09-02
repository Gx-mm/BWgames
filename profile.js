/**
 * BWGAMES Profile Controller
 * Strictly matched to users (10 cols) and wallets (5 cols) tables
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Verify Configuration
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        console.error("Critical: Supabase configuration missing from key/key.js");
        showToast("Configuration missing. Please check key/key.js.", "error");
        return;
    }

    // 2. Authenticate Session
    const sessionUserId = localStorage.getItem('bwgames_session');
    if (!sessionUserId) {
        window.location.replace('login.html');
        return;
    }

    // 3. Fetch User and Wallet Records
    loadUserProfile(sessionUserId);
    loadUserWallet(sessionUserId);
});

/**
 * Loads Profile Data from the clean `users` table
 */
async function loadUserProfile(userId) {
    try {
        // Read exact 10-column table columns
        const queryUrl = `${SUPABASE_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,name,email,phone,is_active,created_at`;
        
        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) throw new Error("Unable to load profile.");

        const users = await response.json();
        if (!users || users.length === 0) throw new Error("User profile not found.");

        const user = users[0];

        // Avatar Initial
        const avatarBox = document.getElementById('avatar-container');
        const avatarText = document.getElementById('avatar-text');
        if (avatarText) {
            avatarText.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        }

        // Names and Identifiers
        document.getElementById('user-name').textContent = user.name || 'Player';
        document.getElementById('user-id-text').textContent = `User ID: ${user.user_id}`;
        
        // Account Status
        const statusText = document.getElementById('user-status');
        statusText.textContent = user.is_active ? 'Active Account' : 'Inactive Account';
        statusText.style.color = user.is_active ? 'var(--accent-green)' : '#ff4757';

        // Member Date
        const memberDateFormatted = formatDate(user.created_at);
        document.getElementById('member-date').innerHTML = `<i class="fa-regular fa-calendar"></i> ${memberDateFormatted}`;

        // Personal Information List
        document.getElementById('info-fullname').textContent = user.name || '--';
        document.getElementById('info-email').textContent = user.email || '--';
        document.getElementById('info-phone').textContent = user.phone || '--';
        document.getElementById('info-userid').textContent = user.user_id;
        document.getElementById('info-joined').textContent = formatFullDateTime(user.created_at);

        const statusBadge = document.getElementById('info-status-badge');
        statusBadge.textContent = user.is_active ? 'Active' : 'Inactive';
        statusBadge.style.color = user.is_active ? 'var(--accent-green)' : '#ff4757';

        // Modal Input Pre-fills
        document.getElementById('edit-name').value = user.name || '';
        document.getElementById('edit-phone').value = user.phone || '';
        document.getElementById('edit-email').value = user.email || '';

        // Clear Skeleton animations
        removeSkeletons('profile-card');
        removeSkeletons('info-card-list');

    } catch (err) {
        console.error("Profile Fetch Error:", err);
        showToast("Unable to load profile.", "error");
    }
}

/**
 * Loads Wallet Balance from the `wallets` table (column: balance)
 */
async function loadUserWallet(userId) {
    try {
        const queryUrl = `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${encodeURIComponent(userId)}&select=balance,currency`;
        
        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) throw new Error("Wallet record not found.");

        const wallets = await response.json();
        if (!wallets || wallets.length === 0) throw new Error("Wallet not found.");

        const wallet = wallets[0];
        const balance = parseFloat(wallet.balance || 0);

        const formattedAmount = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: wallet.currency || 'INR',
            minimumFractionDigits: 2
        }).format(balance);

        document.getElementById('wallet-balance').textContent = formattedAmount;
        document.getElementById('wallet-currency').textContent = wallet.currency || 'INR';

        removeSkeletons('wallet-card');

    } catch (err) {
        console.error("Wallet Fetch Error:", err);
        document.getElementById('wallet-balance').textContent = "₹0.00";
        removeSkeletons('wallet-card');
    }
}

/**
 * Edit Profile Form Submission Handler
 */
async function handleSaveProfile(e) {
    e.preventDefault();
    const userId = localStorage.getItem('bwgames_session');
    if (!userId) return;

    const name = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();

    if (!name || !phone) {
        showToast("Name and phone number cannot be empty.", "error");
        return;
    }

    setButtonLoading(true);

    try {
        const updateUrl = `${SUPABASE_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}`;
        
        const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                name: name,
                phone: phone,
                updated_at: new Date().toISOString()
            })
        });

        if (!response.ok) throw new Error("Failed to save profile changes.");

        showToast("Profile updated successfully!", "success");
        closeEditModal();

        loadUserProfile(userId);

    } catch (err) {
        console.error("Update Profile Error:", err);
        showToast("Unable to update profile. Please try again.", "error");
    } finally {
        setButtonLoading(false);
    }
}

/**
 * User ID Clipboard Copy
 */
function copyUserId() {
    const userIdText = document.getElementById('info-userid').textContent;
    if (userIdText && userIdText !== '--') {
        navigator.clipboard.writeText(userIdText).then(() => {
            showToast(`User ID copied: ${userIdText}`, "success");
        }).catch(() => {
            showToast("Failed to copy ID", "error");
        });
    }
}

/**
 * Logout Handler
 */
function handleLogout() {
    localStorage.removeItem('bwgames_session');
    localStorage.removeItem('bwgames_uuid');
    localStorage.removeItem('bwgames_role');
    window.location.replace('login.html');
}

/**
 * Modal Visibility Controls
 */
function openEditModal() {
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

function closeEditModalOnOverlay(e) {
    if (e.target.id === 'edit-modal') {
        closeEditModal();
    }
}

/**
 * Helper & Formatting Utilities
 */
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.className = `toast ${type}`;
    
    if (toastIcon) {
        toastIcon.className = type === 'success' ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation";
    }

    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}

function setButtonLoading(isLoading) {
    const btn = document.getElementById('save-profile-btn');
    if (!btn) return;
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    if (isLoading) {
        btn.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (btnLoader) btnLoader.classList.remove('hidden');
    } else {
        btn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');
    }
}

function removeSkeletons(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const skeletonElements = container.querySelectorAll('.skeleton-box');
    skeletonElements.forEach(el => el.classList.remove('skeleton-box'));
}

function formatDate(dateString) {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFullDateTime(dateString) {
    if (!dateString) return '---';
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart}, ${timePart}`;
}
