<!-- frontend/login.php -->
<section class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6 py-20">
    <div class="w-full max-w-md">
        <div class="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-none p-8 md:p-12 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <!-- Decorative circle -->
            <div class="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl"></div>
            
            <div class="text-center mb-12 relative z-10">
                <a href="index.php" class="text-3xl font-black text-blue-600 dark:text-blue-400 mb-4 inline-block tracking-tighter">
                    NovaLibrary
                </a>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Welcome Back!</h2>
                <p class="text-slate-500 dark:text-slate-400 mt-2">Log in to continue your reading journey.</p>
            </div>

            <form action="api/auth.php?action=login" method="POST" class="space-y-6 relative z-10">
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                    <div class="relative group">
                        <i class="fa-solid fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        <input type="email" name="email" placeholder="name@example.com" required
                               class="w-full pl-14 pr-6 py-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all shadow-sm">
                    </div>
                </div>
                
                <div class="space-y-2">
                    <div class="flex justify-between items-center ml-1">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                        <a href="#" class="text-xs font-bold text-blue-600 hover:underline">Forgot?</a>
                    </div>
                    <div class="relative group">
                        <i class="fa-solid fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        <input type="password" name="password" placeholder="••••••••" required
                               class="w-full pl-14 pr-6 py-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all shadow-sm">
                    </div>
                </div>

                <div class="flex items-center ml-1">
                    <input type="checkbox" id="remember" class="w-5 h-5 text-blue-600 rounded-lg border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer">
                    <label for="remember" class="ml-3 text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none">Remember this device</label>
                </div>

                <button type="submit" class="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 active:scale-[0.98]">
                    Sign In
                </button>
            </form>

            <div class="mt-12 text-center relative z-10">
                <p class="text-slate-500 dark:text-slate-400 mb-8">
                    Don't have an account? 
                    <a href="index.php?page=register" class="text-blue-600 font-bold hover:underline">Sign up for free</a>
                </p>
                
                <div class="relative flex items-center justify-center mb-8">
                    <div class="border-t border-slate-100 dark:border-slate-800 w-full"></div>
                    <span class="absolute bg-white dark:bg-slate-800 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Or continue with</span>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button class="flex items-center justify-center gap-3 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 transition font-bold text-sm">
                        <img src="https://www.svgrepo.com/show/355037/google.svg" class="w-5 h-5" alt="Google">
                        Google
                    </button>
                    <button class="flex items-center justify-center gap-3 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 transition font-bold text-sm">
                        <img src="https://www.svgrepo.com/show/448234/microsoft.svg" class="w-5 h-5" alt="MS">
                        Microsoft
                    </button>
                </div>
            </div>
            
            <div class="mt-8 text-center relative z-10">
                <a href="index.php" class="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                    Continue as Guest reader
                </a>
            </div>
        </div>
    </div>
</section>
