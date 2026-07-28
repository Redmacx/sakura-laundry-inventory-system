<?php
// api/customers.php
require_once 'config.php';
require_auth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM customers ORDER BY name ASC");
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $input['name'],
        $input['phone'] ?? '',
        $input['email'] ?? '',
        $input['address'] ?? ''
    ]);
    $input['id'] = $pdo->lastInsertId();
    echo json_encode($input);
} elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=?");
    $stmt->execute([
        $input['name'],
        $input['phone'],
        $input['email'],
        $input['address'],
        $input['id']
    ]);
    echo json_encode(["success" => true]);
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM customers WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true]);
    }
}
?>
