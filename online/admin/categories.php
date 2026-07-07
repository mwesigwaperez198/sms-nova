<?php
/**
 * NovaLibrary - Admin Category Management
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();

if (!$db) {
    echo "<div class='p-8 rounded-3xl bg-red-50 text-red-700 border border-red-100'><h3 class='text-xl font-black mb-2'>Database unavailable</h3><p>Please verify MySQL is running and PDO MySQL is enabled.</p></div>";
    require_once 'footer.php';
    return;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['name'])) {
    $name = trim($_POST['name']);
    $description = trim($_POST['description'] ?? '');
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));

    if ($name !== '' && $slug !== '') {
        try {
            $stmt = $db->prepare("INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)");
            $stmt->execute([$name, $slug, $description]);
            header("Location: categories.php?msg=added");
            exit;
        } catch (PDOException $e) {
            $error = "Category already exists or could not be created.";
        }
    } else {
        $error = "Category name is required.";
    }
}

$categories = $db->query("SELECT c.*, (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id) AS book_count FROM categories c ORDER BY c.name ASC")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
    <div class="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div class="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
            <h3 class="text-xl font-bold">Category Catalog</h3>
            <span class="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500">
                <?php echo count($categories); ?> Total
            </span>
        </div>

        <?php if (isset($_GET['msg']) && $_GET['msg'] === 'added'): ?>
            <div class="mx-8 mt-6 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-sm font-bold">
                Category added successfully.
            </div>
        <?php endif; ?>

        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead>
                    <tr class="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                        <th class="px-8 py-6 font-bold">Name</th>
                        <th class="px-8 py-6 font-bold">Slug</th>
                        <th class="px-8 py-6 font-bold">Books</th>
                        <th class="px-8 py-6 font-bold">Created</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                    <?php foreach ($categories as $cat): ?>
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td class="px-8 py-5 font-bold text-sm"><?php echo htmlspecialchars($cat['name']); ?></td>
                            <td class="px-8 py-5 text-sm text-slate-500"><?php echo htmlspecialchars($cat['slug']); ?></td>
                            <td class="px-8 py-5">
                                <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase">
                                    <?php echo (int) $cat['book_count']; ?>
                                </span>
                            </td>
                            <td class="px-8 py-5 text-sm text-slate-400"><?php echo isset($cat['created_at']) ? date('M d, Y', strtotime($cat['created_at'])) : '-'; ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (empty($categories)): ?>
                        <tr>
                            <td colspan="4" class="px-8 py-12 text-center text-slate-500 font-medium">No categories found.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm h-fit">
        <h3 class="text-xl font-bold mb-6">Add Category</h3>

        <?php if (isset($error)): ?>
            <div class="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <form action="categories.php" method="POST" class="space-y-5">
            <div class="space-y-2">
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Category Name</label>
                <input type="text" name="name" required class="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-blue-500 transition">
            </div>
            <div class="space-y-2">
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Description</label>
                <textarea name="description" rows="4" class="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-blue-500 transition"></textarea>
            </div>
            <button type="submit" class="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition shadow-xl shadow-blue-500/20">
                Save Category
            </button>
        </form>
    </div>
</div>

<?php require_once 'footer.php'; ?>
