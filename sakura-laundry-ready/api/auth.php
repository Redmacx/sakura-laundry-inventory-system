<?php
// api/auth.php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'POST') {
    // Login
    $input = json_decode(file_get_contents('php://input'), true);
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];
        echo json_encode(["message" => "Login successful", "user" => ["name" => $user['name'], "role" => $user['role']]]);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Invalid username or password"]);
    }
} elseif ($method === 'GET' && $action === 'logout') {
    session_destroy();
    echo json_encode(["message" => "Logged out successfully"]);
} elseif ($method === 'GET' && $action === 'me') {
    // Check if logged in
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            "loggedIn" => true,
            "user" => [
                "name" => $_SESSION['user_name'],
                "role" => $_SESSION['user_role']
            ]
        ]);
    } else {
        echo json_encode(["loggedIn" => false]);
    }
}
?>
