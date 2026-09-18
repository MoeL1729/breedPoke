import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Game,TRAINERS,makePet} from '../engine.js';
const db=JSON.parse(fs.readFileSync(new URL('../data/pokedex.json',import.meta.url)));
const code=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('all 17 trainer appearances have local PNG files and persist in battle saves',()=>{
 assert.equal(TRAINERS.length,17);
 for(let i=0;i<TRAINERS.length;i++){
  const t=TRAINERS[i];const bytes=fs.readFileSync(new URL('../'+t.sprite,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');
  const g=new Game(db);g.hatch(()=>0,()=>1);g.s.pets[g.s.active]=makePet(db,172,20);g.s.battleCount=10;
  const b=g.startBattle(()=>.5,()=>1,()=>0,()=>(i+.1)/TRAINERS.length);
  assert.equal(b.trainerId,t.id);assert.equal(b.trainerName,t.name);
  assert.equal(new Game(db,JSON.parse(JSON.stringify(g.s))).s.battle.trainerId,t.id);
 }
});
for(const mode of ['timeout','skip','reduced'])test(`trainer intro ${mode}: locks, exits, restores focus, never replays`,async()=>{
 const nodes={};let timer,delay,saves=0,focused=null,cleared=false;
 const $=id=>nodes[id]??=( {hidden:true,classList:{add(){},remove(){}},focus(){focused=id;},querySelector(){return {focus(){focused='move';}}} });
 const context=vm.createContext({$,TRAINERS,busy:false,save(){saves++;},render(){},window:{matchMedia(){return {matches:mode==='reduced'};}},setTimeout(fn,ms){timer=fn;delay=ms;return 1;},clearTimeout(){cleared=true;}});
 vm.runInContext(code.slice(code.indexOf('async function playTrainerIntro('),code.indexOf('async function startBattle(')),context);
 const b={kind:'trainer',trainerId:TRAINERS[0].id,trainerName:TRAINERS[0].name,introSeen:false};
 const pending=context.playTrainerIntro(b);
 assert.equal(context.busy,true);assert.equal($('trainer-intro').hidden,false);assert.equal(delay,mode==='reduced'?900:2600);assert.equal(saves,1);
 if(mode==='skip')$('skip-trainer-intro').onclick();else timer();
 await pending;assert.equal(context.busy,false);assert.equal($('trainer-intro').hidden,true);assert.equal(focused,'move');assert.equal($('skip-trainer-intro').onclick,null);
 if(mode==='skip')assert.ok(cleared);
 await context.playTrainerIntro(b);assert.equal(saves,1);
 await context.playTrainerIntro({kind:'wild'});assert.equal(saves,1);
});
