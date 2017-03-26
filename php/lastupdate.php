<?php 

require_once("./db.php");

$query = "SELECT lastupdatetime FROM rates;";
$result = mysql_query($query);
if(!$result) {
    die('Invalid query: ' . mysql_error());
}
$read = mysql_fetch_array($result);
$mysqltime = $read['lastupdatetime'];
$now = time();
$phptime = date("Y-m-d H:i:s", $now);
$diff = $now - strtotime($mysqltime);

if($diff > 1200) {
    echo("true");
} else {
    echo(1200 - $diff);
}

mysql_close($conn);
?>