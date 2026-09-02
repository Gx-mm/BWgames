<?php
// failed.php
session_start();

// Error message nikalna aur session destroy karna taaki cache na ho
$error_message = isset($_SESSION['failed_reason']) ? $_SESSION['failed_reason'] : "Payment details did not match or an unknown error occurred.";
session_destroy();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #fef2f2; display: flex; justify-content: center; align-items: center; height: 100vh; padding: 20px; }
        .error-card { background: #ffffff; width: 100%; max-width: 420px; padding: 35px 25px; border-radius: 12px; box-shadow: 0 8px 24px rgba(220, 38, 38, 0.1); text-align: center; }
        .error-icon { width: 60px; height: 60px; background: #dc2626; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-size: 30px; font-weight: bold; margin: 0 auto 20px; }
        h2 { color: #dc2626; margin-bottom: 15px; font-size: 24px; }
        .error-msg { color: #475569; font-size: 15px; margin-bottom: 25px; line-height: 1.5; background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; text-align: left; }
        .btn-retry { display: block; width: 100%; background-color: #475569; color: #ffffff; text-decoration: none; padding: 14px; font-size: 16px; font-weight: 700; border-radius: 8px; transition: background-color 0.3s; }
        .btn-retry:hover { background-color: #334155; }
    </style>
</head>
<body>

    <div class="error-card">
        <div class="error-icon">✕</div>
        <h2>Verification Failed</h2>
        
        <div class="error-msg">
            <strong>Reason:</strong><br>
            <?php echo htmlspecialchars($error_message); ?>
        </div>

        <a href="index.php" class="btn-retry">Try Again</a>
    </div>

</body>
</html>
