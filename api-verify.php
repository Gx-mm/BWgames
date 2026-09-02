<?php
// api-verify.php
error_reporting(0);

// 1. CORS Headers (Vercel domain allow karne ke liye)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Preflight request handle karna
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

// 2. Vercel se aane wala JSON data receive karna
$input = json_decode(file_get_contents('php://input'), true);

$user_amount = isset($input['amount']) ? trim($input['amount']) : '';
$user_utr    = isset($input['utr']) ? trim($input['utr']) : '';
$user_utr    = preg_replace('/[^0-9]/', '', $user_utr);

if (empty($user_amount) || empty($user_utr)) {
    echo json_encode([
        "status" => false,
        "message" => "Amount aur UTR number required hain."
    ]);
    exit;
}

// 3. BharatPe API Call
$fromDate = date('Y-m-d', strtotime('-2 days'));
$toDate   = date('Y-m-d');
$api_url  = $API_BASE_URL . '?module=PAYMENT_QR&merchantId=' . urlencode($MERCHANT_ID) . '&sDate=' . $fromDate . '&eDate=' . $toDate;

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
curl_close($curl);

$data = json_decode($response, true);

// 4. Transaction Matching
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
        // Verification Successful Response
        echo json_encode([
            "status" => true,
            "message" => "Payment verified successfully!",
            "data" => [
                "utr" => $matchedTxn['bankReferenceNo'],
                "amount" => $matchedTxn['amount'],
                "sender" => isset($matchedTxn['payerName']) ? $matchedTxn['payerName'] : 'Verified User'
            ]
        ]);
        exit;
    } else {
        echo json_encode([
            "status" => false,
            "message" => "Amount mismatch ya payment status SUCCESS nahi hai."
        ]);
        exit;
    }
} else {
    echo json_encode([
        "status" => false,
        "message" => "Yeh UTR number pichhle 48 ghanto ke records me nahi mila."
    ]);
    exit;
}
?>
