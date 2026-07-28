<?php
// api/orders.php
require_once 'config.php';
require_auth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO orders (customer_name, service_type, weight, status, customer_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['customer_name'],
        $input['service_type'],
        $input['weight'],
        $input['status'] ?? 'received',
        $input['customer_id'] ?? null
    ]);
    $input['id'] = $pdo->lastInsertId();
    echo json_encode($input);
} elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    // For Kanban drag-and-drop, usually only status is updated, but we support all
    if (isset($input['status']) && !isset($input['customer_name'])) {
        $stmt = $pdo->prepare("UPDATE orders SET status=? WHERE id=?");
        $stmt->execute([$input['status'], $input['id']]);
    } else {
        $stmt = $pdo->prepare("UPDATE orders SET customer_name=?, service_type=?, weight=?, status=?, customer_id=? WHERE id=?");
        $stmt->execute([
            $input['customer_name'],
            $input['service_type'],
            $input['weight'],
            $input['status'],
            $input['customer_id'] ?? null,
            $input['id']
        ]);
    }
    echo json_encode(["success" => true]);
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM orders WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true]);
    }
}
?>
