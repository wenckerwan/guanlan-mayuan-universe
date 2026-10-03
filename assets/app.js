(function(){
  'use strict';
  const D=window.MAYUAN_DATA,C=window.MayuanCore,$=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nodes=new Map(D.nodes.map(n=>[n.id,n])),mods=new Map(D.modules.map(m=>[m.id,m]));
  const nodeIds=D.nodes.map(n=>n.id),KEY='mayuan-universe:progress:v1',MOTION_KEY='mayuan-universe:motion',emptyDetail=$('detail-panel').innerHTML;
  const state={view:'map',module:'all',selected:null,detailTab:'understand',cross:false,relationKind:'all',zoom:1,panX:0,panY:0,list:window.innerWidth<700};
  const masteryLabel={unlearned:'未掌握',fuzzy:'有些模糊',mastered:'已掌握'};
  let progress=C.emptyProgress(),toastTimer,quizSession=null,recallSession=null,storageWarning=false;
  function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
  try{const stored=localStorage.getItem(KEY);if(stored)progress=C.validateProgress(JSON.parse(stored),nodeIds);}catch{storageWarning=true;}
  const adapter=window.GuanlanAdapter.create({windowLike:window,core:C,nodeIds,getProgress:()=>JSON.parse(JSON.stringify(progress)),onProgress:p=>{progress=C.mergeProgress(progress,p,nodeIds);save();renderAll();},onNavigate:id=>selectNode(id)});
  window.MayuanApp={connectGuanlan:options=>adapter.connect(options),disconnectGuanlan:()=>adapter.disconnect(),navigate:id=>{if(nodes.has(id))selectNode(id);},getProgress:()=>JSON.parse(JSON.stringify(progress))};
  function save(){
    progress.updatedAt=Date.now();
    try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{toast('浏览器未能保存进度，请用“导出进度”保留记录。');}
    adapter.publishProgress();renderProgress();
  }
  function entry(id){return progress.nodes[id]||C.emptyNode();}
  function touch(id){const e=entry(id);e.visited=true;progress.nodes[id]=e;save();}
  function setMastery(id,value){if(!C.masteryStates.includes(value))return;const e=entry(id);e.mastery=value;e.masteryUpdatedAt=Date.now();e.updatedAt=e.masteryUpdatedAt;progress.nodes[id]=e;save();renderDetail();renderGraph();toast('已标记：'+masteryLabel[value]);}
  function renderProgress(){
    const mastered=Object.values(progress.nodes).filter(n=>n.mastery==='mastered').length;
    $('mastery-count').textContent=mastered+' / '+D.nodes.length;
    $('mastery-bar').style.width=(mastered/D.nodes.length*100)+'%';
  }
  function renderNav(){
    $('module-nav').innerHTML='<button class="module-button '+(state.module==='all'?'active':'')+'" data-module="all"><span class="module-icon" style="--module-color:#5f8764">◉</span>全局概览<span class="count">'+D.nodes.length+'</span></button>'+D.modules.map((m,i)=>'<button class="module-button '+(state.module===m.id?'active':'')+'" data-module="'+esc(m.id)+'" '+(state.module===m.id?'aria-current="page"':'')+'><span class="module-icon" style="--module-color:'+esc(m.color)+'">'+['◇','◒','⌘','◈','⌂','▥','✧'][i]+'</span>'+esc(m.title)+'<span class="count">'+D.nodes.filter(n=>n.module===m.id).length+'</span></button>').join('');
  }
  function renderHeading(){
    const m=mods.get(state.module);
    $('breadcrumb').innerHTML='<button class="text-button" data-module="all">知识宇宙</button><span>/</span>'+esc(m?m.title:'全局概览');
    $('view-title').textContent=m?m.title+(state.view==='star'?' · 知识星区':' · 原理与联系'):(state.view==='star'?'在知识之间，发现引力。':'每个原理，都有来处。');
    $('view-subtitle').textContent=m?(m.subtitle||'选择概念，探索它与其他原理的联系。'):(state.view==='star'?'七个知识星区，一套相互联系的思想体系。':'沿着联系探索，让零散知识成为一个整体。');
    $('graph-caption').innerHTML=esc(m?m.title:'全局视野')+' <span class="muted">· '+(m?'点击节点或连线，查看具体解释':'选择一个领域开始探索')+'</span>';
    $('map-view').classList.toggle('active',state.view==='map');$('map-view').setAttribute('aria-pressed',state.view==='map');
    $('star-view').classList.toggle('active',state.view==='star');$('star-view').setAttribute('aria-pressed',state.view==='star');
    document.querySelector('.graph-card').classList.toggle('star-mode',state.view==='star');
    $('cross-toggle').setAttribute('aria-pressed',state.cross);
  }
  const svgText=(text,x,y,size,color,anchor='middle')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+color+'">'+esc(text)+'</text>';
  function splitTitle(title,max=13){return title.length>max?[title.slice(0,max),title.slice(max)]:[title];}
  function nodeMarkup(n,p,external=false){
    const m=mods.get(n.module),isStar=state.view==='star',selected=state.selected===n.id,e=entry(n.id),color=m.color;
    const lines=splitTitle(n.title,12),status=e.mastery==='mastered'?'✓':e.mastery==='fuzzy'?'?':e.visited?'·':'';
    const shape=isStar?'<circle class="node-shape" r="'+(selected?33:27)+'" fill="url(#planet-'+esc(m.id)+')" stroke="'+color+'"/><ellipse rx="'+(selected?47:39)+'" ry="12" fill="none" stroke="'+color+'" opacity=".4" transform="rotate(-24)"/>':'<rect class="node-shape" x="-106" y="-33" width="212" height="66" rx="13" fill="'+(selected?'#e9f3e6':'#fff')+'" stroke="'+(external?'#b1c4a4':'#dce6d5')+'"/>';
    const label=isStar?lines.map((s,i)=>svgText(s,0,57+i*20,17,'#dce8da')).join(''):lines.map((s,i)=>svgText(s,0,lines.length>1?-3+i*20:3,17,'#38573e')).join('');
    return '<g class="graph-node '+(selected?'selected':'')+'" data-node="'+esc(n.id)+'" role="button" tabindex="0" aria-label="'+esc(n.title)+'，'+masteryLabel[e.mastery]+'" transform="translate('+p.x+','+p.y+')"><title>'+esc(n.title+'：'+n.summary)+'</title>'+shape+(isStar?svgText(status||'·',0,6,22,'#e7f1c1'):svgText(status,90,-16,13,'#6d9b67'))+label+(external?svgText(m.title,0,isStar?92:24,10,isStar?'#8aac9d':'#91a280'):'')+'</g>';
  }
  function overview(){
    const star=state.view==='star';
    const positions=[{x:550,y:100},{x:865,y:205},{x:880,y:435},{x:705,y:625},{x:390,y:625},{x:215,y:435},{x:230,y:205}];
    let s='<ellipse cx="550" cy="355" rx="338" ry="235" fill="none" stroke="'+(star?'#355351':'#e2e9da')+'" stroke-dasharray="3 9"/>';
    D.modules.forEach((m,i)=>{const p=positions[i];s+='<path d="M550 355 Q '+(550+(p.x-550)*.25)+' '+p.y+' '+p.x+' '+p.y+'" fill="none" stroke="'+(star?'#3f635b':'#d5e1cb')+'" stroke-width="1.2"/>';});
    s+='<circle cx="550" cy="355" r="'+(star?91:89)+'" fill="'+(star?'#193e3d':'#eef4e6')+'" stroke="'+(star?'#6b9d76':'#bdcfae')+'"/>';
    s+='<circle cx="550" cy="355" r="104" fill="none" stroke="'+(star?'#355e53':'#e0e9d5')+'"/>'+svgText('马克思主义',550,346,23,star?'#e1efc6':'#426746')+svgText('基本原理',550,380,23,star?'#e1efc6':'#426746');
    D.modules.forEach((m,i)=>{
      const p=positions[i],count=D.nodes.filter(n=>n.module===m.id).length;
      const shape=star?'<circle class="node-shape" r="49" fill="url(#planet-'+esc(m.id)+')" stroke="'+m.color+'"/><ellipse rx="72" ry="18" stroke="'+m.color+'" fill="none" opacity=".45" transform="rotate(-22)"/>':'<rect class="node-shape" x="-112" y="-42" width="224" height="84" rx="16" fill="#fff" stroke="#dae5d0"/>';
      const text=star?svgText(m.title,0,81,20,'#dae8d4')+svgText(count+' 个知识点',0,103,12,'#87a994'):svgText(m.title,0,-3,20,'#426143')+svgText(count+' 个知识点  ·  进入探索 ↗',0,24,12,'#94a186');
      s+='<g class="graph-node" data-module="'+esc(m.id)+'" role="button" tabindex="0" aria-label="进入'+esc(m.title)+'，'+count+'个知识点" transform="translate('+p.x+','+p.y+')">'+shape+(star?svgText(String(i+1).padStart(2,'0'),0,9,27,'#e8ecc4'):'<circle cx="-89" cy="-27" r="3" fill="'+m.color+'"/>')+text+'</g>';
    });return s;
  }
  function moduleGraph(){
    const visible=D.nodes.filter(n=>n.module===state.module),pos=new Map(),star=state.view==='star';
    visible.forEach((n,i)=>{
      if(star){const inner=Math.min(8,visible.length),outer=visible.length-inner,ring=i<inner?0:1,k=ring?i-inner:i,count=ring?outer:inner,angle=-Math.PI/2+2*Math.PI*k/count;pos.set(n.id,{x:550+Math.cos(angle)*(ring?450:245),y:345+Math.sin(angle)*(ring?252:142)});}
      else {const rows=Math.ceil(visible.length/4),spacing=Math.min(115,500/Math.max(1,rows-1));pos.set(n.id,{x:145+(i%4)*270,y:152+Math.floor(i/4)*spacing});}
    });
    const nearby=state.selected?D.relations.filter(r=>(r.from===state.selected||r.to===state.selected)&&(state.relationKind==='all'||r.kind===state.relationKind)):[];
    const externals=state.cross?[...new Set(nearby.flatMap(r=>[r.from,r.to]).filter(id=>!pos.has(id)))].map(id=>nodes.get(id)).filter(Boolean).slice(0,4):[];
    externals.forEach((n,i)=>pos.set(n.id,{x:175+i*250,y:700}));
    let s=svgText(star?'✧ '+mods.get(state.module).title:mods.get(state.module).title,550,star?346:63,star?20:24,star?'#719989':'#6c8c5d');
    if(!state.selected)s+=svgText('选择一个节点，展开理论联系',550,star?372:89,12,star?'#759187':'#a1af93');
    const bends=new Map();
    for(const r of nearby){
      const a=pos.get(r.from),b=pos.get(r.to);if(!a||!b)continue;
      const cross=nodes.get(r.from).module!==nodes.get(r.to).module;
      const pair=r.from+'>'+r.to,index=bends.get(pair)||0;bends.set(pair,index+1);
      const g=C.graphEdge(a,b,star,40+index*40);
      const path='M '+g.start.x+' '+g.start.y+' Q '+g.control.x+' '+g.control.y+' '+g.end.x+' '+g.end.y;
      const color=star?'#709983':'#97b287';
      s+='<g class="graph-edge" data-relation="'+esc(r.id)+'" role="button" tabindex="0" aria-label="'+esc(nodes.get(r.from).title+' '+r.label+' '+nodes.get(r.to).title)+'"><path class="hit-line" d="'+path+'"/><path class="edge-line" d="'+path+'" fill="none" stroke="'+color+'" stroke-width="1.5" '+(cross?'stroke-dasharray="5 6"':'')+' marker-end="url(#arrow)"/>'+svgText(r.label,g.label.x,g.label.y,11,star?'#b3c9a8':'#6c8c5e')+'</g>';
    }
    [...visible,...externals].forEach(n=>s+=nodeMarkup(n,pos.get(n.id),n.module!==state.module));
    return s;
  }
  function renderGraph(){
    const star=state.view==='star';
    let defs='<defs><filter id="soft-shadow"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#426b37" flood-opacity=".13"/></filter><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="'+(star?'#7aa183':'#97b287')+'"/></marker>';
    D.modules.forEach(m=>defs+='<radialGradient id="planet-'+esc(m.id)+'" cx="32%" cy="26%" r="85%"><stop offset="0" stop-color="'+esc(m.color)+'"/><stop offset=".48" stop-color="'+esc(m.color)+'" stop-opacity=".7"/><stop offset="1" stop-color="#18373d"/></radialGradient>');defs+='</defs>';
    let stars='';if(star)for(let i=0;i<100;i++)stars+='<circle cx="'+((i*137+21)%1100)+'" cy="'+((i*89+57)%740)+'" r="'+(i%7===0?1.6:.7)+'" fill="#aac7ad" opacity="'+(i%3===0?.5:.2)+'"/>';
    $('graph').innerHTML=defs+stars+(state.module==='all'?overview():moduleGraph());
    renderList();applyZoom();
  }
  function renderList(){
    const list=state.module==='all'?D.nodes:D.nodes.filter(n=>n.module===state.module);
    $('node-list').hidden=!state.list;
    $('list-toggle').setAttribute('aria-expanded',state.list);
    $('node-list').innerHTML='<h3>知识点列表 · '+list.length+'</h3>'+list.map(n=>'<button data-node="'+esc(n.id)+'">'+esc(n.title)+'<small>'+esc(masteryLabel[entry(n.id).mastery])+'</small></button>').join('');
  }
  function applyZoom(){const w=1100/state.zoom,h=740/state.zoom;$('graph').setAttribute('viewBox',[(1100-w)/2+state.panX,(740-h)/2+state.panY,w,h].join(' '));$('zoom-value').textContent=Math.round(state.zoom*100)+'%';}
  function resetView(){state.zoom=1;state.panX=0;state.panY=0;applyZoom();}
  function setModule(id){if(id!=='all'&&!mods.has(id))return;state.module=id;state.selected=null;state.detailTab='understand';resetView();renderAll();}
  function selectNode(id){
    const n=nodes.get(id);if(!n)return;
    if(state.module!==n.module){state.module=n.module;resetView();}
    state.selected=id;state.detailTab='understand';touch(id);renderAll();$('detail-panel').classList.add('open');
    if(window.innerWidth<700)state.list=false;renderList();
  }
  function renderDetail(){
    const n=nodes.get(state.selected);if(!n){$('detail-panel').innerHTML=emptyDetail;$('detail-panel').classList.remove('open');return;}
    const m=mods.get(n.module),e=entry(n.id);
    let body='';
    if(state.detailTab==='understand')body='<section class="detail-section"><h3>原理解释</h3><p>'+esc(n.detail)+'</p></section><section class="detail-section"><h3>方法论</h3><p>'+esc(n.method)+'</p></section><section class="detail-section"><h3>放进生活里</h3><p>'+esc(n.example)+'</p></section><div class="trap-card"><small>容易误判的地方</small><p>'+esc(n.trap)+'</p></div>';
    else if(state.detailTab==='relations'){
      const relations=D.relations.filter(r=>r.from===n.id||r.to===n.id);
      body='<p class="studio-intro">点击一条联系，查看解释与成立条件。</p>'+relations.map(r=>'<button class="node-relation" data-relation="'+esc(r.id)+'">'+esc(nodes.get(r.from).title)+' <span class="muted">'+esc(r.label)+'</span> '+esc(nodes.get(r.to).title)+'<small>'+esc(r.kind)+' · '+esc(nodes.get(r.from).module===nodes.get(r.to).module?'本领域':'跨领域')+'</small></button>').join('');
    }else body='<p class="studio-intro">下列来源用于内容整理与核对，页号按原文件标注。</p>'+n.sources.map((s,i)=>'<div class="source-card"><strong>'+esc(s.label)+'</strong><p>'+esc(s.locator)+'</p><span class="source-path">'+esc(s.file)+'</span><button class="text-button" data-source="'+i+'">复制来源位置 ↗</button></div>').join('');
    $('detail-panel').innerHTML='<div class="detail-top"><span class="detail-badge">'+esc(m.title)+'</span><button class="icon-btn detail-close" data-close-detail aria-label="关闭知识详情">×</button></div><div class="detail-kicker">CONCEPT / '+esc(String(D.nodes.indexOf(n)+1).padStart(3,'0'))+'</div><h2>'+esc(n.title)+'</h2><p class="detail-summary">'+esc(n.summary)+'</p><div class="mastery-picker" aria-label="自评掌握程度">'+C.masteryStates.map(v=>'<button data-mastery="'+v+'" class="'+(e.mastery===v?'active':'')+'" aria-pressed="'+(e.mastery===v)+'">'+esc(masteryLabel[v])+'</button>').join('')+'</div><div class="detail-stats"><span>✓ 已浏览</span><span>练习 '+e.correct+' / '+e.attempts+'</span></div><div class="detail-tabs" role="group" aria-label="知识详情内容">'+[['understand','理解'],['relations','联系'],['sources','来源']].map(([id,label])=>'<button data-detail-tab="'+id+'" class="'+(state.detailTab===id?'active':'')+'" aria-pressed="'+(state.detailTab===id)+'">'+label+'</button>').join('')+'</div>'+body+'<div class="detail-actions"><button class="btn subtle" data-tool="recall">◈ 回忆原理</button><button class="btn primary" data-tool="quiz">做一道练习 ↗</button></div>';
  }
  function renderAll(){renderNav();renderHeading();renderGraph();renderDetail();renderProgress();}
  function openDialog(title,eyebrow='LEARNING STUDIO'){const dialog=$('learning-dialog');$('dialog-title').textContent=title;$('dialog-eyebrow').textContent=eyebrow;if(!dialog.open)dialog.showModal();}
  function relatedPills(ids){return '<div class="related-pills">'+[...new Set(ids)].filter(id=>nodes.has(id)).map(id=>'<button data-jump="'+esc(id)+'">'+esc(nodes.get(id).title)+' ↗</button>').join('')+'</div>';}
  function showRelation(id){
    const r=D.relations.find(r=>r.id===id);if(!r)return;openDialog('让联系变得清晰','RELATION / '+r.kind);
    $('dialog-content').innerHTML='<div class="question-text">'+esc(nodes.get(r.from).title)+' <span class="muted">'+esc(r.label)+'</span> '+esc(nodes.get(r.to).title)+'</div><section class="detail-section"><h3>为什么这样联系</h3><p>'+esc(r.explanation)+'</p></section><section class="detail-section"><h3>条件与边界</h3><p>'+esc(r.condition)+'</p></section><div class="trap-card"><small>不要这样理解</small><p>'+esc(r.trap)+'</p></div>'+relatedPills([r.from,r.to])+'<div class="quiz-actions"><button class="btn subtle" data-tool="recall">回忆这类关系</button><button class="btn primary" data-tool="quiz">进入练习 ↗</button></div>';
  }
  function showCompare(id){
    const preferred=D.comparisons.find(c=>c.left===state.selected||c.right===state.selected);
    const item=D.comparisons.find(c=>c.id===id)||preferred||D.comparisons[0];openDialog('概念辨析台','COMPARE / 看清概念的边界');
    $('dialog-content').innerHTML='<p class="studio-intro">把相似概念放在一起，比较它们各自回答什么问题。</p><div class="studio-toolbar"><label for="compare-select">辨析主题</label><select id="compare-select">'+D.comparisons.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===item.id?'selected':'')+'>'+esc(c.title)+'</option>').join('')+'</select></div><table class="compare-table"><thead><tr><th>比较维度</th><th>'+esc(item.leftLabel||nodes.get(item.left)?.title||item.left)+'</th><th>'+esc(item.rightLabel||nodes.get(item.right)?.title||item.right)+'</th></tr></thead><tbody>'+item.rows.map(r=>'<tr><td>'+esc(r.label)+'</td><td>'+esc(r.left)+'</td><td>'+esc(r.right)+'</td></tr>').join('')+'</tbody></table>'+relatedPills([item.left,item.right])+'<div class="quiz-actions"><small>先合上解释，试着说出最关键的区别。</small><button class="btn primary" data-compare-quiz="'+esc(item.id)+'">检验理解 ↗</button></div>';
    $('compare-select').onchange=e=>showCompare(e.target.value);
  }
  let labType='value',labMode='social',labFactor=1,labTemp=80,labTech='digital',labOrg='rigid',labPrediction='';
  function showLab(type){
    labType=type||labType;openDialog('关系实验室','LAB / 先预测，再观察');
    const titles={value:'价值量与劳动生产率',phase:'量变与质变',production:'生产力与生产关系'};
    const predictions={value:['单位价值量降低','单位价值量不变','单位价值量提高'],phase:['发生质变','性质保持不变'],production:['促进生产力发展','阻碍生产力发展']};
    $('dialog-content').innerHTML='<div class="lab-tabs">'+Object.entries(titles).map(([id,title])=>'<button data-lab="'+id+'" class="'+(labType===id?'active':'')+'">'+title+'</button>').join('')+'</div><div class="prediction"><label for="lab-predict">先做一个预测：</label><select id="lab-predict"><option value="">请选择你的判断</option>'+predictions[labType].map(p=>'<option '+(labPrediction===p?'selected':'')+'>'+p+'</option>').join('')+'</select><span id="prediction-feedback"></span></div><div id="lab-body"></div>';
    $('lab-predict').onchange=e=>{labPrediction=e.target.value;updateLab();};updateLab();
  }
  function updateLab(live=false){
    let html='',correctPrediction='';
    if(labType==='value'){
      const r=C.valueModel(labMode,labFactor);correctPrediction=labMode==='social'?(labFactor>1?'单位价值量降低':labFactor<1?'单位价值量提高':'单位价值量不变'):'单位价值量不变';
      html='<div class="lab-stage"><div class="lab-visual"><h3>同样的劳动时间</h3><div class="lab-metrics"><div><strong>'+r.unit.toFixed(1)+'</strong><small>单位商品价值量</small></div><div><strong>'+r.quantity.toFixed(1)+'×</strong><small>商品数量</small></div><div><strong>'+r.total.toFixed(1)+'</strong><small>价值总量</small></div></div><div class="unit-bar" style="width:'+Math.min(260,13*r.unit)+'px"></div></div><div class="lab-controls"><label for="lab-mode">改变哪种生产率？</label><select id="lab-mode"><option value="social" '+(labMode==='social'?'selected':'')+'>社会劳动生产率</option><option value="individual" '+(labMode==='individual'?'selected':'')+'>个别劳动生产率</option></select><label for="lab-factor">相对基准的倍数 <output>'+labFactor.toFixed(1)+'×</output></label><input id="lab-factor" type="range" min="0.5" max="3" step="0.1" value="'+labFactor+'"><p>'+(labMode==='social'?'假设劳动者随社会生产率同比变化。社会生产率提高时单位价值量下降、数量增加；降低时方向相反，价值总量保持不变。':'社会必要劳动时间保持不变。个别生产率提高时数量与价值总量增加，降低时方向相反；单位价值量保持不变。')+'</p></div></div><div class="lab-boundary">基准单位价值量为10个示意单位；劳动时间、强度、复杂程度不变，商品均实现价值。本图只表达比例关系，不预测市场价格。</div>'+relatedPills(['value','labor-power']);
    }else if(labType==='phase'){
      const r=C.phaseModel(labTemp);correctPrediction=(labTemp>=100||labTemp<=0)?'发生质变':'性质保持不变';
      html='<div class="lab-stage"><div class="lab-visual"><div class="phase-symbol '+(labTemp>100?'gas':labTemp<0?'solid':'')+'">'+(labTemp>100?'气':labTemp<0?'冰':'水')+'</div><h3>'+r.phase+'</h3></div><div class="lab-controls"><label for="lab-temp">从液态水（80°C）出发，改变平衡温度</label><output>'+labTemp+' °C</output><input id="lab-temp" type="range" min="-10" max="120" step="1" value="'+labTemp+'"><p>0°C以下为固态区，0°C与100°C为相变边界，0–100°C之间保持液态。在相变过程中，吸收或释放热量可以伴随温度不变。</p></div></div><div class="lab-boundary">'+esc(r.boundary)+'这里比较的是不同温度条件的平衡状态，不模拟升温所需时间。</div>'+relatedPills(['quantity-quality']);
    }else{
      const r=C.productionModel(labTech,labOrg);correctPrediction=labOrg==='adaptive'?'促进生产力发展':'阻碍生产力发展';
      html='<div class="lab-stage"><div class="lab-visual"><span style="font-size:42px;color:#7c9c70">'+(labTech==='manual'?'⚒':labTech==='industrial'?'⚙':'⌘')+'</span><h3>'+esc(r.result)+'</h3><p class="lab-explanation">'+esc(r.explanation)+'</p></div><div class="lab-controls"><label for="lab-tech">生产力情境</label><select id="lab-tech">'+[['manual','手工生产'],['industrial','机械化生产'],['digital','数字化协作']].map(([id,label])=>'<option value="'+id+'" '+(labTech===id?'selected':'')+'>'+label+'</option>').join('')+'</select><label for="lab-org">组织关系是否适应生产力状况？</label><select id="lab-org"><option value="rigid" '+(labOrg==='rigid'?'selected':'')+'>僵化，不适应当前状况</option><option value="adaptive" '+(labOrg==='adaptive'?'selected':'')+'>调整，适应当前状况</option></select><p>改变情境后，比较促进或阻碍作用。生产力决定生产关系，生产关系又反作用于生产力。</p></div></div><div class="lab-boundary">'+esc(r.boundary)+'</div>'+relatedPills(['productive-forces']);
    }
    if(live){
      const temp=document.createElement('div');temp.innerHTML=html;
      $('lab-body').querySelector('.lab-visual').innerHTML=temp.querySelector('.lab-visual').innerHTML;
      const output=$('lab-body').querySelector('output');if(output)output.textContent=temp.querySelector('output').textContent;
    }else $('lab-body').innerHTML=html+'<div class="quiz-actions"><small>观察后，用自己的话解释原因。</small><button class="btn primary" data-lab-quiz="'+labType+'">做一道相关练习 ↗</button></div>';
    $('prediction-feedback').textContent=labPrediction?' · '+(labPrediction===correctPrediction?'判断符合当前条件 ✓':'当前条件下应为：'+correctPrediction):'';
    if($('lab-mode'))$('lab-mode').onchange=e=>{labMode=e.target.value;updateLab();};
    if($('lab-factor'))$('lab-factor').oninput=e=>{labFactor=Number(e.target.value);updateLab(true);};
    if($('lab-temp'))$('lab-temp').oninput=e=>{labTemp=Number(e.target.value);updateLab(true);};
    if($('lab-tech'))$('lab-tech').onchange=e=>{labTech=e.target.value;updateLab();};
    if($('lab-org'))$('lab-org').onchange=e=>{labOrg=e.target.value;updateLab();};
  }
  function questionPool(ids){
    if(ids?.length){const matching=D.exercises.filter(q=>q.nodes.some(id=>ids.includes(id)));if(matching.length)return matching;}
    if(state.module!=='all'){const matching=D.exercises.filter(q=>q.nodes.some(id=>nodes.get(id)?.module===state.module));if(matching.length)return matching;}
    return D.exercises;
  }
  function showQuiz(ids){
    const pool=questionPool(ids||(state.selected?[state.selected]:null));
    quizSession={pool,index:0,choice:null,submitted:false,token:'quiz-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)};renderQuiz();
  }
  function renderQuiz(){
    const s=quizSession,q=s.pool[s.index];openDialog('练习入口','PRACTICE / 从材料回到原理');
    $('dialog-content').innerHTML='<div class="quiz-label">原创单选练习 · '+(s.index+1)+' / '+s.pool.length+' · '+esc(mods.get(nodes.get(q.nodes[0]).module).title)+'</div>'+(q.material?'<div class="question-material">'+esc(q.material)+'</div>':'')+'<h3 class="question-text">'+esc(q.prompt)+'</h3><div class="answer-options">'+q.options.map((option,i)=>'<button class="answer-option '+(s.choice===i?'selected ':'')+(s.submitted&&i===q.answer?'correct ':'')+(s.submitted&&s.choice===i&&i!==q.answer?'wrong':'')+'" data-answer="'+i+'" aria-pressed="'+(s.choice===i)+'" '+(s.submitted?'disabled':'')+'><span>'+String.fromCharCode(65+i)+'</span><span>'+esc(option)+'</span></button>').join('')+'</div>'+(s.submitted?'<div class="feedback '+(s.choice!==q.answer?'wrong':'')+'"><h3>'+(s.choice===q.answer?'理解正确 ✓':'再看清一个边界')+' · 正确答案 '+String.fromCharCode(65+q.answer)+'</h3><p>'+esc(q.explanation)+'</p>'+(s.choice!==q.answer?'<p>复习提示：'+esc(q.reason)+'</p>':'')+'</div>'+relatedPills(q.nodes):'')+'<div class="quiz-actions"><small>原创练习，用于理解检测；不冒充历年真题。</small><button class="btn primary" id="quiz-submit" '+(!s.submitted&&s.choice===null?'disabled':'')+'>'+(s.submitted?(s.index+1<s.pool.length?'下一题 →':'再练一轮 ↻'):'确认答案 →')+'</button></div>';
    $('quiz-submit').onclick=()=>{
      if(s.submitted){s.index=(s.index+1)%s.pool.length;s.choice=null;s.submitted=false;s.token='quiz-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);renderQuiz();return;}
      if(s.choice===null)return;s.submitted=true;
      progress=C.recordAnswer(progress,q.nodes,{id:s.token,exercise:q.id,correct:s.choice===q.answer,reason:q.reason,at:Date.now()});save();renderQuiz();renderDetail();
    };
  }
  function newRecall(type='concept',id){
    const pool=state.module==='all'?D.nodes:D.nodes.filter(n=>n.module===state.module);
    const node=nodes.get(id||state.selected)||pool[Math.floor(Math.random()*pool.length)];
    const relations=D.relations.filter(r=>r.from===node.id||r.to===node.id);
    const relation=relations.find(r=>!r.label.includes('同章辨认'))||relations[0]||D.relations[0];
    recallSession={type,node,relation,revealed:false,value:'',framework:C.pickFramework(pool,node.id),choices:{},token:'recall-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),rated:false};renderRecall();
  }
  function renderRecall(){
    const s=recallSession;openDialog('主动回忆','RECALL / 先想起，再核对');
    let body='';
    if(s.type==='concept')body='<p class="studio-intro">根据解释回忆概念；输入可选，揭晓后自行核对表达。</p><h3 class="question-text">'+esc(C.recallClue(s.node))+'</h3><input id="recall-value" class="recall-input" aria-label="回忆概念名称" placeholder="这个概念是什么？" maxlength="120" value="'+esc(s.value)+'" '+(s.revealed?'disabled':'')+'>'+(s.revealed?'<div class="recall-reveal"><h3>'+esc(s.node.title)+'</h3><p>'+esc(s.node.detail)+'</p></div>':'');
    else if(s.type==='relation')body='<p class="studio-intro">尝试说出联系的方向、含义和成立条件。</p><h3 class="question-text">'+esc(nodes.get(s.relation.from).title)+' <span class="muted">—— ？ ——</span> '+esc(nodes.get(s.relation.to).title)+'</h3><input id="recall-value" class="recall-input" aria-label="回忆关系及条件" placeholder="它们通过什么关系相连？" maxlength="180" value="'+esc(s.value)+'" '+(s.revealed?'disabled':'')+'>'+(s.revealed?'<div class="recall-reveal"><h3>'+esc(s.relation.label)+'</h3><p>'+esc(s.relation.explanation)+'<br><br>条件：'+esc(s.relation.condition)+'</p></div>':'');
    else {
      const shuffled=[...s.framework].sort((a,b)=>a.title.localeCompare(b.title,'zh'));
      body='<p class="studio-intro">将三个概念放回解释所对应的位置，恢复一小组知识框架。</p><div class="framework-cards">'+s.framework.map((n,i)=>'<div><p>'+esc(C.recallClue(n))+'</p><select data-framework="'+i+'" aria-label="第'+(i+1)+'个概念" '+(s.revealed?'disabled':'')+'><option value="">选择概念</option>'+shuffled.map(v=>'<option value="'+esc(v.id)+'" '+(s.choices[i]===v.id?'selected':'')+'>'+esc(v.title)+'</option>').join('')+'</select>'+(s.revealed?'<small>'+(s.choices[i]===n.id?'✓ 正确':'应为：'+esc(n.title))+'</small>':'')+'</div>').join('')+'</div>';
    }
    $('dialog-content').innerHTML='<div class="recall-tabs">'+[['concept','概念回忆'],['relation','关系回忆'],['framework','框架回忆']].map(([id,label])=>'<button data-recall-type="'+id+'" class="'+(s.type===id?'active':'')+'">'+label+'</button>').join('')+'</div>'+body+(s.revealed?relatedPills(s.type==='relation'?[s.relation.from,s.relation.to]:s.type==='framework'?s.framework.map(n=>n.id):[s.node.id]):'')+'<div class="quiz-actions">'+(s.revealed?(s.rated?'<small>已记录本次回忆结果</small>':'<span><button class="btn subtle" data-recall-rate="false">还没想清楚</button> <button class="btn primary" data-recall-rate="true">我能回忆 ✓</button></span>'):'<small>概念与关系回忆由你自评，不自动判定自由表达。</small>')+'<button class="btn '+(s.revealed?'subtle':'primary')+'" id="recall-reveal">'+(s.revealed?'换一组 ↻':'揭晓并核对 →')+'</button></div>';
    if($('recall-value'))$('recall-value').oninput=e=>s.value=e.target.value;
    document.querySelectorAll('[data-framework]').forEach(el=>el.onchange=e=>s.choices[el.dataset.framework]=e.target.value);
    $('recall-reveal').onclick=()=>{
      if(s.revealed){const pool=state.module==='all'?D.nodes:D.nodes.filter(n=>n.module===state.module);const alternatives=pool.filter(n=>n.id!==s.node.id);newRecall(s.type,(alternatives[Math.floor(Math.random()*alternatives.length)]||s.node).id);return;}
      s.revealed=true;renderRecall();
    };
  }
  function rateRecall(correct){
    const s=recallSession;if(!s||s.rated||!s.revealed)return;
    const ids=s.type==='relation'?[s.relation.from,s.relation.to]:s.type==='framework'?s.framework.map(n=>n.id):[s.node.id];
    if(s.type==='framework')correct=s.framework.every((n,i)=>s.choices[i]===n.id);
    progress=C.recordAnswer(progress,ids,{id:s.token,exercise:'recall-'+s.type,correct,reason:'主动回忆待巩固',at:Date.now()});s.rated=true;save();renderRecall();renderDetail();toast(s.type==='framework'?(correct?'框架恢复正确，已记录':'框架仍有错位，已记录待复习'):'已记录本次回忆自评');
  }
  function showProgress(){
    const entries=Object.values(progress.nodes),visited=entries.filter(n=>n.visited).length,mastered=entries.filter(n=>n.mastery==='mastered').length;
    const attempts=new Map();entries.forEach(n=>Object.entries(n.answers).forEach(([id,a])=>attempts.set(id,a)));
    const correct=[...attempts.values()].filter(a=>a.correct).length,review=D.nodes.filter(n=>entry(n.id).mastery==='fuzzy'||entry(n.id).lastReason);
    openDialog('我的复习','PROGRESS / 让薄弱处变得清晰');
    $('dialog-content').innerHTML='<div class="stat-grid"><div><strong>'+visited+'</strong><small>已浏览知识点</small></div><div><strong>'+mastered+'</strong><small>自评已掌握</small></div><div><strong>'+attempts.size+'</strong><small>练习与回忆次数</small></div><div><strong>'+correct+'</strong><small>练习正确／回忆通过</small></div></div><p class="studio-intro">以下节点来自“有些模糊”的自评或最近一次练习／回忆错误。多个知识点共享一道题时，总次数只计一次。</p><div class="review-list">'+(review.length?review.map(n=>'<button data-jump="'+esc(n.id)+'"><span>'+esc(n.title)+'</span><small>'+esc(entry(n.id).lastReason||'自评模糊')+' ↗</small></button>').join(''):'<p class="empty-message">还没有待复习记录。探索知识点后，可以标记掌握程度或做一道练习。</p>')+'</div><div class="quiz-actions"><button class="btn subtle" data-export>导出进度 ↗</button><button class="btn primary" data-import>导入并合并 ↙</button></div><p class="studio-intro" style="margin-top:15px">本地记录属于当前浏览器和页面来源。切换浏览器或使用单文件版时，可通过导出／导入迁移。</p>';
  }
  function openTool(tool){
    if(tool==='compare')showCompare();else if(tool==='lab')showLab();else if(tool==='recall')newRecall();else if(tool==='quiz')showQuiz();
  }
  function exportProgress(){const blob=new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='马原学习进度-'+new Date().toLocaleDateString('sv-SE')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('进度已导出，可在其他浏览器中导入。');}
  async function importProgress(file){
    if(!file)return;if(file.size>5*1024*1024){toast('进度文件过大，请选择5MB以内的JSON文件。');return;}
    try{const incoming=C.validateProgress(JSON.parse(await file.text()),nodeIds);const merged=C.mergeProgress(progress,incoming,nodeIds);progress=merged;save();renderAll();if($('learning-dialog').open)showProgress();toast('进度已合并，原有学习记录已保留。');}
    catch(error){toast('导入失败：'+error.message+'。原进度未被更改。');}
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,[data-node],[data-module],[data-relation]');if(!el)return;
    if(el.hasAttribute('data-module'))setModule(el.dataset.module);
    else if(el.hasAttribute('data-node'))selectNode(el.dataset.node);
    else if(el.hasAttribute('data-relation'))showRelation(el.dataset.relation);
    else if(el.dataset.tool)openTool(el.dataset.tool);
    else if(el.dataset.mastery&&state.selected)setMastery(state.selected,el.dataset.mastery);
    else if(el.dataset.detailTab){state.detailTab=el.dataset.detailTab;renderDetail();}
    else if(el.hasAttribute('data-close-detail'))$('detail-panel').classList.remove('open');
    else if(el.dataset.jump){$('learning-dialog').close();selectNode(el.dataset.jump);}
    else if(el.dataset.lab){labPrediction='';showLab(el.dataset.lab);}
    else if(el.hasAttribute('data-answer')&&quizSession&&!quizSession.submitted){quizSession.choice=Number(el.dataset.answer);renderQuiz();}
    else if(el.dataset.recallType)newRecall(el.dataset.recallType);
    else if(el.hasAttribute('data-recall-rate'))rateRecall(el.dataset.recallRate==='true');
    else if(el.dataset.compareQuiz){const item=D.comparisons.find(c=>c.id===el.dataset.compareQuiz);showQuiz([item.left,item.right]);}
    else if(el.dataset.labQuiz)showQuiz(el.dataset.labQuiz==='value'?['value','labor-power']:el.dataset.labQuiz==='phase'?['quantity-quality']:['productive-forces']);
    else if(el.hasAttribute('data-export'))exportProgress();
    else if(el.hasAttribute('data-import'))$('import-file').click();
    else if(el.hasAttribute('data-source')){const s=nodes.get(state.selected).sources[Number(el.dataset.source)],text=s.file+' · '+s.locator;navigator.clipboard?.writeText(text).then(()=>toast('来源位置已复制。')).catch(()=>toast('请在来源卡中手动复制文件位置。'));if(!navigator.clipboard)toast('请在来源卡中手动复制文件位置。');}
  });
  $('map-view').onclick=()=>{state.view='map';renderHeading();renderGraph();};$('star-view').onclick=()=>{state.view='star';renderHeading();renderGraph();};
  $('cross-toggle').onclick=()=>{state.cross=!state.cross;renderHeading();renderGraph();if(!state.selected&&state.cross)toast('选择一个知识点后，将显示它的跨领域联系。');};
  $('relation-filter').innerHTML='<option value="all">全部关系</option>'+[...new Set(D.relations.map(r=>r.kind))].map(kind=>'<option value="'+esc(kind)+'">'+esc(kind)+'</option>').join('');
  $('relation-filter').onchange=e=>{state.relationKind=e.target.value;renderGraph();};
  $('list-toggle').onclick=()=>{state.list=!state.list;renderList();};
  $('zoom-in').onclick=()=>{state.zoom=Math.min(2.8,state.zoom+.2);applyZoom();};$('zoom-out').onclick=()=>{state.zoom=Math.max(.6,state.zoom-.2);applyZoom();};$('zoom-reset').onclick=resetView;
  $('progress-open').onclick=showProgress;$('export-btn').onclick=exportProgress;$('import-btn').onclick=()=>$('import-file').click();
  $('import-file').onchange=async e=>{await importProgress(e.target.files[0]);e.target.value='';};
  $('dialog-close').onclick=()=>$('learning-dialog').close();$('learning-dialog').addEventListener('click',e=>{if(e.target===$('learning-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  $('search').addEventListener('input',()=>{
    const q=$('search').value.trim();$('search-results').hidden=!q;if(!q)return;
    const results=C.searchNodes(D.nodes,q).slice(0,15);
    $('search-results').innerHTML=results.length?results.map(n=>'<button data-search-node="'+esc(n.id)+'"><strong>'+esc(n.title)+'</strong><small>'+esc(mods.get(n.module).title)+' · '+esc(n.summary.slice(0,38))+'</small></button>').join(''):'<p>没有匹配的知识点，试试其他关键词。</p>';
    $('search-results').querySelectorAll('button').forEach(el=>el.onclick=()=>{selectNode(el.dataset.searchNode);$('search-results').hidden=true;$('search').value='';});
  });
  $('search').addEventListener('keydown',e=>{if(e.key==='Escape')$('search-results').hidden=true;if(e.key==='ArrowDown'){e.preventDefault();$('search-results').querySelector('button')?.focus();}if(e.key==='Enter'&&!$('search-results').hidden)$('search-results').querySelector('button')?.click();});
  document.addEventListener('click',e=>{if(!e.target.closest('.search-box'))$('search-results').hidden=true;});
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus();}
    if(e.key==='Escape'){$('search-results').hidden=true;if(!$('learning-dialog').open)$('detail-panel').classList.remove('open');}
    const t=e.target.closest('.graph-node,.graph-edge');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  });
  let pointer=null;
  $('graph').addEventListener('pointerdown',e=>{if(e.target.closest('.graph-node,.graph-edge'))return;pointer={x:e.clientX,y:e.clientY,panX:state.panX,panY:state.panY};$('graph').setPointerCapture(e.pointerId);});
  $('graph').addEventListener('pointermove',e=>{if(!pointer)return;const r=$('graph').getBoundingClientRect();const scale=Math.max(1100/r.width,740/r.height)/state.zoom;state.panX=pointer.panX-(e.clientX-pointer.x)*scale;state.panY=pointer.panY-(e.clientY-pointer.y)*scale;applyZoom();});
  $('graph').addEventListener('pointerup',()=>pointer=null);$('graph').addEventListener('pointercancel',()=>pointer=null);
  $('graph').addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();state.zoom=Math.max(.6,Math.min(2.8,state.zoom+(e.deltaY<0?.1:-.1)));applyZoom();},{passive:false});
  let reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{const stored=localStorage.getItem(MOTION_KEY);if(stored!==null)reduced=stored==='off';}catch{}
  function applyMotion(){document.body.classList.toggle('reduced-motion',reduced);$('motion-toggle').setAttribute('aria-pressed',reduced);$('motion-toggle').setAttribute('aria-label',reduced?'开启动态效果':'关闭动态效果');$('motion-toggle').title=reduced?'开启动态效果':'关闭动态效果';}
  $('motion-toggle').onclick=()=>{reduced=!reduced;applyMotion();try{localStorage.setItem(MOTION_KEY,reduced?'off':'on');}catch{}toast(reduced?'动态效果已关闭。':'动态效果已开启。');};
  document.querySelector('.brand').onclick=e=>{e.preventDefault();setModule('all');};
  $('data-count').textContent=D.modules.length+' 个领域 · '+D.nodes.length+' 个知识点 · '+D.comparisons.length+' 组辨析';
  renderAll();applyMotion();if(storageWarning)toast('原进度未能读取。请导入备份，或在当前页面重新记录。');
})();
