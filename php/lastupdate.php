<?php 

require_once("./db.php");



$query = "SELECT lastupdatetime FROM rates;";
$result = mysql_query($query);
$read = mysql_fetch_array($result);
$mysqltime = date ("Y-m-d H:i:s", $read['lastupdatetime']);
echo($mysqltime);

mysql_close($conn);
?>