import os,subprocess,tempfile,time,json,urllib.request,urllib.error,http.cookiejar,concurrent.futures,datetime,sqlite3
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
php=os.environ.get('PHP_BINARY','php');env=os.environ.copy();tmp=tempfile.TemporaryDirectory();env.update(APP_ENV='test',TEST_DATABASE=tmp.name+'/test.db',APP_URL='http://127.0.0.1:9191',ADMIN_EMAIL='owner@example.test',ADMIN_SETUP_TOKEN='test-only-activation-token-1234567890',PHP_CLI_SERVER_WORKERS='4')
subprocess.run([php,'bin/migrate.php'],cwd=root,env=env,check=True)
log=open(tmp.name+'/server.log','w');p=subprocess.Popen([php,'-S','127.0.0.1:9191','-t','public','router.php'],cwd=root,env=env,stdout=log,stderr=log,start_new_session=True)
base='http://127.0.0.1:9191';pwd='Testing-only-long-password-42!'
def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def req(c,path,data=None,csrf=None,origin=base):
 h={}
 if data is not None:h={'Content-Type':'application/json','Origin':origin}
 if csrf:h['X-CSRF-Token']=csrf
 r=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers=h)
 try:
  with c.open(r) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
try:
 for _ in range(30):
  try:
   if req(client(),'/health')[0]==200:break
  except:time.sleep(.1)
 owner=client();c=client();other=client()
 assert req(c,'/api/saas/me')[0]==401
 reg={'name':'Owner test','phone':'51999990001','email':'owner@example.test','password':pwd,'token':env['ADMIN_SETUP_TOKEN']}
 status,d=req(owner,'/api/auth/setup',reg);assert status==201,(status,d);admincsrf=d['csrf']
 assert req(owner,'/api/auth/setup',reg)[0]==409
 reg={'name':'Client test','phone':'51999990002','email':'client@example.test','password':pwd}
 status,d=req(c,'/api/auth/register',reg);assert status==201,(status,d);csrf=d['csrf'];recovery=d['recoveryCode']
 assert req(c,'/api/saas/me')[1]['admin']==False
 assert req(owner,'/api/saas/me')[1]['admin']==True
 assert req(c,'/api/saas/settings',{'name':'bad'},csrf)[0]==403
 assert req(c,'/api/saas/profile',{'name':'Test','phone':'51999990002'})[0]==403
 assert req(c,'/api/saas/profile',{'name':'Test','phone':'51999990002'},csrf,'https://other.test')[0]==403
 for i in range(1,8):
  date=(datetime.date.today()+datetime.timedelta(days=i)).isoformat();status,d=req(c,'/api/saas/availability?date='+date+'&service=alan-service-0&staff=alan-staff-0')
  assert status==200,(status,d)
  if d['slots']:break
 booking={'service':'alan-service-0','staff':'alan-staff-0','start':d['slots'][0]['start']}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:req(c,'/api/saas/bookings',booking,csrf),[1,2]))
 assert sorted(r[0] for r in results)==[201,409],results
 bid=next(r[1]['id'] for r in results if r[0]==201)
 status,d=req(other,'/api/auth/register',{**reg,'email':'other@example.test','phone':'51999990003'});assert status==201
 assert req(other,'/api/saas/change',{'id':bid,'status':'cancelled'},d['csrf'])[0]==403
 assert req(other,'/api/saas/bookings')[1]==[]
 assert req(c,'/api/saas/change',{'id':bid,'status':'cancelled'},csrf)[0]==200
 assert req(c,'/api/saas/bookings',booking,csrf)[0]==201
 assert req(owner,'/api/saas/dashboard?date='+date)[0]==200
 status,d=req(c,'/api/auth/recover',{'email':reg['email'],'password':pwd+'x','recovery':recovery});assert status==200,(status,d)
 assert req(client(),'/api/auth/recover',{'email':reg['email'],'password':pwd,'recovery':recovery})[0]==401
 assert req(c,'/api/auth/logout',{},d['csrf'])[0]==200
 assert req(c,'/api/saas/me')[0]==401
 assert req(c,'/api/auth/login',{'email':reg['email'],'password':pwd})[0]==401
 assert req(c,'/api/auth/login',{'email':reg['email'],'password':pwd+'x'})[0]==200
 db=sqlite3.connect(env['TEST_DATABASE']);stored=db.execute('SELECT password_hash FROM users WHERE email=?',(reg['email'],)).fetchone()[0];assert stored.startswith('$argon2id$')
 print('PASS: PHP registration/login, Argon2id, admin activation, authorization, CSRF/origin, booking concurrency, client isolation, cancellation, recovery rotation, logout.')
finally:
 import signal
 os.killpg(p.pid,signal.SIGTERM);p.wait();log.close()
