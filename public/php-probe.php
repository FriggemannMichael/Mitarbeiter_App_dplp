<?php
header('Content-Type: text/plain; charset=utf-8');

echo "php-ok\n";
echo "time=" . gmdate('c') . "\n";
echo "method=" . ($_SERVER['REQUEST_METHOD'] ?? '') . "\n";
echo "host=" . ($_SERVER['HTTP_HOST'] ?? '') . "\n";
echo "uri=" . ($_SERVER['REQUEST_URI'] ?? '') . "\n";
