<?php
session_start();
if (empty($_SESSION['user']) || ($_SESSION['role'] ?? '') !== 'librarian') {
    header('Location: login.php');
    exit;
}
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Librarian Dashboard</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Librarian Dashboard</h1>
    <p>Welcome, <?php echo htmlspecialchars($_SESSION['user']); ?>.</p>
    <ul>
      <li><a href="#">Check out / return books (placeholder)</a></li>
      <li><a href="#">View inventory (placeholder)</a></li>
    </ul>
    <p><a href="logout.php">Logout</a></p>
  </div>
</body>
</html>
