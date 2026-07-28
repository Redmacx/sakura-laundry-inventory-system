<?php
// api/inventory.php
require_once 'config.php';
require_auth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM inventory ORDER BY created_at DESC");
    $items = $stmt->fetchAll();
    echo json_encode($items);
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO inventory (item_name, category, sub_category, quantity, max_capacity, unit) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['item_name'], 
        $input['category'], 
        $input['sub_category'], 
        $input['quantity'], 
        $input['max_capacity'], 
        $input['unit']
    ]);
    $input['id'] = $pdo->lastInsertId();
    echo json_encode($input);
} elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("UPDATE inventory SET item_name=?, category=?, sub_category=?, quantity=?, max_capacity=?, unit=? WHERE id=?");
    $stmt->execute([
        $input['item_name'], 
        $input['category'], 
        $input['sub_category'], 
        $input['quantity'], 
        $input['max_capacity'], 
        $input['unit'],
        $input['id']
    ]);
    echo json_encode(["success" => true]);
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM inventory WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "ID required"]);
    }
}
?>
