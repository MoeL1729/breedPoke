// Gen-7-style singles hooks for the mechanics available in POkegotchi.
export const HIDDEN_CHANCE=.03, DROP_CHANCE=.01;
export const options=(db,id)=>db.pokemon[id]?.abilities??[];
export const abilityOf=(db,p)=>{
 const list=options(db,p.speciesId),entry=list.find(a=>a.slot===p.abilitySlot)??list.find(a=>!a.hidden);
 return p.copiedAbilityId?db.abilities?.[p.copiedAbilityId]:entry?{...db.abilities?.[entry.id],hidden:entry.hidden,slot:entry.slot}:null;
};
export const abilitySlug=(db,p)=>abilityOf(db,p)?.slug??'';
export function assignAbility(db,p,random=Math.random){
 const list=options(db,p.speciesId),hidden=list.find(a=>a.hidden),normal=list.filter(a=>!a.hidden);
 if(!normal.length)return p;
 const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw Error('특성 추첨 난수가 올바르지 않습니다.');
 const selected=hidden&&r<HIDDEN_CHANCE?hidden:normal[Math.min(normal.length-1,Math.floor((hidden?(r-HIDDEN_CHANCE)/(1-HIDDEN_CHANCE):r)*normal.length))];
 p.abilitySlot=selected.slot;return p;
}
export function abilityItemTarget(db,p,item){
 const list=options(db,p.speciesId),current=abilityOf(db,p),normal=list.filter(a=>!a.hidden);
 if(item==='ability-capsule')return !current?.hidden?normal.find(a=>a.id!==current?.id)??null:null;
 if(item==='ability-patch')return current?.hidden?normal[0]??null:list.find(a=>a.hidden&&a.id!==current?.id)??null;
 return null;
}
const clamp=(n)=>Math.max(-6,Math.min(6,n));
const has=(g,p,...slugs)=>slugs.includes(abilitySlug(g.db,p));
const active=(g,p,attacker,...slugs)=>!has(g,attacker,'mold-breaker')&&has(g,p,...slugs);
const heal=(f,n)=>{if(f.hp>0)f.hp=Math.min(f.maxHp,f.hp+Math.max(1,Math.floor(n)));};
const chip=(g,f,n)=>{if(!has(g,f,'magic-guard'))f.hp=Math.max(0,f.hp-Math.max(1,Math.floor(n)));};
const announce=(g,f,logs,text)=>logs.push(`${g.db.pokemon[f.speciesId].name} · ${abilityOf(g.db,f)?.name??'특성'}: ${text}`);
export function weather(g){const b=g.s.battle;if(!b)return null;return [b.player,b.enemy].some(f=>f.hp>0&&has(g,f,'cloud-nine'))?null:b.weather;}
export function changeStage(g,f,key,delta,source,logs){
 const hostile=source!==f;
 if(hostile&&delta<0&&(f.heldItem==='clear-amulet'||active(g,f,source,'clear-body')||key==='attack'&&active(g,f,source,'hyper-cutter')||key==='defense'&&active(g,f,source,'big-pecks')||key==='accuracy'&&active(g,f,source,'keen-eye'))){logs.push('특성·도구가 능력치 하락을 막았어요.');return false;}
 const old=f.stages[key]??0;f.stages[key]=clamp(old+delta);
 if(hostile&&f.stages[key]<old){if(has(g,f,'defiant'))f.stages.attack=clamp(f.stages.attack+2);if(has(g,f,'competitive'))f.stages['special-attack']=clamp(f.stages['special-attack']+2);}
 return f.stages[key]!==old;
}
export function statusImmune(g,f,status,source=f){
 if(status==='confusion'&&active(g,f,source,'own-tempo'))return true;
 const w=weather(g);
 return active(g,f,source,'leaf-guard')&&w==='sun'||status==='paralysis'&&(g.fighterTypes(f).includes(13)||active(g,f,source,'limber'))||status==='sleep'&&active(g,f,source,'insomnia','vital-spirit')||status==='poison'&&(g.fighterTypes(f).some(t=>[4,9].includes(t))||active(g,f,source,'immunity'))||status==='burn'&&(g.fighterTypes(f).includes(10)||active(g,f,source,'water-veil'))||status==='freeze'&&(g.fighterTypes(f).includes(15)||w==='sun');
}
export function inflict(g,f,status,source,logs,turns=3,reflect=true){
 if(f.hp<=0||statusImmune(g,f,status,source)||status!=='confusion'&&f.status)return false;
 if(status==='confusion')f.confused=3;else{f.status=status;f.statusTurns=status==='sleep'&&has(g,f,'early-bird')?Math.ceil(turns/2):turns;}
 logs.push(`${g.db.pokemon[f.speciesId].name}에게 ${ {poison:'독',burn:'화상',paralysis:'마비',sleep:'잠듦',freeze:'얼음',confusion:'혼란'}[status]}!`);
 if(reflect&&source!==f&&has(g,f,'synchronize')&&['poison','burn','paralysis'].includes(status))inflict(g,source,status,f,logs,0,false);
 return true;
}
export function transform(g,a,d,logs){
 if(a.transformed||d.transformed)return false;
 a.originalMoves=structuredClone(a.moves);a.transformedShiny=d.shiny;a.transformed=true;a.transformedSpeciesId=d.speciesId;
 a.typeIds=[...g.fighterTypes(d)];a.copiedStats={...(d.copiedStats??g.baseStats(d))};a.stages={...d.stages};a.moves=d.moves.map(x=>({id:x.id,pp:5}));a.copiedAbilityId=abilityOf(g.db,d)?.id;
 logs.push('상대의 타입·능력치·기술·특성을 복사했어요. HP와 레벨은 유지돼요.');return true;
}
export function enter(g,f,other,logs,copy=true){
 if(f.hp<=0)return;
 const slug=abilitySlug(g.db,f);
 if(slug==='trace'&&copy&&!has(g,other,'trace','imposter')){f.copiedAbilityId=abilityOf(g.db,other)?.id;announce(g,f,logs,'상대 특성을 복사했어요.');enter(g,f,other,logs,false);}
 if(slug==='imposter')transform(g,f,other,logs);
 if(slug==='drought'){g.s.battle.weather='sun';g.s.battle.weatherTurns=5;announce(g,f,logs,'햇살이 강해졌어요.');}
 if(slug==='intimidate'){if(changeStage(g,other,'attack',-1,f,logs))announce(g,f,logs,'상대 공격 하락!');}
 if(slug==='download'){const key=g.effectiveStat(other,'defense')<g.effectiveStat(other,'special-defense')?'attack':'special-attack';changeStage(g,f,key,1,f,logs);announce(g,f,logs,'능력치 상승!');}
 if(slug==='frisk')announce(g,f,logs,other.heldItem?`상대 도구: ${g.itemName(other.heldItem)}`:'상대가 도구를 지니지 않았어요.');
 if(slug==='forewarn'){const m=other.moves.map(x=>g.db.moves[x.id]).sort((a,b)=>(b.power??0)-(a.power??0))[0];if(m)announce(g,f,logs,`상대 기술 ${m.name}을 간파했어요.`);}
 if(slug==='anticipation'&&other.moves.some(x=>g.effectiveness(g.db.moves[x.id],f)>1))announce(g,f,logs,'위험한 기술을 감지했어요.');
 f.enteredTurn=g.s.battle?.turn??1;
}
export function leave(g,f){
 if(has(g,f,'natural-cure')){f.status=null;f.statusTurns=0;}
 if(has(g,f,'regenerator'))heal(f,f.maxHp/3);
 delete f.copiedAbilityId;delete f.flashFire;delete f.unburden;delete f.loaf;delete f.disabledMove;delete f.disabledTurns;
}
export function statFactor(g,f,key){
 let mult=1;const a=abilitySlug(g.db,f),w=weather(g);
 if(key==='speed'){
  if((a==='swift-swim'&&w==='rain')||(a==='chlorophyll'&&w==='sun')||(a==='sand-rush'&&w==='sand')||(a==='unburden'&&f.unburden))mult*=2;
  if(a==='quick-feet'&&f.status)mult*=1.5;
 }
 if(key==='attack'&&a==='hustle')mult*=1.5;
 if(key==='attack'&&a==='guts'&&f.status)mult*=1.5;
 if(key==='defense'&&a==='marvel-scale'&&f.status)mult*=1.5;
 if(key==='special-attack'&&a==='solar-power'&&w==='sun')mult*=1.5;
 return mult;
}
export function accuracyFactor(g,a,d,m){
 let n=has(g,a,'compound-eyes')?1.3:1;if(has(g,a,'hustle')&&m.damageClass==='physical')n*=.8;
 if(active(g,d,a,'sand-veil')&&weather(g)==='sand'||active(g,d,a,'snow-cloak')&&weather(g)==='hail')n*=.8;
 if(active(g,d,a,'tangled-feet')&&d.confused>0)n*=.5;
 return n;
}
export function blockMove(g,a,d,m,logs){
 if(m.slug==='struggle'||m.target==='user')return false;
 const type=m.typeId;
 let blocked=type===5&&active(g,d,a,'levitate')||m.flags?.includes('sound')&&active(g,d,a,'soundproof')||m.flags?.includes('powder')&&(active(g,d,a,'overcoat')||g.fighterTypes(d).includes(12));
 if(type===11&&active(g,d,a,'water-absorb','dry-skin')||type===13&&active(g,d,a,'volt-absorb')){heal(d,d.maxHp/4);blocked=true;}
 if(type===13&&active(g,d,a,'lightning-rod','motor-drive')){changeStage(g,d,has(g,d,'motor-drive')?'speed':'special-attack',1,d,logs);blocked=true;}
 if(type===10&&active(g,d,a,'flash-fire')){d.flashFire=true;blocked=true;}
 if(['explosion','self-destruct'].includes(m.slug)&&[a,d].some(f=>active(g,f,a,'damp')))blocked=true;
 if(blocked){a.lastHit={effect:0,immune:true};announce(g,d,logs,'기술을 막았어요.');}
 return blocked;
}
export function damageFactor(g,a,d,m,power,effect){
 let n=1;const ab=abilitySlug(g.db,a),w=weather(g);
 if(m.slug==='struggle')return n;
 if((ab==='overgrow'&&m.typeId===12||ab==='blaze'&&m.typeId===10||ab==='torrent'&&m.typeId===11||ab==='swarm'&&m.typeId===7)&&a.hp<=a.maxHp/3)n*=1.5;
 if(ab==='technician'&&power<=60)n*=1.5;
 if(ab==='iron-fist'&&m.flags?.includes('punch'))n*=1.2;
 if(ab==='reckless'&&m.meta?.drain<0)n*=1.2;
 if(ab==='tinted-lens'&&effect<1)n*=2;
 if(ab==='analytic'&&g.s.battle?.acted?.includes(d))n*=1.3;
 if(ab==='sand-force'&&w==='sand'&&[5,6,9].includes(m.typeId))n*=1.3;
 if(a.flashFire&&m.typeId===10)n*=1.5;
 if(sheerForce(g,a,m))n*=1.3;
 if(active(g,d,a,'thick-fat')&&[10,15].includes(m.typeId))n*=.5;
 if(active(g,d,a,'dry-skin')&&m.typeId===10)n*=1.25;
 if(active(g,d,a,'multiscale')&&d.hp===d.maxHp)n*=.5;
 if(active(g,d,a,'filter')&&effect>1)n*=.75;
 if(w==='sun')n*=m.typeId===10?1.5:m.typeId===11?.5:1;
 if(w==='rain')n*=m.typeId===11?1.5:m.typeId===10?.5:1;
 return n;
}
export function sheerForce(g,a,m){return has(g,a,'sheer-force')&&m.damageClass!=='status'&&(m.meta?.ailmentChance>0||m.meta?.statChance>0||m.meta?.flinchChance>0);}
export function afterHit(g,a,d,m,damage,logs,random){
 if(damage<=0)return;
 const contact=m.flags?.includes('contact');
 if(d.hp<=0){if(contact&&has(g,d,'aftermath')&&!has(g,a,'damp'))chip(g,a,a.maxHp/4);if(has(g,a,'moxie'))changeStage(g,a,'attack',1,a,logs);}
 if(d.hp>0&&has(g,d,'weak-armor')&&m.damageClass==='physical'){changeStage(g,d,'defense',-1,d,logs);changeStage(g,d,'speed',2,d,logs);}
 if(d.hp>0&&has(g,d,'justified')&&m.typeId===17)changeStage(g,d,'attack',1,d,logs);
 if(d.hp>0&&has(g,d,'rattled')&&[7,8,17].includes(m.typeId))changeStage(g,d,'speed',1,d,logs);
 if(has(g,d,'cursed-body')&&random()<.3){a.disabledMove=m.id;a.disabledTurns=4;announce(g,d,logs,'상대 기술을 4턴 동안 봉인했어요.');}
 if(contact){
  const statuses={'static':'paralysis','poison-point':'poison','flame-body':'burn'};
  const status=statuses[abilitySlug(g.db,d)];if(status&&random()<.3)inflict(g,a,status,d,logs);
  if(has(g,d,'effect-spore')&&!g.fighterTypes(a).includes(12)&&!has(g,a,'overcoat')&&random()<.3)inflict(g,a,['sleep','poison','paralysis'][Math.floor(random()*3)],d,logs);
  if(has(g,a,'poison-touch')&&random()<.3)inflict(g,d,'poison',a,logs);
  if(has(g,d,'pickpocket')&&!d.heldItem&&a.heldItem&&!has(g,a,'sticky-hold')){d.heldItem=a.heldItem;a.heldItem=null;announce(g,d,logs,'상대 도구를 가져왔어요.');}
 }
 const flinch=has(g,a,'stench')&&!(m.meta?.flinchChance>0)?10:m.meta?.flinchChance??0;
 if(d.hp>0&&!sheerForce(g,a,m)&&!active(g,d,a,'shield-dust','inner-focus')&&d.heldItem!=='covert-cloak'&&random()*100<flinch*(has(g,a,'serene-grace')?2:1))d.flinch=true;
}
export function endAbilities(g,f,other,logs,random){
 if(f.hp<=0)return;const a=abilitySlug(g.db,f),w=weather(g);
 if(a==='speed-boost'&&f.enteredTurn!==g.s.battle.turn)changeStage(g,f,'speed',1,f,logs);
 if(a==='shed-skin'&&f.status&&random()<1/3||a==='hydration'&&w==='rain'&&f.status){f.status=null;f.statusTurns=0;announce(g,f,logs,'상태이상을 회복했어요.');}
 if(a==='rain-dish'&&w==='rain'||a==='ice-body'&&w==='hail')heal(f,f.maxHp/16);
 if(a==='dry-skin'&&w==='rain')heal(f,f.maxHp/8);
 if((a==='dry-skin'||a==='solar-power')&&w==='sun')chip(g,f,f.maxHp/8);
 if(w==='sand'&&!g.fighterTypes(f).some(t=>[5,6,9].includes(t))&&!has(g,f,'sand-veil','sand-rush','sand-force','overcoat'))chip(g,f,f.maxHp/16);
 if(w==='hail'&&!g.fighterTypes(f).includes(15)&&!has(g,f,'ice-body','snow-cloak','overcoat'))chip(g,f,f.maxHp/16);
 if(a==='harvest'&&!f.heldItem&&f.lastBerry&&(w==='sun'||random()<.5)){f.heldItem=f.lastBerry;delete f.lastBerry;announce(g,f,logs,'먹은 열매를 다시 얻었어요.');}
 if(a==='pickup'&&!f.heldItem&&other.lastConsumedItem){f.heldItem=other.lastConsumedItem;delete other.lastConsumedItem;announce(g,f,logs,'상대가 쓴 도구를 주웠어요.');}
 if(f.disabledTurns>0&&--f.disabledTurns===0)delete f.disabledMove;
}
export function trapped(g,f,other){
 if(has(g,f,'run-away')||g.fighterTypes(f).includes(8))return false;
 return has(g,other,'arena-trap')&&!g.fighterTypes(f).includes(3)&&!has(g,f,'levitate')||has(g,other,'magnet-pull')&&g.fighterTypes(f).includes(9);
}
// No substitute mechanics or fake stat boost for abilities with no applicable rule.
export const abilityNotes={
 gluttony:'현재 열매들은 원래 HP 절반 이하 또는 상태이상 때 발동하므로 추가로 빨라지지 않습니다.',
 illuminate:'이 게임에는 필드 조우 빈도 시스템이 없어 추가 효과가 없습니다.',
 'cute-charm':'이 게임에는 성별·헤롱헤롱 시스템이 없어 추가 효과가 없습니다.',
 rivalry:'이 게임에는 성별 시스템이 없어 위력 보정이 없습니다.',
 oblivious:'도발·헤롱헤롱 시스템이 없어 추가 효과가 없습니다.',
 healer:'싱글 전투에서는 동료 치료 효과가 없습니다.',
 'friend-guard':'싱글 전투에서는 동료 피해 감소 효과가 없습니다.',
 telepathy:'싱글 전투에서는 동료 공격 회피 효과가 없습니다.',
 'heavy-metal':'몸무게를 2배로 계산해 안다리걸기·풀묶기 피해에 반영합니다.',
 'light-metal':'몸무게를 절반으로 계산해 안다리걸기·풀묶기 피해에 반영합니다.',
 infiltrator:'대타출동·벽 시스템이 없어 추가 효과가 없습니다.',
 'sticky-hold':'나쁜손버릇에 의한 도구 도난을 방지합니다.',
 pickup:'전투에서 상대가 소비한 열매를 줍습니다. 승리 보상 드롭 1%와 별개입니다.',
 'skill-link':'연속 공격 횟수를 최대로 고정합니다. 각 타격의 피해·옹골참을 계산합니다.',
 'magic-bounce':'반사 가능한 변화기를 되돌립니다. 반사된 기술은 재반사하지 않습니다.'
};
