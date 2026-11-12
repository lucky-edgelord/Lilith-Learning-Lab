// Verifies every lab level: starter must NOT meet the goal, solution MUST.
const RL=require('../rustlab.core.js'), fs=require('fs');
const labs=JSON.parse(fs.readFileSync(process.argv[2]||'/tmp/rustlabs.json','utf8'));
function check(l,r,src){const g=l.goal,out=r.stdout.replace(/\s+$/,'');
 if(g.error){ if(g.error==='panic') return r.code===101; return !!(r.compileError&&r.error&&r.error.code===g.error);}
 if(!r.ok) return false;
 if(g.stdout!==undefined&&out!==String(g.stdout).replace(/\s+$/,'')) return false;
 if(g.contains&&!g.contains.every(c=>out.indexOf(c)>=0)) return false;
 if(g.requires&&!g.requires.every(re=>new RegExp(re).test(src))) return false;
 if(g.forbids&&g.forbids.some(re=>new RegExp(re).test(src))) return false;
 return true;}
let bad=0,n=0;
for(const [k,lab] of Object.entries(labs)){ lab.levels.forEach((l,i)=>{ n++;
  const rs=RL.run(l.solution), okS=check(l,rs,l.solution);
  const rc=RL.run(l.code), okC=check(l,rc,l.code);
  if(!okS||okC){bad++;console.log((okS?'':'SOLUTION FAILS ')+(okC?'STARTER ALREADY PASSES ':'')+k+' L'+(i+1)+' '+l.title);
    if(!okS)console.log('   out:',JSON.stringify(rs.stdout.slice(0,150)),'| err:',(rs.stderr||'').split('\n').slice(0,4).join(' / '));}
});}
console.log(n+' levels, '+bad+' problems'); process.exit(bad?1:0);
