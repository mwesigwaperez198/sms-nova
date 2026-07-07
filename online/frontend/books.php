<?php
require_once 'backend/Database.php';
$db = (new Database())->getConnection();
if (!$db) {
    echo "<section class='min-h-[60vh] flex items-center justify-center px-6 py-24 bg-slate-950 text-white'><div class='max-w-xl text-center'><h2 class='text-3xl font-black mb-4'>Library temporarily unavailable</h2><p class='text-slate-400'>Database connection is currently unavailable. Please verify MySQL is running and PDO MySQL is enabled.</p></div></section>";
    return;
}

$search = $_GET['search'] ?? '';
$cat_id = $_GET['category'] ?? '';
$inst_id = $_GET['institution'] ?? '';

$query = "SELECT b.*, c.name as category_name FROM books b LEFT JOIN categories c ON b.category_id = c.id WHERE b.status = 'Approved'";
$params = [];

if ($search) {
    $query .= " AND (b.title LIKE ? OR b.author LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if ($cat_id && $cat_id !== 'all') {
    $query .= " AND b.category_id = ?";
    $params[] = $cat_id;
}

if ($inst_id) {
    $query .= " AND b.institution_id = ?";
    $params[] = $inst_id;
}

$query .= " ORDER BY b.upload_date DESC";
$stmt = $db->prepare($query);
$stmt->execute($params);
$books = $stmt->fetchAll(PDO::FETCH_ASSOC);

$categories = $db->query("SELECT * FROM categories")->fetchAll(PDO::FETCH_ASSOC);
?>
<!-- frontend/books.php -->
<section class="py-16 px-6 bg-slate-950 pt-28 min-h-screen relative overflow-hidden font-inter">
    <!-- Ambient Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]"></div>
        <div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"></div>
    </div>

        <div class="mb-20 text-center">
            <h1 class="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-white">Digital <span class="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Library</span></h1>
            <p class="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">Access our extensive collection of educational resources through our modern interactive reader.</p>
        </div>

        <!-- Futuristic Search and Filter -->
        <form action="index.php" method="GET" class="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-20">
            <input type="hidden" name="page" value="books">
            <div class="relative flex-1 group">
                <div class="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity"></div>
                <div class="relative flex items-center bg-white/5 border border-white/10 rounded-[2rem] px-6 lg:px-8 py-4 lg:py-5 backdrop-blur-2xl focus-within:border-cyan-500/50 transition-all">
                    <i class="fa-solid fa-magnifying-glass text-slate-500 mr-4 lg:mr-6"></i>
                    <input type="text" name="search" value="<?php echo htmlspecialchars($search); ?>" placeholder="Search books..." 
                           class="w-full bg-transparent border-none text-white font-medium placeholder:text-slate-600 focus:outline-none text-sm lg:text-base">
                </div>
            </div>
            
            <div class="flex gap-3 lg:gap-4">
                <div class="relative group flex-1 lg:flex-none">
                    <select name="category" onchange="this.form.submit()" class="w-full lg:w-auto appearance-none bg-white/5 border border-white/10 rounded-[2rem] px-8 lg:px-10 py-4 lg:py-5 text-white font-black text-xs lg:text-sm uppercase tracking-widest cursor-pointer hover:bg-white/10 transition-all focus:outline-none focus:border-cyan-500/50 lg:min-w-[200px]">
                        <option value="all" class="bg-slate-900">All Categories</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?php echo $cat['id']; ?>" <?php echo $cat_id == $cat['id'] ? 'selected' : ''; ?> class="bg-slate-900">
                                <?php echo strtoupper($cat['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <i class="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-cyan-400 transition-colors"></i>
                </div>
                <button type="submit" class="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl lg:rounded-[2rem] flex items-center justify-center hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all flex-shrink-0">
                    <i class="fa-solid fa-sliders"></i>
                </button>
            </div>
        </form>

        <!-- High-End Books Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
            <?php foreach ($books as $book): ?>
            <div class="group perspective-1000">
                <div class="relative aspect-[2/3] rounded-[2.5rem] overflow-hidden bg-slate-900 border border-white/10 transition-all duration-700 transform group-hover:rotate-y-12 group-hover:scale-[1.05] group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] mb-8">
                    <img src="uploads/covers/<?php echo $book['cover_image']; ?>" onerror="this.src='https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=400'" alt="Book" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-700">
                    
                    <!-- Hover Content (Glassmorphism) -->
                    <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                         <div class="space-y-3 transform translate-y-10 group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
                            <a href="index.php?page=reader&id=<?php echo $book['id']; ?>" class="w-full py-4 bg-cyan-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest text-center shadow-xl shadow-cyan-500/20 block hover:bg-cyan-400 transition-colors">Read Now</a>
                            <a href="index.php?page=book_details&id=<?php echo $book['id']; ?>" class="w-full py-4 bg-white/5 border border-white/10 backdrop-blur-xl text-white rounded-2xl font-black text-[10px] uppercase tracking-widest text-center block hover:bg-white/10 transition-colors">Book Details</a>
                         </div>
                    </div>


                    <!-- Tags & Badges -->
                    <div class="absolute top-5 left-5 flex flex-col gap-2">
                        <span class="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-[8px] font-black text-white uppercase tracking-[0.2em] shadow-lg"><?php echo $book['file_type']; ?></span>
                    </div>
                </div>

                <div class="px-2 transition-all duration-500 group-hover:translate-x-2">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="h-[1px] w-8 bg-cyan-500/50"></div>
                        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500"><?php echo $book['category_name']; ?></span>
                    </div>
                    <h3 class="font-black text-xl text-white mb-2 leading-tight truncate group-hover:text-cyan-400 transition-colors"><?php echo $book['title']; ?></h3>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-500 text-xs font-bold"><?php echo $book['author']; ?></span>
                        <div class="flex items-center gap-1 text-amber-400 text-[10px]">
                            <i class="fa-solid fa-star"></i>
                            <span class="text-white font-black ml-1">4.9</span>
                        </div>
                    </div>
                </div>
            </div>
            <?php endforeach; if (empty($books)) echo "<div class='col-span-full py-32 text-center'><p class='text-slate-500 text-2xl font-black uppercase tracking-widest animate-pulse'>System: Zero results found.</p></div>"; ?>
        </div>
    </div>
</section>
