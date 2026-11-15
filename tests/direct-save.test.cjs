const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../docs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.EDGE_PATH,headless:true});
 try{
  const page=await browser.newPage();
  const roster=JSON.parse(fs.readFileSync(path.join(root,'assets/board-teams.json'),'utf8'));
  let issues=[],posts=0,owner=40270480,deny=false,loseResponse=false;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://api.github.com/**',async r=>{
   const req=r.request(),url=new URL(req.url());
   if(url.pathname==='/user')return r.fulfill({json:{id:owner,login:'wonk19'}});
   if(req.method()==='POST'){
    posts++;
    if(deny)return r.fulfill({status:403,json:{message:'denied'}});
    const data=req.postDataJSON();
    assert(!data.body.includes('test-token'));
    const issue={...data,number:issues.length+1,user:{id:40270480,login:'wonk19'},created_at:'2026-11-15T00:00:00Z'};
    issues.push(issue);
    if(loseResponse){loseResponse=false;return r.abort();}
    return r.fulfill({status:201,json:issue});
   }
   return r.fulfill({json:issues});
  });
  await page.route('https://course.test/**',r=>{
   const file=path.join(root,new URL(r.request().url()).pathname.slice(1));
   return r.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html'});
  });
  await page.goto('https://course.test/evaluation.html');
  await page.waitForFunction(()=>document.querySelectorAll('#grade-table tbody tr').length===8);
  async function connect(){
   await page.locator('#account-setup').evaluate(e=>e.open=true);
   await page.locator('#account-token').fill('test-token');
   await page.locator('#account-connect').click();
  }
  owner=123;await connect();
  await page.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('토큰으로 연결'));
  assert.equal(posts,0);
  owner=40270480;await connect();
  await page.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('연결됨'));
  assert.equal(await page.locator('#account-token').inputValue(),'');
  await page.getByRole('button',{name:'평가 입력',exact:true}).first().click();
  await page.locator('[name=score0]').fill('17');
  await page.locator('[name=presenter0]').selectOption(roster[0].members[0]);
  await page.locator('[name=comment0]').fill('시험 코멘트');
  await page.locator('#grade-save').click();
  await page.waitForFunction(()=>document.querySelector('#grade-request-message').textContent.includes('저장 완료'));
  assert.equal(posts,1);
  assert.equal(await page.locator('.grade-presenter').first().textContent(),roster[0].members[0]);
  await page.getByRole('button',{name:'평가 입력',exact:true}).first().click();
  assert.equal(await page.locator('[name=score0]').inputValue(),'17');
  deny=true;await page.locator('[name=score0]').fill('18');await page.locator('#grade-save').click();
  await page.waitForFunction(()=>document.querySelector('#grade-request-message').textContent.includes('저장 권한'));
  assert.equal(await page.locator('[name=score0]').inputValue(),'18');
  deny=false;loseResponse=true;await page.locator('#grade-save').click();
  await page.waitForFunction(()=>document.querySelector('#grade-request-message').textContent.includes('응답을 받지'));
  const before=posts;
  await page.locator('#grade-check-save').click();
  await page.waitForFunction(()=>document.querySelector('#grade-request-message').textContent.includes('저장 완료'));
  assert.equal(posts,before);
  assert.equal(await page.locator('.score-cell strong').first().textContent(),'18');
  const storage=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]));
  assert(!storage.includes('test-token'));
  await page.getByRole('button',{name:'평가 입력',exact:true}).first().click();
  const last=issues.at(-1),data=JSON.parse(/<!-- survey2-action-v2\n([^]*?)\n-->/.exec(last.body)[1]);
  issues.push({...last,number:issues.length+1,body:'<!-- survey2-action-v2\n'+JSON.stringify({...data,base:last.number,requestId:'another',scores:[19,null,null,null,null,null]})+'\n-->'});
  await page.locator('#grade-save').click();
  await page.waitForFunction(()=>document.querySelector('#grade-request-message').textContent.includes('다른 창'));
  assert.equal(posts,before);
  await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('#grade-table tbody tr').length===8);
  assert(await page.locator('#account-disconnect').isHidden());
  assert.deepEqual(errors,[]);
  console.log('PASS: owner authentication, direct save, prefill, permission failure preserves input, lost-response recovery without duplicate POST, stale-write prevention, no credential storage, reload disconnect');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
