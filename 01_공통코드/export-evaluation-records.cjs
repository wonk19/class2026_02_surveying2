// Export only public assessment records; never include credentials in the output.
const fs=require('node:fs/promises');
const path=require('node:path');
const {decode}=require('../docs/assets/course-state.js');
const REPO='wonk19/class2026_02_surveying2';
async function collect(fetcher=fetch,token=process.env.GITHUB_TOKEN){
 const issues=[];
 for(let page=1;;page++){
  const headers={Accept:'application/vnd.github+json'};
  if(token)headers.Authorization=`Bearer ${token}`;
  const r=await fetcher(`https://api.github.com/repos/${REPO}/issues?state=all&sort=created&direction=asc&per_page=100&page=${page}`,{headers});
  if(!r.ok)throw Error(`Assessment export failed (${r.status}); previous snapshot is preserved.`);
  const rows=await r.json();if(!Array.isArray(rows))throw Error('Invalid issue list');
  for(const i of rows){if(decode(i)?.kind==='grade')issues.push({number:i.number,title:i.title,body:i.body,user:{id:i.user.id,login:i.user.login},html_url:i.html_url,created_at:i.created_at,updated_at:i.updated_at});}
  if(!(r.headers.get('link')||'').includes('rel="next"'))break;
 }
 return {schema:1,repository:REPO,generatedAt:new Date().toISOString(),issues};
}
async function main(){
 const result=await collect();
 const target=path.join(__dirname,'../docs/assets/evaluation-records.json');
 let previous;try{previous=JSON.parse(await fs.readFile(target,'utf8'));}catch{}
 // Avoid endless commits caused only by a new export timestamp.
 if(previous?.schema===1&&JSON.stringify(previous.issues)===JSON.stringify(result.issues)){console.log('Assessment records unchanged');return;}
 await fs.writeFile(target,JSON.stringify(result,null,2)+'\n');
 console.log(`Exported ${result.issues.length} assessment records`);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={collect};
