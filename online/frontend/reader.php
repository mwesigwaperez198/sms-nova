<?php
/**
 * NovaLibrary - Modern In-Browser Reader
 */
require_once 'backend/Database.php';
require_once 'backend/Auth.php';

$db = (new Database())->getConnection();
if (!$db) {
    echo "<section class='min-h-[60vh] flex items-center justify-center px-6 py-24 bg-slate-950 text-white'><div class='max-w-xl text-center'><h2 class='text-3xl font-black mb-4'>Reader temporarily unavailable</h2><p class='text-slate-400'>Database connection is currently unavailable. Please verify MySQL is running and PDO MySQL is enabled.</p></div></section>";
    return;
}

$book_id = $_GET['id'] ?? 0;
$stmt = $db->prepare("SELECT * FROM books WHERE id = ?");
$stmt->execute([$book_id]);
$book = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$book) {
    echo "<div class='py-32 text-center'><h2 class='text-2xl font-bold text-white'>Book not found.</h2></div>";
    return;
}

// Check permissions (basic check)
$user = Auth::user();
$can_download = $book['is_downloadable'];
?>

<script>
// Hide global header on reader page
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
});
</script>

<!-- Reader UI -->
<div id="reader-container" class="fixed inset-0 bg-slate-950 z-[100] flex flex-col transition-all duration-700 overflow-hidden font-inter selection:bg-cyan-500/30">
    
    <!-- Ambient Background Glows -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div class="absolute -top-48 -left-48 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px] animate-pulse"></div>
        <div class="absolute -bottom-48 -right-48 w-[600px] h-[600px] bg-purple-600 rounded-full blur-[150px] animate-pulse delay-1000"></div>
    </div>

    <!-- Top Navigation Bar -->
    <header id="reader-toolbar" class="fixed top-0 left-0 w-full bg-slate-900/40 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between z-[1001] transition-all duration-500 hover:bg-slate-900/60">
        <div class="flex items-center gap-6">
            <a href="index.php?page=book_details&id=<?php echo $book_id; ?>" class="group w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300 text-white shadow-lg">
                <i class="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
            </a>
            <div class="hidden md:block">
                <h1 class="text-white font-black text-lg tracking-tight truncate max-w-md drop-shadow-sm"><?php echo $book['title']; ?></h1>
                <div class="flex items-center gap-3">
                    <span class="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em]"><?php echo $book['author']; ?></span>
                    <div class="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    <span class="text-slate-400 text-[10px] font-bold uppercase tracking-widest"><span id="header-progress">0</span>% READ</span>
                </div>
            </div>
        </div>

        <!-- Center Search/Jump (Desktop) -->
        <div class="hidden lg:flex items-center gap-4 px-6 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md focus-within:border-cyan-500/50 transition-all">
            <i class="fa-solid fa-magnifying-glass text-slate-500 text-xs"></i>
            <input type="text" placeholder="Search book..." class="bg-transparent border-none focus:outline-none text-white text-sm w-48 placeholder:text-slate-600">
            <div class="h-4 w-px bg-slate-700"></div>
            <span class="text-slate-500 text-[10px] font-bold uppercase">Go to</span>
            <input type="number" id="jump-page" class="bg-transparent w-10 text-center text-cyan-400 font-black text-sm focus:outline-none" value="1">
        </div>

        <div class="flex items-center gap-2">
            <button onclick="toggleSidebar()" class="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group" title="Menu">
                <i class="fa-solid fa-bars-staggered group-hover:scale-110 transition-transform"></i>
            </button>
            <div class="h-8 w-px bg-white/10 mx-2"></div>
            <button onclick="toggleTheme()" class="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all group" title="Toggle Theme">
                <i class="fa-solid fa-circle-half-stroke group-hover:rotate-180 transition-transform duration-500"></i>
            </button>
            <button onclick="toggleFullscreen()" class="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-cyan-400 transition-all" title="Fullscreen">
                <i class="fa-solid fa-expand"></i>
            </button>
            <div class="relative group ml-2">
                <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] cursor-pointer hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                    <div class="w-full h-full rounded-[15px] bg-slate-900 flex items-center justify-center overflow-hidden">
                        <span class="text-xs font-black text-white"><?php echo substr($user['name'], 0, 1); ?></span>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 relative flex overflow-hidden pt-24">
        
        <!-- Sidebar (Glass) -->
        <aside id="reader-sidebar" class="absolute left-0 lg:left-6 top-20 lg:top-28 bottom-0 lg:bottom-6 w-full lg:w-80 bg-slate-900 lg:bg-slate-900/60 backdrop-blur-2xl border-r lg:border border-white/10 lg:rounded-[2.5rem] transform -translate-x-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-[1000] flex flex-col shadow-2xl overflow-hidden">

            <!-- Fixed Header (Outside Scroll) -->
            <div class="z-20 bg-slate-900/40 backdrop-blur-3xl px-6 lg:px-8 pt-6 lg:pt-8 pb-4 border-b border-white/5 transition-all duration-700" id="sidebar-header">

                <!-- Close Button (Mobile Only) -->
                <button onclick="toggleSidebar()" class="lg:hidden absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <!-- Book Card in Sidebar -->
                <div id="sidebar-book-card" class="relative group mb-6 perspective-1000 transition-all duration-700 origin-top max-h-[400px] overflow-visible cursor-pointer">
                    <div class="relative transform lg:group-hover:rotate-y-12 transition-transform duration-500 shadow-2xl rounded-2xl overflow-hidden aspect-[2/3] max-w-[120px] lg:max-w-none mx-auto lg:mx-0">
                        <img src="uploads/covers/<?php echo $book['cover_image']; ?>" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60"></div>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="flex">
                    <button onclick="switchTab('toc')" id="tab-toc" class="flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 border-b-2 border-cyan-500 transition-all">Index</button>
                    <button onclick="switchTab('bookmarks')" id="tab-bookmarks" class="flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b-2 border-transparent hover:text-white transition-all">Saved</button>
                    <button onclick="switchTab('notes')" id="tab-notes" class="flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b-2 border-transparent hover:text-white transition-all">Notes</button>
                </div>
            </div>
            <!-- Independent Scrollable Container -->
            <div id="sidebar-scroll-container" class="flex-1 overflow-y-auto custom-scrollbar">
                <!-- Content Area -->
                <div class="px-6 py-8 pb-24" id="sidebar-content-area">
                    <div id="content-toc" class="space-y-1"></div>
                    <div id="content-bookmarks" class="hidden space-y-3"></div>
                    <div id="content-notes" class="hidden space-y-3"></div>
                </div>
            </div>

        </aside>

        <!-- Reader Viewer Container -->
        <div id="viewer-container" class="flex-1 overflow-auto bg-transparent flex justify-center items-start pt-6 lg:pt-12 pb-48 perspective-1000 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <!-- PDF Viewer with floating effect -->
            <div id="pdf-viewer" class="hidden transition-all duration-700 transform hover:scale-[1.01] px-4 lg:px-0"></div>
            <!-- EPUB Viewer -->
            <div id="epub-viewer" class="w-full max-w-5xl mx-auto h-full hidden rounded-xl lg:rounded-[2rem] overflow-hidden bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"></div>
            <!-- DOCX Viewer -->
            <div id="docx-viewer" class="w-full max-w-4xl mx-auto bg-white p-8 lg:p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-xl lg:rounded-[2.5rem] hidden text-slate-900 leading-[1.8] animate-fade-in-up"></div>
            
            <!-- Futuristic Loader -->
            <div id="reader-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-3xl z-30">
                <div class="relative w-16 h-16 lg:w-24 lg:h-24">
                    <div class="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                    <div class="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p class="mt-6 lg:mt-8 text-cyan-400 font-black text-xs lg:text-sm uppercase tracking-[0.3em] animate-pulse">Loading Book...</p>
            </div>
            </div>

            <!-- Mobile Page Indicator (Below Viewer) -->
            <div class="lg:hidden absolute bottom-24 left-0 w-full text-center">
            <span class="px-4 py-1 bg-black/50 backdrop-blur-lg rounded-full text-[10px] font-black text-white/80 uppercase tracking-widest">Page <span id="mobile-page-num">1</span></span>
            </div>
            </main>

    <!-- Floating Bottom Control Bar (Pill Design) -->
    <nav id="reader-controls" class="fixed bottom-6 lg:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/60 backdrop-blur-2xl border border-white/10 px-4 lg:px-8 py-3 lg:py-5 rounded-[2rem] lg:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 lg:gap-10 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-slate-900/80 group max-w-[95vw] overflow-x-auto no-scrollbar">
        <div class="flex items-center gap-2 lg:gap-3">
            <button onclick="prevPage()" class="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl lg:rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-cyan-500 transition-all active:scale-90">
                <i class="fa-solid fa-chevron-left text-xs lg:text-base"></i>
            </button>
            <div class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 h-10 lg:h-12 bg-white/5 rounded-xl lg:rounded-2xl border border-white/10">
                <input type="number" id="current-page-input" value="1" class="w-8 lg:w-12 bg-transparent text-center text-white font-black focus:outline-none text-sm lg:text-base">
                <span class="text-slate-600 font-bold text-xs lg:text-sm">/</span>
                <span id="total-pages" class="text-slate-400 font-black text-xs lg:text-sm">0</span>
            </div>
            <button onclick="nextPage()" class="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl lg:rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-cyan-500 transition-all active:scale-90">
                <i class="fa-solid fa-chevron-right text-xs lg:text-base"></i>
            </button>
        </div>

        <div class="h-8 lg:h-10 w-px bg-white/10"></div>

        <div class="flex items-center gap-4 lg:gap-6">
            <div class="hidden sm:flex items-center gap-1">
                <button onclick="zoomOut()" class="p-2 lg:p-3 text-slate-400 hover:text-cyan-400 transition-all"><i class="fa-solid fa-minus text-[10px] lg:text-xs"></i></button>
                <div class="w-8 lg:w-12 text-center text-[9px] lg:text-[10px] font-black text-white uppercase tracking-tighter">Zoom</div>
                <button onclick="zoomIn()" class="p-2 lg:p-3 text-slate-400 hover:text-cyan-400 transition-all"><i class="fa-solid fa-plus text-[10px] lg:text-xs"></i></button>
            </div>
            <div class="h-6 w-px bg-white/10"></div>
            <button onclick="addBookmark()" class="group flex flex-col items-center gap-1 transition-all">
                <i class="fa-regular fa-bookmark text-slate-400 group-hover:text-cyan-400 transition-colors text-[10px] lg:text-base"></i>
                <span class="hidden lg:block text-[8px] font-black text-slate-500 uppercase group-hover:text-cyan-400">Save</span>
            </button>
            <button onclick="toggleTheme()" class="group flex flex-col items-center gap-1 transition-all">
                <i class="fa-solid fa-circle-half-stroke text-slate-400 group-hover:text-cyan-400 transition-colors text-[10px] lg:text-base"></i>
                <span class="hidden lg:block text-[8px] font-black text-slate-500 uppercase group-hover:text-cyan-400">Theme</span>
            </button>
        </div>
<!-- Sleek Neon Progress Bar -->
        <div class="absolute top-0 left-10 right-10 -translate-y-1/2 h-1 bg-white/5 rounded-full overflow-hidden">
            <div id="reading-progress-bar" class="h-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-all duration-700" style="width: 0%"></div>
        </div>
    </nav>

</div>

<!-- Libraries -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.88/epub.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js"></script>

<script>
// Reader Configuration
const bookData = {
    id: <?php echo $book['id']; ?>,
    type: '<?php echo $book['file_type']; ?>',
    path: 'uploads/books/<?php echo $book['file_path']; ?>',
    title: '<?php echo addslashes($book['title']); ?>',
    csrfToken: '<?php echo Auth::generateCSRF(); ?>'
};

// Global State
let pdfDoc = null;
let epubBook = null;
let rendition = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.5;
let isSidebarOpen = false;
let startTime = Date.now();
let currentTheme = 'dark';

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    initReader();
    setupProtection();
    setupWatermark();
    setupSidebarScrollEffect();
    setupGestures();
});

function setupGestures() {
    const viewer = document.getElementById('viewer-container');
    const mc = new Hammer(viewer);
    
    mc.on('swipeleft', nextPage);
    mc.on('swiperight', prevPage);
    
    // Pinch-to-zoom for PDF
    if (bookData.type === 'PDF') {
        mc.get('pinch').set({ enable: true });
        mc.on('pinchin', () => zoomOut());
        mc.on('pinchout', () => zoomIn());
    }
}

function setupSidebarScrollEffect() {
    const scrollContainer = document.getElementById('sidebar-scroll-container');
    const bookCard = document.getElementById('sidebar-book-card');
    const badge = document.getElementById('sidebar-book-badge');
    const header = document.getElementById('sidebar-header');
    
    let isShrunk = false;
    
    // Toggle shrink on click/tap
    bookCard.addEventListener('click', () => {
        if (!isShrunk) {
            scrollContainer.scrollTo({ top: 100, behavior: 'smooth' });
        } else {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Proxy scroll events from fixed header to scroll container
    header.addEventListener('wheel', (e) => {
        scrollContainer.scrollTop += e.deltaY;
    }, { passive: true });

    scrollContainer.addEventListener('scroll', () => {
        const scrolled = Math.ceil(scrollContainer.scrollTop);
        
        // Shrink almost immediately
        if (!isShrunk && scrolled > 20) {
            isShrunk = true;
            bookCard.classList.add('scale-[0.35]', 'max-h-[80px]', '-mb-4', 'opacity-40', 'blur-[2px]');
            bookCard.classList.remove('mb-6');
            badge.classList.add('scale-0', 'opacity-0');
            header.classList.add('backdrop-blur-xl', 'bg-slate-900/90', 'pt-4');
            header.classList.remove('pt-8');
        } 
        // Only expand when scrolled back to the absolute top (0)
        else if (isShrunk && scrolled <= 0) {
            isShrunk = false;
            bookCard.classList.remove('scale-[0.35]', 'max-h-[80px]', '-mb-4', 'opacity-40', 'blur-[2px]');
            bookCard.classList.add('mb-6');
            badge.classList.remove('scale-0', 'opacity-0');
            header.classList.remove('backdrop-blur-xl', 'bg-slate-900/90', 'pt-4');
            header.classList.add('pt-8');
        }
    });
}

function setupWatermark() {
    const userEmail = '<?php echo $user['email'] ?? "Guest"; ?>';
    const watermark = document.createElement('div');
    watermark.className = 'fixed inset-0 pointer-events-none z-[110] opacity-[0.03] flex items-center justify-center select-none overflow-hidden';
    watermark.style.transform = 'rotate(-45deg)';
    
    let content = '';
    for(let i=0; i<100; i++) {
        content += `<span class="text-white text-2xl font-bold m-20 whitespace-nowrap">${userEmail}</span>`;
    }
    watermark.innerHTML = content;
    document.getElementById('reader-container').appendChild(watermark);
}

function toggleTheme() {
    const themes = ['dark', 'light', 'sepia'];
    const currentIndex = themes.indexOf(currentTheme);
    currentTheme = themes[(currentIndex + 1) % themes.length];
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    const container = document.getElementById('reader-container');
    const viewer = document.getElementById('viewer-container');
    const docxViewer = document.getElementById('docx-viewer');
    
    // Reset
    container.classList.remove('bg-slate-900', 'bg-white', 'bg-[#f4ecd8]');
    viewer.classList.remove('bg-slate-900', 'bg-slate-100', 'bg-[#f4ecd8]');
    docxViewer.classList.remove('bg-white', 'bg-slate-800', 'bg-[#f4ecd8]', 'text-slate-900', 'text-white', 'text-[#5b4636]');
    
    if (theme === 'dark') {
        container.classList.add('bg-slate-900');
        viewer.classList.add('bg-slate-900');
        docxViewer.classList.add('bg-slate-800', 'text-white');
        if (rendition) rendition.themes.register('dark', { 'body': { 'background': '#0f172a', 'color': '#f8fafc' } });
        if (rendition) rendition.themes.select('dark');
    } else if (theme === 'light') {
        container.classList.add('bg-white');
        viewer.classList.add('bg-slate-100');
        docxViewer.classList.add('bg-white', 'text-slate-900');
        if (rendition) rendition.themes.register('light', { 'body': { 'background': '#ffffff', 'color': '#000000' } });
        if (rendition) rendition.themes.select('light');
    } else if (theme === 'sepia') {
        container.classList.add('bg-[#f4ecd8]');
        viewer.classList.add('bg-[#f4ecd8]');
        docxViewer.classList.add('bg-[#f4ecd8]', 'text-[#5b4636]');
        if (rendition) rendition.themes.register('sepia', { 'body': { 'background': '#f4ecd8', 'color': '#5b4636' } });
        if (rendition) rendition.themes.select('sepia');
    }
}

async function initReader() {
    try {
        if (bookData.type === 'PDF') {
            await loadPDF();
        } else if (bookData.type === 'EPUB') {
            await loadEPUB();
        } else if (bookData.type === 'DOCX') {
            await loadDOCX();
        }
        
        // Hide loading screen
        document.getElementById('reader-loading').classList.add('hidden');
        
        // Load user progress
        loadProgress();
    } catch (error) {
        console.error('Error initializing reader:', error);
        alert('Failed to load the book. Please try again later.');
    }
}

// --- PDF Reader Logic ---
async function loadPDF() {
    document.getElementById('pdf-viewer').classList.remove('hidden');
    const loadingTask = pdfjsLib.getDocument(bookData.path);
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;
    document.getElementById('total-pages').textContent = totalPages;
    
    // Load PDF TOC (Outline)
    const outline = await pdfDoc.getOutline();
    const tocContainer = document.getElementById('content-toc');
    tocContainer.innerHTML = '';
    
    if (outline && outline.length > 0) {
        renderPDFOutline(outline, tocContainer);
    } else {
        tocContainer.innerHTML = '<p class="text-slate-600 text-xs text-center py-4 font-bold uppercase tracking-widest">No index available</p>';
    }
    
    renderPage(currentPage);
}

async function renderPage(num) {
    const container = document.getElementById('pdf-viewer');
    container.innerHTML = '';
    
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.className = 'rounded shadow-lg';
    
    container.appendChild(canvas);
    
    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;
    
    updateUIProgress();
}

function renderPDFOutline(outline, container) {
    outline.forEach(item => {
        const el = document.createElement('button');
        el.className = 'w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-xl transition-all flex items-center gap-3 group';
        el.innerHTML = `<div class="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-cyan-500 transition-colors"></div> ${item.title}`;
        
        el.onclick = async () => {
            if (item.dest) {
                const dest = typeof item.dest === 'string' ? item.dest : JSON.stringify(item.dest);
                // For simplicity, we just navigate to a page if it's a direct reference
                // More complex dest parsing would be needed for full support
                const pageIndex = await pdfDoc.getPageIndex(item.dest[0]);
                currentPage = pageIndex + 1;
                renderPage(currentPage);
                if (window.innerWidth < 1024) toggleSidebar();
            }
        };
        container.appendChild(el);
        if (item.items && item.items.length > 0) {
            const subContainer = document.createElement('div');
            subContainer.className = 'ml-4 border-l border-white/5 pl-2 mt-1 mb-2';
            container.appendChild(subContainer);
            renderPDFOutline(item.items, subContainer);
        }
    });
}

// --- EPUB Reader Logic ---
async function loadEPUB() {
    document.getElementById('epub-viewer').classList.remove('hidden');
    epubBook = ePub(bookData.path);
    rendition = epubBook.renderTo("epub-viewer", {
        width: "100%",
        height: "100%",
        flow: "paginated",
        manager: "default"
    });

    await rendition.display();
    
    rendition.on("relocated", (location) => {
        currentPage = location.start.displayed.page;
        totalPages = location.start.displayed.total;
        document.getElementById('total-pages').textContent = totalPages;
        document.getElementById('current-page-input').value = currentPage;
        updateUIProgress();
    });

    // TOC
    epubBook.loaded.navigation.then((nav) => {
        const tocContainer = document.getElementById('content-toc');
        tocContainer.innerHTML = '';
        nav.toc.forEach(chapter => {
            const el = document.createElement('button');
            el.className = 'w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-xl transition-all flex items-center gap-3 group';
            el.innerHTML = `<div class="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-cyan-500 transition-colors"></div> ${chapter.label}`;
            el.onclick = () => {
                rendition.display(chapter.href);
                if (window.innerWidth < 1024) toggleSidebar();
            };
            tocContainer.appendChild(el);
        });
    });
}

// --- DOCX Reader Logic ---
async function loadDOCX() {
    document.getElementById('docx-viewer').classList.remove('hidden');
    const response = await fetch(bookData.path);
    const arrayBuffer = await response.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    document.getElementById('docx-viewer').innerHTML = result.value;
    
    // Simple pagination for DOCX (very basic)
    totalPages = 1;
    document.getElementById('total-pages').textContent = totalPages;
}

// --- Navigation ---
function prevPage() {
    if (bookData.type === 'PDF' && currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
    } else if (bookData.type === 'EPUB') {
        rendition.prev();
    }
}

function nextPage() {
    if (bookData.type === 'PDF' && currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
    } else if (bookData.type === 'EPUB') {
        rendition.next();
    }
}

// --- UI Helpers ---
function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    const sidebar = document.getElementById('reader-sidebar');
    const viewer = document.getElementById('viewer-container');
    const controls = document.getElementById('reader-controls');
    
    if (isSidebarOpen) {
        sidebar.classList.remove('-translate-x-[calc(100%+2rem)]');
        sidebar.classList.add('translate-x-0');
        if (window.innerWidth >= 1024) {
            viewer.classList.add('lg:pl-80');
            controls.classList.add('lg:ml-40');
        }
    } else {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-[calc(100%+2rem)]');
        if (window.innerWidth >= 1024) {
            viewer.classList.remove('lg:pl-80');
            controls.classList.remove('lg:ml-40');
        }
    }
}

function switchTab(tab) {
    const tabs = ['toc', 'bookmarks', 'notes'];
    tabs.forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        tabEl.classList.remove('text-cyan-400', 'border-cyan-500');
        tabEl.classList.add('text-slate-500', 'border-transparent');
        document.getElementById(`content-${t}`).classList.add('hidden');
    });
    
    const activeTab = document.getElementById(`tab-${tab}`);
    activeTab.classList.add('text-cyan-400', 'border-cyan-500');
    activeTab.classList.remove('text-slate-500', 'border-transparent');
    document.getElementById(`content-${tab}`).classList.remove('hidden');
    
    if (tab === 'bookmarks') loadBookmarks();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function zoomIn() {
    if (bookData.type === 'PDF') {
        scale += 0.2;
        renderPage(currentPage);
    }
}

function zoomOut() {
    if (bookData.type === 'PDF' && scale > 0.5) {
        scale -= 0.2;
        renderPage(currentPage);
    }
}

function updateUIProgress() {
    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
    document.getElementById('reading-progress-bar').style.width = `${progress}%`;
    document.getElementById('header-progress').textContent = Math.round(progress);
    document.getElementById('current-page-input').value = currentPage;
    document.getElementById('mobile-page-num').textContent = currentPage;
    
    // Auto-save progress every few pages or on exit
    saveProgress(progress);
}

// Jump to page listener
document.getElementById('jump-page').addEventListener('change', (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        if (bookData.type === 'PDF') renderPage(currentPage);
        else if (bookData.type === 'EPUB') rendition.display(currentPage);
    }
});

// --- API Integration ---
async function saveProgress(progress) {
    const formData = new FormData();
    formData.append('book_id', bookData.id);
    formData.append('last_page', currentPage);
    formData.append('progress_percentage', progress);
    formData.append('csrf_token', bookData.csrfToken);
    
    await fetch('api/reader.php?action=save_progress', {
        method: 'POST',
        body: formData
    });
}

async function loadProgress() {
    const response = await fetch(`api/reader.php?action=get_progress&book_id=${bookData.id}`);
    const result = await response.json();
    if (result.success && result.data) {
        currentPage = parseInt(result.data.last_page) || 1;
        if (bookData.type === 'PDF') renderPage(currentPage);
        else if (bookData.type === 'EPUB') rendition.display(currentPage);
    }
}

async function addBookmark() {
    const formData = new FormData();
    formData.append('book_id', bookData.id);
    formData.append('page_index', currentPage);
    formData.append('title', `Bookmark Page ${currentPage}`);
    formData.append('csrf_token', bookData.csrfToken);
    
    const response = await fetch('api/reader.php?action=add_bookmark', {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    if (result.success) {
        alert('Bookmark added!');
        loadBookmarks();
    }
}

async function loadBookmarks() {
    const response = await fetch(`api/reader.php?action=get_bookmarks&book_id=${bookData.id}`);
    const result = await response.json();
    const container = document.getElementById('content-bookmarks');
    container.innerHTML = '';
    
    if (result.success && result.data && result.data.length > 0) {
        result.data.forEach(bm => {
            const el = document.createElement('div');
            el.className = 'p-4 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between group hover:border-cyan-500/30 transition-all';
            el.innerHTML = `
                <div>
                    <p class="text-white text-[10px] font-black uppercase tracking-widest mb-1">${bm.title}</p>
                    <p class="text-cyan-500 text-[10px] font-bold">PAGE: ${bm.page_index}</p>
                </div>
                <button onclick="gotoBookmark('${bm.page_index}')" class="w-10 h-10 bg-cyan-500/10 rounded-xl text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-lg shadow-cyan-500/10">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            `;
            container.appendChild(el);
        });
    } else {
        container.innerHTML = '<p class="text-slate-600 text-xs text-center py-8 font-bold uppercase tracking-widest">Zero markers saved</p>';
    }
}

function gotoBookmark(page) {
    currentPage = parseInt(page);
    if (bookData.type === 'PDF') renderPage(currentPage);
    else if (bookData.type === 'EPUB') rendition.display(currentPage);
}

// --- Protection & Security ---
function setupProtection() {
    // Disable right click
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // Disable certain key combos
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'u')) {
            e.preventDefault();
        }
    });
}

// Analytics logging on close
window.addEventListener('beforeunload', () => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const formData = new FormData();
    formData.append('book_id', bookData.id);
    formData.append('duration', duration);
    formData.append('pages_read', currentPage); // This is approximate
    
    navigator.sendBeacon('api/reader.php?action=log_analytics', formData);
});

</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

.font-inter { font-family: 'Inter', sans-serif; }

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(6,182,212,0.4);
}

#pdf-viewer canvas {
    max-width: 100%;
    border-radius: 1.5rem;
    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.6);
    transition: all 0.5s ease;
}

#epub-viewer iframe {
    background: white !important;
}

.perspective-1000 {
    perspective: 1000px;
}

.rotate-y-12 {
    transform: rotateY(12deg);
}

@keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
    animation: fade-in-up 0.8s ease-out forwards;
}

.animate-spin-slow {
    animation: spin 3s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>
