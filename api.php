<?php
// backend/api.php
// Yeh file frontend se requests receive karegi aur database se baat karegi

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow requests from anywhere
header('Access-Control-Allow-Methods: GET, POST');

include 'db_connect.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

// --- 1. GET ALL LISTINGS (Jobs & Scholarships) ---
if ($action == 'get_listings') {
    $sql = "SELECT * FROM listings ORDER BY id DESC";
    $result = $conn->query($sql);
    
    $data = [];
    while($row = $result->fetch_assoc()) {
        // Icon logic backend pe bhi add kar sakte hain ya frontend pe rehne dein
        $row['icon'] = ($row['type'] == 'Job') ? 'fa-briefcase' : 'fa-graduation-cap';
        $data[] = $row;
    }
    echo json_encode($data);
}

// --- 2. GET ALL BLOGS ---
elseif ($action == 'get_blogs') {
    $sql = "SELECT * FROM blogs ORDER BY id DESC";
    $result = $conn->query($sql);
    $data = [];
    while($row = $result->fetch_assoc()) {
        $row['date'] = date("M d, Y", strtotime($row['created_at']));
        $data[] = $row;
    }
    echo json_encode($data);
}

// --- 3. ADD NEW LISTING (Admin) ---
elseif ($action == 'add_listing' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    $type = $_POST['type'];
    $title = $_POST['title'];
    $category = $_POST['category'];
    $amount = $_POST['amount'];
    $university = $_POST['university'];
    $deadline = $_POST['deadline'];

    $stmt = $conn->prepare("INSERT INTO listings (type, title, category, amount, university, deadline) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssss", $type, $title, $category, $amount, $university, $deadline);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "New opportunity added!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Error adding listing"]);
    }
    $stmt->close();
}

// --- 4. SUBMIT APPLICATION (User) ---
elseif ($action == 'submit_application' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    $full_name = $_POST['full_name'];
    $email = $_POST['email'];
    $statement = $_POST['statement'];
    // Listing ID agar bhejna ho to frontend se hidden input add karna parega
    // Abhi k liye hum generic save kar rahe hain

    $stmt = $conn->prepare("INSERT INTO applications (full_name, email, statement) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $full_name, $email, $statement);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Application submitted successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Database error"]);
    }
    $stmt->close();
}

// --- 5. DELETE LISTING (Admin) ---
elseif ($action == 'delete_listing' && isset($_POST['id'])) {
    $id = $_POST['id'];
    $conn->query("DELETE FROM listings WHERE id=$id");
    echo json_encode(["success" => true]);
}

$conn->close();
?>