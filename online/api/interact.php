<?php
/**
 * NovaLibrary - Interaction API (Likes/Favourites)
 */
require_once '../backend/Auth.php';
require_once '../backend/Database.php';

header('Content-Type: application/json');

// CSRF Protection
$token = $_POST['csrf_token'] ?? '';
if (!Auth::validateCSRF($token)) {
    echo json_encode(['success' => false, 'message' => 'CSRF token mismatch']);
    exit;
}

if (!Auth::check()) {
    echo json_encode(['success' => false, 'message' => 'Login required']);
    exit;
}

$action = $_GET['action'] ?? '';
$book_id = $_POST['book_id'] ?? 0;
$user_id = Auth::user()['id'];

$db = (new Database())->getConnection();
if (!$db) {
    echo json_encode(['success' => false, 'message' => 'Database unavailable']);
    exit;
}

if ($action === 'like') {
    try {
        $stmt = $db->prepare("INSERT INTO likes (user_id, book_id) VALUES (?, ?)");
        $stmt->execute([$user_id, $book_id]);
        echo json_encode(['success' => true, 'message' => 'Liked']);
    } catch (PDOException $e) {
        $stmt = $db->prepare("DELETE FROM likes WHERE user_id = ? AND book_id = ?");
        $stmt->execute([$user_id, $book_id]);
        echo json_encode(['success' => true, 'message' => 'Unliked']);
    }
}

if ($action === 'rate') {
    $rating = $_POST['rating'] ?? 0;
    if ($rating < 1 || $rating > 5) {
        echo json_encode(['success' => false, 'message' => 'Invalid rating']);
        exit;
    }
    
    try {
        $stmt = $db->prepare("INSERT INTO ratings (user_id, book_id, rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)");
        $stmt->execute([$user_id, $book_id, $rating]);
        echo json_encode(['success' => true, 'message' => 'Rated successfully']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
    }
}

if ($action === 'comment') {
    $content = htmlspecialchars($_POST['content'] ?? '');
    if (empty($content)) {
        echo json_encode(['success' => false, 'message' => 'Comment cannot be empty']);
        exit;
    }
    
    try {
        $stmt = $db->prepare("INSERT INTO comments (user_id, book_id, content) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $book_id, $content]);
        echo json_encode(['success' => true, 'message' => 'Comment added']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
    }
}
