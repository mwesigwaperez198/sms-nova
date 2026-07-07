-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: May 23, 2026 at 11:11 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `novalibrary`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookmarks`
--

CREATE TABLE `bookmarks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `page_index` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookmarks`
--

INSERT INTO `bookmarks` (`id`, `user_id`, `book_id`, `page_index`, `title`, `created_at`) VALUES
(1, 3, 1, '1', 'Bookmark Page 1', '2026-05-16 23:06:34'),
(2, 3, 1, '1', 'Bookmark Page 1', '2026-05-16 23:22:34'),
(3, 3, 2, '6', 'Bookmark Page 6', '2026-05-16 23:35:23'),
(4, 3, 2, '1', 'Bookmark Page 1', '2026-05-16 23:35:42'),
(5, 3, 2, '7', 'Bookmark Page 7', '2026-05-17 00:51:39'),
(6, 3, 2, '1', 'Bookmark Page 1', '2026-05-17 01:00:55');

-- --------------------------------------------------------

--
-- Table structure for table `books`
--

CREATE TABLE `books` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `cover_image` varchar(255) DEFAULT 'default_cover.jpg',
  `file_path` varchar(255) NOT NULL,
  `file_type` enum('PDF','EPUB','DOCX','AUDIO') NOT NULL,
  `category_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL,
  `language` varchar(50) DEFAULT 'English',
  `download_count` int(11) DEFAULT 0,
  `read_count` int(11) DEFAULT 0,
  `file_size` varchar(20) DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `uploader_id` int(11) NOT NULL,
  `institution_id` int(11) DEFAULT NULL,
  `is_downloadable` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `books`
--

INSERT INTO `books` (`id`, `title`, `author`, `cover_image`, `file_path`, `file_type`, `category_id`, `description`, `tags`, `language`, `download_count`, `read_count`, `file_size`, `status`, `upload_date`, `uploader_id`, `institution_id`, `is_downloadable`) VALUES
(1, 'yah man', 'Clovis klein', 'cover_6a08a5c3b5f0b.jpeg', 'book_6a08a5c3b5f67.pdf', 'PDF', 1, 'oke', NULL, 'English', 0, 0, NULL, 'Approved', '2026-05-16 17:13:39', 3, 3, 1),
(2, 'New Book', 'Clovis klein', 'cover_6a08fcd40a5a5.png', 'book_6a08fcd40a614.pdf', 'PDF', 1, 'let see if it works out', NULL, 'English', 0, 0, NULL, 'Approved', '2026-05-16 23:25:08', 3, 3, 1);

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `created_at`) VALUES
(1, 'ICT', 'ict', NULL, '2026-05-16 17:06:31'),
(2, 'Science', 'science', NULL, '2026-05-17 00:35:18'),
(3, 'History', 'history', NULL, '2026-05-17 00:35:19'),
(4, 'Technology', 'technology', NULL, '2026-05-17 00:35:19'),
(5, 'Arts', 'arts', NULL, '2026-05-17 00:35:19'),
(6, 'Mathematics', 'mathematics', NULL, '2026-05-17 00:35:19'),
(7, 'Literature', 'literature', NULL, '2026-05-17 00:35:19'),
(8, 'Philosophy', 'philosophy', NULL, '2026-05-17 00:35:19'),
(9, 'Engineering', 'engineering', NULL, '2026-05-17 00:35:19'),
(10, 'Medicine', 'medicine', NULL, '2026-05-17 00:35:19'),
(11, 'Business', 'business', NULL, '2026-05-17 00:35:19'),
(12, 'Law', 'law', NULL, '2026-05-17 00:35:19'),
(13, 'Social Sciences', 'social-sciences', NULL, '2026-05-17 00:35:20'),
(14, 'Geography', 'geography', NULL, '2026-05-17 00:35:20'),
(15, 'Languages', 'languages', NULL, '2026-05-17 00:35:20');

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`id`, `user_id`, `book_id`, `content`, `parent_id`, `created_at`) VALUES
(1, 3, 2, 'yah man', NULL, '2026-05-17 00:07:33');

-- --------------------------------------------------------

--
-- Table structure for table `downloads`
--

CREATE TABLE `downloads` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `status` enum('Pending','Approved','Denied') DEFAULT 'Approved',
  `downloaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `favourites`
--

CREATE TABLE `favourites` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `highlights`
--

CREATE TABLE `highlights` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `cfi_range` text NOT NULL,
  `text_content` text DEFAULT NULL,
  `color` varchar(20) DEFAULT 'yellow',
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `institutions`
--

CREATE TABLE `institutions` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('School','Organization') NOT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `institutions`
--

INSERT INTO `institutions` (`id`, `name`, `type`, `owner_id`, `status`, `created_at`) VALUES
(1, 'Naalya S.S Namugongo', 'School', 0, 'Active', '2026-05-16 14:53:03'),
(2, 'Clovis Klein\'s Institution', 'School', 1, 'Active', '2026-05-16 15:08:21'),
(3, 'Naalya Admin\'s Institution', 'School', 3, 'Active', '2026-05-16 15:08:23');

-- --------------------------------------------------------

--
-- Table structure for table `likes`
--

CREATE TABLE `likes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ratings`
--

CREATE TABLE `ratings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL CHECK (`rating` between 1 and 5),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reading_analytics`
--

CREATE TABLE `reading_analytics` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `session_start` timestamp NOT NULL DEFAULT current_timestamp(),
  `session_end` timestamp NULL DEFAULT NULL,
  `duration_seconds` int(11) DEFAULT 0,
  `pages_read` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reading_analytics`
--

INSERT INTO `reading_analytics` (`id`, `user_id`, `book_id`, `session_start`, `session_end`, `duration_seconds`, `pages_read`) VALUES
(1, 3, 1, '2026-05-16 23:05:18', NULL, 17, 1),
(2, 3, 1, '2026-05-16 23:05:49', NULL, 22, 1),
(3, 3, 1, '2026-05-16 23:07:01', NULL, 32, 1),
(4, 3, 1, '2026-05-16 23:08:04', NULL, 3, 1),
(5, 3, 1, '2026-05-16 23:09:38', NULL, 6, 1),
(6, 3, 1, '2026-05-16 23:10:40', NULL, 24, 1),
(7, 3, 1, '2026-05-16 23:15:51', NULL, 299, 1),
(8, 3, 1, '2026-05-16 23:17:44', NULL, 110, 1),
(9, 3, 1, '2026-05-16 23:18:54', NULL, 68, 1),
(10, 3, 1, '2026-05-16 23:19:07', NULL, 12, 1),
(11, 3, 1, '2026-05-16 23:20:37', NULL, 86, 1),
(12, 3, 1, '2026-05-16 23:22:51', NULL, 85, 1),
(13, 3, 1, '2026-05-16 23:23:42', NULL, 46, 1),
(14, 3, 2, '2026-05-16 23:26:49', NULL, 97, 4),
(15, 3, 2, '2026-05-16 23:28:43', NULL, 112, 6),
(16, 3, 1, '2026-05-16 23:29:20', NULL, 28, 1),
(17, 3, 1, '2026-05-16 23:31:21', NULL, 120, 1),
(18, 3, 1, '2026-05-16 23:31:53', NULL, 30, 1),
(19, 3, 1, '2026-05-16 23:33:30', NULL, 96, 1),
(20, 3, 1, '2026-05-16 23:34:31', NULL, 59, 1),
(21, 3, 1, '2026-05-16 23:35:01', NULL, 29, 1),
(22, 3, 2, '2026-05-16 23:38:13', NULL, 186, 4),
(23, 3, 2, '2026-05-16 23:41:17', NULL, 173, 4),
(24, 3, 2, '2026-05-16 23:41:30', NULL, 11, 4),
(25, 3, 2, '2026-05-16 23:43:08', NULL, 44, 1),
(26, 3, 2, '2026-05-16 23:44:13', NULL, 9, 1),
(27, 3, 2, '2026-05-16 23:48:20', NULL, 241, 7),
(28, 3, 2, '2026-05-16 23:50:28', NULL, 80, 7),
(29, 3, 2, '2026-05-16 23:50:40', NULL, 10, 7),
(30, 3, 2, '2026-05-16 23:53:50', NULL, 189, 7),
(31, 3, 2, '2026-05-16 23:55:51', NULL, 119, 7),
(32, 3, 2, '2026-05-16 23:57:48', NULL, 115, 7),
(33, 3, 2, '2026-05-16 23:58:07', NULL, 18, 7),
(34, 3, 2, '2026-05-17 00:00:27', NULL, 130, 7),
(35, 3, 2, '2026-05-17 00:01:40', NULL, 72, 7),
(36, 3, 2, '2026-05-17 00:01:53', NULL, 11, 7),
(37, 3, 2, '2026-05-17 00:02:17', NULL, 17, 7),
(38, 3, 2, '2026-05-17 00:10:55', NULL, 21, 7),
(39, 3, 1, '2026-05-17 00:17:08', NULL, 200, 1),
(40, 3, 2, '2026-05-17 00:53:45', NULL, 143, 7),
(41, 3, 2, '2026-05-17 00:54:10', NULL, 23, 7),
(42, 3, 2, '2026-05-17 00:55:30', NULL, 79, 7),
(43, 3, 2, '2026-05-17 00:58:11', NULL, 135, 7),
(44, 3, 2, '2026-05-17 01:04:40', NULL, 386, 2),
(45, 3, 2, '2026-05-17 01:06:25', NULL, 97, 2),
(46, 3, 2, '2026-05-17 01:07:45', NULL, 73, 1),
(47, 3, 2, '2026-05-17 01:13:28', NULL, 338, 2),
(48, 3, 2, '2026-05-17 01:14:14', NULL, 41, 2),
(49, 3, 2, '2026-05-17 01:17:50', NULL, 214, 2),
(50, 3, 2, '2026-05-17 01:19:14', NULL, 81, 1),
(51, 3, 2, '2026-05-17 01:19:30', NULL, 14, 1),
(52, 3, 2, '2026-05-17 01:19:37', NULL, 5, 1),
(53, 3, 2, '2026-05-17 01:20:46', NULL, 67, 1),
(54, 3, 2, '2026-05-17 01:21:22', NULL, 34, 3),
(55, 3, 2, '2026-05-17 01:31:54', NULL, 99, 3),
(56, 3, 2, '2026-05-17 01:32:35', NULL, 39, 3),
(57, 3, 2, '2026-05-17 01:33:25', NULL, 48, 3),
(58, 3, 2, '2026-05-17 01:33:44', NULL, 18, 3),
(59, 3, 2, '2026-05-17 01:34:00', NULL, 14, 3),
(60, 3, 2, '2026-05-17 01:35:42', NULL, 101, 3),
(61, 3, 2, '2026-05-17 01:38:45', NULL, 180, 3),
(62, 3, 2, '2026-05-17 01:41:35', NULL, 167, 3),
(63, 3, 2, '2026-05-17 01:45:24', NULL, 130, 3),
(64, 3, 2, '2026-05-17 01:45:28', NULL, 2, 3),
(65, 3, 2, '2026-05-17 01:46:11', NULL, 41, 3),
(66, 3, 2, '2026-05-17 01:48:03', NULL, 111, 3),
(67, 3, 2, '2026-05-17 01:49:32', NULL, 37, 3),
(68, 3, 2, '2026-05-17 01:50:13', NULL, 39, 3),
(69, 3, 2, '2026-05-17 01:50:17', NULL, 2, 3),
(70, 3, 2, '2026-05-17 01:50:32', NULL, 14, 3),
(71, 3, 2, '2026-05-17 01:50:44', NULL, 10, 3),
(72, 3, 2, '2026-05-17 01:51:56', NULL, 68, 3),
(73, 3, 2, '2026-05-17 01:52:04', NULL, 6, 3),
(74, 3, 2, '2026-05-17 01:52:44', NULL, 38, 3),
(75, 3, 2, '2026-05-17 01:53:36', NULL, 5, 3),
(76, 3, 2, '2026-05-17 10:09:48', NULL, 50, 5);

-- --------------------------------------------------------

--
-- Table structure for table `reading_history`
--

CREATE TABLE `reading_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `last_page` int(11) DEFAULT 1,
  `progress_percentage` decimal(5,2) DEFAULT 0.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reading_history`
--

INSERT INTO `reading_history` (`id`, `user_id`, `book_id`, `last_page`, `progress_percentage`, `updated_at`) VALUES
(1, 3, 1, 1, 100.00, '2026-05-16 23:05:02'),
(36, 3, 2, 5, 25.00, '2026-05-17 10:09:14');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`) VALUES
(7, 'Admin'),
(1, 'Guest'),
(3, 'Individual User'),
(6, 'Librarian'),
(5, 'Organization Account'),
(4, 'School Account'),
(2, 'Student'),
(8, 'Super Admin (ProsAdmin)');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `institution_id` int(11) DEFAULT NULL,
  `status` enum('Pending','Active','Suspended') DEFAULT 'Pending',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `password`, `role_id`, `institution_id`, `status`, `email_verified_at`, `created_at`, `updated_at`) VALUES
(1, 'Clovis Klein', 'kleinclovis75@gmail.com', '$2y$10$/XN40Yjghg.JC2YhqOl55.gTc5XQdwZxalW5KYH.XklJlbiKhv8Pu', 4, 2, 'Active', NULL, '2026-05-16 13:41:58', '2026-05-16 15:08:22'),
(2, 'Super Admin', 'admin@novalibrary.com', '$2y$10$5GYrn252EZO3ktptMh93Be2wsl8COHKjoMYAI/yxvLB.7LWhGDsDa', 8, NULL, 'Active', NULL, '2026-05-16 13:43:05', '2026-05-16 13:43:05'),
(3, 'Naalya Admin', 'clovisklein75@gmail.com', '$2y$10$3Wo3FeKA1HCx74UyWFiDYO1UB4sxlLGE6cHXSyVC4VT8prdwYZDvK', 4, 3, 'Active', NULL, '2026-05-16 14:53:00', '2026-05-16 15:08:23');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `books`
--
ALTER TABLE `books`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `uploader_id` (`uploader_id`),
  ADD KEY `institution_id` (`institution_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `downloads`
--
ALTER TABLE `downloads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `favourites`
--
ALTER TABLE `favourites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_book_fav` (`user_id`,`book_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `highlights`
--
ALTER TABLE `highlights`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `institutions`
--
ALTER TABLE `institutions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `likes`
--
ALTER TABLE `likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_book_like` (`user_id`,`book_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `ratings`
--
ALTER TABLE `ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_book_rating` (`user_id`,`book_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `reading_analytics`
--
ALTER TABLE `reading_analytics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `reading_history`
--
ALTER TABLE `reading_history`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_book_reading` (`user_id`,`book_id`),
  ADD KEY `book_id` (`book_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `institution_id` (`institution_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookmarks`
--
ALTER TABLE `bookmarks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `books`
--
ALTER TABLE `books`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `downloads`
--
ALTER TABLE `downloads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `favourites`
--
ALTER TABLE `favourites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `highlights`
--
ALTER TABLE `highlights`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `institutions`
--
ALTER TABLE `institutions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `likes`
--
ALTER TABLE `likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ratings`
--
ALTER TABLE `ratings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reading_analytics`
--
ALTER TABLE `reading_analytics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `reading_history`
--
ALTER TABLE `reading_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=233;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD CONSTRAINT `bookmarks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `bookmarks_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `books`
--
ALTER TABLE `books`
  ADD CONSTRAINT `books_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `books_ibfk_2` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `books_ibfk_3` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `downloads`
--
ALTER TABLE `downloads`
  ADD CONSTRAINT `downloads_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `downloads_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `favourites`
--
ALTER TABLE `favourites`
  ADD CONSTRAINT `favourites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `favourites_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `highlights`
--
ALTER TABLE `highlights`
  ADD CONSTRAINT `highlights_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `highlights_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `likes`
--
ALTER TABLE `likes`
  ADD CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `ratings`
--
ALTER TABLE `ratings`
  ADD CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `reading_analytics`
--
ALTER TABLE `reading_analytics`
  ADD CONSTRAINT `reading_analytics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `reading_analytics_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `reading_history`
--
ALTER TABLE `reading_history`
  ADD CONSTRAINT `reading_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `reading_history_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
