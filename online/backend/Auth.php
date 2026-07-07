<?php

class Auth {
    private static function initSession(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_set_cookie_params([
                'httponly' => true,
                'samesite' => 'Lax',
                'secure' => isset($_SERVER['HTTPS']),
            ]);
            session_start();
        }
    }

    public static function check() {
        self::initSession();
        return isset($_SESSION['user_id']);
    }

    public static function user() {
        if (self::check()) {
            return [
                'id' => $_SESSION['user_id'],
                'role' => $_SESSION['role_id'],
                'name' => $_SESSION['full_name']
            ];
        }
        return null;
    }

    public static function login($email, $password) {
        require_once 'Database.php';
        $db = (new Database())->getConnection();
        if (!$db) return false;

        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            self::initSession();
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role_id'] = $user['role_id'];
            $_SESSION['full_name'] = $user['full_name'];
            return true;
        }
        return false;
    }

    public static function register($data) {
        require_once 'Database.php';
        $db = (new Database())->getConnection();
        if (!$db) return false;

        $hashed_password = password_hash($data['password'], PASSWORD_BCRYPT);

        try {
            $stmt = $db->prepare("INSERT INTO users (full_name, email, password, role_id, status) VALUES (?, ?, ?, ?, 'Active')");
            if ($stmt->execute([
                $data['full_name'],
                $data['email'],
                $hashed_password,
                $data['role_id']
            ])) {
                return $db->lastInsertId();
            }
            return false;
        } catch (PDOException $e) {
            return false;
        }
    }

    public static function hasRole($role_id) {
        $user = self::user();
        if (!$user) return false;
        return $user['role'] >= $role_id;
    }

    public static function institution() {
        $user = self::user();
        if (!$user) return null;

        require_once 'Database.php';
        $db = (new Database())->getConnection();
        if (!$db) return null;

        $stmt = $db->prepare("SELECT i.* FROM institutions i JOIN users u ON u.institution_id = i.id WHERE u.id = ?");
        $stmt->execute([$user['id']]);
        $inst = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($inst) return $inst;

        $stmt = $db->prepare("SELECT * FROM institutions WHERE owner_id = ? LIMIT 1");
        $stmt->execute([$user['id']]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public static function generateCSRF() {
        self::initSession();
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function validateCSRF($token) {
        self::initSession();
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }

    public static function logout() {
        self::initSession();
        $_SESSION = [];
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
        session_destroy();
    }
}
