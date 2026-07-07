<?php
/**
 * NovaLibrary - Institutional Dashboard
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();
$inst_id = $institution['id'];

// Stats for this institution
$total_members = $db->prepare("SELECT COUNT(*) FROM users WHERE institution_id = ?");
$total_members->execute([$inst_id]);
$members_count = $total_members->fetchColumn();

$total_books = $db->prepare("SELECT COUNT(*) FROM books WHERE uploader_id IN (SELECT id FROM users WHERE institution_id = ?)");
$total_books->execute([$inst_id]);
$books_count = $total_books->fetchColumn();

// Recent members
$stmt = $db->prepare("SELECT * FROM users WHERE institution_id = ? ORDER BY created_at DESC LIMIT 5");
$stmt->execute([$inst_id]);
$recent_members = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
    <div class="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div class="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-6 text-xl">
            <i class="fa-solid fa-users"></i>
        </div>
        <p class="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Total Members</p>
        <h3 class="text-4xl font-black"><?php echo number_format($members_count); ?></h3>
    </div>
    <div class="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-6 text-xl">
            <i class="fa-solid fa-book-bookmark"></i>
        </div>
        <p class="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Our Resources</p>
        <h3 class="text-4xl font-black"><?php echo number_format($books_count); ?></h3>
    </div>
    <div class="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 mb-6 text-xl">
            <i class="fa-solid fa-chart-line"></i>
        </div>
        <p class="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Reading Activity</p>
        <h3 class="text-4xl font-black">Coming Soon</h3>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10">
        <div class="flex items-center justify-between mb-8">
            <h3 class="text-2xl font-black tracking-tight">Recently Joined</h3>
            <a href="members.php" class="text-blue-600 text-sm font-bold hover:underline">Manage All</a>
        </div>
        <div class="space-y-6">
            <?php foreach ($recent_members as $member): ?>
            <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                        <?php echo substr($member['full_name'], 0, 1); ?>
                    </div>
                    <div>
                        <p class="font-bold text-sm"><?php echo $member['full_name']; ?></p>
                        <p class="text-xs text-slate-500"><?php echo $member['email']; ?></p>
                    </div>
                </div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <?php echo date('M d', strtotime($member['created_at'])); ?>
                </span>
            </div>
            <?php endforeach; if (empty($recent_members)) echo "<p class='text-slate-500 text-center py-8'>No members yet.</p>"; ?>
        </div>
    </div>

    <div class="bg-blue-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-500/30">
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <h3 class="text-2xl font-black mb-4 relative z-10">Invite Your Members</h3>
        <p class="text-blue-100 mb-8 relative z-10">Share the knowledge. Invite students or staff to join your institutional library with a unique link.</p>
        <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8 relative z-10">
            <p class="text-xs font-black uppercase tracking-widest text-blue-200 mb-2">Invitation Link</p>
            <div class="flex items-center gap-3">
                <code class="text-sm font-bold truncate">novalibrary.com/join/<?php echo substr(md5($institution['id']), 0, 8); ?></code>
                <button class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                    <i class="fa-solid fa-copy"></i>
                </button>
            </div>
        </div>
        <button class="w-full py-4 bg-white text-blue-600 rounded-2xl font-black hover:bg-slate-100 transition shadow-lg">
            Send Email Invites
        </button>
    </div>
</div>

<?php require_once '../admin/footer.php'; ?>
