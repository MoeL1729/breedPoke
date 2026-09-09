import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game, makePet, initialMoves, statsFor, validateState, encounterPool} from '../engine.js';
const db=JSON.parse(fs.readFileSync(new URL('../data/pokedex.json',import.meta.url),'utf8'));
function started(id=25){const g=new Game(db);g.hatch(()=>id===147?.995:(db.legacyStarterIds.indexOf(id)*11+5.5)/100);return g;}
function settle(g,accept=true){let count=0;while(g.s.pending.length||g.s.progressing){assert.ok(++count<500);const e=g.s.pending[0]??g.progress();if(!e)break;if(e.kind==='move')g.chooseMove(0);else g.chooseEvolution(accept);}return g;}
test('snapshot uses HGSS learnsets and historically accurate examples',()=>{
 assert.equal(db.meta.versionGroupId,10);assert.equal(Object.keys(db.pokemon).length,149);assert.equal(Object.keys(db.moves).length,369);
 assert.equal(db.moves[33].power,35);assert.equal(db.moves[33].accuracy,95);assert.equal(db.moves[85].power,95);assert.equal(db.moves[204].typeId,1);
 assert.equal(db.pokemon[25].stats.defense,30);assert.equal(db.pokemon[26].stats.speed,100);assert.equal(db.pokemon[51].stats.attack,80);
 assert.deepEqual(db.pokemon[173].typeIds,[1]);assert.equal(db.pokemon[4].evolutions[0].minLevel,16);assert.equal(db.pokemon[5].evolutions[0].minLevel,36);
 assert.equal(db.pokemon[238].evolutions[0].minLevel,30);assert.equal(db.pokemon[174].evolutions[0].minFriendship,220);
 assert.equal(db.pokemon[25].learnset.find(x=>x.moveId===98).level,13);
 for(const p of Object.values(db.pokemon)){assert.ok(p.learnset.length);for(const m of p.learnset)assert.ok(db.moves[m.moveId]);for(const e of p.evolutions)assert.ok(db.pokemon[e.to]);}
});
test('all ten partners start with up to four legitimate moves, including an attack',()=>{
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
test('all ten partners can complete bounded battles without invalid HP or five moves',()=>{
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
test('all ten weighted random buckets hatch exactly one partner; repeat clicks cannot reroll',()=>{
 for(let i=0;i<10;i++){const g=new Game(db);const id=g.hatch(()=>i===9?.995:(i*11+5.5)/100);assert.equal(id,db.starterIds[i]);assert.equal(Object.keys(g.s.pets).length,1);assert.equal(g.hatch(()=>.99),false);assert.equal(g.s.active,id);assert.equal(g.switch(db.starterIds[(i+1)%10]),false);const resumed=new Game(db,JSON.parse(JSON.stringify(g.s)));assert.equal(resumed.hatch(()=>0),false);assert.equal(resumed.s.active,id);assert.equal(validateState(db,resumed.s),resumed.s);}
});
test('legacy save retains the active evolved Pokemon and progression only',()=>{
 const legacy={schemaVersion:1,active:4,day:17,fatigue:70,coins:700,pets:Object.fromEntries(db.legacyStarterIds.map(id=>[id,makePet(db,id)])),journal:[],battle:null,pending:[],progressing:false};legacy.pets[4]=makePet(db,5,22);const before=structuredClone(legacy.pets[4]);const g=new Game(db,legacy);assert.equal(g.s.schemaVersion,2);assert.equal(g.s.hatched,true);assert.deepEqual(g.pet,before);assert.deepEqual(Object.keys(g.s.pets),['4']);assert.equal(g.s.day,17);assert.equal(g.s.fatigue,70);assert.equal(g.s.coins,700);assert.equal(validateState(db,g.s),g.s);assert.equal(Object.keys(legacy.pets).length,9);
});
test('single-partner saves reject additional Pokemon',()=>{const g=started();g.s.pets[4]=makePet(db,4);assert.throws(()=>validateState(db,g.s));});

test('all 146 Kanto opponents are reachable; excluded species and babies never spawn',()=>{
 const expected=Array.from({length:151},(_,i)=>i+1).filter(i=>![144,145,146,150,151].includes(i));
 assert.deepEqual(db.enemyIds,expected);
 const seen=new Set();
 for(let level=1;level<=100;level++){
  const pool=encounterPool(db,level);assert.ok(pool.length);
  for(const id of pool){seen.add(id);const e=db.pokemon[id].encounter;assert.ok(level>=e.minLevel&&level<=e.maxLevel);}
 }
 assert.deepEqual([...seen].sort((a,b)=>a-b),expected);
});
test('evolution-stage gates cover middle, final, trade, stone and late evolutions',()=>{
 for(const id of encounterPool(db,10))assert.equal(db.pokemon[id].encounter.stage,'basic');
 assert.ok(encounterPool(db,19).includes(4));assert.ok(!encounterPool(db,19).includes(5));
 assert.ok(encounterPool(db,20).includes(5));assert.ok(!encounterPool(db,20).includes(4));
 assert.ok(encounterPool(db,36).includes(6));assert.ok(!encounterPool(db,36).includes(5));
 assert.ok(encounterPool(db,29).includes(147));assert.ok(encounterPool(db,30).includes(148));
 assert.ok(!encounterPool(db,54).includes(149));assert.ok(encounterPool(db,55).includes(149));
 assert.ok(!encounterPool(db,35).includes(26));assert.ok(encounterPool(db,36).includes(26));
 assert.ok(!encounterPool(db,35).includes(65));assert.ok(encounterPool(db,36).includes(65));
 assert.ok(!encounterPool(db,29).includes(143));assert.ok(encounterPool(db,30).includes(143));
 for(const id of db.enemyIds){const e=db.pokemon[id].encounter;assert.ok(e.minLevel<=e.maxLevel);for(const p of Object.values(db.pokemon)){const edge=p.evolutions.find(x=>x.to===id);if(edge?.minLevel)assert.ok(e.minLevel>=edge.minLevel);}}
});
test('actual battle picker reaches every candidate at first/last level rolls',()=>{
 const seen=new Set();
 for(let level=10;level<=100;level++)for(const levelRoll of [0,.999]){
  const enemyLevel=Math.max(1,level-Math.floor(levelRoll*3)),pool=encounterPool(db,enemyLevel);
  for(let i=0;i<pool.length;i++){
   const g=started();g.s.pets[25]=makePet(db,25,level);let call=0;
   const b=g.startBattle(()=>call++===0?levelRoll:(i+.5)/pool.length);
   assert.equal(b.enemy.speciesId,pool[i]);assert.equal(b.enemy.level,enemyLevel);seen.add(b.enemy.speciesId);
  }
 }
 assert.equal(seen.size,146);
});
test('type multipliers and STAB change real HP damage; fixed damage and Struggle exceptions',()=>{
 const g=started();
 // attack move, attacker, defender, expected combined type factor, expected STAB
 const cases=[[84,25,50,0,1.5],[88,74,6,4,1.5],[52,4,7,.5,1.5],[52,4,130,.5,1.5],[52,4,139,.25,1.5],[33,25,4,1,1],[33,52,4,1,1.5],[33,25,92,0,1],[84,25,130,4,1.5],[52,4,1,2,1.5]];
 for(const [mid,aid,did,effect,stab] of cases){
  const a=g.fighter(makePet(db,aid,40)),d=g.fighter(makePet(db,did,40)),m=db.moves[mid];a.moves=[{id:mid,pp:m.pp}];d.hp=10000;
  assert.equal(g.effectiveness(m,d),effect);const logs=[];g.execute(a,d,mid,logs,()=>.5);
  const atk=g.effectiveStat(a,m.damageClass==='physical'?'attack':'special-attack'),def=g.effectiveStat(d,m.damageClass==='physical'?'defense':'special-defense');
  const expected=effect===0?0:Math.max(1,Math.floor(((2*40/5+2)*m.power*atk/def/50+2)*stab*effect*.925));
  assert.equal(10000-d.hp,expected,`${aid}/${mid} -> ${did}`);
 }
 assert.equal(db.typeChart[8][9],.5);assert.equal(db.typeChart[17][9],.5);assert.equal(Object.keys(db.types).length,17);
 for(const defender of [4,74]){const a=g.fighter(makePet(db,56,40)),d=g.fighter(makePet(db,defender,40));d.hp=1000;g.execute(a,d,69,[],()=>.5);assert.equal(1000-d.hp,40);}
 const a=g.fighter(makePet(db,25,40)),d=g.fighter(makePet(db,92,40));const before=d.hp;g.execute(a,d,-1,[],()=>.5);assert.ok(d.hp<before);
});
test('Ditto copies combat types, non-HP stats and four moves with five PP; copy survives save',()=>{
 const g=started(),a=g.fighter(makePet(db,132,30)),d=g.fighter(makePet(db,25,30)),hp=a.hp;
 g.execute(a,d,144,[],()=>.5);assert.equal(a.hp,hp);assert.deepEqual(a.typeIds,[13]);assert.deepEqual(a.moves,d.moves.map(m=>({id:m.id,pp:5})));assert.equal(g.effectiveStat(a,'attack'),g.effectiveStat(d,'attack'));
 g.s.battle={player:d,enemy:a,turn:2};const saved=new Game(db,JSON.parse(JSON.stringify(g.s)));assert.deepEqual(saved.s.battle.enemy.typeIds,[13]);
});
test('every new opponent completes a bounded battle with finite HP and legal initial moves',()=>{
 for(const id of db.enemyIds){
  const g=started(),level=Math.max(10,db.pokemon[id].encounter.minLevel);g.s.pets[25]=makePet(db,25,level);
  const enemy=makePet(db,id,level);for(const m of enemy.moves)assert.ok(db.pokemon[id].learnset.some(x=>x.moveId===m&&x.level<=level));
  g.s.battle={player:g.fighter(g.pet),enemy:g.fighter(enemy),turn:1};let turns=0;
  while(g.s.battle){assert.ok(++turns<=60,`opponent ${id}`);const moves=g.usable(g.s.battle.player),move=moves.find(x=>db.moves[x.id].damageClass!=='status')??moves[0];g.act(move?.id??-1,()=>.5);assert.ok(Number.isFinite(g.pet.hp)&&g.pet.hp>=0);}
 }
});


test('rare egg probability boundaries allocate exactly 1 percent to Dratini',()=>{
 const counts={};for(let i=0;i<10000;i++){const g=new Game(db),id=g.hatch(()=>(i+.5)/10000);counts[id]=(counts[id]||0)+1;}
 assert.equal(counts[147],100);for(const id of db.legacyStarterIds)assert.equal(counts[id],1100);
 for(const [roll,id] of [[0,25],[.11,4],[.989999,173],[.99,147],[.999999,147]]){const g=new Game(db);assert.equal(g.hatch(()=>roll),id);}
});
test('rare partner evolves at 30 and 55 with four moves and survives backup restoration',()=>{
 const g=started(147);assert.equal(g.pet.level,10);assert.equal(validateState(db,g.s),g.s);
 g.awardXP(db.experience[g.species.growthRateId][30]-g.pet.exp);settle(g);assert.equal(g.pet.speciesId,148);assert.equal(g.pet.level,30);
 g.awardXP(db.experience[g.species.growthRateId][55]-g.pet.exp);settle(g);assert.equal(g.pet.speciesId,149);assert.equal(g.pet.level,55);assert.ok(g.pet.moves.length<=4);
 const restored=new Game(db,validateState(db,JSON.parse(JSON.stringify(g.s))));assert.equal(restored.pet.speciesId,149);assert.equal(restored.s.active,147);assert.equal(restored.hatch(()=>0),false);
});
