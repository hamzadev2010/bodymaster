<?php
require_once 'database.php';

// CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Get presence ID from query parameter (?id=123) OR from URL path
$presenceId = 0;
if (isset($_GET['id'])) {
    $presenceId = (int)$_GET['id'];
} else {
    $requestUri = $_SERVER['REQUEST_URI'];
    if (preg_match('/\/presence-detail\.php\/(\d+)/', $requestUri, $matches)) {
        $presenceId = (int)$matches[1];
    }
}

if ($presenceId <= 0) {
    sendJSON(['error' => 'Invalid presence ID'], 400);
}

// GET - Fetch single presence
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM Presence WHERE id = ? AND isdeleted = 0");
        $stmt->execute([$presenceId]);
        $presence = $stmt->fetch();
        
        if (!$presence) {
            sendJSON(['message' => 'Not found'], 404);
        }
        
        sendJSON($presence);
    } catch (Exception $e) {
        sendJSON(['error' => $e->getMessage()], 500);
    }
}

// DELETE - Soft delete presence (retirer)
elseif ($method === 'DELETE') {
    try {
        // Check if presence exists
        $stmt = $pdo->prepare("SELECT id, isdeleted FROM Presence WHERE id = ?");
        $stmt->execute([$presenceId]);
        $presence = $stmt->fetch();
        
        if (!$presence) {
            sendJSON(['error' => 'Pointage introuvable'], 404);
        }
        
        if ($presence['isdeleted']) {
            sendJSON(['error' => 'Pointage déjà supprimé'], 400);
        }
        
        $now = date('Y-m-d H:i:s');
        
        // Soft delete the presence
        $stmt = $pdo->prepare("UPDATE Presence SET isdeleted = 1, deletedat = ? WHERE id = ?");
        $stmt->execute([$now, $presenceId]);
        
        sendJSON(['success' => true]);
    } catch (Exception $e) {
        sendJSON(['error' => $e->getMessage()], 500);
    }
}

else {
    sendJSON(['error' => 'Method not allowed'], 405);
}
?>

