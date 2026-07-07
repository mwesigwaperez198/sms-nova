<?php
session_start();
if (empty($_SESSION['user']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admin Dashboard</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Admin Dashboard</h1>
    <p>Welcome, <?php echo htmlspecialchars($_SESSION['user']); ?>.</p>
    <ul>
      <li><a href="#">Manage books (placeholder)</a></li>
      <li><a href="#">Manage users (placeholder)</a></li>
    </ul>
    <p><a href="logout.php">Logout</a></p>
  </div>
</body>
</html>
