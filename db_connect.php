<?php
// backend/db_connect.php

$host = "localhost";
$user = "root";      // Default XAMPP user
$pass = "";          // Default XAMPP password (empty)
$dbname = "scholarship_db";

$conn = new mysqli($host, $user, $pass, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}
?>