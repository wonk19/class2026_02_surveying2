// Run with PLAYWRIGHT_MODULE pointing to the installed Playwright package.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const CourseState=require('../docs/assets/course-state.js');
(async()=>{
 const root=path.resolve(__dirname,'../docs');
 const server=http.createServer((req,res)=>{const p=path.join(root,new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const data=fs.readFileSync(p);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.json')?'application/json':p.endsWith('.css')?'text/css':'text/html');res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let apiRecords=[],failPrimary=false,apiCalls=0;
 await page.route('https://api.github.com/**',route=>{apiCalls++;return route.fulfill({status:403,json:{message:'API rate limit exceeded'}});});
 const snapshot=()=>({schema:1,repository:CourseState.REPO,generatedAt:'2026-11-18T00:00:00Z',issues:apiRecords});
 await page.route('https://raw.githubusercontent.com/**',route=>failPrimary?route.fulfill({status:503}):route.fulfill({json:snapshot()}));
 await page.route('**/assets/evaluation-records.json',route=>route.request().url().startsWith('http://127.')?route.fulfill({json:snapshot()}):route.fallback());
 await page.goto(`http://127.0.0.1:${server.address().port}/evaluation.html`);
 await page.getByRole('button',{name:'평가 입력',exact:true}).first().click();
 await page.locator('[name=score0]').fill('0');await page.locator('[name=score1]').fill('12.5');
 await page.getByRole('button',{name:'평가 등록 준비',exact:true}).click();
 const shortUrl=new URL(await page.locator('#grade-request-link').getAttribute('href'));
 assert(shortUrl.searchParams.has('body'));assert(await page.locator('#grade-copy').isHidden());
 const shortAction=CourseState.decode({body:shortUrl.searchParams.get('body'),user:{id:CourseState.OWNER_ID}});assert.deepEqual(shortAction.scores,[0,12.5,null,null,null,null]);
 const comment='한글 코멘트 & + # ?\n'.repeat(80);
 await page.locator('[name=comment0]').fill(comment);await page.locator('[name=note]').fill('검증용 의견');
 await page.getByRole('button',{name:'평가 등록 준비',exact:true}).click();
 const href=await page.locator('#grade-request-link').getAttribute('href');const url=new URL(href);
 assert.equal(url.pathname,'/wonk19/class2026_02_surveying2/issues/new');assert.equal(url.searchParams.has('body'),false);assert(href.length<500);
 const body=await page.locator('#grade-request-body').inputValue();assert(await page.locator('#grade-request-body').isVisible());
 const action=CourseState.decode({body,user:{id:CourseState.OWNER_ID}});assert.deepEqual(action.scores,[0,12.5,null,null,null,null]);assert.equal(action.comments[0],comment.trim());
 const roster=JSON.parse(fs.readFileSync(path.join(root,'assets/board-teams.json')));
 const state=await CourseState.reduce(roster,[{number:1,user:{id:CourseState.OWNER_ID,login:'wonk19'},body,html_url:'https://example.invalid/1',created_at:'2026-11-18T00:00:00Z'}]);assert.equal(state.results[1].accepted,true);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copied=value;}}}));await page.locator('#grade-request-link').evaluate(e=>e.addEventListener('click',event=>event.preventDefault()));await page.locator('#grade-request-link').click();assert.equal(await page.evaluate(()=>window.copied),body);
 await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('denied');};});await page.locator('#grade-copy').click();assert.match(await page.locator('#grade-request-message').textContent(),/Ctrl\+C/);
 assert.equal(await page.locator('#grade-request-body').evaluate(e=>e.selectionEnd-e.selectionStart),body.length);
 await page.locator('[name=score0]').fill('1');assert(await page.locator('#grade-request').isHidden());assert.deepEqual(errors,[]);
 await page.locator('#grade-close').click();
 apiRecords=[{number:1,user:{id:CourseState.OWNER_ID,login:'wonk19'},body,html_url:'https://example.invalid/1',created_at:'2026-11-18T00:00:00Z'}];
 await page.locator('#grade-refresh').click();await page.waitForFunction(()=>document.querySelector('.grade-total')?.textContent.includes('12.5 / 40'));
 await page.getByRole('button',{name:'평가 입력',exact:true}).first().click();
 assert.equal(await page.locator('[name=score0]').inputValue(),'0');assert.equal(await page.locator('[name=score1]').inputValue(),'12.5');assert.equal(await page.locator('[name=score2]').inputValue(),'');
 await page.locator('[name=score2]').fill('10');await page.getByRole('button',{name:'평가 등록 준비',exact:true}).click();
 const nextBody=await page.locator('#grade-request-body').inputValue();const next=CourseState.decode({body:nextBody,user:{id:CourseState.OWNER_ID}});assert.equal(next.base,1);assert.deepEqual(next.scores,[0,12.5,10,null,null,null]);assert.equal(next.comments[0],comment.trim());
 assert.match(await page.locator('#grade-preview').textContent(),/22.5 \/ 55점/);
 assert.equal(apiCalls,0);
 await page.locator('#grade-close').click();failPrimary=true;await page.locator('#grade-refresh').click();await page.waitForFunction(()=>document.querySelector('#grade-state').textContent.includes('배포 당시'));
 assert.match(await page.locator('.grade-total').first().textContent(),/12.5/);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'평가 입력',exact:true}).first().click();assert(await page.locator('#grade-editor').isHidden());
 console.log('PASS: API 403 makes no difference to static lookup; fallback is labelled and read-only');
 console.log('PASS: progressive reload preserves previous scores/comments and blank ungraded fields');
 console.log('PASS: automatic short-body prefill, automatic long-body copy, complete Korean payload, grade round-trip, copy/fallback, invalidation; no real issue created');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

