<?php
/**
 * NovaLibrary - Admin User Management
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();

$users = $db->query("SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
    <div class="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
        <h3 class="text-xl font-bold">User Management</h3>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left">
            <thead>
                <tr class="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                    <th class="px-8 py-6 font-bold">User</th>
                    <th class="px-8 py-6 font-bold">Role</th>
                    <th class="px-8 py-6 font-bold">Status</th>
                    <th class="px-8 py-6 font-bold">Joined Date</th>
                    <th class="px-8 py-6 font-bold">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                <?php foreach ($users as $u): ?>
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="px-8 py-5">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                                <?php echo substr($u['full_name'], 0, 1); ?>
                            </div>
                            <div>
                                <p class="font-bold text-sm"><?php echo $u['full_name']; ?></p>
                                <p class="text-xs text-slate-500"><?php echo $u['email']; ?></p>
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-5 text-sm font-medium"><?php echo $u['role_name']; ?></td>
                    <td class="px-8 py-5">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider 
                            <?php echo $u['status'] === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'; ?>">
                            <?php echo $u['status']; ?>
                        </span>
                    </td>
                    <td class="px-8 py-5 text-sm text-slate-400"><?php echo date('M d, Y', strtotime($u['created_at'])); ?></td>
                    <td class="px-8 py-5">
                        <button class="text-slate-400 hover:text-blue-600 transition"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once 'footer.php'; ?>
