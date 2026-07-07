<?php
/**
 * NovaLibrary - Institutions Directory
 */
require_once 'backend/Database.php';
$db = (new Database())->getConnection();
if (!$db) {
    echo "<section class='min-h-[60vh] flex items-center justify-center px-6 py-24 bg-slate-950 text-white'><div class='max-w-xl text-center'><h2 class='text-3xl font-black mb-4'>Institutions temporarily unavailable</h2><p class='text-slate-400'>Database connection is currently unavailable. Please verify MySQL is running and PDO MySQL is enabled.</p></div></section>";
    return;
}

// Fetch all active institutions with book counts
$query = "SELECT i.*, (SELECT COUNT(*) FROM books WHERE institution_id = i.id AND status = 'Approved') as book_count 
          FROM institutions i 
          WHERE i.status = 'Active'
          ORDER BY i.name ASC";
$institutions = $db->query($query)->fetchAll(PDO::FETCH_ASSOC);
?>

<section class="py-16 px-6 bg-slate-950 pt-28 min-h-screen relative overflow-hidden font-inter">
    <!-- Ambient Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]"></div>
        <div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"></div>
    </div>

    <div class="max-w-7xl mx-auto relative z-10">
        <div class="mb-12 text-center">
            <h1 class="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-white">Partner <span class="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Institutions</span></h1>
            <p class="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed mb-10">Meet our growing network of educational partners.</p>
            
            <!-- Live Search -->
            <div class="max-w-md mx-auto">
                <input type="text" id="inst-search" placeholder="Search institutions..." onkeyup="filterInstitutions()"
                       class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all">
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="inst-grid">
            <?php foreach ($institutions as $inst): ?>
            <a href="index.php?page=books&institution=<?php echo $inst['id']; ?>" class="inst-card group relative p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl hover:border-cyan-500/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden" data-name="<?php echo strtolower($inst['name']); ?>">
                <div class="relative z-10">
                    <div class="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl mb-8 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-school"></i>
                    </div>
                    <h3 class="text-2xl font-black text-white mb-2 tracking-tight"><?php echo $inst['name']; ?></h3>
                    <p class="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-6"><?php echo $inst['type']; ?></p>
                    <p class="text-slate-500 font-medium mb-8">Contributing <?php echo $inst['book_count']; ?> books to the library.</p>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<script>
function filterInstitutions() {
    const input = document.getElementById('inst-search').value.toLowerCase();
    const cards = document.getElementsByClassName('inst-card');
    
    for (let card of cards) {
        const name = card.getAttribute('data-name');
        card.style.display = name.includes(input) ? '' : 'none';
    }
}
</script>
