<?php
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);$file=realpath(__DIR__.'/public'.$path);$root=realpath(__DIR__.'/public');if($path!=='/'&&$file&&str_starts_with($file,$root.'/')&&is_file($file)&&pathinfo($file,PATHINFO_EXTENSION)!=='php')return false;
require __DIR__.'/public/index.php';
