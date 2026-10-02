import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Game,makePet,statsFor,validateState} from '../engine.js';
const db=JSON.parse(fs.readFileSync(new URL('../data/pokedex.json',import.meta.url)));
function hit(moveId,stageKey,stage=0){
 const g=new Game(db),p=g.fighter(makePet(db,4,40)),e=g.fighter(makePet(db,129,40));
 p.hp=p.maxHp=e.hp=e.maxHp=10000;p.moves=[{id:moveId,pp:99}];e.stages[stageKey]=stage;
 g.s.battle={player:p,enemy:e,turn:1};g.execute(p,e,moveId,[],()=>.5);return 10000-e.hp;
}
test('Gen7 move classes use each move rather than its type, and all species have six stats',()=>{
 assert.equal(db.meta.statGeneration,7);assert.equal(db.meta.damageClassGeneration,7);
 // Fire Fang is physical, Ember special; Bite physical despite Dark being special in Gen III.
 for(const [id,kind] of [[424,'physical'],[52,'special'],[44,'physical'],[247,'special'],[45,'status']])assert.equal(db.moves[id].damageClass,kind);
 for(const m of Object.values(db.moves))assert.equal(m.damageClassGeneration,7);
 for(const p of Object.values(db.pokemon))assert.equal(Object.keys(p.stats).length,6);
 assert.equal(db.pokemon[85].stats.speed,110);assert.equal(db.pokemon[295].stats['special-defense'],73);
});
test('actual damage responds to the matching defensive stat only',()=>{
 assert.ok(hit(10,'defense',2)<hit(10,'defense'));assert.equal(hit(10,'special-defense',2),hit(10,'defense'));
 assert.ok(hit(52,'special-defense',2)<hit(52,'special-defense'));assert.equal(hit(52,'defense',2),hit(52,'special-defense'));
});
test('six current stats grow with level; existing saved IVs and progress survive',()=>{
 assert.deepEqual(statsFor(db,25,50),{hp:95,attack:60,defense:45,'special-attack':55,'special-defense':55,speed:95});
 const g=new Game(db);g.hatch(()=>0,()=>1,()=>.5);g.s.pets[g.s.active]=makePet(db,236,15);g.pet.ivs={attack:31,defense:0};g.pet.hp=7;g.recordCaught(236);
 const raw=JSON.stringify(g.s),loaded=new Game(db,validateState(db,JSON.parse(raw)));assert.equal(JSON.stringify(loaded.s),raw);
 assert.ok(statsFor(db,236,15,g.pet.ivs).attack>statsFor(db,236,15,g.pet.ivs).defense);
});
test('battle stat panel reflects stages, burn/paralysis and preserves current HP',()=>{
 const g=new Game(db),f=g.fighter(makePet(db,25,50));f.stages.attack=2;f.status='burn';assert.equal(g.effectiveStat(f,'attack'),60);
 f.status='paralysis';assert.equal(g.effectiveStat(f,'speed'),47.5);
 const code=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');const ctx=vm.createContext({});vm.runInContext(code.slice(code.indexOf('const statLabels='),code.indexOf('function battleStatPanel')),ctx);
 ctx.values={...statsFor(db,25,50),speed:47.5};ctx.f={...f,hp:7};const html=vm.runInContext('statGrid(values,f)',ctx);
 for(const label of ['HP','공격','방어','특수공격','특수방어','스피드'])assert.ok(html.includes(label));
 assert.ok(html.includes('47.5'));assert.ok(html.includes('+2단계'));assert.ok(html.includes('7 / 95'));
});
