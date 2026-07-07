    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-20 px-6">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div class="col-span-1 lg:col-span-1">
                <a href="index.php" class="text-2xl font-black text-blue-600 tracking-tighter mb-6 inline-block">Nova<span class="text-emerald-500">Library</span></a>
                <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                    The ultimate digital library platform for schools and organizations. Empowering readers globally.
                </p>
                <div class="flex gap-4">
                    <a href="#" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition"><i class="fa-brands fa-twitter"></i></a>
                    <a href="#" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition"><i class="fa-brands fa-facebook"></i></a>
                    <a href="#" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition"><i class="fa-brands fa-instagram"></i></a>
                </div>
            </div>
            
            <div>
                <h4 class="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-xs">Platform</h4>
                <ul class="space-y-4 text-slate-500 dark:text-slate-400 font-medium">
                    <li><a href="index.php?page=books" class="hover:text-blue-600 transition">Browse Books</a></li>
                    <li><a href="#" class="hover:text-blue-600 transition">Categories</a></li>
                    <li><a href="#" class="hover:text-blue-600 transition">Institutions</a></li>
                    <li><a href="#" class="hover:text-blue-600 transition">Pricing</a></li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-xs">Resources</h4>
                <ul class="space-y-4 text-slate-500 dark:text-slate-400 font-medium">
                    <li><a href="#" class="hover:text-blue-600 transition">Help Center</a></li>
                    <li><a href="#" class="hover:text-blue-600 transition">API Documentation</a></li>
                    <li><a href="#" class="hover:text-blue-600 transition">Community</a></li>
                    <li><a href="#" class="hover:text-blue-600 transition">Offline Mode</a></li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-xs">Contact Us</h4>
                <p class="text-slate-500 dark:text-slate-400 mb-6 font-medium">
                    support@novalibrary.com<br>
                    +234 800 NOVA LIB
                </p>
                <div class="p-1 rounded-2xl border border-slate-200 dark:border-slate-800 flex">
                    <input type="email" placeholder="Your email" class="bg-transparent px-4 py-2 outline-none flex-1 text-sm">
                    <button class="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition">Join</button>
                </div>
            </div>
        </div>
        <div class="max-w-7xl mx-auto border-t border-slate-100 dark:border-slate-800 mt-20 pt-10 text-center">
            <p class="text-slate-400 text-sm font-medium">
                &copy; <?php echo date('Y'); ?> NovaLibrary. All rights reserved. Built with <i class="fa-solid fa-heart text-red-500 mx-1"></i> for Education.
            </p>
        </div>
    </footer>

    <script>
        function likeBook(bookId, btn) {
            const formData = new FormData();
            formData.append('book_id', bookId);
            formData.append('csrf_token', document.querySelector('meta[name="csrf-token"]').content);

            fetch('api/interact.php?action=like', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    btn.classList.toggle('text-red-500');
                    btn.classList.toggle('text-slate-400');
                    // Add a small animation
                    btn.classList.add('scale-125');
                    setTimeout(() => btn.classList.remove('scale-125'), 200);
                } else {
                    window.location.href = 'index.php?page=login';
                }
            });
        }
    </script>
</body>
</html>
