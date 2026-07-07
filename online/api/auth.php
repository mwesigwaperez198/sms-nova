<?php
/**
 * NovaLibrary - Auth API
 */
require_once '../backend/Auth.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validate CSRF token on every POST
    $csrf_token = $_POST['csrf_token'] ?? '';
    if (!Auth::validateCSRF($csrf_token)) {
        http_response_code(403);
        header("Location: ../index.php?page=login&error=csrf");
        exit;
    }

    if ($action === 'register') {
        $data = [
            'full_name' => htmlspecialchars($_POST['full_name']),
            'email' => htmlspecialchars($_POST['email']),
            'password' => $_POST['password'],
            'role_id' => $_POST['role_id']
        ];

        if ($_POST['password'] !== $_POST['confirm_password']) {
            header("Location: ../index.php?page=register&error=mismatch");
            exit;
        }

        $user_id = Auth::register($data);
        if ($user_id) {
            // Handle Institution creation for roles 4 (School) and 5 (Org)
            if ($data['role_id'] == 4 || $data['role_id'] == 5) {
                require_once '../backend/Database.php';
                $db = (new Database())->getConnection();
                if (!$db) {
                    header("Location: ../index.php?page=register&error=db");
                    exit;
                }
                $inst_name = $_POST['institution'] ?? ($data['full_name'] . "'s Institution");
                $type = ($data['role_id'] == 4) ? 'School' : 'Organization';
                
                $stmt = $db->prepare("INSERT INTO institutions (name, type, owner_id) VALUES (?, ?, ?)");
                $stmt->execute([$inst_name, $type, $user_id]);
                $inst_id = $db->lastInsertId();
                
                // Update user with institution_id
                $stmt = $db->prepare("UPDATE users SET institution_id = ? WHERE id = ?");
                $stmt->execute([$inst_id, $user_id]);
            }
            header("Location: ../index.php?page=login&msg=registered");
        } else {
            header("Location: ../index.php?page=register&error=exists");
        }
    }

    if ($action === 'login') {
        $email = htmlspecialchars($_POST['email']);
        $password = $_POST['password'];

        if (Auth::login($email, $password)) {
            header("Location: ../index.php?page=home&msg=welcome");
        } else {
            header("Location: ../index.php?page=login&error=invalid");
        }
    }
}
