<!-- frontend/register.php -->
<section class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6 py-20">
    <div class="w-full max-w-2xl">
        <div class="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-none p-8 md:p-12 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            
            <div class="text-center mb-12">
                <a href="index.php" class="text-3xl font-black text-blue-600 dark:text-blue-400 mb-4 inline-block tracking-tighter">
                    NovaLibrary
                </a>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Create Your Account</h2>
                <p class="text-slate-500 dark:text-slate-400 mt-2">Join thousands of readers and start exploring today.</p>
                
                <?php if (isset($_GET['error'])): ?>
                    <div class="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold">
                        <?php 
                            if($_GET['error'] == 'mismatch') echo "Passwords do not match.";
                            elseif($_GET['error'] == 'exists') echo "An account with this email already exists.";
                            else echo "Registration failed. Please try again.";
                        ?>
                    </div>
                <?php endif; ?>
            </div>

            <form action="api/auth.php?action=register" method="POST" x-data="{ role: 3 }" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                    <input type="text" name="full_name" placeholder="John Doe" required
                           class="w-full px-6 py-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                    <input type="email" name="email" placeholder="john@example.com" required
                           class="w-full px-6 py-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Account Type</label>
                    <select name="role_id" x-model="role" class="w-full px-6 py-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm cursor-pointer appearance-none">
                        <option value="3">Individual Reader</option>
                        <option value="2">Student</option>
                        <option value="4">School Representative</option>
                        <option value="5">Organization</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                        <span x-text="role == 4 ? 'School Name' : (role == 5 ? 'Organization Name' : 'Institution (Optional)')"></span>
                    </label>
                    <input type="text" name="institution" :placeholder="role == 4 ? 'Greenwood High' : 'Global Library Corp'" :required="role == 4 || role == 5"
                           class="w-full px-6 py-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                    <input type="password" name="password" placeholder="••••••••" required
                           class="w-full px-6 py-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Confirm Password</label>
                    <input type="password" name="confirm_password" placeholder="••••••••" required
                           class="w-full px-6 py-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                </div>

                <div class="md:col-span-2 flex items-start ml-1 mt-2">
                    <input type="checkbox" id="terms" required class="w-5 h-5 text-blue-600 rounded-lg border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer mt-1">
                    <label for="terms" class="ml-3 text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none leading-relaxed">
                        I agree to the <a href="#" class="text-blue-600 font-bold hover:underline">Terms of Service</a> and <a href="#" class="text-blue-600 font-bold hover:underline">Privacy Policy</a>.
                    </label>
                </div>

                <button type="submit" class="md:col-span-2 py-5 bg-blue-600 text-white rounded-3xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 active:scale-[0.98] mt-4">
                    Create My Account
                </button>
            </form>

            <div class="mt-12 text-center">
                <p class="text-slate-500 dark:text-slate-400">
                    Already have an account? 
                    <a href="index.php?page=login" class="text-blue-600 font-bold hover:underline">Sign in instead</a>
                </p>
            </div>
        </div>
    </div>
</section>
