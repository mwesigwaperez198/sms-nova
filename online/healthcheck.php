<?php
/**
 * NovaLibrary - Local Health Check
 * Quick verification for runtime communication paths.
 */
header('Content-Type: application/json');

require_once __DIR__ . '/backend/Database.php';

$results = [];

function add_check(&$results, $name, $ok, $details) {
    $results[] = [
        'name' => $name,
        'ok' => (bool) $ok,
        'details' => $details
    ];
}

add_check(
    $results,
    'php_runtime',
    version_compare(PHP_VERSION, '8.1.0', '>='),
    'Detected PHP ' . PHP_VERSION
);

add_check(
    $results,
    'pdo_mysql_extension',
    extension_loaded('pdo_mysql'),
    extension_loaded('pdo_mysql') ? 'pdo_mysql loaded' : 'pdo_mysql missing'
);

$db = (new Database())->getConnection();
add_check(
    $results,
    'database_connection',
    $db instanceof PDO,
    $db instanceof PDO ? 'Connected to database' : 'Could not connect to database'
);

add_check(
    $results,
    'uploads_books_writable',
    is_dir(__DIR__ . '/uploads/books') && is_writable(__DIR__ . '/uploads/books'),
    'uploads/books directory must exist and be writable'
);

add_check(
    $results,
    'uploads_covers_writable',
    is_dir(__DIR__ . '/uploads/covers') && is_writable(__DIR__ . '/uploads/covers'),
    'uploads/covers directory must exist and be writable'
);

$required_files = [
    'index.php',
    'backend/Database.php',
    'backend/Auth.php',
    'api/auth.php',
    'api/interact.php',
    'api/reader.php',
    'admin/dashboard.php',
    'admin/categories.php',
    'admin/requests.php',
    'institution/dashboard.php'
];

$missing = [];
foreach ($required_files as $file) {
    if (!file_exists(__DIR__ . '/' . $file)) {
        $missing[] = $file;
    }
}

add_check(
    $results,
    'required_files_present',
    count($missing) === 0,
    count($missing) === 0 ? 'All required files found' : 'Missing: ' . implode(', ', $missing)
);

$overall_ok = true;
foreach ($results as $check) {
    if (!$check['ok']) {
        $overall_ok = false;
        break;
    }
}

echo json_encode([
    'app' => 'NovaLibrary',
    'timestamp' => date('c'),
    'overall_ok' => $overall_ok,
    'checks' => $results
], JSON_PRETTY_PRINT);
