<?php
declare(strict_types=1);
require __DIR__.'/../app/core.php';
header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');header('X-Frame-Options: DENY');
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
try {
if($path==='/api/auth/status'&&!getenv('DATABASE_URL')&&getenv('APP_ENV')!=='test')out(['loggedIn'=>false,'databaseConfigured'=>false]);
if(str_starts_with($path,'/api/')&&!getenv('DATABASE_URL')&&getenv('APP_ENV')!=='test')fail('O cadastro e a agenda aguardam a conexão do banco de dados pela administração.',503);
if($path==='/health'){q('SELECT 1');out(['ok'=>true]);}
if(str_starts_with($path,'/api/auth/')){require __DIR__.'/../app/auth.php';handleAuth(substr($path,10));}
if(str_starts_with($path,'/api/saas/')){require __DIR__.'/../app/saas.php';handleSaas(substr($path,10));}
if($path==='/download/alan-barber.apk'){$f=__DIR__.'/downloads/alan-barber.apk';if(!is_file($f))fail('Aplicativo ainda não disponível.',503);header('Content-Type: application/vnd.android.package-archive');header('Content-Disposition: attachment; filename="Alan-Barber.apk"');header('Content-Length: '.filesize($f));header('Cache-Control: public, max-age=3600');readfile($f);exit;}
if($path==='/'){header('Location: /login.html',true,302);exit;}
http_response_code(404);echo 'Página não encontrada.';
}catch(DomainException $e){out(['error'=>$e->getMessage()],$e->getCode()?:400);}catch(Throwable $e){error_log('Request failed: '.get_class($e).' code '.$e->getCode());out(['error'=>'Não foi possível concluir. Tente novamente.'],500);}
