<?php
/**
 * NovaLibrary - Admin Dashboard
 */
require_once 'header.php';
require_once '../backend/Database.php';

$db = (new Database())->getConnection();

// Fetch stats
$total_books = $db->query("SELECT COUNT(*) FROM books")->fetchColumn();
$total_users = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
$pending_approvals = $db->query("SELECT COUNT(*) FROM books WHERE status = 'Pending'")->fetchColumn();
$total_downloads = $db->query("SELECT COUNT(*) FROM downloads")->fetchColumn();

// Recent Activity (Mock for now, should use activity_logs)
$recent_books = $db->query("SELECT * FROM books ORDER BY upload_date DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
    <div class="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm" x-data="{ count: 0 }" x-init="setTimeout(() => { let target = <?php echo $total_books; ?>; let interval = setInterval(() => { if(count >= target) { count = target; clearInterval(interval); } else { count += Math.ceil(target/20); } }, 30) }, 100)">
        <div class="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-6">
            <i class="fa-solid fa-book"></i>
        </div>
        <p class="text-slate-500 font-medium text-sm mb-1">Total Books</p>
        <h3 class="text-3xl font-black" x-text="count.toLocaleString()">0</h3>
    </div>
    <div class="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm" x-data="{ count: 0 }" x-init="setTimeout(() => { let target = <?php echo $total_users; ?>; let interval = setInterval(() => { if(count >= target) { count = target; clearInterval(interval); } else { count += Math.ceil(target/20); } }, 30) }, 100)">
        <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-6">
            <i class="fa-solid fa-users"></i>
        </div>
        <p class="text-slate-500 font-medium text-sm mb-1">Active Users</p>
        <h3 class="text-3xl font-black" x-text="count.toLocaleString()">0</h3>
    </div>
    <div class="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm" x-data="{ count: 0 }" x-init="setTimeout(() => { let target = <?php echo $pending_approvals; ?>; let interval = setInterval(() => { if(count >= target) { count = target; clearInterval(interval); } else { count += Math.ceil(target/20); } }, 30) }, 100)">
        <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 mb-6">
            <i class="fa-solid fa-clock"></i>
        </div>
        <p class="text-slate-500 font-medium text-sm mb-1">Pending Approvals</p>
        <h3 class="text-3xl font-black" x-text="count.toLocaleString()">0</h3>
    </div>
    <div class="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm" x-data="{ count: 0 }" x-init="setTimeout(() => { let target = <?php echo $total_downloads; ?>; let interval = setInterval(() => { if(count >= target) { count = target; clearInterval(interval); } else { count += Math.ceil(target/20); } }, 30) }, 100)">
        <div class="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 mb-6">
            <i class="fa-solid fa-download"></i>
        </div>
        <p class="text-slate-500 font-medium text-sm mb-1">Total Downloads</p>
        <h3 class="text-3xl font-black" x-text="count.toLocaleString()">0</h3>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
    <!-- User Growth Chart -->
    <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
        <h3 class="text-xl font-bold mb-8 tracking-tight">User Registration Trends</h3>
        <canvas id="userGrowthChart" height="200"></canvas>
    </div>
    <!-- Category Distribution Chart -->
    <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
        <h3 class="text-xl font-bold mb-8 tracking-tight">Books by Category</h3>
        <canvas id="categoryChart" height="200"></canvas>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // User Growth Chart
    const ctx1 = document.getElementById('userGrowthChart').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: 'New Users',
                data: [12, 19, 3, 5, 2, 3, 7],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#2563eb'
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });

    // Category Chart
    const ctx2 = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Science', 'Technology', 'History', 'Arts', 'Business'],
            datasets: [{
                data: [30, 25, 20, 15, 10],
                backgroundColor: [
                    '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'
                ],
                borderWidth: 0,
                hoverOffset: 20
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            }
        }
    });
});
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Recent Books Table -->
    <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8">
        <div class="flex items-center justify-between mb-8">
            <h3 class="text-xl font-bold">Recent Uploads</h3>
            <a href="books.php" class="text-blue-600 text-sm font-bold hover:underline">View All</a>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead>
                    <tr class="text-slate-400 text-sm uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                        <th class="pb-4 font-bold">Book Title</th>
                        <th class="pb-4 font-bold">Author</th>
                        <th class="pb-4 font-bold">Status</th>
                        <th class="pb-4 font-bold">Date</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-800">
                    <?php foreach ($recent_books as $book): ?>
                    <tr>
                        <td class="py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-12 rounded bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden">
                                    <img src="../uploads/covers/<?php echo $book['cover_image']; ?>" onerror="this.src='https://via.placeholder.com/40x50'" class="w-full h-full object-cover">
                                </div>
                                <span class="font-bold text-sm truncate max-w-[200px]"><?php echo $book['title']; ?></span>
                            </div>
                        </td>
                        <td class="py-4 text-sm text-slate-500"><?php echo $book['author']; ?></td>
                        <td class="py-4">
                            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider 
                                <?php echo $book['status'] === 'Approved' ? 'bg-emerald-100 text-emerald-600' : ($book['status'] === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'); ?>">
                                <?php echo $book['status']; ?>
                            </span>
                        </td>
                        <td class="py-4 text-sm text-slate-400"><?php echo date('M d, Y', strtotime($book['upload_date'])); ?></td>
                    </tr>
                    <?php endforeach; if (empty($recent_books)) echo "<tr><td colspan='4' class='py-8 text-center text-slate-500'>No books found.</td></tr>"; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Quick Actions / Analytics Placeholder -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8">
        <h3 class="text-xl font-bold mb-8">System Health</h3>
        <div class="space-y-6">
            <div>
                <div class="flex justify-between text-sm mb-2">
                    <span class="font-medium">Storage Usage</span>
                    <span class="text-slate-400">45%</span>
                </div>
                <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div class="w-[45%] h-full bg-blue-600"></div>
                </div>
            </div>
            <div>
                <div class="flex justify-between text-sm mb-2">
                    <span class="font-medium">Server Load</span>
                    <span class="text-slate-400">12%</span>
                </div>
                <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div class="w-[12%] h-full bg-emerald-500"></div>
                </div>
            </div>
            <div class="pt-6">
                <h4 class="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Quick Links</h4>
                <div class="grid grid-cols-1 gap-2">
                    <a href="#" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-sm font-bold flex items-center gap-3">
                        <i class="fa-solid fa-gear text-slate-400"></i> System Settings
                    </a>
                    <a href="#" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-sm font-bold flex items-center gap-3">
                        <i class="fa-solid fa-file-export text-slate-400"></i> Export Reports
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once 'footer.php'; ?>
