const fs=require('node:fs');const path=require('node:path');
const base=path.resolve(__dirname,'..');
function build(){
  let html=fs.readFileSync(path.join(base,'index.html'),'utf8');
  html=html.replace(/<link rel="stylesheet" href="assets\/styles.css">/,()=>'<style>'+fs.readFileSync(path.join(base,'assets/styles.css'),'utf8').replace(/<\/style/gi,'<\\/style')+'</style>');
  html=html.replace(/<script src="(assets\/[\w-]+\.js)"><\/script>/g,(_,file)=>'<script>\n'+fs.readFileSync(path.join(base,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
  if(/(?:src|href)="assets\//.test(html))throw new Error('单文件仍有外部资源');
  const out=path.join(base,'dist','马原知识宇宙.html');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html,'utf8');return out;
}
if(require.main===module)console.log('单文件已生成：'+build());
module.exports={build};
