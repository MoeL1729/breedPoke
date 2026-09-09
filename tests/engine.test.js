import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game, makePet, initialMoves, statsFor, validateState} from '../engine.js';
const db=JSON.parse(fs.readFileSync(new URL('../data/pokedex.json',import.meta.url),'utf8'));
function started(id=25){const g=new Game(db);g.hatch(()=>(db.starterIds.indexOf(id)+.5)/db.starterIds.length);return g;}
function settle(g,accept=true){let count=0;while(g.s.pending.length||g.s.progressing){assert.ok(++count<500);const e=g.s.pending[0]??g.progress();if(!e)break;if(e.kind==='move')g.chooseMove(0);else g.chooseEvolution(accept);}return g;}
test('snapshot uses HGSS learnsets and historically accurate examples',()=>{
 assert.equal(db.meta.versionGroupId,10);assert.equal(Object.keys(db.pokemon).length,23);assert.equal(Object.keys(db.moves).length,118);
 assert.equal(db.moves[33].power,35);assert.equal(db.moves[33].accuracy,95);assert.equal(db.moves[85].power,95);assert.equal(db.moves[204].typeId,1);
 assert.equal(db.pokemon[25].stats.defense,30);assert.equal(db.pokemon[26].stats.speed,100);assert.equal(db.pokemon[51].stats.attack,80);
 assert.deepEqual(db.pokemon[173].typeIds,[1]);assert.equal(db.pokemon[4].evolutions[0].minLevel,16);assert.equal(db.pokemon[5].evolutions[0].minLevel,36);
 assert.equal(db.pokemon[238].evolutions[0].minLevel,30);assert.equal(db.pokemon[174].evolutions[0].minFriendship,220);
 assert.equal(db.pokemon[25].learnset.find(x=>x.moveId===98).level,13);
 for(const p of Object.values(db.pokemon)){assert.ok(p.learnset.length);for(const m of p.learnset)assert.ok(db.moves[m.moveId]);for(const e of p.evolutions)assert.ok(db.pokemon[e.to]);}
});
test('all nine partners start with up to four legitimate moves, including an attack',()=>{
 for(const id of db.starterIds){const p=started(id).pet;assert.ok(p.moves.length<=4);assert.ok(p.moves.some(m=>db.moves[m].damageClass!=='status'));for(const m of p.moves)assert.ok(db.pokemon[id].learnset.some(l=>l.moveId===m&&l.level<=p.level));}
});
test('single-partner fatigue blocks over-budget actions, sleep advances game day and restores HP',()=>{
 const g=started();for(let i=0;i<6;i++)g.feed();assert.equal(g.s.fatigue,90);assert.equal(g.switch(4),false);assert.equal(g.s.fatigue,90);assert.throws(()=>g.feed());assert.throws(()=>g.startBattle());g.pet.hp=1;g.sleep();assert.equal(g.s.day,2);assert.equal(g.s.fatigue,0);assert.equal(g.pet.hp,statsFor(db,25,10).hp);
});
test('learning fifth move never exceeds four and skipping preserves current moves',()=>{
 const g=started();g.awardXP(g.nextXp()-g.pet.exp+700);const before=[...g.pet.moves];while(g.s.pending.length||g.s.progressing){const e=g.s.pending[0]??g.progress();if(!e)break;if(e.kind==='move')g.chooseMove(null);else g.chooseEvolution(false);assert.ok(g.pet.moves.length<=4);}assert.deepEqual(g.pet.moves,before);
 const m=db.pokemon[25].learnset.find(x=>x.level>g.pet.level).moveId;g.s.pending.push({kind:'move',moveId:m});g.chooseMove(2);assert.equal(g.pet.moves[2],m);assert.equal(g.pet.moves.length,4);
});
test('level evolution occurs at 16 and 36 while preserving legal move limit',()=>{
 const g=started(4);g.awardXP(db.experience[g.species.growthRateId][16]-g.pet.exp);settle(g);assert.equal(g.pet.level,16);assert.equal(g.pet.speciesId,5);g.awardXP(db.experience[g.species.growthRateId][36]-g.pet.exp);settle(g);assert.equal(g.pet.speciesId,6);assert.ok(g.pet.moves.length<=4);
});
test('friendship needs 220 AND a level-up, eating alone never evolves',()=>{
 const g=started(174);g.pet.friendship=219;g.feed();assert.equal(g.pet.speciesId,174);g.awardXP(g.nextXp()-g.pet.exp);settle(g);assert.equal(g.pet.speciesId,39);
 const h=started(173);h.pet.friendship=100;h.awardXP(h.nextXp()-h.pet.exp);settle(h);assert.equal(h.pet.speciesId,173);
});
test('stone is required for Pikachu and retains old moves; not automatic at a level',()=>{
 const g=started();g.awardXP(db.experience[g.species.growthRateId][20]-g.pet.exp);settle(g);assert.equal(g.pet.speciesId,25);assert.throws(()=>g.stone());g.s.coins=300;const moves=[...g.pet.moves];g.stone();assert.equal(g.pet.speciesId,26);assert.equal(g.s.coins,0);assert.deepEqual(g.pet.moves,moves);
});
test('move reminder only permits current species moves at or below current level',()=>{
 const g=started();assert.throws(()=>g.recall(85,0));g.pet.moves=g.pet.moves.slice(1);g.recall(84,0);assert.ok(g.pet.moves.includes(84));assert.ok(g.pet.moves.length<=4);assert.throws(()=>g.recall(84,0));
});
test('battle costs charged once; switching and care blocked; flee keeps fatigue',()=>{
 const g=started();g.startBattle(()=>.4);assert.equal(g.s.fatigue,35);assert.equal(g.switch(4),false);assert.throws(()=>g.feed());assert.throws(()=>g.sleep());const saved=JSON.parse(JSON.stringify(g.s));const resumed=new Game(db,saved);assert.equal(resumed.s.battle.turn,1);resumed.flee();assert.equal(resumed.s.fatigue,35);assert.equal(resumed.s.battle,null);
});
test('all nine partners can complete bounded battles without invalid HP or five moves',()=>{
 for(const id of db.starterIds){const g=started(id);g.startBattle(()=>.31);let count=0;while(g.s.battle){assert.ok(++count<65);const available=g.usable(g.s.battle.player),move=available.find(x=>db.moves[x.id].damageClass!=='status')??available[0];g.act(move?.id??-1,()=>.5);assert.ok(g.pet.hp>=0);assert.ok(g.pet.hp<=statsFor(db,g.pet.speciesId,g.pet.level).hp);}settle(g);assert.ok(g.pet.moves.length<=4);}
});
test('PP exhaustion enables Struggle, invalid moves cannot be used',()=>{
 const g=started();g.startBattle(()=>.5);assert.throws(()=>g.act(-1));g.s.battle.player.moves.forEach(m=>m.pp=0);assert.doesNotThrow(()=>g.act(-1,()=>.5));
});
test('save validation rejects invalid bounds and accepts completed state',()=>{
 const g=started();assert.equal(validateState(db,g.s),g.s);const copy=structuredClone(g.s);copy.pets[25].moves=[1,3,6,8,10];assert.throws(()=>validateState(db,copy));const other=structuredClone(g.s);other.pets[25].speciesId=6;assert.throws(()=>validateState(db,other));
});

test('fresh game is an egg, with no owned Pokemon and no available care',()=>{
 const g=new Game(db);assert.equal(g.s.hatched,false);assert.equal(g.s.active,null);assert.deepEqual(g.s.pets,{});assert.equal(g.ready(),false);assert.throws(()=>g.feed());assert.throws(()=>g.startBattle());assert.throws(()=>g.sleep());assert.equal(validateState(db,g.s),g.s);
});
test('all nine equal random buckets hatch exactly one partner; repeat clicks cannot reroll',()=>{
 for(let i=0;i<9;i++){const g=new Game(db);const id=g.hatch(()=>(i+.5)/9);assert.equal(id,db.starterIds[i]);assert.equal(Object.keys(g.s.pets).length,1);assert.equal(g.hatch(()=>.99),false);assert.equal(g.s.active,id);assert.equal(g.switch(db.starterIds[(i+1)%9]),false);const resumed=new Game(db,JSON.parse(JSON.stringify(g.s)));assert.equal(resumed.hatch(()=>0),false);assert.equal(resumed.s.active,id);assert.equal(validateState(db,resumed.s),resumed.s);}
});
test('legacy save retains the active evolved Pokemon and progression only',()=>{
 const legacy={schemaVersion:1,active:4,day:17,fatigue:70,coins:700,pets:Object.fromEntries(db.starterIds.map(id=>[id,makePet(db,id)])),journal:[],battle:null,pending:[],progressing:false};legacy.pets[4]=makePet(db,5,22);const before=structuredClone(legacy.pets[4]);const g=new Game(db,legacy);assert.equal(g.s.schemaVersion,2);assert.equal(g.s.hatched,true);assert.deepEqual(g.pet,before);assert.deepEqual(Object.keys(g.s.pets),['4']);assert.equal(g.s.day,17);assert.equal(g.s.fatigue,70);assert.equal(g.s.coins,700);assert.equal(validateState(db,g.s),g.s);assert.equal(Object.keys(legacy.pets).length,9);
});
test('single-partner saves reject additional Pokemon',()=>{const g=started();g.s.pets[4]=makePet(db,4);assert.throws(()=>validateState(db,g.s));});
