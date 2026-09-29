// Gen-IV side conditions; existing Gen-VII abilities remain available.
import {inflict,changeStage} from './abilities.js?v=pokegotchi-290';
export const FIELD_ITEMS={
 'light-clay':{name:'빛의점토',kind:'held',price:1000,description:'리플렉터·빛의장막을 5턴에서 8턴으로 연장.'},
 'iron-ball':{name:'검은철구',kind:'held',price:650,description:'스피드 절반. 비행·부유도 땅에 닿아 설치 기술과 땅 공격에 영향받음.'},
 'shed-shell':{name:'아름다운허물',kind:'held',price:900,description:'조이기·교체 방해 특성에도 자발적으로 교체 가능.'},
 'big-root':{name:'큰뿌리',kind:'held',price:1000,description:'흡수 기술·씨뿌리기·뿌리박기·아쿠아링의 회복량 30% 증가. 해감액 피해도 증가.'},
 'grip-claw':{name:'끈기갈고리손톱',kind:'held',price:850,description:'조이기·회오리불꽃 등 구속이 5턴 지속 (4세대).'},
 'heavy-duty-boots':{name:'통굽부츠',kind:'held',price:1800,description:'등장 시 압정뿌리기·독압정·스텔스록 무시 (8세대 도구를 추가 적용).'},
 ...Object.fromEntries([['heat-rock','뜨거운바위'],['damp-rock','축축한바위'],['smooth-rock','보송보송바위'],['icy-rock','차가운바위']].map(([id,name])=>[id,{name,kind:'held',price:800,description:'대응하는 날씨 기술의 지속 시간을 5턴에서 8턴으로 연장.'}]))
};
export const FIELD_INFO={
 spikes:['▲','압정뿌리기','교대로 나온 땅에 닿은 포켓몬에게 1층 1/8, 2층 1/6, 3층 1/4의 최대 HP 피해.'],
 toxicSpikes:['☠','독압정','땅에 닿은 포켓몬에게 1층 독, 2층 맹독. 땅에 닿은 독타입이 나오면 제거.'],
 stealthRock:['◆','스텔스록','등장할 때 바위 상성 × 최대 HP 1/8 피해. 비행도 영향받음.'],
 reflect:['▥','리플렉터','물리 공격 피해 절반. 급소·고정 피해 제외.'],
 lightScreen:['▤','빛의장막','특수 공격 피해 절반. 급소·고정 피해 제외.'],
 safeguard:['♧','신비의부적','상대 기술의 상태이상·혼란 방지. 독압정은 막지 못함.'],
 mist:['≋','흰안개','상대에 의한 능력치 랭크 하락 방지.'],
 tailwind:['➟','순풍','이쪽 포켓몬의 스피드 2배. 4세대 기준 3턴.'],
 gravity:['↓','중력','모두 땅에 닿음. 명중률 5/3배. 공중으로 뛰는 기술 사용 불가.'],
 trickRoom:['◷','트릭룸','같은 우선도에서 스피드가 낮을수록 먼저 행동.'],
 seeded:['✿','씨뿌리기','턴 종료 시 최대 HP 1/8 흡수. 교체·고속스핀으로 해제.'],
 bound:['⛓','구속','턴 종료 시 최대 HP 1/16 피해. 교체 불가. 시전자가 떠나면 해제.'],
 toxic:['☠','맹독','턴마다 최대 HP의 1/16, 2/16…으로 피해 증가. 교체하면 누적 초기화.'],
 aquaRing:['○','아쿠아링','턴 종료 시 최대 HP 1/16 회복. 교체하면 해제.'],
 ingrain:['♧','뿌리박기','턴 종료 시 최대 HP 1/16 회복. 땅에 고정되며 강제 교대도 방지.']
};
export function initField(g){const b=g.s.battle;if(!b)return null;b.field??={player:{},enemy:{}};b.field.player??={};b.field.enemy??={};return b.field;}
export function side(g,f){return initField(g)?.[g.s.battle.player===f?'player':'enemy']??{};}
export function grounded(g,f){return !!(f.ingrain||f.heldItem==='iron-ball'||initField(g)?.gravity)||(!g.fighterTypes(f).includes(3)&&!g.hasAbility(f,'levitate'));}
export function clearVolatile(f){f.recharge=false;f.flinch=false;f.infatuated=false;f.lastDamage=0;f.lastClass=null;f.seeded=false;f.bound=null;f.toxicCounter=0;f.aquaRing=false;f.ingrain=false;f.confused=0;f.charge=null;f.guard=false;}
export function resetOnSwitch(f){clearVolatile(f);for(const k of Object.keys(f.stages))f.stages[k]=0;if(f.transformed){f.moves=f.originalMoves??f.moves;for(const k of ['transformed','transformedSpeciesId','transformedShiny','typeIds','copiedStats','originalMoves'])delete f[k];}}
export function entryHazards(g,f,logs){
 const s=side(g,f);if(f.heldItem==='heavy-duty-boots')return;
 const chip=(fraction,name)=>{if(g.hasAbility(f,'magic-guard'))return;const n=Math.min(f.hp,Math.max(1,Math.floor(f.maxHp*fraction)));f.hp-=n;logs.push(`${g.db.pokemon[f.speciesId].name}: ${name} ${n} 피해!`);};
 if(s.stealthRock)chip(g.effectiveness({typeId:6,slug:'stealth-rock'},f)/8,'스텔스록');
 if(f.hp>0&&grounded(g,f)){
  if(s.spikes)chip([0,1/8,1/6,1/4][s.spikes],'압정뿌리기');
  if(f.hp>0&&s.toxicSpikes){if(g.fighterTypes(f).includes(4)){s.toxicSpikes=0;logs.push('독타입이 독압정을 흡수했어요.');}
   else if(inflict(g,f,'poison',f,logs,0,false)){f.toxic=s.toxicSpikes===2;f.toxicCounter=0;}}
 }
 g.heldRecovery(f,logs);
}
export function fieldMove(g,a,d,m,logs,random){
 const own=side(g,a),opp=side(g,d),field=initField(g),slug=m.slug;
 const hazards={'spikes':['spikes',3],'toxic-spikes':['toxicSpikes',2],'stealth-rock':['stealthRock',1]};
 if(hazards[slug]){const [key,max]=hazards[slug];if((opp[key]??0)>=max)logs.push('이미 최대로 설치되어 있어요.');else{opp[key]=(opp[key]??0)+1;logs.push(`${m.name} ${opp[key]}층 설치!`);}return true;}
 const screens={'reflect':'reflect','light-screen':'lightScreen','safeguard':'safeguard','mist':'mist','tailwind':'tailwind'};
 if(screens[slug]){const key=screens[slug];if(own[key])logs.push('이미 효과가 유지 중이에요.');else{own[key]=slug==='tailwind'?3:['reflect','light-screen'].includes(slug)&&a.heldItem==='light-clay'?8:5;logs.push(`${m.name}: ${own[key]}턴!`);}return true;}
 if(['gravity','trick-room'].includes(slug)){const k=slug==='gravity'?'gravity':'trickRoom';field[k]=k==='trickRoom'&&field[k]?0:5;if(k==='gravity')for(const f of [a,d])if(['fly','bounce'].includes(g.db.moves[f.charge]?.slug))f.charge=null;logs.push(`${m.name} ${field[k]?'5턴 시작':'해제'}!`);return true;}
 if(slug==='defog'){for(const k of ['spikes','toxicSpikes','stealthRock','reflect','lightScreen','safeguard','mist'])opp[k]=0;changeStage(g,d,'evasion',-1,a,logs);logs.push('안개제거: 상대 쪽 설치물·장벽 제거 (4세대).');return true;}
 if(slug==='toxic'){if(inflict(g,d,'poison',a,logs,0)){d.toxic=true;d.toxicCounter=0;}else logs.push('맹독에 걸리지 않았어요.');return true;}
 if(slug==='haze'){for(const f of [a,d])for(const k of Object.keys(f.stages))f.stages[k]=0;logs.push('모든 능력치 랭크를 초기화했어요.');return true;}
 if(['aqua-ring','ingrain'].includes(slug)){a[slug==='ingrain'?'ingrain':'aquaRing']=true;logs.push(`${m.name} 회복 효과 시작!`);return true;}
 if(['roar','whirlwind'].includes(slug)){g.forceSwitch(d,logs,random);return true;}
 return false;
}
export function afterFieldHit(g,a,d,m,logs,random){
 if(m.slug==='rapid-spin'&&a.hp>0){const s=side(g,a);s.spikes=s.toxicSpikes=s.stealthRock=0;a.seeded=false;a.bound=null;logs.push('고속스핀: 내 설치물·씨앗·구속 제거! (4세대: 스피드 상승 없음)');}
 if(['bind','wrap','fire-spin','whirlpool','clamp','sand-tomb','magma-storm'].includes(m.slug)&&d.hp>0&&!d.bound){d.bound={turns:a.heldItem==='grip-claw'?5:2+Math.floor(random()*4),source:g.s.battle.player===a?'player':'enemy'};logs.push('상대가 구속되었어요!');}
}
export function tickField(g,logs){const field=initField(g);for(const s of [field.player,field.enemy,field])for(const k of ['reflect','lightScreen','safeguard','mist','tailwind','gravity','trickRoom'])if(s[k]>0&&--s[k]===0)logs.push(`${FIELD_INFO[k][1]} 효과가 끝났어요.`);}
export function fieldResidual(g,f,other,logs){
 if(f.status!=='poison'){f.toxic=false;f.toxicCounter=0;}
 if(f.bound){const source=g.s.battle[f.bound.source];if(source!==other||other.hp<=0)f.bound=null;else{if(f.hp>0&&!g.hasAbility(f,'magic-guard')){const n=Math.min(f.hp,Math.max(1,Math.floor(f.maxHp/16)));f.hp-=n;logs.push(`구속으로 ${n} 피해!`);}if(--f.bound.turns<=0){f.bound=null;logs.push('구속에서 풀려났어요.');}}}
 for(const k of ['aquaRing','ingrain'])if(f[k]&&f.hp>0){f.hp=Math.min(f.maxHp,f.hp+Math.max(1,Math.floor(f.maxHp/16*(f.heldItem==='big-root'?1.3:1))));logs.push(`${FIELD_INFO[k][1]}로 회복했어요.`);}
}
export function fieldDescriptions(g){const b=g.s.battle,field=initField(g);if(!b)return [];const out=[];for(const [label,obj] of [['내 필드',field.player],['상대 필드',field.enemy],['전체',field],['내 친구',b.player],['상대',b.enemy]])for(const [k,[icon,name,description]] of Object.entries(FIELD_INFO)){if(!obj[k])continue;if(k==='toxic'&&obj.status!=='poison')continue;const suffix=['spikes','toxicSpikes'].includes(k)?` ${obj[k]}층`:['reflect','lightScreen','safeguard','mist','tailwind','gravity','trickRoom'].includes(k)?` ${obj[k]}턴`:k==='bound'?` ${obj[k].turns}턴`:'';out.push({icon,label:`${label} · ${name}${suffix}`,description});}if(b.weather&&b.weatherTurns>0)out.push({icon:'☀',label:`날씨 · ${{sun:'쾌청',rain:'비',sand:'모래바람',hail:'싸라기눈'}[b.weather]} ${b.weatherTurns}턴`,description:'날씨에 맞는 기술·특성 효과가 적용됩니다. 에어록·날씨부정 중에는 효과가 억제됩니다.'});return out;}
