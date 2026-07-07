<?php
/**
 * NovaLibrary - Institutional Library Management
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();
$inst_id = $institution['id'];
$action = $_GET['action'] ?? 'list';

// Handle Add/Delete actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'add') {
    $title = htmlspecialchars($_POST['title']);
    $author = htmlspecialchars($_POST['author']);
    $category_id = $_POST['category_id'];
    $file_type = $_POST['file_type'];
    $description = htmlspecialchars($_POST['description']);
    $uploader_id = Auth::user()['id'];

    // Handle New Category Creation
    if ($category_id === 'new' && !empty($_POST['new_category_name'])) {
        $new_cat_name = htmlspecialchars($_POST['new_category_name']);
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $new_cat_name)));
        
        try {
            $stmt = $db->prepare("INSERT INTO categories (name, slug) VALUES (?, ?)");
            $stmt->execute([$new_cat_name, $slug]);
            $category_id = $db->lastInsertId();
        } catch (PDOException $e) {
            // If category already exists, try to find it
            $stmt = $db->prepare("SELECT id FROM categories WHERE name = ? OR slug = ?");
            $stmt->execute([$new_cat_name, $slug]);
            $category_id = $stmt->fetchColumn();
        }
    }

    $cover_image = 'default_cover.jpg';
    $file_path = '';

    // Handle Cover Upload
    if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === 0) {
        $ext = pathinfo($_FILES['cover_image']['name'], PATHINFO_EXTENSION);
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];
        if (in_array(strtolower($ext), $allowed)) {
            $cover_image = uniqid('cover_') . '.' . $ext;
            move_uploaded_file($_FILES['cover_image']['tmp_name'], '../uploads/covers/' . $cover_image);
        }
    }

    // Handle Book File Upload
    error_log("FILES: " . print_r($_FILES, true));
    error_log("POST: " . print_r($_POST, true));
    if (isset($_FILES['book_file']) && $_FILES['book_file']['error'] === 0) {
        $ext = pathinfo($_FILES['book_file']['name'], PATHINFO_EXTENSION);
        $book_file = uniqid('book_') . '.' . $ext;
        if (move_uploaded_file($_FILES['book_file']['tmp_name'], '../uploads/books/' . $book_file)) {
            $file_path = $book_file;
        } else {
            $error = "Failed to move uploaded file. Check directory permissions.";
        }
    } elseif (isset($_FILES['book_file']) && $_FILES['book_file']['error'] !== 0) {
        $error = "Upload error code: " . $_FILES['book_file']['error'];
    }

    if ($file_path) {
        // Books uploaded by institutions are Approved by default for their own library
        $stmt = $db->prepare("INSERT INTO books (title, author, category_id, file_type, description, cover_image, file_path, uploader_id, institution_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved')");
        $stmt->execute([$title, $author, $category_id, $file_type, $description, $cover_image, $file_path, $uploader_id, $inst_id]);
        header("Location: books.php?msg=added");
        exit;
    } else {
        if (empty($error)) {
            $error = "Failed to upload book file. Please ensure a file is selected and check server logs.";
        }
    }
}

if ($action === 'delete' && isset($_GET['id'])) {
    // Only allow deleting books that belong to this institution
    $stmt = $db->prepare("DELETE FROM books WHERE id = ? AND institution_id = ?");
    $stmt->execute([$_GET['id'], $inst_id]);
    header("Location: books.php?msg=deleted");
    exit;
}

// Fetch only books belonging to this institution
$stmt = $db->prepare("SELECT b.*, c.name as category_name FROM books b LEFT JOIN categories c ON b.category_id = c.id WHERE b.institution_id = ? ORDER BY b.upload_date DESC");
$stmt->execute([$inst_id]);
$books = $stmt->fetchAll(PDO::FETCH_ASSOC);

$categories = $db->query("SELECT * FROM categories")->fetchAll(PDO::FETCH_ASSOC);
?>

<?php if ($action === 'list'): ?>
<div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
    <div class="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
        <h3 class="text-xl font-bold">Institutional Resources</h3>
        <a href="?action=add" class="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2">
            <i class="fa-solid fa-plus"></i> Upload Resource
        </a>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left">
            <thead>
                <tr class="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                    <th class="px-8 py-6 font-bold">Material</th>
                    <th class="px-8 py-6 font-bold">Category</th>
                    <th class="px-8 py-6 font-bold">Format</th>
                    <th class="px-8 py-6 font-bold">Read Count</th>
                    <th class="px-8 py-6 font-bold text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                <?php foreach ($books as $book): ?>
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="px-8 py-5">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                                <img src="../uploads/covers/<?php echo $book['cover_image']; ?>" onerror="this.src='https://via.placeholder.com/60x80'" class="w-full h-full object-cover">
                            </div>
                            <div>
                                <p class="font-bold text-sm"><?php echo $book['title']; ?></p>
                                <p class="text-xs text-slate-500"><?php echo $book['author']; ?></p>
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-5 text-sm font-medium"><?php echo $book['category_name']; ?></td>
                    <td class="px-8 py-5">
                        <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase">
                            <?php echo $book['file_type']; ?>
                        </span>
                    </td>
                    <td class="px-8 py-5 text-sm text-slate-500 font-bold"><?php echo $book['read_count']; ?></td>
                    <td class="px-8 py-5 text-right">
                        <div class="flex justify-end gap-3">
                            <a href="../index.php?page=reader&id=<?php echo $book['id']; ?>" target="_blank" class="text-blue-500 hover:text-blue-700 transition">
                                <i class="fa-solid fa-eye"></i>
                            </a>
                            <a href="?action=delete&id=<?php echo $book['id']; ?>" onclick="return confirm('Permanently delete this resource?')" class="text-red-400 hover:text-red-600 transition">
                                <i class="fa-solid fa-trash"></i>
                            </a>
                        </div>
                    </td>
                </tr>
                <?php endforeach; if (empty($books)) echo "<tr><td colspan='5' class='px-8 py-12 text-center text-slate-500 font-medium'>You haven't uploaded any resources to your library yet.</td></tr>"; ?>
            </tbody>
        </table>
    </div>
</div>
<?php elseif ($action === 'add'): ?>
<div class="max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-12 shadow-sm">
    <h3 class="text-2xl font-black mb-8">Upload Institutional Material</h3>
    
    <?php if (isset($error)): ?>
        <div class="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold">
            <?php echo $error; ?>
        </div>
    <?php endif; ?>

    <form action="?action=add" method="POST" enctype="multipart/form-data" class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-2">
            <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Document Title</label>
            <input type="text" name="title" required placeholder="Chemistry Study Guide"
                   class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
        </div>
        <div class="space-y-2">
            <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Author / Department</label>
            <input type="text" name="author" required placeholder="Science Faculty"
                   class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
        </div>
        <div class="space-y-2">
            <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
            <select name="category_id" id="category_select" onchange="toggleNewCategoryInput()" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
                <?php foreach ($categories as $cat): ?>
                    <option value="<?php echo $cat['id']; ?>"><?php echo $cat['name']; ?></option>
                <?php endforeach; ?>
                <option value="new">+ Add New Category</option>
            </select>
        </div>
        <div class="space-y-2 hidden" id="new_category_input">
            <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">New Category Name</label>
            <input type="text" name="new_category_name" placeholder="E.g. Engineering"
                   class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
        </div>
        <script>
        function toggleNewCategoryInput() {
            const select = document.getElementById('category_select');
            const input = document.getElementById('new_category_input');
            if (select.value === 'new') {
                input.classList.remove('hidden');
                input.querySelector('input').setAttribute('required', 'required');
            } else {
                input.classList.add('hidden');
                input.querySelector('input').removeAttribute('required');
            }
        }
        // Run on page load to set correct state
        document.addEventListener('DOMContentLoaded', toggleNewCategoryInput);
        </script>
        <div class="space-y-2">
            <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Format</label>
            <select name="file_type" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
                <option value="PDF">PDF Document</option>
                <option value="EPUB">EPUB Ebook</option>
                <option value="DOCX">Word Document</option>
            </select>
        </div>
        
        <div class="space-y-2">
            <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Cover Image</label>
            <input type="file" name="cover_image" accept="image/*" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700">
        </div>
        <div class="space-y-2">
            <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Source File</label>
            <input type="file" name="book_file" required class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700">
        </div>

        <div class="md:col-span-2 space-y-2">
            <label class="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Brief Description</label>
            <textarea name="description" rows="4" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition"></textarea>
        </div>
        
        <div class="md:col-span-2 pt-4">
            <button type="submit" class="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/20">
                Publish to Our Library
            </button>
            <a href="books.php" class="ml-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition">Cancel</a>
        </div>
    </form>
</div>
<?php endif; ?>

<?php require_once '../admin/footer.php'; ?>
