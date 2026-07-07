<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $title ?? 'NovaLibrary'; ?></title>
    <!-- Tailwind CSS (Play CDN for prototype) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        dark: {
                            bg: '#0f172a',
                            card: '#1e293b',
                            text: '#f1f5f9'
                        }
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.5s ease-out',
                        'slide-up': 'slideUp 0.5s ease-out',
                    },
                    keyframes: {
                        fadeIn: {
                            '0%': { opacity: '0' },
                            '100%': { opacity: '1' },
                        },
                        slideUp: {
                            '0%': { transform: 'translateY(20px)', opacity: '0' },
                            '100%': { transform: 'translateY(0)', opacity: '1' },
                        },
                    },
                },
            },
        }
    </script>
    <!-- Google Fonts: Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <meta name="csrf-token" content="<?php echo Auth::generateCSRF(); ?>">
    <!-- Alpine.js -->
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        [x-cloak] { display: none !important; }
    </style>
    <script>
        // Check for dark mode preference
        if (localStorage.getItem('dark-mode') === 'true' || (!('dark-mode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(reg => console.log('Service Worker Registered'))
                    .catch(err => console.log('Service Worker Failed', err));
            });
        }
    </script>
    <link rel="manifest" href="manifest.json">
</head>
<body class="bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
    <!-- Navbar -->
    <nav x-data="{ open: false, atTop: true }" 
         @scroll.window="atTop = (window.pageYOffset > 10 ? false : true)"
         :class="{ 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg': !atTop, 'bg-transparent': atTop }"
         class="fixed w-full z-[1000] transition-all duration-300 px-6 py-4">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <a href="index.php" class="text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                Nova<span class="text-emerald-500 dark:text-emerald-400">Library</span>
            </a>
            
            <!-- Desktop Menu -->
            <div class="hidden md:flex items-center space-x-8">
                <a href="index.php?page=home" class="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition">Home</a>
                <a href="index.php?page=books" class="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition">Explore</a>
                <?php if (Auth::check()): ?>
                    <?php if (Auth::user()['role'] >= 6): ?>
                        <a href="admin/dashboard.php" class="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition text-emerald-500">Dashboard</a>
                    <?php elseif (Auth::user()['role'] == 4 || Auth::user()['role'] == 5): ?>
                        <a href="institution/dashboard.php" class="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition text-blue-500">Inst. Portal</a>
                    <?php endif; ?>
                <?php endif; ?>
                <a href="index.php?page=categories" class="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition">Categories</a>
                <a href="index.php?page=institutions" class="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition">Institutions</a>
                
                <!-- Dark Mode Toggle -->
                <button @click="
                    document.documentElement.classList.toggle('dark');
                    localStorage.setItem('dark-mode', document.documentElement.classList.contains('dark'));
                " class="p-2 rounded-full bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition">
                    <i class="fa-solid fa-moon dark:hidden"></i>
                    <i class="fa-solid fa-sun hidden dark:block text-yellow-400"></i>
                </button>

                <?php if (Auth::check()): ?>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm font-bold text-slate-700 dark:text-slate-300">Hi, <?php echo explode(' ', Auth::user()['name'])[0]; ?></span>
                        <a href="index.php?action=logout" class="px-5 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition font-bold text-sm">Logout</a>
                    </div>
                <?php else: ?>
                    <a href="index.php?page=login" class="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-md">Login</a>
                <?php endif; ?>
            </div>

            <!-- Mobile Menu Button -->
            <div class="md:hidden flex items-center space-x-4">
                <button @click="document.documentElement.classList.toggle('dark'); localStorage.setItem('dark-mode', document.documentElement.classList.contains('dark'));" class="p-2">
                    <i class="fa-solid fa-moon dark:hidden"></i>
                    <i class="fa-solid fa-sun hidden dark:block text-yellow-400"></i>
                </button>
                <button @click="open = !open; document.body.classList.toggle('overflow-hidden')" class="text-2xl">
                    <i class="fa-solid" :class="open ? 'fa-xmark' : 'fa-bars'"></i>
                </button>
            </div>
        </div>

        <!-- Mobile Menu -->
        <div x-show="open" 
             x-cloak
             @click.away="open = false; document.body.classList.remove('overflow-hidden')"
             x-transition:enter="transition ease-out duration-300"
             x-transition:enter-start="opacity-0 translate-x-full"
             x-transition:enter-end="opacity-100 translate-x-0"
             x-transition:leave="transition ease-in duration-200"
             x-transition:leave-start="opacity-100 translate-x-0"
             x-transition:leave-end="opacity-0 translate-x-full"
             class="fixed inset-0 z-[2000] bg-slate-900/95 backdrop-blur-2xl p-8 flex flex-col md:hidden overflow-y-auto">
            
            <div class="flex justify-between items-center mb-12">
                <span class="text-2xl font-black text-blue-500">Menu</span>
                <button @click="open = false; document.body.classList.remove('overflow-hidden')" class="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-white">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="flex flex-col gap-6">
                <a href="index.php?page=home" @click="open = false" class="text-3xl font-black text-white hover:text-blue-500 transition-colors">Home</a>
                <a href="index.php?page=books" @click="open = false" class="text-3xl font-black text-white hover:text-blue-500 transition-colors">Library</a>
                <a href="index.php?page=categories" @click="open = false" class="text-3xl font-black text-white hover:text-blue-500 transition-colors">Categories</a>
                <a href="index.php?page=institutions" @click="open = false" class="text-3xl font-black text-white hover:text-blue-500 transition-colors">Institutions</a>
                
                <div class="h-px w-full bg-white/10 my-4"></div>
                
                <?php if (Auth::check()): ?>
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/10">
                            <div class="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white">
                                <?php echo substr(Auth::user()['name'], 0, 1); ?>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Logged in as</p>
                                <p class="text-white font-black"><?php echo Auth::user()['name']; ?></p>
                            </div>
                        </div>
                        <a href="index.php?action=logout" class="w-full py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[2rem] text-center font-black uppercase tracking-widest">Logout</a>
                    </div>
                <?php else: ?>
                    <a href="index.php?page=login" @click="open = false" class="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-center text-xl font-black shadow-xl shadow-blue-600/20">Login / Join</a>
                <?php endif; ?>
            </div>

            <div class="mt-auto text-center">
                <p class="text-slate-600 text-xs font-bold uppercase tracking-[0.3em] mb-4">NovaLibrary v2.0</p>
            </div>
        </div>
    </nav>

    <!-- Content Area -->
    <main class="min-h-screen">
