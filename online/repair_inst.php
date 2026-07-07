<?php
/**
 * NovaLibrary - Institution Repair Tool
 * Run this to fix missing links between School accounts and their Institutions.
 */
require_once 'backend/Database.php';
require_once 'backend/Auth.php';

$db = (new Database())->getConnection();

echo "<h2>Institution Repair Tool</h2>";

// 1. Find School/Org users with NO institution_id
$stmt = $db->query("SELECT id, full_name, role_id FROM users WHERE role_id IN (4, 5) AND institution_id IS NULL");
$orphans = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($orphans)) {
    echo "<p style='color:green'>No orphan school accounts found. All accounts are properly linked.</p>";
} else {
    foreach ($orphans as $user) {
        echo "<p>Repairing account: <strong>" . $user['full_name'] . "</strong> (ID: " . $user['id'] . ")... ";
        
        // Check if an institution already exists for this owner
        $check = $db->prepare("SELECT id FROM institutions WHERE owner_id = ?");
        $check->execute([$user['id']]);
        $inst = $check->fetch(PDO::FETCH_ASSOC);
        
        if ($inst) {
            $inst_id = $inst['id'];
            echo "Found existing institution. Linking... ";
        } else {
            $type = ($user['role_id'] == 4) ? 'School' : 'Organization';
            $name = $user['full_name'] . "'s Institution";
            $create = $db->prepare("INSERT INTO institutions (name, type, owner_id) VALUES (?, ?, ?)");
            $create->execute([$name, $type, $user['id']]);
            $inst_id = $db->lastInsertId();
            echo "Created new institution. Linking... ";
        }
        
        // Final link
        $update = $db->prepare("UPDATE users SET institution_id = ? WHERE id = ?");
        $update->execute([$inst_id, $user['id']]);
        echo "<span style='color:green'>Done!</span></p>";
    }
}

echo "<hr><p><a href='index.php?page=login'>Go to Login</a></p>";
echo "<p style='color:red'><strong>Security:</strong> Delete this file (repair_inst.php) after use.</p>";
