const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const base=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
function resolvePath(url){
  let pathname;try{pathname=decodeURIComponent(new URL(url,'http://localhost').pathname);}catch{return null;}
  if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(p=>p.startsWith('.')))return null;
  const target=path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname));
  return target.startsWith(base+path.sep)?target:null;
}
function createServer(){return http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const target=resolvePath(req.url);if(!target){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(target,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  });
});}
if(require.main===module){const port=Number(process.env.PORT||4178);const server=createServer();server.on('error',e=>{console.error('无法启动：'+(e.code==='EADDRINUSE'?'端口已占用，请设置 PORT 或关闭旧服务':e.message));process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log('马原知识宇宙：http://127.0.0.1:'+port+'（Ctrl+C 停止）'));}
module.exports={resolvePath,createServer};
