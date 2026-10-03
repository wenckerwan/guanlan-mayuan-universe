const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/core.js');
const nodes = [{id:'practice',title:'实践',summary:'认识的基础',keywords:['检验']},{id:'truth',title:'真理',summary:'实践是检验真理的唯一标准'}];
test('搜索优先标题且支持多个词和空查询', () => {
  assert.equal(C.searchNodes(nodes,'实践')[0].id,'practice');
  assert.deepEqual(C.searchNodes(nodes,'实践 唯一').map(n=>n.id),['truth']);
  assert.equal(C.searchNodes(nodes,'不存在').length,0);
  assert.equal(C.searchNodes(nodes,'').length,2);
});
test('进度导入拒绝未知节点、非法掌握状态、污染键，不改动原记录', () => {
  const p=C.emptyProgress();
  assert.deepEqual(C.validateProgress(p,['practice']),p);
  for (const raw of [{...p,version:99},{...p,nodes:{unknown:{}}},{...p,nodes:{practice:{mastery:'高手'}}},JSON.parse('{"version":1,"updatedAt":0,"nodes":{"__proto__":{}}}')]) {
    assert.throws(()=>C.validateProgress(raw,['practice']));
  }
});
test('导入拒绝伪造数值与不完整答案，确保导入可以往返',()=>{
  const p=C.recordAnswer(C.emptyProgress(),['practice'],{id:'attempt-1',exercise:'q1',correct:true,reason:'概念混淆',at:1});
  assert.deepEqual(C.validateProgress(JSON.parse(JSON.stringify(p)),['practice']),p);
  const bad=JSON.parse(JSON.stringify(p));bad.nodes.practice.attempts=100;
  assert.throws(()=>C.validateProgress(bad,['practice']));
});
test('练习重试重复提交不会增加计数，错误原因与自评掌握分开',()=>{
  const a={id:'a',exercise:'q1',correct:false,reason:'条件遗漏',at:1};
  const p=C.recordAnswer(C.emptyProgress(),['practice'],a);
  const p2=C.recordAnswer(p,['practice'],a);
  assert.equal(p2.nodes.practice.attempts,1);
  assert.equal(p2.nodes.practice.correct,0);
  assert.equal(p2.nodes.practice.mastery,'unlearned');
  assert.equal(p2.nodes.practice.lastReason,'条件遗漏');
  assert.deepEqual(p.nodes.practice,p2.nodes.practice);
});
test('合并保留两边练习并采用较新的自评',()=>{
  let a=C.recordAnswer(C.emptyProgress(),['practice'],{id:'a',exercise:'q1',correct:true,reason:'',at:2});
  let b=C.recordAnswer(C.emptyProgress(),['practice'],{id:'b',exercise:'q2',correct:false,reason:'关系倒置',at:3});
  b.nodes.practice.mastery='fuzzy';b.nodes.practice.updatedAt=4;b.nodes.practice.masteryUpdatedAt=4;
  const p=C.mergeProgress(a,b,['practice']);
  assert.equal(p.nodes.practice.attempts,2);assert.equal(p.nodes.practice.correct,1);
  assert.equal(p.nodes.practice.mastery,'fuzzy');
});
test('社会生产率变化单位价值反比，个别生产率不改变单位价值',()=>{
  assert.deepEqual(C.valueModel('social',2),{unit:5,quantity:2,total:10});
  assert.deepEqual(C.valueModel('individual',2),{unit:10,quantity:2,total:20});
  assert.throws(()=>C.valueModel('social',0));
});
test('水的相变示意明确边界，不把阈值普遍化',()=>{
  assert.equal(C.phaseModel(99).phase,'液态');
  assert.equal(C.phaseModel(100).phase,'液态与气态共存');
  assert.equal(C.phaseModel(110).phase,'气态');
  assert.match(C.phaseModel(100).boundary,/标准大气压/);
});
test('生产关系实验返回定性判断，不伪造进步百分比',()=>{
  assert.match(C.productionModel('digital','rigid').result,/调整/);
  assert.match(C.productionModel('digital','adaptive').result,/促进/);
  assert.throws(()=>C.productionModel('magic','adaptive'));
});
test('较新的答题记录不得覆盖另一份进度中的掌握自评',()=>{
  const a=C.emptyProgress();a.nodes.practice={...C.emptyNode(),mastery:'mastered',masteryUpdatedAt:100,updatedAt:100};
  const b=C.recordAnswer(C.emptyProgress(),['practice'],{id:'later',exercise:'q1',correct:true,reason:'',at:200});
  const merged=C.mergeProgress(a,b,['practice']);
  assert.equal(merged.nodes.practice.mastery,'mastered');
  assert.equal(merged.nodes.practice.masteryUpdatedAt,100);
});
test('回忆提示隐藏概念名，框架随目标节点变化',()=>{
  assert.ok(!C.recallClue({title:'实践',summary:'实践是人类改造世界的物质活动。'}).includes('实践'));
  const list=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];
  assert.deepEqual(C.pickFramework(list,'a').map(n=>n.id),['a','b','c']);
  assert.deepEqual(C.pickFramework(list,'b').map(n=>n.id),['b','c','d']);
});
test('旧v1进度保留自评但不把答题时间当成自评时间',()=>{
  const p=C.recordAnswer(C.emptyProgress(),['practice'],{id:'old',exercise:'q1',correct:true,reason:'',at:200});
  p.nodes.practice.mastery='fuzzy';delete p.nodes.practice.masteryUpdatedAt;
  const migrated=C.validateProgress(p,['practice']);
  assert.equal(migrated.nodes.practice.mastery,'fuzzy');
  assert.equal(migrated.nodes.practice.masteryUpdatedAt,0);
});
test('关系箭头停在节点边界之外，双向关系使用不同曲线',()=>{
  const a={x:100,y:100},b={x:500,y:100};
  const edge=C.graphEdge(a,b,false),reverse=C.graphEdge(b,a,false);
  assert.ok(edge.start.x>200);assert.ok(edge.end.x<400);
  assert.notEqual(edge.control.y,reverse.control.y);
  const star=C.graphEdge(a,b,true);
  assert.ok(Math.hypot(star.end.x-b.x,star.end.y-b.y)>=35);
});
