<?php
/**
 * NovaLibrary - Admin Book Management
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();
$action = $_GET['action'] ?? 'list';

// Handle Add/Edit/Delete actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'add') {
        $title = $_POST['title'];
        $author = $_POST['author'];
        $category_id = $_POST['category_id'];
        $file_type = $_POST['file_type'];
        $description = $_POST['description'];
        $uploader_id = Auth::user()['id'];

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
        if (isset($_FILES['book_file']) && $_FILES['book_file']['error'] === 0) {
            $ext = pathinfo($_FILES['book_file']['name'], PATHINFO_EXTENSION);
            $book_file = uniqid('book_') . '.' . $ext;
            if (move_uploaded_file($_FILES['book_file']['tmp_name'], '../uploads/books/' . $book_file)) {
                $file_path = $book_file;
            }
        }

        if ($file_path) {
            $stmt = $db->prepare("INSERT INTO books (title, author, category_id, file_type, description, cover_image, file_path, uploader_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved')");
            $stmt->execute([$title, $author, $category_id, $file_type, $description, $cover_image, $file_path, $uploader_id]);
            header("Location: books.php?msg=added");
            exit;
        } else {
            $error = "Failed to upload book file.";
        }
    }
}

if ($action === 'delete' && isset($_GET['id'])) {
    $stmt = $db->prepare("DELETE FROM books WHERE id = ?");
    $stmt->execute([$_GET['id']]);
    header("Location: books.php?msg=deleted");
    exit;
}

$books = $db->query("SELECT b.*, c.name as category_name FROM books b LEFT JOIN categories c ON b.category_id = c.id ORDER BY b.upload_date DESC")->fetchAll(PDO::FETCH_ASSOC);
$categories = $db->query("SELECT * FROM categories")->fetchAll(PDO::FETCH_ASSOC);
?>

<?php if ($action === 'list'): ?>
<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
    <div class="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
        <h3 class="text-xl font-bold">Book Catalog</h3>
        <div class="flex gap-4">
            <input type="text" placeholder="Search books..." class="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
        </div>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full text-left">
            <thead>
                <tr class="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                    <th class="px-8 py-6 font-bold">Book Info</th>
                    <th class="px-8 py-6 font-bold">Category</th>
                    <th class="px-8 py-6 font-bold">Format</th>
                    <th class="px-8 py-6 font-bold">Status</th>
                    <th class="px-8 py-6 font-bold">Actions</th>
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
                    <td class="px-8 py-5 text-sm font-medium text-slate-600 dark:text-slate-400"><?php echo $book['category_name']; ?></td>
                    <td class="px-8 py-5">
                        <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase">
                            <?php echo $book['file_type']; ?>
                        </span>
                    </td>
                    <td class="px-8 py-5">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider 
                            <?php echo $book['status'] === 'Approved' ? 'bg-emerald-100 text-emerald-600' : ($book['status'] === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'); ?>">
                            <?php echo $book['status']; ?>
                        </span>
                    </td>
                    <td class="px-8 py-5">
                        <div class="flex gap-2">
                            <a href="?action=edit&id=<?php echo $book['id']; ?>" class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-600 transition">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </a>
                            <a href="?action=delete&id=<?php echo $book['id']; ?>" onclick="return confirm('Are you sure?')" class="w-9 h-9 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center">
                                <i class="fa-solid fa-trash"></i>
                            </a>
                        </div>
                    </td>
                </tr>
                <?php endforeach; if (empty($books)) echo "<tr><td colspan='5' class='px-8 py-12 text-center text-slate-500 font-medium'>No books found in the library.</td></tr>"; ?>
            </tbody>
        </table>
    </div>
</div>
<?php elseif ($action === 'add' || $action === 'edit'): ?>
<div class="max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 shadow-sm">
    <h3 class="text-2xl font-black mb-8"><?php echo $action === 'add' ? 'Upload New Book' : 'Edit Book Details'; ?></h3>
    
    <?php if (isset($error)): ?>
        <div class="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold">
            <?php echo $error; ?>
        </div>
    <?php endif; ?>

    <form action="?action=<?php echo $action; ?>" method="POST" enctype="multipart/form-data" class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Book Title</label>
            <input type="text" name="title" required class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
        </div>
        <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Author Name</label>
            <input type="text" name="author" required class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
        </div>
        <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Category</label>
            <select name="category_id" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
                <?php foreach ($categories as $cat): ?>
                    <option value="<?php echo $cat['id']; ?>"><?php echo $cat['name']; ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Format</label>
            <select name="file_type" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition">
                <option value="PDF">PDF Document</option>
                <option value="EPUB">EPUB Ebook</option>
                <option value="DOCX">Word Document</option>
                <option value="AUDIO">Audio Book</option>
            </select>
        </div>
        
        <!-- File Uploads -->
        <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Cover Image</label>
            <input type="file" name="cover_image" accept="image/*" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
        </div>
        <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Book File (PDF/EPUB/DOCX)</label>
            <input type="file" name="book_file" required class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100">
        </div>

        <div class="md:col-span-2 space-y-2">
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Description</label>
            <textarea name="description" rows="4" class="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition"></textarea>
        </div>
        
        <div class="md:col-span-2 pt-4">
            <button type="submit" class="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/20">
                Save Book Details
            </button>
            <a href="books.php" class="ml-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition">Cancel</a>
        </div>
    </form>
</div>
<?php endif; ?>

<?php require_once 'footer.php'; ?>
