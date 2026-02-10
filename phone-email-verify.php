<?php
// phone-email-verify.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['user_json_url'])) {
        echo json_encode(['error' => 'No URL provided']);
        exit;
    }
    
    $url = $input['user_json_url'];
    
    // Security check - must be from phone.email
    if (!str_starts_with($url, 'https://user.phone.email/')) {
        echo json_encode(['error' => 'Invalid URL']);
        exit;
    }
    
    // Fetch from Phone.Email
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 || !$data) {
        echo json_encode(['error' => 'Failed to fetch from Phone.Email']);
        exit;
    }
    
    $result = json_decode($data, true);
    
    if (!$result) {
        echo json_encode(['error' => 'Invalid response from Phone.Email']);
        exit;
    }
    
    // Return the phone number
    echo json_encode([
        'success' => true,
        'phone_number' => $result['user_phone_number'] ?? '',
        'country_code' => $result['user_country_code'] ?? '91',
        'first_name' => $result['user_first_name'] ?? '',
        'last_name' => $result['user_last_name'] ?? '',
        'email' => $result['user_email'] ?? ''
    ]);
    
} else {
    echo json_encode(['message' => 'Phone.Email verification endpoint. Send POST with user_json_url.']);
}
?>