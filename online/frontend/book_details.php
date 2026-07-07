<?php
/**
 * NovaLibrary - Book Details Page
 */
require_once 'backend/Database.php';
$db = (new Database())->getConnection();
if (!$db) {
    echo "<section class='min-h-[60vh] flex items-center justify-center px-6 py-24 bg-slate-950 text-white'><div class='max-w-xl text-center'><h2 class='text-3xl font-black mb-4'>Book details unavailable</h2><p class='text-slate-400'>Database connection is currently unavailable. Please verify MySQL is running and PDO MySQL is enabled.</p></div></section>";
    return;
}

$book_id = $_GET['id'] ?? 0;
$user_id = Auth::check() ? Auth::user()['id'] : 0;

// Fetch Book Details
$stmt = $db->prepare("SELECT b.*, c.name as category_name, 
                      (SELECT AVG(rating) FROM ratings WHERE book_id = b.id) as avg_rating,
                      (SELECT COUNT(*) FROM ratings WHERE book_id = b.id) as total_ratings
                      FROM books b 
                      LEFT JOIN categories c ON b.category_id = c.id 
                      WHERE b.id = ?");
$stmt->execute([$book_id]);
$book = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$book) {
    echo "<div class='py-32 text-center'><h2 class='text-2xl font-bold text-white'>Book not found.</h2></div>";
    return;
}

// Fetch Comments
$stmt = $db->prepare("SELECT c.*, u.full_name FROM comments c JOIN users u ON c.user_id = u.id WHERE c.book_id = ? ORDER BY c.created_at DESC");
$stmt->execute([$book_id]);
$comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Check if user has rated
$user_rating = 0;
if ($user_id) {
    $stmt = $db->prepare("SELECT rating FROM ratings WHERE user_id = ? AND book_id = ?");
    $stmt->execute([$user_id, $book_id]);
    $user_rating = $stmt->fetchColumn() ?: 0;
}
?>
<!-- frontend/book_details.php -->
<section class="py-12 lg:py-16 px-6 bg-slate-950 pt-28 lg:pt-28 min-h-screen relative overflow-hidden font-inter">
    <!-- Immersive Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <img src="uploads/covers/<?php echo $book['cover_image']; ?>" class="w-full h-full object-cover blur-[120px] scale-150">
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl"></div>
    </div>

    <div class="max-w-7xl mx-auto relative z-10">
        <!-- Futuristic Breadcrumbs -->
        <nav class="flex mb-8 lg:mb-12 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            <a href="index.php?page=home" class="hover:text-cyan-400 transition-colors">Home</a>
            <span class="mx-4 text-slate-700">/</span>
            <a href="index.php?page=books" class="hover:text-cyan-400 transition-colors">Library</a>
            <span class="mx-4 text-slate-700">/</span>
            <span class="text-cyan-500 truncate max-w-[150px] lg:max-w-none"><?php echo $book['title']; ?></span>
        </nav>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            <!-- Left: Premium 3D Cover -->
            <div class="lg:col-span-5 perspective-1000">
                <div class="lg:sticky lg:top-40 group">
                    <div class="relative transform lg:group-hover:rotate-y-6 transition-transform duration-700 max-w-[300px] lg:max-w-none mx-auto">
                        <div class="absolute -inset-4 bg-cyan-500/20 blur-3xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div class="relative rounded-[2rem] lg:rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]">
                            <img src="uploads/covers/<?php echo $book['cover_image']; ?>" onerror="this.src='https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=600'" class="w-full aspect-[2/3] object-cover lg:group-hover:scale-105 transition-transform duration-1000">
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right: Cinematic Info -->
            <div class="lg:col-span-7 pt-0 lg:pt-6">
                <div class="mb-12">
                    <div class="flex items-center gap-4 mb-6 lg:mb-8">
                        <span class="px-4 lg:px-5 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-[10px] font-black uppercase tracking-[0.3em]">
                            <?php echo $book['category_name']; ?>
                        </span>
                        <div class="h-px w-8 lg:w-12 bg-slate-800"></div>
                        <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest"><?php echo $book['file_type']; ?> Format</span>
                    </div>

                    <h1 class="text-4xl lg:text-6xl font-black text-white mb-8 tracking-tighter leading-[0.9] drop-shadow-2xl">
                        <?php echo $book['title']; ?>
                    </h1>

                    <div class="flex flex-wrap items-center gap-6 lg:gap-10 mb-12">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-cyan-500 text-lg lg:text-xl shadow-inner">
                                <?php echo substr($book['author'], 0, 1); ?>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Author</p>
                                <span class="font-black text-white text-lg lg:text-xl tracking-tight"><?php echo $book['author']; ?></span>
                            </div>
                        </div>
                        <div class="hidden lg:block h-12 w-px bg-slate-800"></div>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-1 text-amber-400 text-xl lg:text-2xl">
                                <i class="fa-solid fa-star"></i>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Rating</p>
                                <span class="font-black text-white text-lg lg:text-xl tracking-tight"><?php echo number_format((float)($book['avg_rating'] ?? 0), 1); ?></span>
                            </div>
                        </div>
                        <div class="hidden lg:block h-12 w-px bg-slate-800"></div>
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                                <i class="fa-solid fa-database text-lg lg:text-xl"></i>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Size</p>
                                <span class="font-black text-white text-lg lg:text-xl tracking-tight"><?php echo $book['file_size']; ?></span>
                            </div>
                        </div>
                    </div>

                    <!-- Tags & Specifications -->
                    <div class="flex flex-wrap gap-2 lg:gap-3 mb-12">
                        <div class="px-5 lg:px-6 py-2.5 lg:py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                            <i class="fa-solid fa-language text-cyan-500"></i>
                            <span class="text-[10px] font-black text-white uppercase tracking-widest"><?php echo $book['language']; ?></span>
                        </div>
                        <?php 
                        $tags = explode(',', $book['tags'] ?? '');
                        foreach($tags as $tag): if(trim($tag)):
                        ?>
                        <div class="px-5 lg:px-6 py-2.5 lg:py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-cyan-500/30 transition-colors cursor-default">
                            # <?php echo trim($tag); ?>
                        </div>
                        <?php endif; endforeach; ?>
                    </div>
                </div>

                <!-- Strategic Interaction Bar -->
                <div class="flex flex-col sm:flex-row gap-4 lg:gap-6 mb-16">
                    <a href="index.php?page=reader&id=<?php echo $book['id']; ?>" class="w-full sm:w-auto group px-10 lg:px-12 py-5 lg:py-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl lg:rounded-[2rem] font-black text-lg lg:text-xl hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all duration-500 flex items-center justify-center gap-4">
                        <i class="fa-solid fa-play"></i> Start Reading
                    </a>
                    <button onclick="likeBook(<?php echo $book['id']; ?>, this)" class="w-full sm:w-auto px-10 py-5 lg:py-6 bg-white/5 border border-white/10 text-white rounded-2xl lg:rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-4">
                        <i class="fa-solid fa-heart"></i> Add to Favourites
                    </button>
                </div>

                <!-- Abstract/Description -->
                <div class="mb-20">
                    <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500 mb-8 flex items-center gap-4">
                        <span class="w-8 h-px bg-cyan-500/50"></span>
                        Synopsis
                    </h3>
                    <p class="text-xl text-slate-400 leading-[1.8] font-medium max-w-3xl">
                        <?php echo nl2br($book['description']); ?>
                    </p>
                </div>

                <!-- Comment Section (Simplified Vocabulary) -->
                <div id="comments" class="pt-10 border-t border-white/5">
                    <h3 class="text-2xl font-black text-white mb-6 tracking-tight">Community Discussion <span class="text-slate-600 ml-4"><?php echo count($comments); ?></span></h3>

                    <?php if (Auth::check()): ?>
                    <form onsubmit="submitComment(event, <?php echo $book['id']; ?>)" class="mb-10 group">
                        <div class="relative">
                            <div class="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-[2rem] blur opacity-0 group-focus-within:opacity-20 transition-opacity"></div>
                            <textarea id="comment-content" placeholder="Write your thoughts..." required
                                      class="relative w-full p-6 rounded-[2rem] border border-white/10 bg-white/5 text-white focus:outline-none focus:border-cyan-500/50 transition-all h-24 resize-none backdrop-blur-xl"></textarea>
                            <button type="submit" class="absolute bottom-4 right-4 px-6 py-2 bg-cyan-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-cyan-400 transition-all">
                                Post
                            </button>
                        </div>
                    </form>
                    <?php endif; ?>

                    <div class="space-y-6">
                        <?php foreach ($comments as $comment): ?>
                        <div class="flex gap-4 lg:gap-6 group animate-fade-in">
                            <div class="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-slate-500 text-lg flex-shrink-0 group-hover:border-cyan-500/30 transition-all">
                                <?php echo substr($comment['full_name'], 0, 1); ?>
                            </div>
                            <div class="flex-1">
                                <div class="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 group-hover:border-white/20 transition-all">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="font-black text-white text-sm"><?php echo $comment['full_name']; ?></span>
                                        <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest"><?php echo date('M d, Y', strtotime($comment['created_at'])); ?></span>
                                    </div>
                                    <p class="text-slate-400 leading-relaxed font-medium text-sm">
                                        <?php echo nl2br($comment['content']); ?>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<script>
function submitRating(bookId, rating) {
    const formData = new FormData();
    formData.append('book_id', bookId);
    formData.append('rating', rating);
    formData.append('csrf_token', document.querySelector('meta[name="csrf-token"]').content);

    fetch('api/interact.php?action=rate', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            if (data.message === 'CSRF token mismatch') alert('Security error. Please refresh.');
            else window.location.href = 'index.php?page=login';
        }
    });
}

function submitComment(e, bookId) {
    e.preventDefault();
    const content = document.getElementById('comment-content').value;
    const formData = new FormData();
    formData.append('book_id', bookId);
    formData.append('content', content);
    formData.append('csrf_token', document.querySelector('meta[name="csrf-token"]').content);

    fetch('api/interact.php?action=comment', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            alert(data.message);
        }
    });
}
</script>
