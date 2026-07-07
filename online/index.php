<?php
/**
 * NovaLibrary - Main Entry Point
 * Modern E-Library Platform
 */

// Show errors for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Basic routing
$page = isset($_GET['page']) ? $_GET['page'] : 'home';

require_once 'backend/Database.php';
require_once 'backend/Auth.php';

$db = (new Database())->getConnection();

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    Auth::logout();
    header("Location: index.php?page=home&msg=loggedout");
    exit;
}
$title = 'NovaLibrary - Your Digital Knowledge Hub';

// View mapping
$views = [
    'home' => 'frontend/home.php',
    'books' => 'frontend/books.php',
    'login' => 'frontend/login.php',
    'register' => 'frontend/register.php',
    'reader' => 'frontend/reader.php',
    'book_details' => 'frontend/book_details.php',
    'categories' => 'frontend/categories.php',
    'institutions' => 'frontend/institutions.php',
];

$view = $views[$page] ?? 'frontend/404.php';

// Titles for specific pages
if ($page === 'books') $title = 'Explore Books | NovaLibrary';
if ($page === 'login') $title = 'Login | NovaLibrary';
if ($page === 'register') $title = 'Register | NovaLibrary';

// Include the layout
include 'frontend/layouts/header.php';
include $view;
include 'frontend/layouts/footer.php';
