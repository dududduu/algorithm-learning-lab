// Independent content and execution checks. Run: node verify.cjs
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const data=fs.readFileSync(__dirname+'/data.js','utf8');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const context=vm.createContext({});
vm.runInContext(data+'\nthis.lessons=LESSONS;this.exercises=EXERCISES;',context);
assert.equal(context.lessons.length,9);
for(const [i,l] of context.lessons.entries()){
 assert.equal(l.code,`9정03-0${i+1}`);
 assert.equal(l.rubric.length,5);
 assert.equal(l.tasks.length,3);
 assert.ok(l.answer>=0&&l.answer<l.options.length);
 assert.ok(l.concepts.length>=3);
}
let testCount=0;
for(const e of context.exercises){
 const c=vm.createContext({console:{log(){}}});
 vm.runInContext(e.solution,c,{timeout:1000});
 for(const t of e.tests){c.input=JSON.parse(JSON.stringify(t.input));const actual=vm.runInContext(`${e.fn}(input)`,c,{timeout:1000});assert.equal(JSON.stringify(actual),JSON.stringify(t.expected),e.name);testCount++;}
}
// The same generated Worker source used by the application must parse and execute.
const elements=new Map();
const element=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',value:'',disabled:false,classList:{add(){},remove(){}},focus(){},addEventListener(){}});return elements.get(key);};
let blobSource;
const ui=vm.createContext({
 document:{querySelector:element},localStorage:{getItem(){return null;},setItem(){}},
 location:{hash:''},window:{addEventListener(){},scrollTo(){}},
 setTimeout(){return 1;},clearTimeout(){},console,
 Blob:class{constructor(parts){blobSource=parts.join('');}},
 URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},
 Worker:class{terminate(){}postMessage(data){const self={postMessage:result=>this.onmessage({data:result})};vm.runInNewContext(blobSource,{self,JSON,Number,Error},{timeout:1000});self.onmessage({data});}}
});
vm.runInContext(data+'\n'+app.replace("window.addEventListener('hashchange',()=>render());render();",''),ui);
for(let i=0;i<context.exercises.length;i++){
 element('#editor').value=context.exercises[i].solution;
 vm.runInContext(`exerciseIndex=${i};runCode();`,ui);
 assert.ok(!element('#output').textContent.includes('오류'),element('#output').textContent);
 assert.ok(!element('#tests').innerHTML.includes('다시 확인'),element('#tests').innerHTML);
 assert.equal((element('#tests').innerHTML.match(/✓ 통과/g)||[]).length,context.exercises[i].tests.length);
}
element('#editor').value='function sum(values) { return 0; }';
vm.runInContext('exerciseIndex=0;runCode();',ui);
assert.ok(element('#tests').innerHTML.includes('다시 확인'),'wrong output must fail');
element('#editor').value='function sum( {';
vm.runInContext('runCode();',ui);
assert.ok(element('#output').textContent.includes('오류'),'syntax error must be visible');
for(let target=1;target<=16;target++){
 const result=vm.runInContext(`searchSteps(${target})`,ui);
 assert.equal(result.sequential.at(-1),target);
 assert.equal(result.binary.at(-1),target);
 assert.equal(result.sequential.length,target);
 assert.ok(result.binary.length<=5);
}
assert.equal(vm.runInContext('debugTrace(false).at(-1).total',ui),6);
assert.equal(vm.runInContext('debugTrace(true).at(-1).total',ui),12);
for(const route of ['home()','learn()','lab()','project()','guide()',...Array.from({length:9},(_,i)=>`lesson(${i+1})`)]){
 const html=vm.runInContext(route,ui);
 assert.ok(html.includes('<h1>'),route);
 assert.ok(!html.includes('undefined'),route);
}
vm.runInContext('saved.notes[1]="<script>alert(1)</script>";',ui);
assert.ok(vm.runInContext('lesson(1)',ui).includes('&lt;script&gt;'));
console.log(`PASS: 9 lessons, 4 exercises / ${testCount} solution cases, actual Worker source, wrong-code feedback, 16 search targets, debugger states, page templates, stored-text escaping.`);
