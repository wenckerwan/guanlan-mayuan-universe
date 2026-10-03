const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../assets/data.js');
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
test('knowledge dataset contract', () => {
 const mids=['intro','material','dialectic','cognition','history','economy','socialism'];
 assert.deepEqual(data.modules.map(x=>x.id),mids);
 assert.ok(data.nodes.length>=80&&data.nodes.length<=120);
 const ids=new Set(data.nodes.map(x=>x.id)); assert.equal(ids.size,data.nodes.length);
 for(const id of ['practice','truth','contradiction','social-being','productive-forces','labor-power','value','quantity-quality']) assert.ok(ids.has(id));
 for(const n of data.nodes){assert.ok(mids.includes(n.module));for(const k of ['title','summary','detail','method','trap','example'])assert.ok(nonempty(n[k]),n.id+':'+k);assert.ok(n.sources.length);for(const s of n.sources)for(const k of ['file','label','locator'])assert.ok(nonempty(s[k]));}
 assert.ok(data.relations.length>=80);assert.ok(data.relations.every(r=>!r.label.includes('同章辨认')&&r.kind!=='亲缘'));const linked=new Set();const rids=new Set();
 for(const r of data.relations){assert.ok(!rids.has(r.id));rids.add(r.id);assert.ok(ids.has(r.from)&&ids.has(r.to));linked.add(r.from);linked.add(r.to);for(const k of ['label','kind','explanation','condition','trap'])assert.ok(nonempty(r[k]),r.id+':'+k);}
 for(const id of ids)assert.ok(linked.has(id),'unlinked '+id);
 assert.ok(data.comparisons.length>=15&&data.comparisons.length<=20);const cids=new Set();
 for(const c of data.comparisons){assert.ok(!cids.has(c.id));cids.add(c.id);assert.ok(ids.has(c.left)&&ids.has(c.right));assert.ok(nonempty(c.leftLabel)&&nonempty(c.rightLabel));assert.ok(c.rows.length>=2);for(const row of c.rows)for(const k of ['label','left','right'])assert.ok(nonempty(row[k]));}
 assert.ok(data.exercises.length>=28);const covered=new Set();const eids=new Set();
 for(const e of data.exercises){assert.ok(!eids.has(e.id));eids.add(e.id);assert.equal(e.type,'single');assert.equal(e.kind,'原创');assert.ok(e.nodes.length>=2);for(const id of e.nodes){assert.ok(ids.has(id));covered.add(data.nodes.find(n=>n.id===id).module);}assert.ok(e.options.length>=3);assert.ok(e.options.every(nonempty));assert.ok(Number.isInteger(e.answer)&&e.answer>=0&&e.answer<e.options.length);for(const k of ['prompt','explanation','reason'])assert.ok(nonempty(e[k]));}
 assert.deepEqual([...covered].sort(),[...mids].sort());
});
test('browser and CommonJS receive the same object when both are present',()=>{
 const fs=require('node:fs'), vm=require('node:vm');
 const sandbox={window:{},module:{exports:{}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'),'utf8'),sandbox);
 assert.strictEqual(sandbox.window.MAYUAN_DATA,sandbox.module.exports);
 assert.equal(sandbox.window.MAYUAN_DATA.nodes.length,data.nodes.length);
 const browser={window:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'),'utf8'),browser);
 assert.equal(browser.window.MAYUAN_DATA.exercises.length,data.exercises.length);
});
test('labor and labor power have a directly reachable comparison and exercise',()=>{
 assert.ok(data.nodes.some(n=>n.id==='labor'&&n.module==='economy'));
 assert.ok(data.comparisons.some(c=>c.left==='labor'&&c.right==='labor-power'));
 assert.ok(data.relations.some(r=>r.from==='labor'&&r.to==='labor-power'&&r.kind==='辨析'));
 assert.ok(data.exercises.some(e=>e.nodes.includes('labor')&&e.nodes.includes('labor-power')));
});
test('semantic edges distinguish directions and practice functions',()=>{
 const edge=(from,to,label)=>data.relations.some(r=>r.from===from&&r.to===to&&r.label===label);
 for(const [a,b] of [['productive-forces','production-relations'],['economic-base','superstructure'],['social-being','social-consciousness']]){
  assert.ok(edge(a,b,'决定'));assert.ok(edge(b,a,'反作用'));
 }
 assert.ok(data.relations.filter(r=>r.from==='practice'||r.to==='practice').length>=5);
 assert.ok(edge('practice','practice-knowledge','来源'));
 assert.ok(edge('practice','reflection','动力'));
 assert.ok(edge('practice','truth','检验'));
 assert.ok(edge('second-leap','practice','目的'));
 assert.equal(new Set(data.relations.map(r=>r.explanation)).size,data.relations.length);
 assert.equal(new Set(data.relations.map(r=>r.condition)).size,data.relations.length);
 const c=data.comparisons.find(c=>c.id==='c9');
 assert.equal(c.leftLabel,'客观假象');assert.equal(c.rightLabel,'主观错觉');
});
