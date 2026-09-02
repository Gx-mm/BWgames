<?php 
// index.php
session_start(); 

// CSRF Token generate kar rahe hain security ke liye
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Payment</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        body {
            background-color: #f0f4f8;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            padding: 20px;
        }
        .verification-card {
            background: #ffffff;
            width: 100%;
            max-width: 420px;
            padding: 30px 25px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h2 {
            color: #211B3E;
            font-size: 24px;
            font-weight: 700;
        }
        .header p {
            color: #585371;
            font-size: 14px;
            margin-top: 5px;
        }
        /* Yaha se QR Code ka design add kiya hai */
        .qr-section {
            text-align: center;
            margin-bottom: 25px;
            padding: 15px;
            background-color: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
        }
        .qr-section p {
            color: #475569;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .qr-section img {
            width: 180px;
            height: 180px;
            object-fit: contain;
            border-radius: 8px;
            background: #fff;
            padding: 5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        /* QR Code CSS End */
        
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #475569;
            font-size: 14px;
            font-weight: 600;
        }
        .form-group input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
            transition: border-color 0.3s ease;
        }
        .form-group input:focus {
            border-color: #00afcb;
            box-shadow: 0 0 0 3px rgba(0, 175, 203, 0.1);
        }
        .input-icon-wrapper {
            position: relative;
        }
        .input-prefix {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #475569;
            font-weight: bold;
        }
        .has-prefix input {
            padding-left: 35px;
        }
        .btn-verify {
            width: 100%;
            background-color: #00afcb;
            color: #ffffff;
            border: none;
            padding: 14px;
            font-size: 16px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.3s ease;
            margin-top: 10px;
        }
        .btn-verify:hover {
            background-color: #0093aa;
        }
        .btn-verify:active {
            transform: scale(0.98);
        }
        .footer-text {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #8d8b97;
        }
    </style>
</head>
<body>

    <div class="verification-card">
        <div class="header">
            <h2>Payment Verification</h2>
            <p>Scan the QR to pay & enter details below</p>
        </div>

        <!-- Naya QR Code Section -->
        <div class="qr-section">
            <p>Scan to Pay</p>
            <img src="QR.png" alt="Payment QR Code">
        </div>

        <!-- Form POST ke through verify-payment.php ko data bhejega -->
        <form action="verify-payment.php" method="POST">
            
            <!-- Hidden CSRF Token -->
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
            
            <div class="form-group">
                <label for="amount">Payment Amount</label>
                <div class="input-icon-wrapper has-prefix">
                    <span class="input-prefix">₹</span>
                    <input type="number" id="amount" name="amount" step="0.01" min="1" placeholder="0.00" required>
                </div>
            </div>

            <div class="form-group">
                <label for="utr">UTR / Transaction ID</label>
                <input type="text" id="utr" name="utr" placeholder="Enter 12-digit UTR No." required autocomplete="off">
            </div>

            <button type="submit" class="btn-verify">Verify Payment</button>
        </form>

        <div class="footer-text">
            Powered by Secure Payment Gateway
        </div>
    </div>

</body>
</html>
