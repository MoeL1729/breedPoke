import {HIDDEN_CHANCE,DROP_CHANCE,options,abilityOf,abilitySlug,assignAbility,abilityItemTarget,weather,changeStage,statusImmune,inflict,transform,enter,leave,statFactor,accuracyFactor,blockMove,damageFactor,sheerForce,afterHit,endAbilities,trapped} from './abilities.js?v=pokegotchi-271';
export {HIDDEN_CHANCE,DROP_CHANCE,abilityOf,abilityItemTarget};
// Pure game rules. Canonical data lives in data/pokedex.json; care rules are game-specific.
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function statsFor(db,id,level,ivs={}){
  const s=db.pokemon[id].stats, out={};
  for(const [k,v] of Object.entries(s)) out[k]=Math.floor((2*v+(ivs?.[k]??0))*level/100)+(k==='hp'?level+10:5);
  return out;
}
export function initialMoves(db,id,level){
  const known=[];
  for(const m of db.pokemon[id].learnset.filter(m=>m.level<=level)){
    const pos=known.indexOf(m.moveId);if(pos>=0)known.splice(pos,1);known.push(m.moveId);
  }
  const selected=known.slice(-4);
  if(!selected.some(id=>db.moves[id].damageClass!=='status')){const attack=known.find(id=>db.moves[id].damageClass!=='status');if(attack!==undefined){if(selected.length===4)selected[0]=attack;else selected.push(attack);}}
  return selected;
}
export function encounterPool(db,level){return db.enemyIds.filter(id=>{const e=db.pokemon[id].encounter;return level>=e.minLevel&&level<=e.maxLevel;});}
const FIXED_DAMAGE=new Set(['seismic-toss','night-shade','dragon-rage','sonic-boom','super-fang','endeavor','counter','mirror-coat','fissure','guillotine','horn-drill']);
export function makePet(db,id,level=db.starterLevel??7,random=Math.random){return {...(id===265?{evolutionBranch:random()<.5?266:268}:{}),abilitySlot:1,speciesId:id,level,exp:db.experience[db.pokemon[id].growthRateId][level],hp:statsFor(db,id,level).hp,hunger:75,friendship:db.pokemon[id].baseFriendship,moves:initialMoves(db,id,level),wins:0,originSpeciesId:id,shiny:false,heldItem:null};}
export const SHINY_CHANCE=0.04;
export const MAX_PARTY=3;
export const TRAINER_CHANCE=.2;
export const TRAINERS=[{"id":"lass-gen4","name":"짧은치마 소녀","sprite":"assets/trainers/lass-gen4.png"},{"id":"falkner","name":"체육관 관장 비상","sprite":"assets/trainers/falkner.png"},{"id":"bugsy","name":"체육관 관장 호일","sprite":"assets/trainers/bugsy.png"},{"id":"whitney","name":"체육관 관장 꼭두","sprite":"assets/trainers/whitney.png"},{"id":"morty","name":"체육관 관장 유빈","sprite":"assets/trainers/morty.png"},{"id":"chuck","name":"체육관 관장 사도","sprite":"assets/trainers/chuck.png"},{"id":"jasmine","name":"체육관 관장 규리","sprite":"assets/trainers/jasmine.png"},{"id":"pryce","name":"체육관 관장 류옹","sprite":"assets/trainers/pryce.png"},{"id":"clair","name":"체육관 관장 이향","sprite":"assets/trainers/clair.png"},{"id":"brock","name":"체육관 관장 웅","sprite":"assets/trainers/brock.png"},{"id":"misty","name":"체육관 관장 이슬","sprite":"assets/trainers/misty.png"},{"id":"ltsurge","name":"체육관 관장 마티스","sprite":"assets/trainers/ltsurge.png"},{"id":"erika","name":"체육관 관장 민화","sprite":"assets/trainers/erika.png"},{"id":"janine","name":"체육관 관장 도희","sprite":"assets/trainers/janine.png"},{"id":"sabrina","name":"체육관 관장 초련","sprite":"assets/trainers/sabrina.png"},{"id":"blaine","name":"체육관 관장 강연","sprite":"assets/trainers/blaine.png"},{"id":"blue","name":"체육관 관장 그린","sprite":"assets/trainers/blue.png"}];
export const battleExperience=level=>Math.floor(Math.floor((40+3*level*level)*.8)*.6);
export const ITEMS={
 'shiny-stone':{name:'별빛물약',kind:'shiny',price:20000,drop:false,description:'선택한 친구를 영구적으로 이로치로 바꿉니다. 1회 소모 · 이미 이로치면 사용 불가 · 게임 전용 아이템.'},
 'ability-capsule':{name:'특성캡슐',kind:'ability',price:1200,description:'일반 특성 2종을 서로 전환. 숨겨진 특성에는 사용 불가. 쉼터에서 사용.'},
 'ability-patch':{name:'특성패치',kind:'ability',price:3000,description:'일반 특성 ↔ 숨겨진 특성 전환 (9세대 도구 규칙). 숨겨진 특성이 있는 종에만 사용.'},
 'poke-ball':{name:'몬스터볼',kind:'ball',price:40,bonus:1,description:'야생 포켓몬을 포획해요.'},
 'great-ball':{name:'수퍼볼',kind:'ball',price:80,bonus:1.5,description:'몬스터볼보다 높은 포획 보정.'},
 'ultra-ball':{name:'하이퍼볼',kind:'ball',price:120,bonus:2,description:'더 높은 포획 보정.'},
 potion:{name:'상처약',kind:'medicine',price:60,heal:20,description:'HP 20 회복. 전투 중 사용하면 한 턴 소모.'},
 'super-potion':{name:'좋은상처약',kind:'medicine',price:120,heal:50,description:'HP 50 회복. 전투 중 사용하면 한 턴 소모.'},
 'quick-claw':{name:'선제공격손톱',kind:'held',price:600,description:'같은 우선도에서 20% 확률로 먼저 공격.'},
 leftovers:{name:'먹다남은음식',kind:'held',price:1000,description:'매 턴 종료 시 최대 HP의 1/16 회복.'},
 'oran-berry':{name:'오랭열매',kind:'held',price:30,description:'HP가 절반 이하가 되면 10 회복 후 소모.'},
 "hyper-potion":{"name": "고급상처약", "kind": "medicine", "price": 240, "description": "HP 200 회복 (HGSS 기준).", "heal": 200},
 "max-potion":{"name": "풀회복약", "kind": "medicine", "price": 360, "description": "HP 전부 회복.", "heal": 9999},
 "full-restore":{"name": "회복약", "kind": "medicine", "price": 450, "description": "HP 전부 회복하고 상태이상·혼란 치료.", "heal": 9999, "cure": "all"},
 "antidote":{"name": "해독제", "kind": "medicine", "price": 40, "description": "전투 중 독 치료. 한 턴 소모.", "cure": "poison"},
 "burn-heal":{"name": "화상치료제", "kind": "medicine", "price": 40, "description": "전투 중 화상 치료. 한 턴 소모.", "cure": "burn"},
 "ice-heal":{"name": "얼음상태치료제", "kind": "medicine", "price": 40, "description": "전투 중 얼음 치료. 한 턴 소모.", "cure": "freeze"},
 "awakening":{"name": "잠깨는약", "kind": "medicine", "price": 40, "description": "전투 중 잠듦 치료. 한 턴 소모.", "cure": "sleep"},
 "paralyze-heal":{"name": "마비치료제", "kind": "medicine", "price": 40, "description": "전투 중 마비 치료. 한 턴 소모.", "cure": "paralysis"},
 "full-heal":{"name": "만병통치제", "kind": "medicine", "price": 100, "description": "전투 중 모든 상태이상·혼란 치료. 한 턴 소모.", "cure": "all"},
 "muscle-band":{"name": "힘의머리띠", "kind": "held", "price": 700, "description": "물리 기술 위력 10% 증가."},
 "wise-glasses":{"name": "박식안경", "kind": "held", "price": 700, "description": "특수 기술 위력 10% 증가."},
 "expert-belt":{"name": "달인의띠", "kind": "held", "price": 900, "description": "효과가 굉장한 공격 피해 20% 증가."},
 "life-orb":{"name": "생명의구슬", "kind": "held", "price": 1200, "description": "공격 피해 30% 증가. 명중 후 최대 HP 10% 소모."},
 "shell-bell":{"name": "조개껍질방울", "kind": "held", "price": 900, "description": "공격으로 준 실제 피해의 1/8만큼 HP 회복."},
 "clear-amulet":{"name": "클리어참", "kind": "held", "price": 1000, "description": "상대가 능력치 랭크를 낮추는 효과 방지 (9세대)."},
 "covert-cloak":{"name": "은밀망토", "kind": "held", "price": 1000, "description": "공격 기술의 추가 상태이상·능력치 변화 방지. 변화기는 통과 (9세대)."},
 "sitrus-berry":{"name": "자뭉열매", "kind": "held", "price": 80, "description": "HP 절반 이하에서 최대 HP 1/4 회복 후 소모."},
 "lum-berry":{"name": "리샘열매", "kind": "held", "price": 100, "description": "상태이상·혼란을 자동 치료하고 소모.", "cure": "all"},
 "chesto-berry":{"name": "유루열매", "kind": "held", "price": 40, "description": "잠듦을 자동 치료하고 소모.", "cure": "sleep"},
 "silk-scarf":{"name": "실크스카프", "kind": "held", "price": 500, "description": "노말 기술 위력 20% 증가. 전투 장착용.", "boostType": 1},
 "black-belt":{"name": "검은띠", "kind": "held", "price": 500, "description": "격투 기술 위력 20% 증가. 전투 장착용.", "boostType": 2},
 "sharp-beak":{"name": "예리한부리", "kind": "held", "price": 500, "description": "비행 기술 위력 20% 증가. 전투 장착용.", "boostType": 3},
 "poison-barb":{"name": "독바늘", "kind": "held", "price": 500, "description": "독 기술 위력 20% 증가. 전투 장착용.", "boostType": 4},
 "soft-sand":{"name": "부드러운모래", "kind": "held", "price": 500, "description": "땅 기술 위력 20% 증가. 전투 장착용.", "boostType": 5},
 "hard-stone":{"name": "딱딱한돌", "kind": "held", "price": 500, "description": "바위 기술 위력 20% 증가. 전투 장착용.", "boostType": 6},
 "silver-powder":{"name": "은빛가루", "kind": "held", "price": 500, "description": "벌레 기술 위력 20% 증가. 전투 장착용.", "boostType": 7},
 "spell-tag":{"name": "저주의부적", "kind": "held", "price": 500, "description": "고스트 기술 위력 20% 증가. 전투 장착용.", "boostType": 8},
 "metal-coat":{"name": "금속코트", "kind": "held", "price": 500, "description": "강철 기술 위력 20% 증가. 전투 장착용.", "boostType": 9},
 "charcoal":{"name": "목탄", "kind": "held", "price": 500, "description": "불꽃 기술 위력 20% 증가. 전투 장착용.", "boostType": 10},
 "mystic-water":{"name": "신비의물방울", "kind": "held", "price": 500, "description": "물 기술 위력 20% 증가. 전투 장착용.", "boostType": 11},
 "miracle-seed":{"name": "기적의씨", "kind": "held", "price": 500, "description": "풀 기술 위력 20% 증가. 전투 장착용.", "boostType": 12},
 "magnet":{"name": "자석", "kind": "held", "price": 500, "description": "전기 기술 위력 20% 증가. 전투 장착용.", "boostType": 13},
 "twisted-spoon":{"name": "휘어진스푼", "kind": "held", "price": 500, "description": "에스퍼 기술 위력 20% 증가. 전투 장착용.", "boostType": 14},
 "never-melt-ice":{"name": "녹지않는얼음", "kind": "held", "price": 500, "description": "얼음 기술 위력 20% 증가. 전투 장착용.", "boostType": 15},
 "dragon-fang":{"name": "용의이빨", "kind": "held", "price": 500, "description": "드래곤 기술 위력 20% 증가. 전투 장착용.", "boostType": 16},
 "black-glasses":{"name": "검은안경", "kind": "held", "price": 500, "description": "악 기술 위력 20% 증가. 전투 장착용.", "boostType": 17},
 'trade-pass':{name:'NPC 교환권',kind:'trade',price:150,description:'교환 진화 시 1장 소모. 필요한 진화 도구도 준비하세요.'}
};
export function medicineUsable(item,f){return !!(item?.kind==='medicine'&&f.hp>0&&((item.heal&&f.hp<f.maxHp)||(item.cure==='all'&&(f.status||f.confused>0))||(item.cure&&item.cure!=='all'&&f.status===item.cure)));}
function cureWith(item,f){if(item.cure==='all'){f.status=null;f.statusTurns=0;f.confused=0;}else if(item.cure&&f.status===item.cure){f.status=null;f.statusTurns=0;}}
export function shopCatalog(db){
 const items={...ITEMS};for(const [id,t] of Object.entries(db.tms??{})){if(t.enabled)items[id]={name:`TM${String(t.number).padStart(2,'0')} ${db.moves[t.moveId].name}`,kind:'tm',price:t.price,moveId:t.moveId,description:'습득 가능한 포켓몬에게 사용 · 성공 시 1개 소모 · 기술 4칸 유지'};}for(const sp of Object.values(db.pokemon))for(const e of sp.evolutions){
  const id=e.itemId??e.heldItemId;if(id)items['evo-'+id]={name:e.itemName??e.heldItemName,kind:'evolution',price:300,description:'해당 진화 조건에서 사용하는 도구.'};
 }return items;
}
export function captureChance(db,f,ball='poke-ball',boost=true){
 const item=ITEMS[ball];if(!item||item.kind!=='ball'||f.hp<=0||f.maxHp<=0)return 0;
 const rate=db.pokemon[f.speciesId].captureRate;
 if(!Number.isInteger(rate))throw Error('포획률 데이터가 없습니다.');
 const status=['sleep','freeze'].includes(f.status)?2:['poison','burn','paralysis'].includes(f.status)?1.5:1;
 const x=Math.max(1,Math.floor(Math.floor((3*f.maxHp-2*f.hp)*Math.floor(rate*item.bonus)/(3*f.maxHp))*status));
 if(x>=255)return 1;
 const y=Math.floor(1048560/Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680/x))))));
 const original=Math.pow(Math.min(65536,y)/65536,4);
 return Math.min(1,original*(boost?1.1:1));
}
const startingBag=()=>({'poke-ball':5,potion:3});
export function freshState(db){return {schemaVersion:3,battleCount:0,lastBattleTrainer:false,hatched:false,active:null,day:1,fatigue:0,coins:100,pets:{},inventory:startingBag(),journal:[{day:1,text:'작은 알 하나가 도착했어요. 몬스터볼 5개와 상처약 3개도 함께 왔어요.'}],battle:null,pending:[],progressing:false};}
export function migrateState(db,state){
 if(state?.schemaVersion===3)return state;
 if(!state||![1,2].includes(state.schemaVersion))throw Error('지원하지 않는 저장 버전입니다.');
 const s=structuredClone(state);s.hatched=s.schemaVersion===1?true:s.hatched;
 if(s.schemaVersion===1)s.pets={[s.active]:s.pets[s.active]};
 s.schemaVersion=3;s.inventory=startingBag();
 for(const [id,p] of Object.entries(s.pets)){p.originSpeciesId=Number(id);p.shiny=false;p.heldItem=null;}
 if(s.battle){for(const f of [s.battle.player,s.battle.enemy]){f.shiny=false;f.heldItem=null;}s.battle.activeId=s.active;s.battle.originalEnemy=makePet(db,s.battle.enemy.speciesId,s.battle.enemy.level);}
 return s;
}
export function validateState(db,input){
 const s=input?.schemaVersion===3?input:migrateState(db,input);
 const fail=()=>{throw Error('저장 데이터 형식이 올바르지 않습니다.');};
 if(!s||typeof s.hatched!=='boolean'||!s.pets||Array.isArray(s.pets)||!Number.isInteger(s.day)||s.day<1||!Number.isFinite(s.fatigue)||s.fatigue<0||s.fatigue>100||!Number.isSafeInteger(s.coins)||s.coins<0)fail();
 if(s.battleCount!==undefined&&(!Number.isSafeInteger(s.battleCount)||s.battleCount<0))fail();
 if(s.lastBattleTrainer!==undefined&&typeof s.lastBattleTrainer!=='boolean')fail();
 const entries=Object.entries(s.pets);
 if(entries.length>MAX_PARTY||s.hatched!==!!entries.length||(s.hatched?(!Number.isSafeInteger(s.active)||!s.pets[s.active]):s.active!==null))fail();
 for(const [id,p] of entries){
  if(!/^\d+$/.test(id)||!Number.isSafeInteger(Number(id))||Number(id)<1)fail();
  const sp=db.pokemon[p?.speciesId],origin=db.pokemon[p?.originSpeciesId];
  if(!sp||!origin||!origin.family.includes(p.speciesId)||typeof p.shiny!=='boolean'||(p.heldItem!==null&&ITEMS[p.heldItem]?.kind!=='held')||!Number.isInteger(p.level)||p.level<1||p.level>100||!Array.isArray(p.moves)||p.moves.length<1||p.moves.length>4||new Set(p.moves).size!==p.moves.length||p.moves.some(m=>!db.moves[m]))fail();
  if(![p.hp,p.hunger,p.friendship,p.exp,p.wins].every(Number.isFinite)||p.hp<0||p.hp>statsFor(db,p.speciesId,p.level,p.ivs).hp||p.hunger<0||p.hunger>100||p.friendship<0||p.friendship>255||p.exp<0||p.wins<0)fail();
  if(p.abilitySlot!==undefined&&![1,2,3].includes(p.abilitySlot))fail();
  if(p.originSpeciesId===265&&![266,268].includes(p.evolutionBranch))fail();
  if(p.ivs&&Object.entries(p.ivs).some(([k,v])=>!['attack','defense'].includes(k)||!Number.isInteger(v)||v<0||v>31))fail();
 }
 const catalog=shopCatalog(db);
 if(!s.inventory||Array.isArray(s.inventory)||Object.entries(s.inventory).some(([id,n])=>!catalog[id]||!Number.isSafeInteger(n)||n<0||n>999))fail();
 if(s.evolutionContext&&(!['day','night'].includes(s.evolutionContext.timeOfDay)||![null,8,10,48].includes(s.evolutionContext.locationId)))fail();
 if(!Array.isArray(s.journal)||!Array.isArray(s.pending))fail();
 if(s.battle||s.pending.length||s.progressing)throw Error('전투와 성장을 마친 뒤 만든 백업을 사용해 주세요.');
 return s;
}
export class Game{
  constructor(db,state){this.db=db;this.s=state?migrateState(db,state):freshState(db);this.s.battleCount??=0;this.s.lastBattleTrainer??=false;
    if(!this.s.hatched&&Object.keys(this.s.pets).length===0)this.s.day=1;
    for(const p of Object.values(this.s.pets))if(p.abilitySlot===undefined)assignAbility(db,p);
    const b=this.s.battle;if(b){
      for(const p of b.enemyTeam??[])if(p.abilitySlot===undefined)assignAbility(db,p);
      if(b.originalEnemy?.abilitySlot===undefined&&b.originalEnemy){if(b.enemyTeam?.[b.enemyIndex??0])b.originalEnemy.abilitySlot=b.enemyTeam[b.enemyIndex??0].abilitySlot;else assignAbility(db,b.originalEnemy);}
      b.player.abilitySlot??=this.pet.abilitySlot;b.enemy.abilitySlot??=b.originalEnemy?.abilitySlot;
      if(b.enemy.abilitySlot===undefined)assignAbility(db,b.enemy);
      for(const [id,f] of Object.entries(b.bench??{}))f.abilitySlot??=this.s.pets[id]?.abilitySlot;
    }
  }
  get pet(){return this.s.pets[this.s.active];} get species(){return this.db.pokemon[this.pet.speciesId];}
  log(text){this.s.journal.unshift({day:this.s.day,text});this.s.journal=this.s.journal.slice(0,30);}
  ready(){return this.s.hatched&&!this.s.battle&&!this.s.pending.length&&!this.s.progressing;}
  hatch(random=Math.random,shinyRandom=Math.random,abilityRandom=Math.random){if(this.s.hatched)return false;const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw Error('잘못된 난수입니다.');const table=this.db.hatchTable,total=table.reduce((n,x)=>n+x.weight,0);let ticket=value*total;const id=table.find(x=>{ticket-=x.weight;return ticket<0;}).id;this.s.active=id;this.s.pets={[id]:makePet(this.db,id)};if(id===236){const iv=()=>{const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw Error('잘못된 난수입니다.');return Math.floor(r*32);};this.s.pets[id].ivs={attack:iv(),defense:iv()};}assignAbility(this.db,this.pet,abilityRandom);this.pet.shiny=shinyRandom()<SHINY_CHANCE;this.s.hatched=true;this.log(`${this.species.name}가 알에서 태어났어요! 이제 둘만의 모험을 시작해요.`);return id;}
  release(){
 if(!this.ready())throw Error('전투와 성장을 마친 뒤 놓아줄 수 있어요.');
 const p=this.pet;if(p.heldItem&&(this.s.inventory[p.heldItem]??0)>=999)throw Error('돌려받을 도구의 가방 공간이 부족해요.');if(p.heldItem)this.s.inventory[p.heldItem]=(this.s.inventory[p.heldItem]??0)+1;
 this.log(`${this.species.name}를 놓아주었어요.`);delete this.s.pets[this.s.active];
 const ids=Object.keys(this.s.pets);this.s.active=ids.length?Number(ids[0]):null;this.s.hatched=!!ids.length;if(!ids.length)this.s.day=1;return this.s;
 }
  setEvolutionContext(timeOfDay,locationId){
    if(!this.ready())throw Error('진행 중인 일을 먼저 마쳐주세요.');
    if(!['day','night'].includes(timeOfDay)||![null,8,10,48].includes(locationId))throw Error('진화 환경이 올바르지 않습니다.');
    this.s.evolutionContext={timeOfDay,locationId};
  }
  evolutionEligible(e){
    const p=this.pet,c=this.s.evolutionContext??{timeOfDay:'day',locationId:null};
    if(e.personalityBranch&&p.evolutionBranch!==e.personalityBranch)return false;
    if(e.trigger!=='level-up'||p.level<(e.minLevel||1)||p.friendship<(e.minFriendship||0))return false;
    if(e.timeOfDay&&e.timeOfDay!==c.timeOfDay)return false;
    if(e.locationId&&e.locationId!==c.locationId)return false;
    if(e.relativePhysicalStats!==null&&e.relativePhysicalStats!==undefined){const st=statsFor(this.db,p.speciesId,p.level,p.ivs);if(Math.sign(st.attack-st.defense)!==e.relativePhysicalStats)return false;}
    return true;
  }
  switch(id){if(!this.ready()||!this.s.pets[id])return false;this.s.active=Number(id);return true;}
  can(action){if(!this.ready())return '지금 진행 중인 일을 먼저 마쳐주세요.';if(action==='battle'){if(this.s.fatigue+35>100)return '오늘은 많이 피곤해요. 잠을 자고 다시 도전하세요.';if(this.pet.hp<=0)return 'HP를 회복한 뒤 전투할 수 있어요.';if(this.pet.hunger<15)return '배가 고파요. 먼저 밥을 먹여주세요.';}if(action==='feed'&&this.s.fatigue+15>100)return '식사할 기운도 부족해요. 잠을 자고 내일 먹어요.';return null;}
  feed(){const e=this.can('feed');if(e)throw Error(e);const p=this.pet;this.s.fatigue+=15;p.hunger=clamp(p.hunger+35,0,100);p.hp=clamp(p.hp+Math.ceil(statsFor(this.db,p.speciesId,p.level,p.ivs).hp*.3),0,statsFor(this.db,p.speciesId,p.level,p.ivs).hp);p.friendship=clamp(p.friendship+12,0,255);this.log(`${this.species.name}에게 밥을 주었어요. 친밀도 +12`);}
  sleep(){const e=this.can('sleep');if(e)throw Error(e);this.s.day++;this.s.fatigue=0;for(const p of Object.values(this.s.pets)){p.hp=statsFor(this.db,p.speciesId,p.level,p.ivs).hp;p.hunger=clamp(p.hunger-12,0,100);}this.pet.friendship=clamp(this.pet.friendship+3,0,255);this.log('친구가 푹 잤어요. 피로와 HP를 회복하고 새 아침을 맞았어요.');}
  nextXp(p=this.pet){return p.level>=100?null:this.db.experience[this.db.pokemon[p.speciesId].growthRateId][p.level+1];}
  awardXP(amount){this.pet.exp=Math.min(this.db.experience[this.species.growthRateId][100],this.pet.exp+amount);this.s.progressing=true;this.progress();}
  progress(){
    if(this.s.pending.length)return this.s.pending[0];
    const p=this.pet;if(p.level>=100||p.exp<this.nextXp()){this.s.progressing=false;return null;}
    const oldHP=statsFor(this.db,p.speciesId,p.level,p.ivs).hp;p.level++;p.hp=clamp(p.hp+statsFor(this.db,p.speciesId,p.level,p.ivs).hp-oldHP,0,statsFor(this.db,p.speciesId,p.level,p.ivs).hp);p.friendship=clamp(p.friendship+5,0,255);this.log(`${this.species.name}, 레벨 ${p.level} 달성!`);
    for(const m of this.species.learnset.filter(m=>m.level===p.level&&!p.moves.includes(m.moveId)))if(!this.s.pending.some(e=>e.kind==='move'&&e.moveId===m.moveId))this.s.pending.push({kind:'move',moveId:m.moveId,level:p.level});
    const e=[...this.species.evolutions].sort((a,b)=>Number(!!b.locationId)-Number(!!a.locationId)).find(e=>this.evolutionEligible(e));
    if(e)this.s.pending.push({kind:'evolution',to:e.to,from:p.speciesId});
    return this.s.pending[0]??this.progress();
  }
  chooseMove(slot){const event=this.s.pending[0];if(event?.kind!=='move')throw Error('학습할 기술이 없습니다.');const p=this.pet;if(slot!==null){if(p.moves.includes(event.moveId))throw Error('이미 알고 있는 기술입니다.');if(p.moves.length<4)p.moves.push(event.moveId);else{if(!Number.isInteger(slot)||slot<0||slot>3)throw Error('교체할 기술을 선택하세요.');p.moves[slot]=event.moveId;}this.log(`${this.species.name}, ${this.db.moves[event.moveId].name} 습득!`);}else this.log(`${this.db.moves[event.moveId].name} 배우기를 건너뛰었어요.`);this.s.pending.shift();return this.progress();}
  evolveTo(to){const p=this.pet,old=this.species,oldHp=statsFor(this.db,p.speciesId,p.level,p.ivs).hp;p.speciesId=to;p.hp=clamp(p.hp+statsFor(this.db,to,p.level,p.ivs).hp-oldHp,0,statsFor(this.db,to,p.level,p.ivs).hp);this.log(`${old.name} → ${this.species.name}! 진화했어요.`);}
  chooseEvolution(accept){const e=this.s.pending[0];if(e?.kind!=='evolution')throw Error('진화할 수 없습니다.');this.s.pending.shift();if(accept){this.evolveTo(e.to);const learned=this.species.learnset.filter(m=>m.level===this.pet.level&&!this.pet.moves.includes(m.moveId));this.s.pending.unshift(...learned.map(m=>({kind:'move',moveId:m.moveId,level:this.pet.level})));}else this.log(`${this.species.name}의 진화를 다음 레벨업으로 미뤘어요.`);return this.progress();}
  buy(id,quantity=1){
 if(!this.ready())throw Error('전투와 성장을 마친 뒤 상점을 이용하세요.');
 const item=shopCatalog(this.db)[id];if(!item||!Number.isSafeInteger(quantity)||quantity<1||quantity>99)throw Error('구매 수량을 확인하세요.');
 if(item.kind==='tm'&&this.tmReason(id))throw Error(this.tmReason(id));
 if((this.s.inventory[id]??0)+quantity>999)throw Error('도구는 999개까지 보관할 수 있어요.');
 if(this.s.coins<item.price*quantity)throw Error('모험 포인트가 부족해요.');
 this.s.coins-=item.price*quantity;this.s.inventory[id]=(this.s.inventory[id]??0)+quantity;this.log(`${item.name} ${quantity}개 구매!`);
 }
 equip(id){
 if(!this.ready())throw Error('전투와 성장을 먼저 마쳐주세요.');
 if(id!==null&&(ITEMS[id]?.kind!=='held'||!(this.s.inventory[id]>0)))throw Error('지닐 도구가 없습니다.');
 const old=this.pet.heldItem;if(old&&(this.s.inventory[old]??0)>=999)throw Error('돌려받을 도구의 가방 공간이 부족해요.');if(old)this.s.inventory[old]=(this.s.inventory[old]??0)+1;
 if(id)this.s.inventory[id]--;this.pet.heldItem=id;
 }
 heal(id){
 if(!this.ready())throw Error('전투 중에는 전투 가방을 이용하세요.');
 const item=ITEMS[id],p=this.pet,max=statsFor(this.db,p.speciesId,p.level,p.ivs).hp;
 if(!medicineUsable(item,{...p,maxHp:max})||!(this.s.inventory[id]>0))throw Error('이 도구를 사용할 수 없어요. 기절한 친구는 식사나 잠으로 회복하세요.');
 this.s.inventory[id]--;p.hp=Math.min(max,p.hp+(item.heal??0));
 }
 consumeEvolution(e){
 const keys=[];if(e.trigger==='trade')keys.push('trade-pass');const id=e.itemId??e.heldItemId;if(id)keys.push('evo-'+id);
 if(keys.some(k=>!(this.s.inventory[k]>0)))throw Error('상점에서 필요한 진화 도구와 교환권을 먼저 구매하세요.');
 for(const k of keys)this.s.inventory[k]--;
 }
 stone(to=null){if(!this.ready())throw Error('진행 중인 일을 먼저 마쳐주세요.');const e=this.species.evolutions.find(e=>e.trigger==='use-item'&&(to===null||e.to===to));if(!e)throw Error('진화의돌을 사용할 수 없습니다.');this.consumeEvolution(e);this.evolveTo(e.to);}
 trade(to){if(!this.ready())throw Error('진행 중인 일을 먼저 마쳐주세요.');const e=this.species.evolutions.find(e=>e.trigger==='trade'&&e.to===to);if(!e)throw Error('교환 진화 대상이 아닙니다.');this.consumeEvolution(e);this.evolveTo(e.to);this.log('NPC에게 맡겼다가 진화한 같은 친구를 돌려받았어요.');}
  recall(moveId,slot){if(!this.ready())throw Error('진행 중인 일을 먼저 마쳐주세요.');const p=this.pet;if(!this.species.learnset.some(m=>m.moveId===moveId&&m.level<=p.level)||p.moves.includes(moveId))throw Error('떠올릴 수 없는 기술입니다.');if(p.moves.length<4)p.moves.push(moveId);else{if(!Number.isInteger(slot)||slot<0||slot>3)throw Error('교체할 기술을 선택하세요.');p.moves[slot]=moveId;}this.log(`${this.species.name}, ${this.db.moves[moveId].name}을 떠올렸어요.`);}
  startBattle(random=Math.random,shinyRandom=Math.random,trainerRandom=Math.random,appearanceRandom=Math.random,abilityRandom=Math.random){
 const error=this.can('battle');if(error)throw Error(error);
 const trainer=this.s.battleCount>=10&&!this.s.lastBattleTrainer&&this.pet.level>1&&trainerRandom()<TRAINER_CHANCE;
 const team=[];for(let n=0;n<(trainer?3:1);n++){
  const level=clamp(this.pet.level-(trainer?1:0)-Math.floor(random()*3),1,100);
  const candidates=encounterPool(this.db,level),id=candidates[Math.floor(random()*candidates.length)];
  const enemy=assignAbility(this.db,makePet(this.db,id,level),abilityRandom);enemy.shiny=shinyRandom()<SHINY_CHANCE;team.push(enemy);
 }
 this.s.fatigue+=35;this.pet.hunger=clamp(this.pet.hunger-18,0,100);
 this.s.battleCount++;this.s.lastBattleTrainer=trainer;
 const appearance=trainer?TRAINERS[Math.floor(appearanceRandom()*TRAINERS.length)]:null;
 const enemy=team[0];this.s.battle={trainerId:appearance?.id??null,introSeen:false,kind:trainer?'trainer':'wild',trainerName:appearance?.name??null,enemyIndex:0,enemyTeam:team,earnedXP:0,player:this.fighter(this.pet),enemy:this.fighter(enemy),originalEnemy:structuredClone(enemy),activeId:this.s.active,turn:1};
 const intro=[];enter(this,this.s.battle.player,this.s.battle.enemy,intro);enter(this,this.s.battle.enemy,this.s.battle.player,intro);this.s.battle.player.enteredTurn=0;this.s.battle.enemy.enteredTurn=0;this.s.battle.abilityLogs=intro;
 this.log(trainer?`${appearance.name}가 포켓몬 3마리로 승부를 걸었어요!`:`야생 ${this.db.pokemon[enemy.speciesId].name}와 만났어요.`);return this.s.battle;
 }
  fighter(p){return {abilitySlot:p.abilitySlot,originalHeldItem:p.heldItem??null,speciesId:p.speciesId,shiny:p.shiny??false,heldItem:p.heldItem??null,friendship:p.friendship??70,level:p.level,ivs:{...(p.ivs??{})},hp:p.hp,maxHp:statsFor(this.db,p.speciesId,p.level,p.ivs).hp,moves:p.moves.map(id=>({id,pp:this.db.moves[id].pp})),stages:{attack:0,defense:0,'special-attack':0,'special-defense':0,speed:0,accuracy:0,evasion:0},status:null,statusTurns:0,confused:0,seeded:false,guard:false,charge:null,lastDamage:0,lastClass:null,recharge:false};}
  canStruggle(f){return !this.usable(f).length||!f.moves.some(x=>this.db.moves[x.id].damageClass!=='status');}
  usable(f){return f.moves.filter(m=>m.pp>0&&m.id!==f.disabledMove);}
  baseStats(f){return statsFor(this.db,f.speciesId,f.level,f.ivs);}
  itemName(id){return ITEMS[id]?.name??id;}
  hasAbility(f,...slugs){return slugs.includes(abilitySlug(this.db,f));}
  effectiveStat(f,key,ignoreStage=false){let n=(f.copiedStats??statsFor(this.db,f.speciesId,f.level,f.ivs))[key],stage=ignoreStage?0:f.stages[key]||0;n*=stage>=0?(2+stage)/2:2/(2-stage);if(key==='speed'&&f.status==='paralysis'&&!this.hasAbility(f,'quick-feet'))n*=.5;if(key==='attack'&&f.status==='burn'&&!this.hasAbility(f,'guts'))n*=.5;return n*statFactor(this,f,key);}
  fighterTypes(f){return f.typeIds??this.db.pokemon[f.speciesId].typeIds;}
  effectiveness(move,defender,attacker=null){if(move.slug==='struggle')return 1;return this.fighterTypes(defender).reduce((n,t)=>n*(attacker&&this.hasAbility(attacker,'scrappy')&&t===8&&[1,2].includes(move.typeId)?1:(this.db.typeChart[move.typeId]?.[t]??1)),1);}
  moveMatchup(move,attacker,defender){
    if(move.damageClass==='status')return '변화 기술 · 직접 피해 없음';
    const effect=this.effectiveness(move,defender,attacker);
    if(effect===0)return '효과 없음 · 0배';
    if(FIXED_DAMAGE.has(move.slug))return '고정·조건부 피해 · 상성 배율 제외';
    const stab=move.slug!=='struggle'&&this.fighterTypes(attacker).includes(move.typeId);
    return `상성 ${effect}배${stab?' · 같은 타입 ×'+(this.hasAbility(attacker,'adaptability')?2:1.5):''} · 특성에 따라 변동`;
  }
  syncPlayer(){const b=this.s.battle;if(b){this.pet.hp=b.player.hp;this.pet.heldItem=b.player.heldItem??null;}}
 enemyMove(random){const e=this.s.battle.enemy,slots=this.usable(e),damaging=slots.filter(m=>this.db.moves[m.id].damageClass!=='status');if(e.charge)return e.charge;if(!slots.length)return -1;if(damaging.length&&random()<.7)return damaging[Math.floor(random()*damaging.length)].id;return slots[Math.floor(random()*slots.length)].id;}
 heldRecovery(f,logs){
 if(f.hp<=0)return;
 const other=this.s.battle?.player===f?this.s.battle.enemy:this.s.battle?.player;if(other&&this.hasAbility(other,'unnerve')&&f.heldItem?.endsWith('-berry'))return;
 const item=ITEMS[f.heldItem];if(item?.cure&&((item.cure==='all'&&(f.status||f.confused>0))||f.status===item.cure)){cureWith(item,f);f.lastConsumedItem=f.heldItem;f.lastBerry=f.heldItem;f.heldItem=null;if(this.hasAbility(f,'unburden'))f.unburden=true;logs.push(`${item.name}로 상태를 치료했어요.`);return;}
 if(f.heldItem==='sitrus-berry'&&f.hp<=f.maxHp/2){f.hp=Math.min(f.maxHp,f.hp+Math.max(1,Math.floor(f.maxHp/4)));f.lastConsumedItem=f.heldItem;f.lastBerry=f.heldItem;f.heldItem=null;if(this.hasAbility(f,'unburden'))f.unburden=true;logs.push('자뭉열매로 HP를 회복했어요.');}
 if(f.heldItem==='oran-berry'&&f.hp<=f.maxHp/2){f.hp=Math.min(f.maxHp,f.hp+10);f.lastConsumedItem=f.heldItem;f.lastBerry=f.heldItem;f.heldItem=null;if(this.hasAbility(f,'unburden'))f.unburden=true;logs.push('오랭열매를 먹고 HP 10을 회복했어요.');}
 }
 attack(a,d,id,who,logs,events,random){
 if(a.hp<=0||d.hp<=0)return;const before=d.hp;this.s.battle.acted??=[];this.s.battle.acted.push(a);delete a.lastHit;this.execute(a,d,id,logs,random);
 const hit=a.lastHit;events.push({who,damage:Math.max(0,before-d.hp),effect:hit?.effect??1,immune:hit?.immune??false});
 this.heldRecovery(a,logs);this.heldRecovery(d,logs);
 }
 act(moveId,random=Math.random){
 const b=this.s.battle;if(!b)throw Error('전투 중이 아닙니다.');const p=b.player,e=b.enemy;
 if(moveId!==-1&&!this.usable(p).some(m=>m.id===moveId))throw Error('이 기술은 사용할 수 없습니다.');if(moveId===-1&&!this.canStruggle(p))throw Error('사용 가능한 기술이 남아 있어요.');
 const em=this.enemyMove(random),pm=p.charge??moveId,priority=id=>id===-1?0:this.db.moves[id].priority;
 const logs=[],events=[];b.acted=[];p.flinch=false;e.flinch=false;p.guard=false;e.guard=false;
 const quickP=p.heldItem==='quick-claw'&&random()<.2,quickE=e.heldItem==='quick-claw'&&random()<.2;
 if(quickP)logs.push('선제공격손톱 발동!');if(quickE)logs.push('상대의 선제공격손톱 발동!');
 let order=priority(pm)!==priority(em)?priority(pm)>priority(em):quickP!==quickE?quickP:this.effectiveStat(p,'speed')===this.effectiveStat(e,'speed')?random()<.5:this.effectiveStat(p,'speed')>this.effectiveStat(e,'speed');
 if(order){this.attack(p,e,pm,'player',logs,events,random);this.attack(e,p,em,'enemy',logs,events,random);}else{this.attack(e,p,em,'enemy',logs,events,random);this.attack(p,e,pm,'player',logs,events,random);}
 return this.endTurn(logs,events,random);
 }
 battleItem(id,random=Math.random){
 const b=this.s.battle,item=ITEMS[id];if(!b||!item||!['ball','medicine'].includes(item.kind)||!(this.s.inventory[id]>0))throw Error('사용할 도구가 없습니다.');
 const logs=[],events=[];
 if(item.kind==='medicine'){
  if(!medicineUsable(item,b.player))throw Error('지금은 회복이 필요하지 않아요.');
  this.s.inventory[id]--;const before=b.player.hp;b.player.hp=Math.min(b.player.maxHp,b.player.hp+(item.heal??0));cureWith(item,b.player);logs.push(`${item.name}: HP ${b.player.hp-before} 회복${item.cure?' · 상태 치료':''}!`);
 }else{
  if(b.kind==='trainer')throw Error('트레이너의 포켓몬은 포획할 수 없어요.');
  if(Object.keys(this.s.pets).length>=MAX_PARTY)throw Error('3마리가 함께하고 있어요. 쉼터에서 자리를 비워주세요.');
  if(b.enemy.hp<=0)throw Error('기절한 상대는 포획할 수 없어요.');
  const chance=captureChance(this.db,b.enemy,id);this.s.inventory[id]--;logs.push(`${item.name}을 던졌어요!`);
  if(random()<chance){
   const pet=structuredClone(b.originalEnemy??makePet(this.db,b.enemy.speciesId,b.enemy.level));pet.hp=b.enemy.hp;pet.shiny=b.enemy.shiny??false;pet.heldItem=null;
   const key=Math.max(0,...Object.keys(this.s.pets).map(Number))+1;this.syncPlayer();this.s.pets[key]=pet;this.s.battle=null;this.log(`${pet.shiny?'★ 이로치 ':''}${this.db.pokemon[pet.speciesId].name} 포획 성공!`);logs.push(this.s.journal[0].text);
   return {logs,events,result:'caught',caughtId:key};
  }logs.push('아쉽게도 볼에서 빠져나왔어요!');
 }
 b.acted=[];b.player.flinch=false;b.enemy.flinch=false;b.player.guard=false;b.enemy.guard=false;this.attack(b.enemy,b.player,this.enemyMove(random),'enemy',logs,events,random);return this.endTurn(logs,events,random);
 }
 battleSwitch(id,random=Math.random){
 const b=this.s.battle;if(!b||id===this.s.active||!this.s.pets[id]||this.s.pets[id].hp<=0)throw Error('교대할 수 없는 친구예요.');
 if(trapped(this,b.player,b.enemy))throw Error('상대 특성 때문에 교대할 수 없어요.');leave(this,b.player);this.syncPlayer();
 if(b.player.transformed){b.player.moves=b.player.originalMoves??this.pet.moves.map(id=>({id,pp:this.db.moves[id].pp}));for(const key of ['transformed','transformedSpeciesId','transformedShiny','typeIds','copiedStats','originalMoves'])delete b.player[key];}
 b.bench??={};b.bench[this.s.active]=b.player;
 this.s.active=Number(id);b.activeId=this.s.active;b.player=b.bench[id]??this.fighter(this.pet);delete b.bench[id];
 b.player.stages={attack:0,defense:0,'special-attack':0,'special-defense':0,speed:0,accuracy:0,evasion:0};b.player.confused=0;b.player.seeded=false;b.player.charge=null;b.player.guard=false;b.enemy.guard=false;
 const logs=[`${this.species.name}, 부탁해!`],events=[];b.acted=[];b.player.flinch=false;b.enemy.flinch=false;enter(this,b.player,b.enemy,logs);this.attack(b.enemy,b.player,this.enemyMove(random),'enemy',logs,events,random);return this.endTurn(logs,events,random);
 }
 endTurn(logs,events,random=Math.random,dropRandom=Math.random){
 const b=this.s.battle,p=b.player,e=b.enemy;
 for(const [a,d] of [[p,e],[e,p]]){if(a.hp<=0)continue;if((a.status==='poison'||a.status==='burn')&&!this.hasAbility(a,'magic-guard')){const n=Math.max(1,Math.floor(a.maxHp/(a.status==='burn'?16:8)));a.hp=Math.max(0,a.hp-n);logs.push(`${this.db.pokemon[a.speciesId].name}: ${a.status==='poison'?'독':'화상'}으로 ${n} 피해!`);}if(a.seeded&&a.hp>0&&d.hp>0&&!this.hasAbility(a,'magic-guard')){const n=Math.min(a.hp,Math.max(1,Math.floor(a.maxHp/8)));a.hp-=n;d.hp=this.hasAbility(a,'liquid-ooze')?Math.max(0,d.hp-n):Math.min(d.maxHp,d.hp+n);logs.push('씨뿌리기가 체력을 흡수했어요.');}if(a.hp>0&&a.hp<a.maxHp&&a.heldItem==='leftovers'){a.hp=Math.min(a.maxHp,a.hp+Math.max(1,Math.floor(a.maxHp/16)));logs.push('먹다남은음식으로 HP를 회복했어요.');}endAbilities(this,a,d,logs,random);this.heldRecovery(a,logs);}
 if(b.weatherTurns>0&&--b.weatherTurns===0){b.weather=null;logs.push('날씨가 원래대로 돌아왔어요.');}
 delete b.acted;this.syncPlayer();b.turn++;
 if(p.hp>0&&e.hp<=0&&b.kind==='trainer'&&b.enemyIndex<2&&b.turn<=180){
  b.earnedXP+=battleExperience(e.level);b.enemyIndex++;
  const next=b.enemyTeam[b.enemyIndex];b.enemy=this.fighter(next);b.originalEnemy=structuredClone(next);enter(this,b.enemy,b.player,logs);b.enemy.enteredTurn=b.turn-1;
  logs.push(`상대 포켓몬을 쓰러뜨렸어요! ${b.trainerName}의 ${next.shiny?'★ 이로치 ':''}${this.db.pokemon[next.speciesId].name} 등장! (${b.enemyIndex+1}/3)`);
  return {logs,events,result:null};
 }
 let result=null;if(p.hp<=0)result='lose';else if(e.hp<=0)result='win';else if(b.turn>(b.kind==='trainer'?180:60))result='draw';
 if(result){this.s.battle=null;if(result==='win'){this.pet.wins++;const reward=b.kind==='trainer'?240:80;this.s.coins+=reward;const xp=(b.earnedXP??0)+battleExperience(e.level);this.log(`전투 승리! 경험치 +${xp}, 모험 포인트 +${reward} P`);this.awardXP(xp);logs.push(`승리! 경험치 ${xp}와 ${reward} P를 받았어요.`);this.rollDrop(logs,dropRandom);}else if(result==='lose'){this.pet.friendship=clamp(this.pet.friendship-3,0,255);this.log('전투에서 졌어요. 다른 친구와 다시 도전하거나 회복하세요.');logs.push('전투 중인 친구가 기절해 쉼터로 돌아왔어요.');}else{this.log('긴 전투를 무승부로 마쳤어요.');logs.push(`${b.kind==='trainer'?180:60}턴이 지나 무승부로 마쳤어요.`);}}
 return {logs,events,result};
 }
 rollDrop(logs,random=Math.random){
  if(random()>=DROP_CHANCE)return null;
  const catalog=shopCatalog(this.db),pool=Object.keys(catalog).filter(id=>catalog[id].drop!==false&&(this.s.inventory[id]??0)<999);
  if(!pool.length){logs.push('가방이 가득 차 드롭 도구를 담지 못했어요.');return null;}
  const id=pool[Math.floor(random()*pool.length)];this.s.inventory[id]=(this.s.inventory[id]??0)+1;
  const text=`도구 발견! ${catalog[id].name} 1개를 얻었어요.`;this.log(text);logs.push(text);return id;
 }
 tmReason(id){
  const t=this.db.tms?.[id];if(!t?.enabled)return '현재 지원하지 않는 기술머신이에요.';
  if(!this.pet||!this.species.tmMoves?.includes(t.moveId))return '이 포켓몬은 배울 수 없어요.';
  if(this.pet.moves.includes(t.moveId))return '이미 알고 있는 기술이에요.';
  return null;
 }
 teachTM(id,slot=null){
  if(!this.ready())throw Error('전투와 성장을 마친 뒤 기술머신을 사용하세요.');
  const error=this.tmReason(id);if(error)throw Error(error);
  if(!(this.s.inventory[id]>0))throw Error('이 기술머신을 가지고 있지 않아요.');
  const p=this.pet,moveId=this.db.tms[id].moveId;
  if(p.moves.length>=4&&(!Number.isInteger(slot)||slot<0||slot>=p.moves.length))throw Error('잊을 기술을 선택하세요.');
  if(p.moves.length<4)p.moves.push(moveId);else p.moves[slot]=moveId;
  this.s.inventory[id]--;this.log(`${this.species.name}, 기술머신으로 ${this.db.moves[moveId].name} 습득!`);
 }
 makeShiny(){
  if(!this.ready())throw Error('전투와 성장을 마친 뒤 사용하세요.');
  if(this.pet.shiny)throw Error('이미 이로치인 친구예요.');
  if(!(this.s.inventory['shiny-stone']>0))throw Error('별빛물약이 없어요.');
  this.s.inventory['shiny-stone']--;this.pet.shiny=true;this.log(`★ ${this.species.name}가 이로치로 바뀌었어요!`);
 }
 changeAbility(id){
  if(!this.ready())throw Error('전투와 성장을 마친 뒤 특성을 바꿀 수 있어요.');
  const target=abilityItemTarget(this.db,this.pet,id);
  if(!target||!(this.s.inventory[id]>0))throw Error('이 포켓몬에게 사용할 수 없는 특성 도구입니다.');
  this.s.inventory[id]--;this.pet.abilitySlot=target.slot;this.log(`${this.species.name}의 특성이 ${this.db.abilities[target.id].name}(으)로 바뀌었어요.`);return target;
 }
 flee(){if(!this.s.battle)return;if(trapped(this,this.s.battle.player,this.s.battle.enemy))throw Error('상대 특성 때문에 도망칠 수 없어요.');this.syncPlayer();this.s.battle=null;this.log('전투에서 돌아왔어요. 소모한 피로도는 유지돼요.');}
  execute(a,d,id,logs,random,reflected=false){
    const name=this.db.pokemon[a.speciesId].name;
    if(!reflected){
    if(a.flinch){a.flinch=false;if(this.hasAbility(a,'steadfast'))changeStage(this,a,'speed',1,a,logs);logs.push(`${name}는 풀죽어 움직이지 못했어요.`);return;}
    if(this.hasAbility(a,'truant')){a.loaf=!a.loaf;if(!a.loaf){logs.push(`${name}는 게으름을 피웠어요.`);return;}}
    if(a.infatuated&&random()<.5){logs.push('헤롱헤롱해 움직이지 못했어요.');return;}

    if(a.recharge){a.recharge=false;logs.push(`${name}는 반동으로 쉬고 있어요.`);return;}
    if(a.status==='sleep'){if(--a.statusTurns>0){logs.push(`${name}는 잠들어 있어요.`);return;}a.status=null;logs.push(`${name}가 깨어났어요.`);}
    if(a.status==='freeze'){if(random()<.2){a.status=null;logs.push(`${name}의 얼음이 녹았어요.`);}else{logs.push(`${name}는 얼어 있어요.`);return;}}
    if(a.status==='paralysis'&&random()<.25){logs.push(`${name}는 몸이 저려 움직이지 못했어요.`);return;}
    if(a.confused>0){a.confused--;if(random()<.33){const n=Math.max(1,Math.floor(a.maxHp/8));a.hp=Math.max(0,a.hp-n);logs.push(`${name}는 혼란으로 자신을 공격했어요.`);return;}}
    }
    let m=id===-1?{id:-1,name:'발버둥',slug:'struggle',power:50,accuracy:null,pp:1,typeId:1,damageClass:'physical',meta:{},statChanges:[]}:this.db.moves[id];
    if(!a.charge&&!reflected){const slot=a.moves.find(x=>x.id===id);if(slot){if(slot.pp<=0){logs.push('PP가 부족해요.');return;}slot.pp=Math.max(0,slot.pp-(this.hasAbility(d,'pressure')&&m.target!=='user'?2:1));}}
    logs.push(`${name}의 ${m.name}!`);
    const slug=m.slug;
    if(['solar-beam','skull-bash','razor-wind','dig','fly','bounce'].includes(slug)&&!a.charge&&!(slug==='solar-beam'&&weather(this)==='sun')){a.charge=id;if(slug==='skull-bash')a.stages.defense=clamp(a.stages.defense+1,-6,6);logs.push('힘을 모으고 있어요. 다음 턴에 공격해요.');return;}a.charge=null;
    if(d.guard&&m.target!=='user'){logs.push('상대가 공격을 막았어요.');return;}
    const accStage=clamp(a.stages.accuracy-(this.hasAbility(a,'keen-eye')?Math.min(0,d.stages.evasion):d.stages.evasion),-6,6),accMult=accStage>=0?(3+accStage)/3:3/(3-accStage);
    if(m.accuracy!==null&&!this.hasAbility(a,'no-guard')&&!this.hasAbility(d,'no-guard')&&random()*100>=(m.damageClass==='status'&&!this.hasAbility(a,'mold-breaker')&&this.hasAbility(d,'wonder-skin')?Math.min(50,m.accuracy):m.accuracy)*accMult*accuracyFactor(this,a,d,m)){logs.push('하지만 빗나갔어요!');return;}
    const effect=this.effectiveness(m,d,a),self=m.target==='user';
    if(!self&&effect===0&&m.damageClass!=='status'){a.lastHit={effect:0,immune:true};logs.push('상대에게 효과가 없어요.');return;}
    if(!self&&m.flags?.includes('reflectable')&&this.hasAbility(d,'magic-bounce')&&!this.hasAbility(a,'mold-breaker')&&!a.reflecting){d.reflecting=true;try{this.execute(d,a,id,logs,random,true);}finally{delete d.reflecting;}return;}
    if(blockMove(this,a,d,m,logs))return;
    const meta=m.meta||{};
    const weatherMoves={'sunny-day':'sun','rain-dance':'rain','sandstorm':'sand','hail':'hail'};
    if(weatherMoves[slug]){this.s.battle.weather=weatherMoves[slug];this.s.battle.weatherTurns=5;logs.push('날씨가 바뀌었어요.');return;}

    if(slug==='transform'){if(!transform(this,a,d,logs))logs.push('변신에 실패했어요.');return;}
    if(slug==='splash'){logs.push('하지만 아무 일도 일어나지 않았어요.');return;}
    if(['protect','detect','endure'].includes(slug)){a.guard=true;logs.push('공격에 대비했어요.');return;}
    if(slug==='rest'&&statusImmune(this,a,'sleep',a)){logs.push('특성 때문에 잠들 수 없어요.');return;}
    if(slug==='rest'){a.hp=a.maxHp;a.status='sleep';a.statusTurns=3;logs.push('HP를 전부 회복하고 잠들었어요.');return;}
    if(slug==='leech-seed'){if(this.fighterTypes(d).includes(12)){logs.push('풀타입에게는 씨뿌리기가 통하지 않아요.');return;}d.seeded=true;logs.push('상대에게 씨앗을 심었어요.');return;}
    if(slug==='belly-drum'){if(a.hp>a.maxHp/2){a.hp-=Math.floor(a.maxHp/2);a.stages.attack=6;logs.push('HP를 줄이고 공격을 최대한 높였어요.');}else logs.push('HP가 부족해요.');return;}
    let did=false;
    if(m.damageClass!=='status'){
      let power=m.power??60;
      if(slug==='return')power=Math.max(1,Math.floor((a.friendship??70)/2.5));
      if(slug==='frustration')power=Math.max(1,Math.floor((255-(a.friendship??70))/2.5));
      if(slug==='facade'&&['poison','burn','paralysis'].includes(a.status))power*=2;
      if(slug==='flail')power=Math.min(200,Math.floor(20*a.maxHp/Math.max(1,a.hp)));
      if(slug==='magnitude')power=[10,30,50,70,90,110,150][Math.floor(random()*7)];
      if(['low-kick','grass-knot'].includes(slug)){let weight=this.db.pokemon[d.transformedSpeciesId??d.speciesId].weightKg;if(this.hasAbility(d,'heavy-metal'))weight*=2;if(this.hasAbility(d,'light-metal'))weight/=2;power=weight<10?20:weight<25?40:weight<50?60:weight<100?80:weight<200?100:120;}
      if(slug==='gyro-ball')power=Math.min(150,Math.floor(25*this.effectiveStat(d,'speed')/Math.max(1,this.effectiveStat(a,'speed')))+1);
      const held=ITEMS[a.heldItem];if(slug!=='struggle'&&!FIXED_DAMAGE.has(slug)){if(held?.boostType===m.typeId)power*=1.2;if(a.heldItem==='muscle-band'&&m.damageClass==='physical'||a.heldItem==='wise-glasses'&&m.damageClass==='special')power*=1.1;}
      const atk=this.effectiveStat(a,m.damageClass==='physical'?'attack':'special-attack',this.hasAbility(d,'unaware')&&!this.hasAbility(a,'mold-breaker')),def=this.effectiveStat(d,m.damageClass==='physical'?'defense':'special-defense',this.hasAbility(a,'unaware'));

      const stab=slug!=='struggle'&&this.fighterTypes(a).includes(m.typeId)?(this.hasAbility(a,'adaptability')?2:1.5):1;
      let damage=Math.max(1,Math.floor(((2*a.level/5+2)*power*atk/Math.max(1,def)/50+2)*stab*effect*(.85+random()*.15)));
      if(!FIXED_DAMAGE.has(slug)&&slug!=='struggle'){
        damage=Math.max(1,Math.floor(damage*damageFactor(this,a,d,m,power,effect)));
        const critical=!(this.hasAbility(d,'battle-armor','shell-armor')&&!this.hasAbility(a,'mold-breaker'))&&random()<(meta.critRate>0?1/8:1/24);
        if(critical){damage=Math.floor(damage*(this.hasAbility(a,'sniper')?2.25:1.5));logs.push('급소에 맞았어요!');if(this.hasAbility(d,'anger-point'))d.stages.attack=6;}
      }
      if(!FIXED_DAMAGE.has(slug)&&slug!=='struggle'){if(a.heldItem==='life-orb')damage=Math.floor(damage*1.3);if(a.heldItem==='expert-belt'&&effect>1)damage=Math.floor(damage*1.2);}
      if(['seismic-toss','night-shade'].includes(slug))damage=a.level;
      if(slug==='dragon-rage')damage=40;if(slug==='sonic-boom')damage=20;if(slug==='super-fang')damage=Math.max(1,Math.floor(d.hp/2));
      if(slug==='endeavor')damage=Math.max(0,d.hp-a.hp);
      if(['fissure','guillotine','horn-drill'].includes(slug)){if(a.level<d.level||random()>.3){logs.push('일격필살에 실패했어요.');return;}damage=d.hp;}
      if(['counter','mirror-coat'].includes(slug)){damage=a.lastClass===(slug==='counter'?'physical':'special')?a.lastDamage*2:0;}
      const hits=meta.minHits?(this.hasAbility(a,'skill-link')?meta.maxHits:meta.minHits+Math.floor(random()*(meta.maxHits-meta.minHits+1))):1;
      if(hits>1)logs.push(`${hits}번 연속 공격!`);
      let totalDamage=0;
      for(let hit=0;hit<hits&&d.hp>0;hit++){
        let hitDamage=damage;
        if(!this.hasAbility(a,'mold-breaker')&&this.hasAbility(d,'sturdy')){
          if(['fissure','guillotine','horn-drill'].includes(slug)){hitDamage=0;logs.push('옹골참이 일격필살을 막았어요.');}
          else if(d.hp===d.maxHp&&hitDamage>=d.hp){hitDamage=d.hp-1;logs.push('옹골참으로 버텼어요!');}
        }
        hitDamage=Math.min(d.hp,hitDamage);d.hp-=hitDamage;totalDamage+=hitDamage;
      }
      damage=totalDamage;a.lastHit={effect:FIXED_DAMAGE.has(slug)?1:effect};d.lastDamage=damage;d.lastClass=m.damageClass;
      afterHit(this,a,d,m,damage,logs,random);
      logs.push(`${damage} 피해! ${FIXED_DAMAGE.has(slug)?'고정·조건부 피해':`상성 ${effect}배${stab>1?' · 같은 타입 1.5배':''}`}${!FIXED_DAMAGE.has(slug)&&effect>1?' 효과가 굉장했어요.':!FIXED_DAMAGE.has(slug)&&effect<1?' 효과가 별로예요.':''}`);
      if(meta.drain>0)a.hp=this.hasAbility(d,'liquid-ooze')&&!this.hasAbility(a,'magic-guard')?Math.max(0,a.hp-Math.floor(damage*meta.drain/100)):Math.min(a.maxHp,a.hp+Math.floor(damage*meta.drain/100));
      if(meta.drain<0&&!this.hasAbility(a,'rock-head','magic-guard'))a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(damage*-meta.drain/100)));
      if(a.hp>0&&damage>0&&a.heldItem==='shell-bell'){a.hp=Math.min(a.maxHp,a.hp+Math.max(1,Math.floor(damage/8)));logs.push('조개껍질방울로 HP를 회복했어요.');}
      if(a.hp>0&&damage>0&&slug!=='struggle'&&a.heldItem==='life-orb'&&!this.hasAbility(a,'magic-guard')&&!sheerForce(this,a,m)){a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.maxHp/10)));logs.push('생명의구슬로 HP를 소모했어요.');}
      if(slug==='struggle')a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.maxHp/4)));
      if(['hyper-beam','giga-impact','blast-burn','hydro-cannon','frenzy-plant'].includes(slug))a.recharge=true;
      did=true;
    }
    if(meta.healing>0){const amount=Math.ceil(a.maxHp*meta.healing/100);a.hp=Math.min(a.maxHp,a.hp+amount);logs.push('HP를 회복했어요.');did=true;}
    for(const change of m.statChanges||[]){const affectsSelf=self||(m.damageClass!=='status'&&(change.change>0||slug==='overheat'));if(m.damageClass!=='status'&&(sheerForce(this,a,m)||!affectsSelf&&!this.hasAbility(a,'mold-breaker')&&this.hasAbility(d,'shield-dust')||random()*100>=(meta.statChance||0)*(this.hasAbility(a,'serene-grace')?2:1)))continue;const target=affectsSelf?a:d;if(!affectsSelf&&(d.heldItem==='clear-amulet'&&change.change<0||d.heldItem==='covert-cloak'&&m.damageClass!=='status')){logs.push(`${ITEMS[d.heldItem].name}이 능력치 변화를 막았어요.`);did=true;continue;}changeStage(this,target,change.stat,change.change,a,logs);logs.push(`${affectsSelf?'자신':'상대'}의 ${change.label} ${change.change>0?'상승':'하락'}!`);did=true;}
    const ailments={1:'paralysis',2:'sleep',3:'freeze',4:'burn',5:'poison',6:'confusion'};
    if(!(m.damageClass!=='status'&&(d.heldItem==='covert-cloak'||sheerForce(this,a,m)||!this.hasAbility(a,'mold-breaker')&&this.hasAbility(d,'shield-dust')))&&ailments[meta.ailment]&&(m.damageClass==='status'||random()*100<(meta.ailmentChance||0)*(this.hasAbility(a,'serene-grace')?2:1))&&d.hp>0){
      const status=ailments[meta.ailment],types=this.fighterTypes(d);
      const immune=statusImmune(this,d,status,a)||(slug==='thunder-wave'&&types.includes(5));
      if(immune)logs.push('상태이상에 걸리지 않았어요.');else inflict(this,d,status,a,logs,status==='sleep'?2+Math.floor(random()*2):0);did=true;
    }
    // Unmodeled field/utility effects are openly simplified; learn levels and four slots stay canonical.
    if(!did){if(['sweet-scent','sand-attack','smokescreen','flash'].includes(slug))d.stages.accuracy=clamp(d.stages.accuracy-1,-6,6);else a.stages['special-defense']=clamp(a.stages['special-defense']+1,-6,6);logs.push('간소화 효과: 전투를 준비했어요. (특수방어 +1 또는 명중률 조정)');}
  }
}
