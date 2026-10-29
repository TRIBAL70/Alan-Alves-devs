<?php
require __DIR__.'/../app/core.php';
$tables=[
'users'=>'id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT \'\',password_hash TEXT NOT NULL,recovery_hash TEXT NOT NULL,created BIGINT NOT NULL',
'shops'=>'id TEXT PRIMARY KEY,name TEXT NOT NULL,owner TEXT NOT NULL,phone TEXT NOT NULL DEFAULT \'\',open INTEGER NOT NULL DEFAULT 540,close INTEGER NOT NULL DEFAULT 1140,break_start INTEGER NOT NULL DEFAULT 720,break_end INTEGER NOT NULL DEFAULT 780,days TEXT NOT NULL DEFAULT \'1,2,3,4,5,6\',buffer INTEGER NOT NULL DEFAULT 5,lead INTEGER NOT NULL DEFAULT 60',
'members'=>'shop TEXT NOT NULL,"user" TEXT NOT NULL,role TEXT NOT NULL,PRIMARY KEY(shop,"user")',
'services'=>'id TEXT PRIMARY KEY,shop TEXT NOT NULL,name TEXT NOT NULL,duration INTEGER NOT NULL,price INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1',
'staff'=>'id TEXT PRIMARY KEY,shop TEXT NOT NULL,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1',
'bookings'=>'id TEXT PRIMARY KEY,shop TEXT NOT NULL,"user" TEXT,staff TEXT NOT NULL,service TEXT,name TEXT NOT NULL,phone TEXT NOT NULL,service_name TEXT NOT NULL,price INTEGER NOT NULL DEFAULT 0,start BIGINT NOT NULL,"end" BIGINT NOT NULL,release BIGINT NOT NULL,status TEXT NOT NULL DEFAULT \'confirmed\',notes TEXT NOT NULL DEFAULT \'\',created BIGINT NOT NULL,updated BIGINT NOT NULL,CHECK("end">start AND release>="end")',
'audit'=>'id TEXT PRIMARY KEY,shop TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created BIGINT NOT NULL',
'sessions'=>'token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,expires BIGINT NOT NULL',
'rate_limits'=>'key TEXT NOT NULL,bucket BIGINT NOT NULL,hits INTEGER NOT NULL,PRIMARY KEY(key,bucket)',
'system_state'=>'key TEXT PRIMARY KEY,value TEXT NOT NULL'
];
transaction(function()use($tables){foreach($tables as $name=>$columns)q('CREATE TABLE IF NOT EXISTS '.$name.' ('.$columns.')');q('CREATE INDEX IF NOT EXISTS booking_window ON bookings(shop,staff,start,release)');q('CREATE INDEX IF NOT EXISTS customer_bookings ON bookings("user")');q('CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires)');q('DELETE FROM sessions WHERE expires<?',[time()]);q('DELETE FROM rate_limits WHERE bucket<?',[(int)floor(time()/900)-96]);});
echo "Schema ready.\n";
