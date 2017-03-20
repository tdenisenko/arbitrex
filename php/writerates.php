<?php 

require_once("./db.php");

$rates = "";
if ( $_SERVER['REQUEST_METHOD'] == 'POST' && !empty($_POST)) {
    $rates = $_POST['rates'];
} else {
    die("No POST detected.");
}

if(!file_put_contents('rates.json', json_encode($rates))) {
    die("Writing JSON failed.");
}

$now = time();
$phptime = date("Y-m-d H:i:s", $now);
$query = "UPDATE rates SET lastupdatetime='".$phptime."';";

if (mysql_query($query)) {
    echo "true";
} else {
    echo "Error updating record: " . $conn->error;
}

mysql_close($conn);

?>