<?php
/**
 * NovaLibrary - Admin Bootstrap Script
 * Modern & Clear UI for initial setup.
 */

require_once 'backend/Database.php';
require_once 'backend/Auth.php';

// Check for dark mode preference to keep UI consistent
$darkModeScript = "
    <script>
        if (localStorage.getItem('dark-mode') === 'true' || (!('dark-mode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    </script>
";

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup Admin | NovaLibrary</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <?php echo $darkModeScript; ?>
    <style> body { font-family: 'Inter', sans-serif; } </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-6">

    <div class="max-w-xl w-full">
        <div class="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 border border-slate-100 dark:border-slate-800 relative overflow-hidden text-center">
            
            <!-- Branding -->
            <div class="mb-10">
                <div class="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-xl shadow-blue-500/20">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <h1 class="text-3xl font-black tracking-tighter">System <span class="text-blue-600">Bootstrap</span></h1>
                <p class="text-slate-500 dark:text-slate-400 mt-2">Initializing NovaLibrary administrative access.</p>
            </div>

            <?php
            $db = (new Database())->getConnection();

            if (!$db) {
                echo "
                <div class='p-6 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/30 mb-8'>
                    <i class='fa-solid fa-triangle-exclamation text-2xl mb-2'></i>
                    <p class='font-bold'>Database Connection Failed</p>
                    <p class='text-sm opacity-80'>Please ensure your MySQL server is running and the 'novalibrary' database exists.</p>
                </div>";
            } else {
                $admin_email = "admin@novalibrary.com";
                $admin_password = "AdminPassword123!"; 
                $admin_name = "Super Admin";
                $role_id = 8; // ProsAdmin

                // Check if exists
                $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$admin_email]);

                if ($stmt->fetch()) {
                    echo "
                    <div class='p-8 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 mb-10'>
                        <i class='fa-solid fa-circle-info text-amber-500 text-3xl mb-4'></i>
                        <h3 class='text-xl font-bold text-amber-900 dark:text-amber-400 mb-2'>Account Already Exists</h3>
                        <p class='text-slate-600 dark:text-slate-400 text-sm'>The admin account for <strong>$admin_email</strong> has already been initialized.</p>
                    </div>";
                } else {
                    $hashed_password = password_hash($admin_password, PASSWORD_BCRYPT);
                    try {
                        $stmt = $db->prepare("INSERT INTO users (full_name, email, password, role_id, status) VALUES (?, ?, ?, ?, 'Active')");
                        $stmt->execute([$admin_name, $admin_email, $hashed_password, $role_id]);
                        
                        echo "
                        <div class='p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 mb-10'>
                            <i class='fa-solid fa-circle-check text-emerald-500 text-4xl mb-4'></i>
                            <h3 class='text-2xl font-black text-emerald-900 dark:text-emerald-400 mb-6'>Admin Account Created!</h3>
                            
                            <div class='space-y-4 text-left bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700'>
                                <div>
                                    <p class='text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1'>Email Address</p>
                                    <p class='font-bold text-slate-700 dark:text-slate-200'>$admin_email</p>
                                </div>
                                <div class='pt-4 border-t border-slate-50 dark:border-slate-700'>
                                    <p class='text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1'>Temporary Password</p>
                                    <p class='font-mono font-bold text-blue-600 dark:text-blue-400'>$admin_password</p>
                                </div>
                                <div class='pt-4 border-t border-slate-50 dark:border-slate-700'>
                                    <p class='text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1'>Access Level</p>
                                    <p class='font-bold text-slate-700 dark:text-slate-200'>ProsAdmin (Level 8)</p>
                                </div>
                            </div>
                        </div>";
                    } catch (PDOException $e) {
                        echo "<p class='text-red-500 font-bold'>Error: " . $e->getMessage() . "</p>";
                    }
                }
            }
            ?>

            <!-- Action Links -->
            <div class="space-y-4">
                <a href="index.php?page=login" class="block w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/20">
                    Go to Login Portal
                </a>
                
                <div class="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div class="flex items-center justify-center gap-3 text-red-500 mb-2">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span class="text-xs font-black uppercase tracking-widest">Security Warning</span>
                    </div>
                    <p class="text-xs text-slate-400 leading-relaxed px-4">
                        For security reasons, you must <strong>delete the create_admin.php file</strong> from your server immediately after logging in.
                    </p>
                </div>
            </div>

        </div>

        <p class="text-center mt-12 text-slate-400 text-sm font-medium">
            &copy; <?php echo date('Y'); ?> NovaLibrary Infrastructure Setup
        </p>
    </div>

</body>
</html>
