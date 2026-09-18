import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makePet,Game,validateState} from '../engine.js';
const db=JSON.parse(fs.readFileSync(new URL('../data/pokedex.json',import.meta.url)));
const code=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function ui(){const ctx=vm.createContext({db});const esc=code.slice(code.indexOf('const esc='),code.indexOf('const wait='));const colors=code.slice(code.indexOf('const typeColors='),code.indexOf('let db,game'));const helpers=code.slice(code.indexOf('const typeSkin='),code.indexOf('const petSprite='));vm.runInContext(esc+colors+helpers,ctx);return ctx;}
test('all move cards including Gen-IV Curse render with a known type',()=>{const ctx=ui();for(const move of Object.values(db.moves)){assert.ok(db.types[move.typeId],`${move.name}: missing type`);ctx.move=move;const html=vm.runInContext('moveFace(move,0)',ctx);assert.ok(!html.includes('undefined'));assert.ok(html.includes(move.name));}});
test('unknown types render text without requesting nonexistent assets',()=>{const ctx=ui();for(const type of [10001,99999,null]){ctx.type=type;const html=vm.runInContext('badge(type)',ctx);assert.ok(html.includes('???'));assert.ok(!html.includes('<img'));}});
test('level 12 Gastly with Curse keeps its save and displays every move',()=>{const game=new Game(db);game.s.hatched=true;game.s.active=92;game.s.pets={92:makePet(db,92,12)};const before=JSON.stringify(game.s);validateState(db,JSON.parse(before));assert.ok(game.pet.moves.includes(174));const ctx=ui();for(const id of game.pet.moves){ctx.move=db.moves[id];assert.doesNotThrow(()=>vm.runInContext('moveFace(move,0)',ctx));}assert.equal(JSON.stringify(game.s),before);});
test('egg screen odds follow the same weights as the actual hatch table',()=>{
 const ctx=vm.createContext({});vm.runInContext(code.slice(code.indexOf('function hatchOddsText('),code.indexOf('function renderEgg(')),ctx);ctx.data=db;
 assert.equal(vm.runInContext('hatchOddsText(data)',ctx),'메타몽 2% · 미뇽 2% · 이브이 2% · 나머지 39종은 각각 약 2.4103%');
 ctx.data={pokemon:{132:{name:'메타몽'},1:{name:'이상해씨'}},hatchTable:[{id:132,weight:1},{id:1,weight:9}]};
 assert.equal(vm.runInContext('hatchOddsText(data)',ctx),'메타몽 10% · 나머지 1종은 각각 약 90%');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.includes('id="hatch-odds"'));assert.ok(!html.includes('메타몽 5%'));assert.ok(code.includes("$('hatch-odds').textContent=hatchOddsText(db)"));
});
test('trainer portrait banner shows only for trainers and counts remaining opponents',()=>{
 const nodes={};const ctx=vm.createContext({$:id=>nodes[id]??=( {hidden:false,textContent:'',innerHTML:'',setAttribute(k,v){this[k]=v;}} )});
 vm.runInContext(code.slice(code.indexOf('function renderTrainerBanner('),code.indexOf('function renderBattle(')),ctx);
 for(let i=0;i<3;i++){ctx.b={kind:'trainer',trainerName:'숲길 트레이너',enemyIndex:i};vm.runInContext('renderTrainerBanner(b)',ctx);assert.equal(nodes['trainer-banner'].hidden,false);assert.ok(nodes['trainer-team'].innerHTML.includes(`${3-i}마리 남음`));assert.equal((nodes['trainer-team'].innerHTML.match(/defeated/g)||[]).length,i);}
 for(const b of [null,{kind:'wild'}]){ctx.b=b;vm.runInContext('renderTrainerBanner(b)',ctx);assert.equal(nodes['trainer-banner'].hidden,true);}
 assert.ok(fs.existsSync(new URL('../assets/trainers/forest-trainer.svg',import.meta.url)));
});
