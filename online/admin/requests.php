<?php
/**
 * NovaLibrary - Admin Approval Requests
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();

if (!$db) {
    echo "<div class='p-8 rounded-3xl bg-red-50 text-red-700 border border-red-100'><h3 class='text-xl font-black mb-2'>Database unavailable</h3><p>Please verify MySQL is running and PDO MySQL is enabled.</p></div>";
    require_once 'footer.php';
    return;
}

if (isset($_GET['action'], $_GET['id']) && in_array($_GET['action'], ['approve', 'reject'], true)) {
    $book_id = (int) $_GET['id'];
    $status = $_GET['action'] === 'approve' ? 'Approved' : 'Rejected';
    $stmt = $db->prepare("UPDATE books SET status = ? WHERE id = ?");
    $stmt->execute([$status, $book_id]);
    header("Location: requests.php?msg=updated");
    exit;
}

$pending = $db->query("SELECT b.id, b.title, b.author, b.file_type, b.upload_date, c.name AS category_name, u.full_name AS uploader_name FROM books b LEFT JOIN categories c ON c.id = b.category_id LEFT JOIN users u ON u.id = b.uploader_id WHERE b.status = 'Pending' ORDER BY b.upload_date DESC")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
    <div class="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
        <h3 class="text-xl font-bold">Pending Book Requests</h3>
        <span class="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-black uppercase tracking-widest">
            <?php echo count($pending); ?> Pending
        </span>
    </div>

    <?php if (isset($_GET['msg']) && $_GET['msg'] === 'updated'): ?>
        <div class="mx-8 mt-6 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-sm font-bold">
            Request status updated.
        </div>
    <?php endif; ?>

    <div class="overflow-x-auto">
        <table class="w-full text-left">
            <thead>
                <tr class="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                    <th class="px-8 py-6 font-bold">Title</th>
                    <th class="px-8 py-6 font-bold">Author</th>
                    <th class="px-8 py-6 font-bold">Category</th>
                    <th class="px-8 py-6 font-bold">Uploader</th>
                    <th class="px-8 py-6 font-bold">Format</th>
                    <th class="px-8 py-6 font-bold">Submitted</th>
                    <th class="px-8 py-6 font-bold text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                <?php foreach ($pending as $row): ?>
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td class="px-8 py-5 font-bold text-sm"><?php echo htmlspecialchars($row['title']); ?></td>
                        <td class="px-8 py-5 text-sm text-slate-500"><?php echo htmlspecialchars($row['author']); ?></td>
                        <td class="px-8 py-5 text-sm text-slate-500"><?php echo htmlspecialchars($row['category_name'] ?? 'Uncategorized'); ?></td>
                        <td class="px-8 py-5 text-sm text-slate-500"><?php echo htmlspecialchars($row['uploader_name'] ?? 'Unknown'); ?></td>
                        <td class="px-8 py-5">
                            <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase">
                                <?php echo htmlspecialchars($row['file_type']); ?>
                            </span>
                        </td>
                        <td class="px-8 py-5 text-sm text-slate-400"><?php echo date('M d, Y', strtotime($row['upload_date'])); ?></td>
                        <td class="px-8 py-5">
                            <div class="flex justify-end gap-2">
                                <a href="requests.php?action=approve&id=<?php echo (int) $row['id']; ?>" class="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider hover:bg-emerald-200 transition">
                                    Approve
                                </a>
                                <a href="requests.php?action=reject&id=<?php echo (int) $row['id']; ?>" class="px-4 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider hover:bg-red-200 transition">
                                    Reject
                                </a>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
                <?php if (empty($pending)): ?>
                    <tr>
                        <td colspan="7" class="px-8 py-12 text-center text-slate-500 font-medium">No pending approvals right now.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once 'footer.php'; ?>
