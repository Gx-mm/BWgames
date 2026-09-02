<?php

header("Content-Type: text/html; charset=UTF-8");

/*
 * Test UTR
 */
$utr = $_GET["utr"] ?? "12356899657";

if ($utr === "") {
    die("UTR required");
}

/*
 * Exact endpoint found in BharatPe dashboard source
 */
$url = "https://enterprise.bharatpe.in/v1/api/transaction/recon?utr="
     . urlencode($utr);

$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 30,

    CURLOPT_HTTPHEADER => [
        "Accept: application/json"
    ],

    CURLOPT_USERAGENT =>
        "Mozilla/5.0 (Linux; Android 11) " .
        "AppleWebKit/537.36 (KHTML, like Gecko) " .
        "Chrome/120.0 Mobile Safari/537.36"
]);

$response = curl_exec($ch);

$curlError = curl_error($ch);

$httpCode = curl_getinfo(
    $ch,
    CURLINFO_HTTP_CODE
);

curl_close($ch);

echo "<h2>BharatPe UTR API Test</h2>";

echo "<b>UTR:</b> "
    . htmlspecialchars($utr)
    . "<br><br>";

echo "<b>HTTP Code:</b> "
    . htmlspecialchars((string)$httpCode)
    . "<br><br>";

echo "<b>Endpoint:</b><br>";

echo "<code>"
    . htmlspecialchars($url)
    . "</code>";

echo "<br><br>";

echo "<b>API Response:</b>";

echo "<pre style='white-space:pre-wrap;word-break:break-word;'>";

if ($response === false) {
    echo "CURL ERROR:\n";
    echo htmlspecialchars($curlError);
} else {
    echo htmlspecialchars($response);
}

echo "</pre>";