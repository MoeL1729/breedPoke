// Pure game rules. Canonical data lives in data/pokedex.json; care rules are game-specific.
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function statsFor(db,id,level){
  const s=db.pokemon[id].stats, out={};
  for(const [k,v] of Object.entries(s)) out[k]=Math.floor(2*v*level/100)+(k==='hp'?level+10:5);
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
export function makePet(db,id,level=10){return {speciesId:id,level,exp:db.experience[db.pokemon[id].growthRateId][level],hp:statsFor(db,id,level).hp,hunger:75,friendship:db.pokemon[id].baseFriendship,moves:initialMoves(db,id,level),wins:0};}
export function freshState(db){return {schemaVersion:2,hatched:false,active:null,day:1,fatigue:0,coins:100,pets:{},journal:[{day:1,text:'작은 알 하나가 도착했어요. 어떤 친구가 기다릴까요?'}],battle:null,pending:[],progressing:false};}
export function migrateState(db,state){
  if(state?.schemaVersion!==1)return state;
  validateState(db,{...state,battle:null,pending:[],progressing:false});
  return {...state,schemaVersion:2,hatched:true,pets:{[state.active]:state.pets[state.active]}};
}
export function validateState(db,s){
  if(!s||![1,2].includes(s.schemaVersion)||(s.schemaVersion===1||s.hatched?!db.starterIds.includes(s.active):s.active!==null)||!Number.isInteger(s.day)||s.day<1||!Number.isFinite(s.fatigue)||s.fatigue<0||s.fatigue>100||!Number.isFinite(s.coins)||s.coins<0)throw Error('올바른 저장 파일이 아닙니다.');
  if(s.schemaVersion===2){if(typeof s.hatched!=='boolean'||!s.pets||Object.keys(s.pets).length!==(s.hatched?1:0)||(s.hatched&&!s.pets[s.active])||(!s.hatched&&(s.battle||s.pending?.length||s.progressing)))throw Error('부화 정보가 올바르지 않습니다.');}
  for(const id of s.schemaVersion===1?db.starterIds:s.hatched?[s.active]:[]){const p=s.pets?.[id],spec=db.pokemon[p?.speciesId];if(!p||!spec||!db.pokemon[id].family.includes(p.speciesId)||!Number.isInteger(p.level)||p.level<1||p.level>100||!Array.isArray(p.moves)||p.moves.length>4||new Set(p.moves).size!==p.moves.length||p.moves.some(m=>!db.moves[m])||![p.hp,p.hunger,p.friendship,p.exp,p.wins].every(Number.isFinite)||p.hp<0||p.hp>statsFor(db,p.speciesId,p.level).hp||p.hunger<0||p.hunger>100||p.friendship<0||p.friendship>255||p.exp<0)throw Error('포켓몬 저장 정보가 손상됐습니다.');}
  if(!Array.isArray(s.journal)||!Array.isArray(s.pending))throw Error('저장 형식을 확인할 수 없습니다.');
  // Backups are deliberately only accepted outside combat / pending choices.
  if(s.battle||s.pending.length||s.progressing)throw Error('전투와 성장을 마친 뒤 만든 백업을 사용해 주세요.');
  return s;
}
export class Game{
  constructor(db,state){this.db=db;this.s=state?migrateState(db,state):freshState(db);}
  get pet(){return this.s.pets[this.s.active];} get species(){return this.db.pokemon[this.pet.speciesId];}
  log(text){this.s.journal.unshift({day:this.s.day,text});this.s.journal=this.s.journal.slice(0,30);}
  ready(){return this.s.hatched&&!this.s.battle&&!this.s.pending.length&&!this.s.progressing;}
  hatch(random=Math.random){if(this.s.hatched)return false;const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw Error('잘못된 난수입니다.');const id=this.db.starterIds[Math.floor(value*this.db.starterIds.length)];this.s.active=id;this.s.pets={[id]:makePet(this.db,id)};this.s.hatched=true;this.log(`${this.species.name}가 알에서 태어났어요! 이제 둘만의 모험을 시작해요.`);return id;}
  switch(id){return this.s.hatched&&this.s.active===id&&this.ready();}
  can(action){if(!this.ready())return '지금 진행 중인 일을 먼저 마쳐주세요.';if(action==='battle'){if(this.s.fatigue+35>100)return '오늘은 많이 피곤해요. 잠을 자고 다시 도전하세요.';if(this.pet.hp<=0)return 'HP를 회복한 뒤 전투할 수 있어요.';if(this.pet.hunger<15)return '배가 고파요. 먼저 밥을 먹여주세요.';}if(action==='feed'&&this.s.fatigue+15>100)return '식사할 기운도 부족해요. 잠을 자고 내일 먹어요.';return null;}
  feed(){const e=this.can('feed');if(e)throw Error(e);const p=this.pet;this.s.fatigue+=15;p.hunger=clamp(p.hunger+35,0,100);p.hp=clamp(p.hp+Math.ceil(statsFor(this.db,p.speciesId,p.level).hp*.3),0,statsFor(this.db,p.speciesId,p.level).hp);p.friendship=clamp(p.friendship+12,0,255);this.log(`${this.species.name}에게 밥을 주었어요. 친밀도 +12`);}
  sleep(){const e=this.can('sleep');if(e)throw Error(e);this.s.day++;this.s.fatigue=0;for(const p of Object.values(this.s.pets)){p.hp=statsFor(this.db,p.speciesId,p.level).hp;p.hunger=clamp(p.hunger-12,0,100);}this.pet.friendship=clamp(this.pet.friendship+3,0,255);this.log('친구가 푹 잤어요. 피로와 HP를 회복하고 새 아침을 맞았어요.');}
  nextXp(p=this.pet){return p.level>=100?null:this.db.experience[this.db.pokemon[p.speciesId].growthRateId][p.level+1];}
  awardXP(amount){this.pet.exp=Math.min(this.db.experience[this.species.growthRateId][100],this.pet.exp+amount);this.s.progressing=true;this.progress();}
  progress(){
    if(this.s.pending.length)return this.s.pending[0];
    const p=this.pet;if(p.level>=100||p.exp<this.nextXp()){this.s.progressing=false;return null;}
    const oldHP=statsFor(this.db,p.speciesId,p.level).hp;p.level++;p.hp=clamp(p.hp+statsFor(this.db,p.speciesId,p.level).hp-oldHP,0,statsFor(this.db,p.speciesId,p.level).hp);p.friendship=clamp(p.friendship+5,0,255);this.log(`${this.species.name}, 레벨 ${p.level} 달성!`);
    for(const m of this.species.learnset.filter(m=>m.level===p.level&&!p.moves.includes(m.moveId)))if(!this.s.pending.some(e=>e.kind==='move'&&e.moveId===m.moveId))this.s.pending.push({kind:'move',moveId:m.moveId,level:p.level});
    const e=this.species.evolutions.find(e=>e.trigger==='level-up'&&p.level>=(e.minLevel||1)&&p.friendship>=(e.minFriendship||0));
    if(e)this.s.pending.push({kind:'evolution',to:e.to,from:p.speciesId});
    return this.s.pending[0]??this.progress();
  }
  chooseMove(slot){const event=this.s.pending[0];if(event?.kind!=='move')throw Error('학습할 기술이 없습니다.');const p=this.pet;if(slot!==null){if(p.moves.includes(event.moveId))throw Error('이미 알고 있는 기술입니다.');if(p.moves.length<4)p.moves.push(event.moveId);else{if(!Number.isInteger(slot)||slot<0||slot>3)throw Error('교체할 기술을 선택하세요.');p.moves[slot]=event.moveId;}this.log(`${this.species.name}, ${this.db.moves[event.moveId].name} 습득!`);}else this.log(`${this.db.moves[event.moveId].name} 배우기를 건너뛰었어요.`);this.s.pending.shift();return this.progress();}
  evolveTo(to){const p=this.pet,old=this.species,oldHp=statsFor(this.db,p.speciesId,p.level).hp;p.speciesId=to;p.hp=clamp(p.hp+statsFor(this.db,to,p.level).hp-oldHp,0,statsFor(this.db,to,p.level).hp);this.log(`${old.name} → ${this.species.name}! 진화했어요.`);}
  chooseEvolution(accept){const e=this.s.pending[0];if(e?.kind!=='evolution')throw Error('진화할 수 없습니다.');this.s.pending.shift();if(accept){this.evolveTo(e.to);const learned=this.species.learnset.filter(m=>m.level===this.pet.level&&!this.pet.moves.includes(m.moveId));this.s.pending.unshift(...learned.map(m=>({kind:'move',moveId:m.moveId,level:this.pet.level})));}else this.log(`${this.species.name}의 진화를 다음 레벨업으로 미뤘어요.`);return this.progress();}
  stone(){if(!this.ready())throw Error('진행 중인 일을 먼저 마쳐주세요.');const e=this.species.evolutions.find(e=>e.trigger==='use-item');if(!e)throw Error('진화의돌을 사용할 수 없습니다.');if(this.s.coins<300)throw Error('모험 포인트 300 P가 필요해요.');this.s.coins-=300;this.evolveTo(e.to);}
  recall(moveId,slot){if(!this.ready())throw Error('진행 중인 일을 먼저 마쳐주세요.');const p=this.pet;if(!this.species.learnset.some(m=>m.moveId===moveId&&m.level<=p.level)||p.moves.includes(moveId))throw Error('떠올릴 수 없는 기술입니다.');if(p.moves.length<4)p.moves.push(moveId);else{if(!Number.isInteger(slot)||slot<0||slot>3)throw Error('교체할 기술을 선택하세요.');p.moves[slot]=moveId;}this.log(`${this.species.name}, ${this.db.moves[moveId].name}을 떠올렸어요.`);}
  startBattle(random=Math.random){const error=this.can('battle');if(error)throw Error(error);this.s.fatigue+=35;this.pet.hunger=clamp(this.pet.hunger-18,0,100);const candidates=this.db.starterIds.filter(id=>id!==this.s.active);const id=candidates[Math.floor(random()*candidates.length)];const level=Math.max(3,this.pet.level-1-Math.floor(random()*2));const enemy=makePet(this.db,id,level);this.s.battle={player:this.fighter(this.pet),enemy:this.fighter(enemy),turn:1};this.log(`야생 ${this.db.pokemon[id].name}와 만났어요.`);return this.s.battle;}
  fighter(p){return {speciesId:p.speciesId,level:p.level,hp:p.hp,maxHp:statsFor(this.db,p.speciesId,p.level).hp,moves:p.moves.map(id=>({id,pp:this.db.moves[id].pp})),stages:{attack:0,defense:0,'special-attack':0,'special-defense':0,speed:0,accuracy:0,evasion:0},status:null,statusTurns:0,confused:0,seeded:false,guard:false,charge:null,lastDamage:0,lastClass:null,recharge:false};}
  usable(f){return f.moves.filter(m=>m.pp>0);}
  effectiveStat(f,key){let n=statsFor(this.db,f.speciesId,f.level)[key],stage=f.stages[key]||0;n*=stage>=0?(2+stage)/2:2/(2-stage);if(key==='speed'&&f.status==='paralysis')n*=.25;if(key==='attack'&&f.status==='burn')n*=.5;return n;}
  effectiveness(move,defender){return this.db.pokemon[defender.speciesId].typeIds.reduce((n,t)=>n*(this.db.typeChart[move.typeId]?.[t]??1),1);}
  act(moveId,random=Math.random){
    const b=this.s.battle;if(!b)throw Error('전투 중이 아닙니다.');const p=b.player,e=b.enemy;
    const usable=this.usable(p);if(moveId!==-1&&!usable.some(m=>m.id===moveId))throw Error('이 기술은 사용할 수 없습니다.');if(moveId===-1&&usable.length)throw Error('사용 가능한 기술이 남아 있어요.');
    const enemyMoves=this.usable(e);let em=enemyMoves.length?enemyMoves[Math.floor(random()*enemyMoves.length)].id:-1;
    // Wild opponents prefer a damaging move, but still use their authentic learnset.
    const damaging=enemyMoves.filter(m=>this.db.moves[m.id].damageClass!=='status');if(damaging.length&&random()<.7)em=damaging[Math.floor(random()*damaging.length)].id;
    const pm=p.charge??moveId;em=e.charge??em;
    const priority=id=>id===-1?0:this.db.moves[id].priority;
    let order=priority(pm)!==priority(em)?priority(pm)>priority(em):this.effectiveStat(p,'speed')>=this.effectiveStat(e,'speed');
    const logs=[],events=[];p.guard=false;e.guard=false;
    const attack=(a,d,id,who)=>{if(a.hp<=0||d.hp<=0)return;const before=d.hp;this.execute(a,d,id,logs,random);events.push({who,damage:Math.max(0,before-d.hp)});};
    if(order){attack(p,e,pm,'player');attack(e,p,em,'enemy');}else{attack(e,p,em,'enemy');attack(p,e,pm,'player');}
    for(const [a,d] of [[p,e],[e,p]]){if(a.hp<=0)continue;if(a.status==='poison'||a.status==='burn'){const n=Math.max(1,Math.floor(a.maxHp/8));a.hp=Math.max(0,a.hp-n);logs.push(`${this.db.pokemon[a.speciesId].name}: ${a.status==='poison'?'독':'화상'}으로 ${n} 피해!`);}if(a.seeded&&d.hp>0){const n=Math.min(a.hp,Math.max(1,Math.floor(a.maxHp/8)));a.hp-=n;d.hp=Math.min(d.maxHp,d.hp+n);logs.push('씨뿌리기가 체력을 흡수했어요.');}}
    this.pet.hp=p.hp;b.turn++;
    let result=null;if(p.hp<=0)result='lose';else if(e.hp<=0)result='win';else if(b.turn>60)result='draw';
    if(result){this.s.battle=null;if(result==='win'){this.pet.wins++;this.s.coins+=80;const xp=40+e.level*e.level*3;this.log(`전투 승리! 경험치 +${xp}, 모험 포인트 +80 P`);this.awardXP(xp);logs.push(`승리! 경험치 ${xp}와 80 P를 받았어요.`);}else if(result==='lose'){this.pet.friendship=clamp(this.pet.friendship-3,0,255);this.log('전투에서 졌어요. 맛있는 밥과 휴식이 필요해요.');logs.push('지금은 쉬어갈 시간이에요. 밥이나 잠으로 회복하세요.');}else{this.log('긴 전투를 무승부로 마쳤어요.');logs.push('60턴이 지나 무승부로 마쳤어요.');}}
    return {logs,events,result};
  }
  flee(){if(!this.s.battle)return;this.pet.hp=this.s.battle.player.hp;this.s.battle=null;this.log('전투에서 돌아왔어요. 소모한 피로도는 유지돼요.');}
  execute(a,d,id,logs,random){
    const name=this.db.pokemon[a.speciesId].name;
    if(a.recharge){a.recharge=false;logs.push(`${name}는 반동으로 쉬고 있어요.`);return;}
    if(a.status==='sleep'){if(--a.statusTurns>0){logs.push(`${name}는 잠들어 있어요.`);return;}a.status=null;logs.push(`${name}가 깨어났어요.`);}
    if(a.status==='freeze'){if(random()<.2){a.status=null;logs.push(`${name}의 얼음이 녹았어요.`);}else{logs.push(`${name}는 얼어 있어요.`);return;}}
    if(a.status==='paralysis'&&random()<.25){logs.push(`${name}는 몸이 저려 움직이지 못했어요.`);return;}
    if(a.confused>0){a.confused--;if(random()<.33){const n=Math.max(1,Math.floor(a.maxHp/8));a.hp=Math.max(0,a.hp-n);logs.push(`${name}는 혼란으로 자신을 공격했어요.`);return;}}
    let m=id===-1?{id:-1,name:'발버둥',slug:'struggle',power:50,accuracy:null,pp:1,typeId:1,damageClass:'physical',meta:{},statChanges:[]}:this.db.moves[id];
    if(!a.charge){const slot=a.moves.find(x=>x.id===id);if(slot){if(slot.pp<=0){logs.push('PP가 부족해요.');return;}slot.pp--;}}
    logs.push(`${name}의 ${m.name}!`);
    const slug=m.slug;
    if(['solar-beam','skull-bash','razor-wind','dig','fly','bounce'].includes(slug)&&!a.charge){a.charge=id;if(slug==='skull-bash')a.stages.defense=clamp(a.stages.defense+1,-6,6);logs.push('힘을 모으고 있어요. 다음 턴에 공격해요.');return;}a.charge=null;
    if(d.guard&&m.target!=='user'){logs.push('상대가 공격을 막았어요.');return;}
    const accStage=clamp(a.stages.accuracy-d.stages.evasion,-6,6),accMult=accStage>=0?(3+accStage)/3:3/(3-accStage);
    if(m.accuracy!==null&&random()*100>=m.accuracy*accMult){logs.push('하지만 빗나갔어요!');return;}
    const effect=this.effectiveness(m,d),self=m.target==='user';
    if(!self&&effect===0&&m.damageClass!=='status'){logs.push('상대에게 효과가 없어요.');return;}
    const meta=m.meta||{};
    if(slug==='splash'){logs.push('하지만 아무 일도 일어나지 않았어요.');return;}
    if(['protect','detect','endure'].includes(slug)){a.guard=true;logs.push('공격에 대비했어요.');return;}
    if(slug==='rest'){a.hp=a.maxHp;a.status='sleep';a.statusTurns=3;logs.push('HP를 전부 회복하고 잠들었어요.');return;}
    if(slug==='leech-seed'){if(this.db.pokemon[d.speciesId].typeIds.includes(12)){logs.push('풀타입에게는 씨뿌리기가 통하지 않아요.');return;}d.seeded=true;logs.push('상대에게 씨앗을 심었어요.');return;}
    if(slug==='belly-drum'){if(a.hp>a.maxHp/2){a.hp-=Math.floor(a.maxHp/2);a.stages.attack=6;logs.push('HP를 줄이고 공격을 최대한 높였어요.');}else logs.push('HP가 부족해요.');return;}
    let did=false;
    if(m.damageClass!=='status'){
      let power=m.power??60;
      if(slug==='return')power=Math.max(1,Math.floor(this.pet.friendship/2.5));
      if(slug==='frustration')power=Math.max(1,Math.floor((255-this.pet.friendship)/2.5));
      if(slug==='flail')power=Math.min(200,Math.floor(20*a.maxHp/Math.max(1,a.hp)));
      if(slug==='magnitude')power=[10,30,50,70,90,110,150][Math.floor(random()*7)];
      if(slug==='gyro-ball')power=Math.min(150,Math.floor(25*this.effectiveStat(d,'speed')/Math.max(1,this.effectiveStat(a,'speed')))+1);
      const atk=this.effectiveStat(a,m.damageClass==='physical'?'attack':'special-attack'),def=this.effectiveStat(d,m.damageClass==='physical'?'defense':'special-defense');
      const stab=this.db.pokemon[a.speciesId].typeIds.includes(m.typeId)?1.5:1;
      let damage=Math.max(1,Math.floor(((2*a.level/5+2)*power*atk/Math.max(1,def)/50+2)*stab*effect*(.85+random()*.15)));
      if(['seismic-toss','night-shade'].includes(slug))damage=a.level;
      if(slug==='dragon-rage')damage=40;if(slug==='sonic-boom')damage=20;if(slug==='super-fang')damage=Math.max(1,Math.floor(d.hp/2));
      if(slug==='endeavor')damage=Math.max(0,d.hp-a.hp);
      if(slug==='fissure'){if(a.level<d.level||random()>.3){logs.push('일격필살에 실패했어요.');return;}damage=d.hp;}
      if(['counter','mirror-coat'].includes(slug)){damage=a.lastClass===(slug==='counter'?'physical':'special')?a.lastDamage*2:0;}
      if(meta.minHits){const hits=meta.minHits+Math.floor(random()*(meta.maxHits-meta.minHits+1));damage*=hits;logs.push(`${hits}번 연속 공격!`);}
      damage=Math.min(d.hp,damage);d.hp-=damage;d.lastDamage=damage;d.lastClass=m.damageClass;
      logs.push(`${damage} 피해!${effect>1?' 효과가 굉장했어요.':effect<1?' 효과가 별로예요.':''}`);
      if(meta.drain>0)a.hp=Math.min(a.maxHp,a.hp+Math.floor(damage*meta.drain/100));
      if(meta.drain<0)a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(damage*-meta.drain/100)));
      if(slug==='struggle')a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.maxHp/4)));
      if(['hyper-beam','giga-impact','blast-burn','hydro-cannon','frenzy-plant'].includes(slug))a.recharge=true;
      did=true;
    }
    if(meta.healing>0){const amount=Math.ceil(a.maxHp*meta.healing/100);a.hp=Math.min(a.maxHp,a.hp+amount);logs.push('HP를 회복했어요.');did=true;}
    for(const change of m.statChanges||[]){if(m.damageClass!=='status'&&random()*100>=(meta.statChance||0))continue;const target=self?a:d;target.stages[change.stat]=clamp((target.stages[change.stat]||0)+change.change,-6,6);logs.push(`${self?'자신':'상대'}의 ${change.label} ${change.change>0?'상승':'하락'}!`);did=true;}
    const ailments={1:'paralysis',2:'sleep',3:'freeze',4:'burn',5:'poison',6:'confusion'};
    if(ailments[meta.ailment]&&(m.damageClass==='status'||random()*100<(meta.ailmentChance||0))&&d.hp>0){
      const status=ailments[meta.ailment],types=this.db.pokemon[d.speciesId].typeIds;
      const immune=(status==='burn'&&types.includes(10))||(status==='freeze'&&types.includes(15))||(status==='poison'&&(types.includes(4)||types.includes(9)))||(slug==='thunder-wave'&&types.includes(5));
      if(immune)logs.push('상태이상에 걸리지 않았어요.');else if(status==='confusion'){d.confused=3;logs.push('상대가 혼란에 빠졌어요.');}else if(!d.status){d.status=status;d.statusTurns=status==='sleep'?2+Math.floor(random()*2):0;logs.push('상대에게 상태이상이 생겼어요.');}did=true;
    }
    // Unmodeled field/utility effects are openly simplified; learn levels and four slots stay canonical.
    if(!did){if(['sweet-scent','sand-attack','smokescreen','flash'].includes(slug))d.stages.accuracy=clamp(d.stages.accuracy-1,-6,6);else a.stages['special-defense']=clamp(a.stages['special-defense']+1,-6,6);logs.push('간소화 효과: 전투를 준비했어요. (특수방어 +1 또는 명중률 조정)');}
  }
}
