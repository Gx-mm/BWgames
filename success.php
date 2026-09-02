<?php
// success.php
session_start();

// Security: Check agar payment sach me verify hua hai ya nahi
if (!isset($_SESSION['payment_success']) || $_SESSION['payment_success'] !== true) {
    header("Location: index.php");
    exit;
}

// Transaction details variable me store kar rahe hain
$txn = $_SESSION['txn_details'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #e2fbff; display: flex; justify-content: center; align-items: center; height: 100vh; padding: 20px; }
        .success-card { background: #ffffff; width: 100%; max-width: 420px; padding: 35px 25px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); text-align: center; }
        .success-icon { width: 60px; height: 60px; background: #28a745; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-size: 30px; font-weight: bold; margin: 0 auto 20px; }
        h2 { color: #28a745; margin-bottom: 25px; font-size: 24px; }
        .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: left; margin-bottom: 25px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
        .detail-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
        .detail-label { color: #64748b; font-size: 14px; font-weight: 600; }
        .detail-value { color: #0f172a; font-size: 14px; font-weight: 700; text-align: right; }
        .amount-highlight { font-size: 20px; color: #00afcb; }
        .btn-home { display: block; width: 100%; background-color: #00afcb; color: #ffffff; text-decoration: none; padding: 14px; font-size: 16px; font-weight: 700; border-radius: 8px; transition: background-color 0.3s; }
        .btn-home:hover { background-color: #0093aa; }
    </style>
</head>
<body>

    <div class="success-card">
        <div class="success-icon">✓</div>
        <h2>Payment Verified!</h2>
        
        <div class="details-box">
            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value" style="color: #28a745;">SUCCESS</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Amount</span>
                <span class="detail-value amount-highlight">₹<?php echo htmlspecialchars($txn['amount']); ?></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">UTR No.</span>
                <span class="detail-value"><?php echo htmlspecialchars($txn['utr']); ?></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Sender</span>
                <span class="detail-value"><?php echo htmlspecialchars($txn['received_from']); ?></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Order ID</span>
                <span class="detail-value"><?php echo htmlspecialchars($txn['order_id']); ?></span>
            </div>
        </div>

        <!-- Yahan par wapas jane par session clear ho jayega -->
        <a href="index.php" class="btn-home" onclick="<?php session_destroy(); ?>">Done / Make New Verification</a>
    </div>

</body>
</html>
