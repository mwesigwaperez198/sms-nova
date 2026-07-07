<?php
/**
 * NovaLibrary - Reader API
 * Handles: Progress, Bookmarks, Highlights, Analytics
 */
require_once '../backend/Auth.php';
require_once '../backend/Database.php';

header('Content-Type: application/json');

if (!Auth::check()) {
    echo json_encode(['success' => false, 'message' => 'Login required']);
    exit;
}

// CSRF Protection for write actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_GET['action'] ?? '';
    // Skip CSRF for analytics sendBeacon as it's hard to pass headers/tokens in some browsers
    if ($action !== 'log_analytics') {
        $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!Auth::validateCSRF($token)) {
            echo json_encode(['success' => false, 'message' => 'CSRF token mismatch']);
            exit;
        }
    }
}

$action = $_GET['action'] ?? '';
$book_id = $_POST['book_id'] ?? $_GET['book_id'] ?? 0;
$user_id = Auth::user()['id'];

$db = (new Database())->getConnection();
if (!$db) {
    echo json_encode(['success' => false, 'message' => 'Database unavailable']);
    exit;
}

switch ($action) {
    case 'save_progress':
        $last_page = $_POST['last_page'] ?? 1;
        $progress = $_POST['progress_percentage'] ?? 0;
        
        try {
            $stmt = $db->prepare("INSERT INTO reading_history (user_id, book_id, last_page, progress_percentage) 
                                 VALUES (?, ?, ?, ?) 
                                 ON DUPLICATE KEY UPDATE last_page = VALUES(last_page), progress_percentage = VALUES(progress_percentage)");
            $stmt->execute([$user_id, $book_id, $last_page, $progress]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'get_progress':
        $stmt = $db->prepare("SELECT last_page, progress_percentage FROM reading_history WHERE user_id = ? AND book_id = ?");
        $stmt->execute([$user_id, $book_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
        break;

    case 'add_bookmark':
        $page_index = $_POST['page_index'] ?? '';
        $title = $_POST['title'] ?? "Page $page_index";
        
        try {
            $stmt = $db->prepare("INSERT INTO bookmarks (user_id, book_id, page_index, title) VALUES (?, ?, ?, ?)");
            $stmt->execute([$user_id, $book_id, $page_index, $title]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'get_bookmarks':
        $stmt = $db->prepare("SELECT * FROM bookmarks WHERE user_id = ? AND book_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id, $book_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    case 'delete_bookmark':
        $bookmark_id = $_POST['bookmark_id'] ?? 0;
        $stmt = $db->prepare("DELETE FROM bookmarks WHERE id = ? AND user_id = ?");
        $stmt->execute([$bookmark_id, $user_id]);
        echo json_encode(['success' => true]);
        break;

    case 'add_highlight':
        $cfi_range = $_POST['cfi_range'] ?? '';
        $text = $_POST['text_content'] ?? '';
        $color = $_POST['color'] ?? 'yellow';
        $note = $_POST['note'] ?? '';
        
        try {
            $stmt = $db->prepare("INSERT INTO highlights (user_id, book_id, cfi_range, text_content, color, note) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$user_id, $book_id, $cfi_range, $text, $color, $note]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'get_highlights':
        $stmt = $db->prepare("SELECT * FROM highlights WHERE user_id = ? AND book_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id, $book_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    case 'delete_highlight':
        $highlight_id = $_POST['highlight_id'] ?? 0;
        $stmt = $db->prepare("DELETE FROM highlights WHERE id = ? AND user_id = ?");
        $stmt->execute([$highlight_id, $user_id]);
        echo json_encode(['success' => true]);
        break;

    case 'log_analytics':
        $duration = $_POST['duration'] ?? 0;
        $pages = $_POST['pages_read'] ?? 0;
        
        try {
            $stmt = $db->prepare("INSERT INTO reading_analytics (user_id, book_id, duration_seconds, pages_read) VALUES (?, ?, ?, ?)");
            $stmt->execute([$user_id, $book_id, $duration, $pages]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}
