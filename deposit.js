/**
 * BWGAMES - Deposit Controller with Live UTR Verification Gateway
 * Endpoint: https://api99.site.je/api-verify.php
 */

const RECEIVER_UPI_ID = "bharatpe.9027429188@fbpe";
const MERCHANT_NAME = "BWGAMES";

// Live external gateway URL
const PHP_VERIFY_ENDPOINT = "https://api99.site.je/api-verify.php";

let activeUserId = null;

document.addEventListener("DOMContentLoaded", () => {
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        alert("Configuration Error: SUPABASE_URL / KEY missing in key/key.js");
        return;
    }

    activeUserId = localStorage.getItem('bwgames_session');
    if (!activeUserId) {
        window.location.replace('login.html');
        return;
    }

    loadWalletBalance(activeUserId);
    document.getElementById("display-upi-id").textContent = RECEIVER_UPI_ID;

    // Default QR with ₹500
    renderDynamicQR(500);

    // Live update QR as user types amount
    document.getElementById("deposit-amount").addEventListener("input", (e) => {
        const amt = parseFloat(e.target.value) || 100;
        renderDynamicQR(amt);
    });
});

/**
 * 1. Fetch User Balance
 */
async function loadWalletBalance(userId) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${encodeURIComponent(userId)}&select=balance,currency`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const wallets = await res.json();
        if (wallets && wallets.length > 0) {
            document.getElementById("current-balance").textContent = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: wallets[0].currency || 'INR',
                minimumFractionDigits: 2
            }).format(wallets[0].balance);
        }
    } catch (e) {
        console.error("Wallet load error:", e);
    }
}

/**
 * 2. Amount Helpers & QR Generation
 */
function setQuickAmount(amount) {
    document.getElementById("deposit-amount").value = amount;
    document.querySelectorAll(".chip-btn").forEach(btn => {
        btn.classList.toggle("active", btn.textContent.includes(amount.toString()));
    });
    renderDynamicQR(amount);
}

function renderDynamicQR(amount) {
    const upiLink = `upi://pay?pa=${RECEIVER_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;
    document.getElementById("upi-qr-image").src = qrUrl;
}

function copyUPI() {
    navigator.clipboard.writeText(RECEIVER_UPI_ID).then(() => {
        showToast("UPI ID Copied to Clipboard!", "success");
    });
}

function validateUTRInput(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
}

/**
 * 3. Main Verification & Database Credit Flow
 */
async function submitDepositVerification() {
    const amount = parseFloat(document.getElementById("deposit-amount").value);
    const utr = document.getElementById("utr-number").value.trim();

    if (!amount || amount < 100) {
        showToast("Minimum deposit amount is ₹100", "error");
        return;
    }

    if (!utr || utr.length !== 12) {
        showToast("Please enter a valid 12-digit UTR number.", "error");
        return;
    }

    setButtonLoading(true);

    try {
        // Step 1: Call api-verify.php on api99.site.je
        let apiData = null;
        try {
            const phpResponse = await fetch(PHP_VERIFY_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    amount: amount,
                    utr: utr
                })
            });

            if (!phpResponse.ok) {
                throw new Error(`Gateway returned HTTP ${phpResponse.status}`);
            }

            apiData = await phpResponse.json();
        } catch (fetchErr) {
            console.error("API Gateway Fetch Error:", fetchErr);
            throw new Error("Unable to connect to payment server. Check network or server status.");
        }

        // Step 2: Validate Verification Response
        if (!apiData || apiData.status !== true) {
            throw new Error(apiData?.message || "Payment verification failed with bank.");
        }

        // Step 3: Atomic Credit into Database (credit_deposit_secure RPC)
        const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/credit_deposit_secure`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_user_id: activeUserId,
                p_amount: amount,
                p_utr: utr
            })
        });

        const rpcData = await rpcResponse.json();

        if (!rpcResponse.ok) {
            throw new Error(rpcData.message || "UTR verified but failed to add amount to wallet.");
        }

        showToast(`₹${amount} Deposited Successfully!`, "success");

        document.getElementById("utr-number").value = "";
        loadWalletBalance(activeUserId);

        setTimeout(() => {
            window.location.href = "wallet.html";
        }, 1800);

    } catch (err) {
        console.error("Deposit Error:", err);
        showToast(err.message, "error");
    } finally {
        setButtonLoading(false);
    }
}

/**
 * 4. UI Loader & Toast Controls
 */
function setButtonLoading(isLoading) {
    const btn = document.getElementById("btn-submit-deposit");
    if (!btn) return;
    const text = btn.querySelector(".btn-text");
    const loader = btn.querySelector(".btn-loader");

    if (isLoading) {
        btn.disabled = true;
        if (text) text.classList.add("hidden");
        if (loader) loader.classList.remove("hidden");
    } else {
        btn.disabled = false;
        if (text) text.classList.remove("hidden");
        if (loader) loader.classList.add("hidden");
    }
}

function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast || !toastMsg) {
        alert(message);
        return;
    }

    toastMsg.textContent = message;
    toast.className = `toast ${type}`;
    if (toastIcon) {
        toastIcon.className = (type === 'success') ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation";
    }

    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3500);
}
