<?php

$user = "tdenisenko";
$pwd = "***REMOVED***";
$host = "tdenisenkocom1.ipagemysql.com";
$db = "exchangerates";


$conn = mysql_connect($host,$user,$pwd) or die("MySQL Connection failed".mysql_error());

mysql_select_db($db) or die("Can not select database".mysql_error());

?>