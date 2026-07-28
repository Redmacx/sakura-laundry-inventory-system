<?php
// api/data.php
require_once 'config.php';
require_auth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $inventory = $pdo->query("SELECT * FROM inventory ORDER BY created_at DESC")->fetchAll();
    $orders = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC")->fetchAll();
    $users = $pdo->query("SELECT id, name, role, username, created_at FROM users ORDER BY created_at DESC")->fetchAll();
    $customers = $pdo->query("SELECT * FROM customers ORDER BY name ASC")->fetchAll();
    
    echo json_encode([
        "inventory" => $inventory,
        "orders" => $orders,
        "users" => $users,
        "customers" => $customers
    ]);
}
?>
