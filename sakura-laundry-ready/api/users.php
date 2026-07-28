<?php
// api/users.php
require_once 'config.php';
require_auth();

$method = $_SERVER['REQUEST_METHOD'];

// Optional: only Admins should manage users
// if ($_SESSION['user_role'] !== 'Admin') {
//    http_response_code(403);
//    echo json_encode(["error" => "Forbidden. Admins only."]);
//    exit;
// }

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT id, name, role, username, created_at FROM users ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Hash password
    $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("INSERT INTO users (name, role, username, password) VALUES (?, ?, ?, ?)");
    try {
        $stmt->execute([
            $input['name'],
            $input['role'],
            $input['username'],
            $hashedPassword
        ]);
        $input['id'] = $pdo->lastInsertId();
        unset($input['password']); // don't send back password
        echo json_encode($input);
    } catch (\PDOException $e) {
        http_response_code(400);
        echo json_encode(["error" => "Username might already exist or invalid input."]);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if ($id && $id != $_SESSION['user_id']) { // prevent deleting oneself
        $stmt = $pdo->prepare("DELETE FROM users WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Cannot delete this user."]);
    }
}
?>
