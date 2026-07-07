<?php
/**
 * NovaLibrary - Institutional Shared Header
 */
require_once '../backend/Auth.php';

$user = Auth::user();
$institution = Auth::institution();

if (!$user || ($user['role'] != 4 && $user['role'] != 5)) {
    header("Location: ../index.php?page=login&error=unauthorized");
    exit;
}

if (!$institution) {
    echo "Institution not found. Please contact support.";
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $institution['name']; ?> | Institutional Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
    <div class="flex min-h-screen">
        <!-- Sidebar -->
        <aside class="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 flex flex-col">
            <div class="mb-12">
                <a href="../index.php" class="text-2xl font-black text-blue-600 tracking-tighter">Nova<span class="text-emerald-500">Library</span></a>
                <p class="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest"><?php echo $institution['type']; ?> Portal</p>
            </div>

            <nav class="space-y-2 flex-1">
                <a href="dashboard.php" class="flex items-center gap-4 px-6 py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20">
                    <i class="fa-solid fa-chart-pie"></i> Dashboard
                </a>
                <a href="books.php" class="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium text-slate-600 dark:text-slate-400">
                    <i class="fa-solid fa-book"></i> Our Library
                </a>
                <a href="members.php" class="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium text-slate-600 dark:text-slate-400">
                    <i class="fa-solid fa-users"></i> Member Management
                </a>
                <a href="settings.php" class="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium text-slate-600 dark:text-slate-400">
                    <i class="fa-solid fa-building"></i> Inst. Settings
                </a>
            </nav>

            <div class="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                        <?php echo substr($institution['name'], 0, 1); ?>
                    </div>
                    <div>
                        <p class="font-bold text-sm truncate max-w-[150px]"><?php echo $institution['name']; ?></p>
                        <p class="text-xs text-slate-500 uppercase font-medium">Inst. Owner</p>
                    </div>
                </div>
                <a href="../index.php?action=logout" class="flex items-center gap-4 px-6 py-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition font-bold text-sm">
                    <i class="fa-solid fa-right-from-bracket"></i> Logout
                </a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 p-12 overflow-y-auto">
            <header class="flex justify-between items-center mb-12">
                <div>
                    <h1 class="text-4xl font-black mb-2 tracking-tight"><?php echo $institution['name']; ?></h1>
                    <p class="text-slate-500 font-medium">Welcome to your institutional management portal.</p>
                </div>
            </header>
