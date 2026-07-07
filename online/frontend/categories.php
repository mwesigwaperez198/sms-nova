<?php
/**
 * NovaLibrary - Categories Explorer
 */
require_once 'backend/Database.php';
$db = (new Database())->getConnection();
if (!$db) {
    echo "<section class='min-h-[60vh] flex items-center justify-center px-6 py-24 bg-slate-950 text-white'><div class='max-w-xl text-center'><h2 class='text-3xl font-black mb-4'>Categories temporarily unavailable</h2><p class='text-slate-400'>Database connection is currently unavailable. Please verify MySQL is running and PDO MySQL is enabled.</p></div></section>";
    return;
}

// Fetch all categories with book counts
$query = "SELECT c.*, (SELECT COUNT(*) FROM books WHERE category_id = c.id AND status = 'Approved') as book_count 
          FROM categories c 
          ORDER BY c.name ASC";
$categories = $db->query($query)->fetchAll(PDO::FETCH_ASSOC);

// Map icons to categories (optional, for visual flair)
$icons = [
    'Science' => 'fa-flask-vial',
    'History' => 'fa-landmark',
    'Technology' => 'fa-code',
    'Arts' => 'fa-palette',
    'Mathematics' => 'fa-calculator',
    'Literature' => 'fa-book-open',
    'Philosophy' => 'fa-brain',
    'Engineering' => 'fa-gears',
    'Medicine' => 'fa-stethoscope',
    'Business' => 'fa-briefcase',
    'Law' => 'fa-scale-balanced',
    'Social Sciences' => 'fa-people-group',
    'Geography' => 'fa-earth-africa',
    'Languages' => 'fa-language',
    'ICT' => 'fa-microchip'
];
?>

<section class="py-16 px-6 bg-slate-950 pt-28 min-h-screen relative overflow-hidden font-inter">
    <!-- Ambient Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]"></div>
        <div class="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"></div>
    </div>

    <div class="max-w-7xl mx-auto relative z-10">
        <div class="mb-12 text-center">
            <h1 class="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-white">Knowledge <span class="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Categories</span></h1>
            <p class="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed mb-10">Browse our vast collection by subject area.</p>
            
            <!-- Live Search -->
            <div class="max-w-md mx-auto">
                <input type="text" id="cat-search" placeholder="Search categories..." onkeyup="filterCategories()"
                       class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" id="cat-grid">
            <?php foreach ($categories as $cat): 
                $icon = $icons[$cat['name']] ?? 'fa-folder-open';
            ?>
            <a href="index.php?page=books&category=<?php echo $cat['id']; ?>" class="cat-card group relative p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl hover:border-cyan-500/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden" data-name="<?php echo strtolower($cat['name']); ?>">
                <!-- Hover Glow -->
                <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div class="relative z-10">
                    <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl text-cyan-500 mb-8 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-500 shadow-xl shadow-cyan-500/0 group-hover:shadow-cyan-500/20">
                        <i class="fa-solid <?php echo $icon; ?>"></i>
                    </div>
                    <h3 class="text-2xl font-black text-white mb-2 tracking-tight"><?php echo $cat['name']; ?></h3>
                    <p class="text-slate-500 font-bold text-xs uppercase tracking-widest"><?php echo $cat['book_count']; ?> Resources Available</p>
                </div>

                <!-- Background Icon (Decorative) -->
                <div class="absolute -bottom-6 -right-6 text-white/5 text-9xl transform rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <i class="fa-solid <?php echo $icon; ?>"></i>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<script>
function filterCategories() {
    const input = document.getElementById('cat-search').value.toLowerCase();
    const cards = document.getElementsByClassName('cat-card');
    
    for (let card of cards) {
        const name = card.getAttribute('data-name');
        card.style.display = name.includes(input) ? '' : 'none';
    }
}
</script>
