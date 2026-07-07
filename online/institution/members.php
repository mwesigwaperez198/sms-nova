<?php
/**
 * NovaLibrary - Institutional Member Management
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();
$inst_id = $institution['id'];

// Handle Add Member
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add') {
    $full_name = htmlspecialchars($_POST['full_name']);
    $email = htmlspecialchars($_POST['email']);
    $password = password_hash($_POST['password'], PASSWORD_BCRYPT);
    $role_id = 2; // Default to Student for institutions

    try {
        $stmt = $db->prepare("INSERT INTO users (full_name, email, password, role_id, institution_id, status) VALUES (?, ?, ?, ?, ?, 'Active')");
        $stmt->execute([$full_name, $email, $password, $role_id, $inst_id]);
        $success = "Member added successfully.";
    } catch (PDOException $e) {
        $error = "User with this email already exists.";
    }
}

// Handle Remove Member
if (isset($_GET['remove'])) {
    $user_to_remove = $_GET['remove'];
    $stmt = $db->prepare("UPDATE users SET institution_id = NULL WHERE id = ? AND institution_id = ?");
    $stmt->execute([$user_to_remove, $inst_id]);
    header("Location: members.php?msg=removed");
}

$stmt = $db->prepare("SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.institution_id = ? ORDER BY u.full_name ASC");
$stmt->execute([$inst_id]);
$members = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
    <!-- Member List -->
    <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div class="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
            <h3 class="text-xl font-bold">Member Registry</h3>
            <span class="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-500 uppercase tracking-widest">
                <?php echo count($members); ?> Total
            </span>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead>
                    <tr class="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                        <th class="px-8 py-6 font-bold">Name</th>
                        <th class="px-8 py-6 font-bold">Email</th>
                        <th class="px-8 py-6 font-bold">Role</th>
                        <th class="px-8 py-6 font-bold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                    <?php foreach ($members as $m): ?>
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td class="px-8 py-5">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                    <?php echo substr($m['full_name'], 0, 1); ?>
                                </div>
                                <span class="font-bold text-sm"><?php echo $m['full_name']; ?></span>
                            </div>
                        </td>
                        <td class="px-8 py-5 text-sm text-slate-500"><?php echo $m['email']; ?></td>
                        <td class="px-8 py-5">
                            <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase">
                                <?php echo $m['role_name']; ?>
                            </span>
                        </td>
                        <td class="px-8 py-5 text-right">
                            <?php if ($m['id'] != $user['id']): ?>
                            <a href="?remove=<?php echo $m['id']; ?>" onclick="return confirm('Revoke institutional access for this user?')" class="text-red-400 hover:text-red-600 transition text-sm font-bold">Revoke</a>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Add Member Form -->
    <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm h-fit sticky top-32">
        <h3 class="text-xl font-bold mb-8">Add New Member</h3>
        
        <?php if (isset($success)): ?>
            <div class="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 text-sm font-bold">
                <?php echo $success; ?>
            </div>
        <?php endif; ?>
        <?php if (isset($error)): ?>
            <div class="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <form action="members.php" method="POST" class="space-y-6">
            <input type="hidden" name="action" value="add">
            <div class="space-y-2">
                <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                <input type="text" name="full_name" required placeholder="Student Name"
                       class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
            </div>
            <div class="space-y-2">
                <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <input type="email" name="email" required placeholder="student@school.edu"
                       class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
            </div>
            <div class="space-y-2">
                <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Temporary Password</label>
                <input type="password" name="password" required placeholder="••••••••"
                       class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
            </div>
            <button type="submit" class="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 active:scale-[0.98]">
                Enroll Member
            </button>
        </form>
    </div>
</div>

<?php require_once '../admin/footer.php'; ?>
