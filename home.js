/**
 * BWGAMES Home Page / Lobby Controller
 * Updated to match fresh schema: users (name, profile_image) and wallets (balance, currency)
 */

let currentSlideIndex = 0;
let carouselInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Verify Supabase Configuration
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        console.error("Critical: Supabase configuration missing from key/key.js");
        showToast("Configuration missing. Please check key/key.js.", "error");
        return;
    }

    // 2. Validate Session
    const sessionUserId = localStorage.getItem('bwgames_session');
    if (!sessionUserId) {
        window.location.replace('login.html');
        return;
    }

    // 3. Initialize Interactive Components
    initCarousel();

    // 4. Fetch User Profile, Wallet, and Game Catalog
    loadUserData(sessionUserId);
    loadWalletData(sessionUserId);
    loadGamesCatalog();
});

/* ==========================================
 * DATA FETCHING (PROFILE, WALLET, GAMES)
 * ========================================== */

/**
 * Loads current user's profile icon/name from `users` table
 */
async function loadUserData(userId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}&select=name,profile_image`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) return;

        const users = await response.json();
        if (users && users.length > 0) {
            const user = users[0];
            const avatarEl = document.getElementById('header-avatar');
            const initialEl = document.getElementById('header-avatar-initial');

            if (user.profile_image) {
                avatarEl.style.backgroundImage = `url('${user.profile_image}')`;
                if (initialEl) initialEl.style.display = 'none';
            } else if (initialEl) {
                avatarEl.style.backgroundImage = 'none';
                initialEl.style.display = 'block';
                initialEl.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
            }
        }
    } catch (err) {
        console.error("Header Profile Fetch Error:", err);
    }
}

/**
 * Loads current user's wallet balance from `wallets` table using `balance` column
 */
async function loadWalletData(userId) {
    const balanceEl = document.getElementById('header-balance');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${encodeURIComponent(userId)}&select=balance,currency`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) throw new Error("Wallet fetch failed");

        const wallets = await response.json();
        if (wallets && wallets.length > 0) {
            const wallet = wallets[0];
            // Exact new column name 'balance'
            const balance = parseFloat(wallet.balance || 0);

            const formatted = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: wallet.currency || 'INR',
                minimumFractionDigits: 2
            }).format(balance);

            if (balanceEl) {
                balanceEl.textContent = formatted;
                balanceEl.classList.remove('skeleton-box');
            }
        } else if (balanceEl) {
            balanceEl.textContent = "₹0.00";
            balanceEl.classList.remove('skeleton-box');
        }
    } catch (err) {
        console.error("Wallet Load Error:", err);
        if (balanceEl) {
            balanceEl.textContent = "₹0.00";
            balanceEl.classList.remove('skeleton-box');
        }
    }
}

/**
 * Reads games dynamically from `games` table, groups them by category and renders cards
 */
async function loadGamesCatalog() {
    const container = document.getElementById('game-categories-container');
    if (!container) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/games?is_active=eq.true&order=sort_order.asc&select=*`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) throw new Error("Unable to load games.");

        const games = await response.json();

        container.innerHTML = '';

        if (!games || games.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: var(--text-gray);">
                    <i class="fa-solid fa-gamepad" style="font-size: 2rem; color: var(--primary-red); margin-bottom: 10px;"></i>
                    <p>No active games available at the moment.</p>
                </div>
            `;
            return;
        }

        // Group games by Category
        const categories = {};
        games.forEach(game => {
            const cat = game.category || 'FEATURED GAMES';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(game);
        });

        // Render each category block
        Object.keys(categories).forEach(catName => {
            const catBlock = document.createElement('section');
            catBlock.className = 'game-category-block';

            // Category Header
            const headerRow = document.createElement('div');
            headerRow.className = 'category-header-row';
            headerRow.innerHTML = `
                <h3 class="category-title">${escapeHTML(catName)}</h3>
                <button class="view-all-btn" onclick="safeNavigate('game.html')">
                    View All <i class="fa-solid fa-chevron-right"></i>
                </button>
            `;
            catBlock.appendChild(headerRow);

            // Games Grid
            const grid = document.createElement('div');
            grid.className = 'games-grid';

            categories[catName].forEach(game => {
                const card = document.createElement('div');
                card.className = 'game-card';
                card.onclick = () => openGame(game.page_url);

                const badgeHtml = game.badge 
                    ? `<span class="game-badge">${escapeHTML(game.badge)}</span>` 
                    : '';

                const imageUrl = game.image_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80';

                card.innerHTML = `
                    ${badgeHtml}
                    <div class="game-img-wrap">
                        <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(game.name)}" class="game-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80'">
                    </div>
                    <div class="game-details">
                        <span class="game-name">${escapeHTML(game.name)}</span>
                        <span class="game-desc">${escapeHTML(game.description || 'Win Big Everyday')}</span>
                        <button class="btn-play-game">PLAY NOW</button>
                    </div>
                `;
                grid.appendChild(card);
            });

            catBlock.appendChild(grid);
            container.appendChild(catBlock);
        });

    } catch (err) {
        console.error("Game Catalog Error:", err);
        container.innerHTML = `
            <div style="text-align:center; padding: 30px; color: var(--primary-red);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.8rem; margin-bottom: 8px;"></i>
                <p>Unable to load games. Please try again.</p>
            </div>
        `;
    }
}

/* ==========================================
 * SAFE NAVIGATION & ROUTING
 * ========================================== */

async function safeNavigate(pageUrl) {
    if (!pageUrl || pageUrl === '#') {
        window.location.href = 'error.html';
        return;
    }

    try {
        const check = await fetch(pageUrl, { method: 'HEAD' });
        if (check.ok) {
            window.location.href = pageUrl;
        } else {
            window.location.href = 'error.html';
        }
    } catch (e) {
        window.location.href = pageUrl;
    }
}

function openGame(pageUrl) {
    safeNavigate(pageUrl);
}

/* ==========================================
 * BANNER CAROUSEL
 * ========================================== */

function initCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    const totalSlides = dots.length;

    if (totalSlides <= 1) return;

    if (carouselInterval) clearInterval(carouselInterval);

    carouselInterval = setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
        updateCarousel();
    }, 4500);
}

function jumpToSlide(index) {
    currentSlideIndex = index;
    updateCarousel();
    initCarousel();
}

function updateCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = document.querySelectorAll('.carousel-dots .dot');

    if (!track) return;

    track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentSlideIndex);
    });
}

/* ==========================================
 * UTILITY HELPERS
 * ========================================== */

function showToast(message, type = "error") {
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

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
