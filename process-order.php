<?php
// process-order.php
error_reporting(0);
require_once 'config.php';

// Agar data POST se nahi aaya, toh seedha buy.html par redirect kar do
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: buy.html");
    exit;
}

// 1. Form se data receive karna
$user_id        = $_POST['user_id'] ?? '';
$product_id     = $_POST['product_id'] ?? '';
$product_name   = $_POST['product_name'] ?? '';
$product_image  = $_POST['product_image'] ?? '';
$price          = $_POST['price'] ?? 0;
$amount         = $_POST['amount'] ?? 0;
$utr            = preg_replace('/[^0-9]/', '', $_POST['utr'] ?? '');
$customer_name  = $_POST['customer_name'] ?? '';
$customer_phone = $_POST['customer_phone'] ?? '';
$address        = $_POST['address'] ?? '';
$city           = $_POST['city'] ?? '';
$state          = $_POST['state'] ?? '';
$pincode        = $_POST['pincode'] ?? '';
$payment_method = $_POST['payment_method'] ?? 'UPI';

if (empty($utr) || empty($amount)) {
    die("<h2 style='color:red; text-align:center; margin-top:50px;'>Error: UTR and Amount are required.</h2>");
}

// 2. Supabase API Credentials
$supabase_url = "https://xjiwwapiqszpnoqaripq.supabase.co";
$supabase_key = "sb_publishable_TJQTU1yv270qrVAEW6Ygwg_HxRtmCTe"; // Aapki public/anon key

// A. Check Duplicate UTR in Supabase 'orders' table
$ch_dup = curl_init("$supabase_url/rest/v1/orders?utr=eq.$utr&select=id");
curl_setopt_array($ch_dup, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "apikey: $supabase_key",
        "Authorization: Bearer $supabase_key"
    ]
]);
$dup_response = curl_exec($ch_dup);
curl_close($ch_dup);
$existing_orders = json_decode($dup_response, true);

if (!empty($existing_orders)) {
    echo "<h2 style='color:red; text-align:center; margin-top:50px;'>Payment Failed: This UTR number has already been used for another order!</h2>";
    echo "<br><div style='text-align:center;'><a href='javascript:history.back()'>Go Back</a></div>";
    exit;
}

// B. BharatPe API Verification Call
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
        'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    ]
]);

$response = curl_exec($curl);
curl_close($curl);
$data = json_decode($response, true);

$matchedTxn = null;
if (isset($data['data']['transactions']) && is_array($data['data']['transactions'])) {
    foreach ($data['data']['transactions'] as $txn) {
        if (isset($txn['bankReferenceNo']) && (string)$txn['bankReferenceNo'] === (string)$utr) {
            $matchedTxn = $txn;
            break;
        }
    }
}

// C. Verify Status and Amount
if ($matchedTxn !== null && $matchedTxn['status'] === "SUCCESS" && (float)$matchedTxn['amount'] === (float)$amount) {
    
    // 3. Save Order to Supabase Database via PHP cURL
    $order_data = json_encode([
        "user_id" => $user_id,
        "product_id" => (int)$product_id,
        "product_name" => $product_name,
        "product_image" => $product_image,
        "quantity" => 1,
        "price" => (float)$price,
        "total_amount" => (float)$amount,
        "amount" => (float)$amount,
        "utr" => $utr,
        "customer_name" => $customer_name,
        "customer_phone" => $customer_phone,
        "address" => $address,
        "city" => $city,
        "state" => $state,
        "pincode" => $pincode,
        "payment_method" => $payment_method,
        "order_status" => "Pending"
    ]);

    $ch_insert = curl_init("$supabase_url/rest/v1/orders");
    curl_setopt_array($ch_insert, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => $order_data,
        CURLOPT_HTTPHEADER => [
            "apikey: $supabase_key",
            "Authorization: Bearer $supabase_key",
            "Content-Type: application/json",
            "Prefer: return=minimal"
        ]
    ]);
    
    $insert_response = curl_exec($ch_insert);
    $http_code = curl_getinfo($ch_insert, CURLINFO_HTTP_CODE);
    curl_close($ch_insert);

    if ($http_code >= 200 && $http_code < 300) {
        // Success! Redirect to orders page on Vercel
        header("Location: https://shop-99.vercel.app/orders.html?success=true");
        exit;
    } else {
        echo "<h2 style='color:red; text-align:center; margin-top:50px;'>Database Error: Unable to save order.</h2>";
    }

} else {
    echo "<h2 style='color:red; text-align:center; margin-top:50px;'>Payment Verification Failed!</h2>";
    echo "<p style='text-align:center;'>Either the UTR is invalid, payment is pending, or the amount does not match your product price.</p>";
    echo "<div style='text-align:center; margin-top:20px;'><a href='javascript:history.back()' style='padding:10px 20px; background:#0066ff; color:#fff; text-decoration:none; border-radius:5px;'>Go Back & Try Again</a></div>";
}
?>
