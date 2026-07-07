<!-- frontend/home.php -->
<section class="relative min-h-[70vh] lg:min-h-[90vh] flex items-start justify-center pt-24 lg:pt-32 overflow-hidden bg-slate-950 text-white font-inter">
    <!-- Premium Animated Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[180px] animate-pulse"></div>
        <div class="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[180px] animate-pulse delay-700"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)]"></div>
        
        <!-- Grid Pattern Overlay -->
        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100"></div>
    </div>

    <div class="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <div class="inline-flex items-center gap-3 px-6 py-2 mb-6 lg:mb-4 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl animate-fade-in">
            <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span class="text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em]">The Future of Digital Libraries</span>
        </div>
        
        <h1 class="text-5xl lg:text-7xl font-black mb-6 lg:mb-4 tracking-tighter leading-[0.85] animate-fade-in">
            Explore <br> 
            <span class="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(6,182,212,0.3)]">Knowledge</span>
        </h1>
        
        <p class="text-lg lg:text-xl mb-10 lg:mb-8 text-slate-400 max-w-4xl mx-auto leading-relaxed animate-slide-up font-medium">
            NovaLibrary delivers an immersive, futuristic reading experience. <br class="hidden md:block">
            Smarter access to books, anytime, anywhere.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 animate-slide-up delay-200">
            <a href="index.php?page=books" class="w-full sm:w-auto group relative px-10 lg:px-12 py-4 lg:py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl lg:rounded-[2rem] font-black text-lg lg:text-xl hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all duration-500 flex items-center justify-center gap-4">
                Start Reading
                <i class="fa-solid fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
            </a>
            <a href="#" class="w-full sm:w-auto px-10 lg:px-12 py-4 lg:py-5 bg-white/5 backdrop-blur-2xl text-white border border-white/10 rounded-2xl lg:rounded-[2rem] font-black text-lg lg:text-xl hover:bg-white/10 hover:border-white/20 transition-all duration-500 text-center">
                Institutions
            </a>
        </div>
    </div>
</section>

<?php
// Continue Reading Section (Futuristic Update)
if (Auth::check()):
    $user_id = Auth::user()['id'];
    $stmt = $db->prepare("SELECT h.*, b.title, b.author, b.cover_image, b.file_type 
                         FROM reading_history h 
                         JOIN books b ON h.book_id = b.id 
                         WHERE h.user_id = ? 
                         ORDER BY h.updated_at DESC LIMIT 3");
    $stmt->execute([$user_id]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($history)):
?>
<section class="py-12 lg:py-20 px-6 bg-slate-950 border-t border-white/5">
    <div class="max-w-7xl mx-auto">
        <div class="flex items-center justify-between mb-12">
            <div>
                <h2 class="text-3xl font-black tracking-tight text-white mb-2">Resume Journey</h2>
                <div class="h-1 w-20 bg-gradient-to-r from-cyan-500 to-transparent rounded-full"></div>
            </div>
            <a href="index.php?page=books" class="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 hover:text-white transition-colors">Explore Library</a>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <?php foreach ($history as $item): ?>
            <div class="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] hover:border-cyan-500/50 transition-all duration-500 hover:-translate-y-2">
                <div class="flex gap-6 mb-6">
                    <div class="w-20 h-28 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl group-hover:rotate-y-12 transition-transform duration-500">
                        <img src="uploads/covers/<?php echo $item['cover_image']; ?>" alt="" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 pt-2">
                        <h3 class="font-black text-white text-lg leading-tight mb-2 truncate group-hover:text-cyan-400 transition-colors"><?php echo $item['title']; ?></h3>
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4"><?php echo $item['author']; ?></p>
                        <div class="flex items-center justify-between text-[10px] font-black text-cyan-500 uppercase">
                            <span><?php echo round($item['progress_percentage']); ?>% Completed</span>
                        </div>
                    </div>
                </div>
                <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                    <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000" style="width: <?php echo $item['progress_percentage']; ?>%"></div>
                </div>
                <a href="index.php?page=reader&id=<?php echo $item['book_id']; ?>" class="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-cyan-500 hover:border-cyan-400 hover:text-white transition-all text-center block">
                    Continue <i class="fa-solid fa-play ml-2 text-[8px]"></i>
                </a>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php 
    endif;
endif; 
?>

<!-- Stats Section -->
<section class="py-16 lg:py-24 px-6 bg-white dark:bg-slate-900">
    <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
            <div class="group p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10">
                <div class="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 lg:mb-6 text-lg lg:text-xl">
                    <i class="fa-solid fa-book"></i>
                </div>
                <div class="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white mb-1 lg:mb-2 counter">50K+</div>
                <div class="text-slate-500 dark:text-slate-400 text-xs lg:text-base font-medium">Digital Books</div>
            </div>
            <div class="group p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/10">
                <div class="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 lg:mb-6 text-lg lg:text-xl">
                    <i class="fa-solid fa-school"></i>
                </div>
                <div class="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white mb-1 lg:mb-2 counter">150+</div>
                <div class="text-slate-500 dark:text-slate-400 text-xs lg:text-base font-medium">Partners</div>
            </div>
            <div class="group p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10">
                <div class="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 lg:mb-6 text-lg lg:text-xl">
                    <i class="fa-solid fa-users"></i>
                </div>
                <div class="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white mb-1 lg:mb-2 counter">25K+</div>
                <div class="text-slate-500 dark:text-slate-400 text-xs lg:text-base font-medium">Readers</div>
            </div>
            <div class="group p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/10">
                <div class="w-10 h-10 lg:w-12 lg:h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 lg:mb-6 text-lg lg:text-xl">
                    <i class="fa-solid fa-cloud-arrow-down"></i>
                </div>
                <div class="text-2xl lg:text-4xl font-black text-slate-900 dark:text-white mb-1 lg:mb-2 counter">100K+</div>
                <div class="text-slate-500 dark:text-slate-400 text-xs lg:text-base font-medium">Downloads</div>
            </div>
        </div>
    </div>
</section>

<!-- Featured Categories -->
<section class="py-24 px-6 bg-slate-50 dark:bg-slate-800/30">
    <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div class="max-w-2xl">
                <h2 class="text-3xl md:text-4xl font-black mb-6 tracking-tight text-slate-900 dark:text-white leading-tight">Explore Our <br> Categories</h2>
                <p class="text-lg text-slate-500 dark:text-slate-400">Discover knowledge across diverse subjects from science to literature.</p>
            </div>
            <a href="#" class="inline-flex items-center px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">
                Explore All
                <i class="fa-solid fa-arrow-right ml-3"></i>
            </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="index.php?page=books&category=1" class="group relative overflow-hidden rounded-3xl bg-blue-600 p-8 h-64 flex flex-col justify-end cursor-pointer">
                <div class="absolute top-4 right-4 text-white/20 text-6xl group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                    <i class="fa-solid fa-flask-vial"></i>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Science</h3>
                <p class="text-blue-100 text-sm">Browse Science resources</p>
                <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            <a href="index.php?page=books&category=2" class="group relative overflow-hidden rounded-3xl bg-emerald-500 p-8 h-64 flex flex-col justify-end cursor-pointer">
                <div class="absolute top-4 right-4 text-white/20 text-6xl group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                    <i class="fa-solid fa-landmark"></i>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">History</h3>
                <p class="text-emerald-50 text-sm">Browse History resources</p>
                <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            <a href="index.php?page=books&category=3" class="group relative overflow-hidden rounded-3xl bg-amber-500 p-8 h-64 flex flex-col justify-end cursor-pointer">
                <div class="absolute top-4 right-4 text-white/20 text-6xl group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                    <i class="fa-solid fa-code"></i>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Technology</h3>
                <p class="text-amber-50 text-sm">Browse Technology resources</p>
                <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            <a href="index.php?page=books&category=4" class="group relative overflow-hidden rounded-3xl bg-purple-600 p-8 h-64 flex flex-col justify-end cursor-pointer">
                <div class="absolute top-4 right-4 text-white/20 text-6xl group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                    <i class="fa-solid fa-palette"></i>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Arts</h3>
                <p class="text-purple-50 text-sm">Browse Arts resources</p>
                <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
        </div>
        <div class="text-center mt-12">
            <a href="index.php?page=categories" class="inline-flex items-center px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm">
                View All Categories
                <i class="fa-solid fa-arrow-right ml-3"></i>
            </a>
        </div>
    </div>
</section>

<!-- Featured Books -->
<section class="py-16 lg:py-24 px-6 bg-white dark:bg-slate-900">
    <div class="max-w-7xl mx-auto">
        <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 lg:mb-16 gap-6">
            <div>
                <h2 class="text-3xl lg:text-4xl font-black mb-4 tracking-tight">Trending Books</h2>
                <p class="text-slate-500 dark:text-slate-400">Most read and discussed titles this week.</p>
            </div>
            <div class="flex gap-2">
                <button class="w-10 h-10 lg:w-12 lg:h-12 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <i class="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <button class="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition">
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 lg:gap-8">
            <?php
            // Mocking book data for now
            $mockBooks = [
                ['title' => 'The Great Gatsby', 'author' => 'F. Scott Fitzgerald', 'img' => 'https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=400'],
                ['title' => 'Atomic Habits', 'author' => 'James Clear', 'img' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'],
                ['title' => 'Deep Work', 'author' => 'Cal Newport', 'img' => 'https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&q=80&w=400'],
                ['title' => '1984', 'author' => 'George Orwell', 'img' => 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=400'],
                ['title' => 'The Alchemist', 'author' => 'Paulo Coelho', 'img' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400'],
            ];

            foreach ($mockBooks as $book): ?>
            <div class="group">
                <div class="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-lg group-hover:shadow-blue-500/20 transition-all duration-500 mb-6">
                    <img src="<?php echo $book['img']; ?>" alt="Book" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                        <div class="flex gap-2">
                            <button class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition transform translate-y-4 group-hover:translate-y-0 duration-500">Read</button>
                            <button class="p-3 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition transform translate-y-4 group-hover:translate-y-0 duration-500 delay-75">
                                <i class="fa-solid fa-heart"></i>
                            </button>
                        </div>
                    </div>
                    <div class="absolute top-4 left-4">
                        <span class="px-3 py-1 bg-white/90 backdrop-blur-md dark:bg-slate-800/90 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">PDF</span>
                    </div>
                </div>
                <div>
                    <h3 class="font-bold text-lg mb-1 group-hover:text-blue-600 transition truncate"><?php echo $book['title']; ?></h3>
                    <p class="text-slate-500 dark:text-slate-400 text-sm mb-3"><?php echo $book['author']; ?></p>
                    <div class="flex items-center gap-1 text-amber-400 text-[10px]">
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <span class="text-slate-400 dark:text-slate-500 font-bold ml-1">5.0</span>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Call to Action -->
<section class="py-24 px-6">
    <div class="max-w-7xl mx-auto rounded-[3rem] bg-gradient-to-r from-blue-600 to-indigo-700 p-12 md:p-24 relative overflow-hidden shadow-2xl shadow-blue-500/20">
        <div class="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div class="relative z-10 text-center md:text-left md:flex items-center justify-between gap-12">
            <div class="max-w-xl">
                <h2 class="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">Bring NovaLibrary to Your Institution</h2>
                <p class="text-xl text-blue-100 mb-10">Empower your students with a world-class digital library. Manage members, track progress, and share private resources effortlessly.</p>
                <div class="flex flex-col sm:flex-row gap-4">
                    <a href="#" class="px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold text-lg hover:bg-slate-100 transition shadow-lg">Get Started Now</a>
                    <a href="#" class="px-8 py-4 bg-blue-700 text-white rounded-2xl font-bold text-lg hover:bg-blue-800 transition border border-blue-500">Contact Sales</a>
                </div>
            </div>
            <div class="hidden lg:block">
                <div class="relative w-80 h-96 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-md p-6 transform rotate-6 hover:rotate-0 transition duration-500">
                    <div class="w-full h-40 bg-white/20 rounded-xl mb-4"></div>
                    <div class="w-full h-4 bg-white/30 rounded mb-2"></div>
                    <div class="w-2/3 h-4 bg-white/30 rounded mb-8"></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="h-10 bg-white/20 rounded-lg"></div>
                        <div class="h-10 bg-white/20 rounded-lg"></div>
                    </div>
                    <div class="absolute -bottom-6 -left-6 w-24 h-24 bg-emerald-400 rounded-full flex items-center justify-center text-white text-3xl shadow-xl">
                        <i class="fa-solid fa-check"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
