<?php
/**
 * NovaLibrary - Institutional Settings
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();
$inst_id = $institution['id'];

// Handle Update
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = htmlspecialchars($_POST['name']);
    $type = $_POST['type'];

    $stmt = $db->prepare("UPDATE institutions SET name = ?, type = ? WHERE id = ?");
    $stmt->execute([$name, $type, $inst_id]);
    
    // Refresh institution data in session/header
    header("Location: settings.php?msg=updated");
    exit;
}
?>

<div class="max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-12 shadow-sm">
    <div class="flex items-center gap-6 mb-12">
        <div class="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl shadow-xl shadow-blue-500/20">
            <i class="fa-solid fa-building-columns"></i>
        </div>
        <div>
            <h3 class="text-3xl font-black tracking-tight">Institution Profile</h3>
            <p class="text-slate-500 font-medium">Update your public identity on NovaLibrary.</p>
        </div>
    </div>

    <?php if (isset($_GET['msg']) && $_GET['msg'] === 'updated'): ?>
        <div class="mb-10 p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 text-sm font-bold flex items-center gap-3">
            <i class="fa-solid fa-circle-check"></i>
            Settings saved successfully.
        </div>
    <?php endif; ?>

    <form action="settings.php" method="POST" class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-2">
                <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Official Name</label>
                <input type="text" name="name" value="<?php echo $institution['name']; ?>" required
                       class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
            </div>
            <div class="space-y-2">
                <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Institution Type</label>
                <select name="type" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
                    <option value="School" <?php echo $institution['type'] === 'School' ? 'selected' : ''; ?>>School / Academy</option>
                    <option value="Organization" <?php echo $institution['type'] === 'Organization' ? 'selected' : ''; ?>>Non-Profit / Corp</option>
                </select>
            </div>
        </div>

        <div class="pt-8 border-t border-slate-100 dark:border-slate-800">
            <h4 class="text-lg font-bold mb-4">Ownership & Access</h4>
            <div class="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <p class="text-sm font-bold"><?php echo Auth::user()['name']; ?></p>
                    <p class="text-xs text-slate-400">Primary Administrator / Owner</p>
                </div>
                <span class="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Verified Owner</span>
            </div>
        </div>

        <div class="pt-10">
            <button type="submit" class="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 active:scale-[0.98]">
                Save Changes
            </button>
        </div>
    </form>
</div>

<?php require_once '../admin/footer.php'; ?>
