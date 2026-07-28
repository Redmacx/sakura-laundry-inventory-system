<?php
// api/config.php
session_start();

$host = '127.0.0.1';
$db   = 'sakura_laundry';
$user = 'root';
$pass = ''; // Default XAMPP password
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

header("Content-Type: application/json");

// Optional: Helper function to ensure user is logged in for protected routes
function require_auth() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized. Please log in."]);
        exit;
    }
}
?>
