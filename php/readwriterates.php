<?php 

switch ($_REQUEST['action']) {
    case 'write':
        file_put_contents('rates.json', json_encode($_REQUEST['rates']));
        break;
    case 'read':
        readfile('rates.json');
        break;
}

?>