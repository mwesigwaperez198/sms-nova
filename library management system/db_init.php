<?php
// Create SQLite database and seed two users: admini and librarian
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}
$dbFile = $dataDir . '/library.db';
try {
    $db = new PDO('sqlite:' . $dbFile);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    );");

    // Seed users
    $users = [
        ['username' => 'admini', 'password' => password_hash('admin123', PASSWORD_DEFAULT), 'role' => 'admin'],
        ['username' => 'librarian', 'password' => password_hash('lib123', PASSWORD_DEFAULT), 'role' => 'librarian'],
    ];
    $stmt = $db->prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (:u, :p, :r)');
    foreach ($users as $u) {
        $stmt->execute([':u' => $u['username'], ':p' => $u['password'], ':r' => $u['role']]);
    }

    echo "Database initialized at: " . htmlspecialchars($dbFile) . "\n";
    echo "Seeded users:\n - admini / admin123 (admin)\n - librarian / lib123 (librarian)\n";
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
