import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Game,makePet,statsFor,encounterPool,validateState} from '../engine.js';
import {blockMove} from '../abilities.js';
const db=JSON.parse(fs.readFileSync(new URL('../data/pokedex.json',import.meta.url)));
const ids=Array.from({length:125},(_,i)=>252+i);
test('all 125 ordinary Hoenn species have complete assets, growth, abilities, legal moves and encounters',()=>{
 for(const id of ids){const sp=db.pokemon[id];assert.ok(sp.learnset.length);assert.ok(sp.abilities.length);assert.ok(encounterPool(db,sp.encounter.minLevel).includes(id));assert.equal(Object.keys(sp.stats).length,6);
 for(const level of [1,7,40,100]){const p=makePet(db,id,level);assert.ok(Number.isFinite(p.exp));assert.ok(p.moves.length&&p.moves.length<=4);assert.ok(p.moves.every(m=>db.moves[m]));}
 for(const folder of ['sprites','shiny'])for(const suffix of ['','-back'])assert.equal(fs.readFileSync(new URL(`../assets/${folder}/${id}${suffix}.png`,import.meta.url)).subarray(1,4).toString(),'PNG');
 const g=new Game(db);g.s.pets={1:makePet(db,id,40)};g.s.active=1;g.s.hatched=true;validateState(db,g.s);
 }
 assert.equal(db.starterIds.length,42);assert.equal(db.enemyIds.length,365);
 for(let id=377;id<=386;id++)assert.ok(!db.enemyIds.includes(id));
});
test('Shedinja has 1 HP and Wonder Guard blocks neutral attacks but allows super-effective hits and status',()=>{
 const g=new Game(db),a=g.fighter(makePet(db,4,40)),d=g.fighter(makePet(db,292,40));assert.equal(d.hp,1);assert.equal(statsFor(db,292,100).hp,1);
 assert.equal(blockMove(g,a,d,db.moves[33],[]),true);assert.equal(blockMove(g,a,d,db.moves[52],[]),false);assert.equal(blockMove(g,a,d,db.moves[45],[]),false);
});
test('Feebas requires beauty 170; care supplies beauty and save preserves it',()=>{
 const g=new Game(db);g.s.pets={1:makePet(db,349,30)};g.s.active=1;g.s.hatched=true;
 const e=g.species.evolutions.find(e=>e.to===350);assert.equal(e.minBeauty,170);assert.equal(g.evolutionEligible(e),false);
 for(let i=0;i<9;i++){g.s.fatigue=0;g.feed();}assert.equal(g.pet.beauty,180);assert.equal(g.evolutionEligible(e),true);validateState(db,g.s);
});
test('Nincada evolution adds Shedinja only with empty party slot and a standard ball',()=>{
 for(const full of [false,true]){const g=new Game(db);g.s.pets={1:makePet(db,290,20)};g.s.active=1;g.s.hatched=true;if(full){g.s.pets[2]=makePet(db,1,20);g.s.pets[3]=makePet(db,4,20);}const balls=g.s.inventory['poke-ball'];g.evolveTo(291);assert.equal(Object.values(g.s.pets).some(p=>p.speciesId===292),!full);assert.equal(g.s.inventory['poke-ball'],balls-(full?0:1));validateState(db,g.s);}
});
