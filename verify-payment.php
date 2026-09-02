<?php
// verify-payment.php
session_start();
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
    $_SESSION['failed_reason'] = "Unauthorized request.";
    header("Location: failed.php");
    exit;
}

$user_amount = isset($_POST['amount']) ? trim($_POST['amount']) : '';
$user_utr    = isset($_POST['utr']) ? trim($_POST['utr']) : '';
$user_utr    = preg_replace('/[^0-9]/', '', $user_utr);

if (empty($user_amount) || empty($user_utr)) {
    $_SESSION['failed_reason'] = "Amount and UTR are required.";
    header("Location: failed.php");
    exit;
}

// Last 2 days date range (Source code implementation)
$fromDate = date('Y-m-d', strtotime('-2 days'));
$toDate   = date('Y-m-d');

// Exact URL from new source code
$api_url = $API_BASE_URL . '?module=PAYMENT_QR&merchantId=' . urlencode($MERCHANT_ID) . '&sDate=' . $fromDate . '&eDate=' . $toDate;

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => $api_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CUSTOMREQUEST => 'GET',
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_HTTPHEADER => [
        'token: ' . $TOKEN,
        'user-agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
    ]
]);

$response = curl_exec($curl);
$http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$curl_error = curl_error($curl);
curl_close($curl);

if ($response === false) {
    $_SESSION['failed_reason'] = "Connection Error: " . $curl_error;
    header("Location: failed.php");
    exit;
}

$data = json_decode($response, true);

// Transaction Matching from data.transactions array
$matchedTxn = null;
if (isset($data['data']['transactions']) && is_array($data['data']['transactions'])) {
    foreach ($data['data']['transactions'] as $txn) {
        if (isset($txn['bankReferenceNo']) && $txn['bankReferenceNo'] == $user_utr) {
            $matchedTxn = $txn;
            break;
        }
    }
}

if ($matchedTxn !== null) {
    $api_amount = (float)$matchedTxn['amount'];
    $api_status = $matchedTxn['status'];

    if ($api_status === "SUCCESS" && $api_amount === (float)$user_amount) {
        $_SESSION['payment_success'] = true;
        $_SESSION['txn_details'] = [
            'amount' => $matchedTxn['amount'],
            'utr' => $matchedTxn['bankReferenceNo'],
            'order_id' => isset($matchedTxn['orderId']) ? $matchedTxn['orderId'] : 'N/A',
            'received_from' => isset($matchedTxn['payerName']) ? $matchedTxn['payerName'] : 'Verified User'
        ];
        header("Location: success.php");
        exit;
    } else {
        $_SESSION['failed_reason'] = "Payment found but status is '{$api_status}' or Amount mismatch (Found: ₹{$api_amount}).";
        header("Location: failed.php");
        exit;
    }
} else {
    $_SESSION['failed_reason'] = "UTR not found in last 48 hours transactions.";
    header("Location: failed.php");
    exit;
}
?>
