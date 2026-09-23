import {abilityNotes} from './abilities.js?v=pokegotchi-270';
import { Game, freshState, migrateState, validateState, statsFor, clamp, ITEMS, shopCatalog, captureChance, SHINY_CHANCE, medicineUsable, TRAINERS, abilityOf, abilityItemTarget, HIDDEN_CHANCE, DROP_CHANCE } from './engine.js?v=pokegotchi-270';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const KEY='pokedays-hgss-v1';
const typeColors={1:['#a8a878','#45452d'],2:['#d44b42','#6e201b'],3:['#929ce9','#343b79'],4:['#aa59c4','#542365'],5:['#c79149','#62431d'],6:['#b6a044','#55481b'],7:['#96b82b','#3e510e'],8:['#7863ac','#372657'],9:['#93a9b6','#354b59'],10:['#f28236','#762e0c'],11:['#559ce5','#204d7b'],12:['#70b84b','#2f591b'],13:['#edcb35','#5b4a08'],14:['#ed6b96','#782442'],15:['#72caca','#245f60'],16:['#8262dc','#38206a'],17:['#857465','#382d25']};
let db,game,busy=false,required=false,toastTimer,saveWarning=null;
const typeSkin=t=>`--move-color:${typeColors[t]?.[0]??'#a8a878'};--move-dark:${typeColors[t]?.[1]??'#45452d'}`;
const typeLabel=t=>db.types[t]?.name??'???';
const typeImage=t=>Number(t)>=1&&Number(t)<=17?`<img class="type-image" src="assets/types/${t}.png" alt="" width="64" height="28">`:'<span class="type-image type-unknown" aria-hidden="true">???</span>';
const badge=t=>`<span class="type-badge" style="${typeSkin(t)}">${typeImage(t)}<span>${esc(typeLabel(t))}</span></span>`;
function moveFace(m,index,pp=m.pp,maxPP=m.pp,matchup=''){
 const kind=m.damageClass==='physical'?'물리':m.damageClass==='special'?'특수':'변화';
 return `<div class="move-title"><span class="move-slot">${String(index+1).padStart(2,'0')}</span><strong>${esc(m.name)}</strong></div><div class="move-type-row">${badge(m.typeId)}<span class="move-kind" title="7세대 기술 분류">${kind}</span></div><div class="move-values"><span>위력 <b>${m.power??'—'}</b></span><span>PP <b>${pp}/${maxPP}</b></span></div><small class="move-stat-rule">${m.damageClass==='physical'?'공격 → 방어':m.damageClass==='special'?'특수공격 → 특수방어':'상태·능력치 변화'}</small>${matchup?`<div class="move-matchup">${esc(matchup)}</div>`:''}`;
}

const statLabels={hp:'HP',attack:'공격',defense:'방어','special-attack':'특수공격','special-defense':'특수방어',speed:'스피드'};
function statGrid(values,f=null){return `<dl class="stat-grid">${Object.entries(statLabels).map(([key,label])=>{const stage=f?.stages?.[key]??0;const value=key==='hp'&&f?`${f.hp} / ${f.maxHp}`:Number(values[key].toFixed(1));return `<div><dt>${label}</dt><dd>${value}${stage?` <small class="stat-stage ${stage>0?'raised':'lowered'}">${stage>0?'+':''}${stage}단계</small>`:''}</dd></div>`;}).join('')}</dl>`;}
function battleStatPanel(f,label){const values={hp:f.maxHp};for(const key of Object.keys(statLabels).filter(k=>k!=='hp'))values[key]=game.effectiveStat(f,key);return `<section><h4>${esc(label)} · ${esc(db.pokemon[f.transformedSpeciesId??f.speciesId].name)}</h4>${statGrid(values,f)}</section>`;}
const petSprite=(id,back=false,shiny=false)=>`assets/${shiny?'shiny':'sprites'}/${id}${back?'-back':''}.png`;
const shinyMark=p=>(p.shiny?'<span class="shiny-mark" title="이로치" aria-label="이로치">★</span>':'')+(abilityOf(db,{...p,copiedAbilityId:null})?.hidden?'<span class="hidden-mark" title="숨겨진 특성" aria-label="숨겨진 특성">★</span>':'');
const abilityLabel=p=>{const a=abilityOf(db,p);return a?`${a.hidden?'숨겨진 특성':'특성'} · ${a.name}`:'특성 없음';};
function abilityDetails(sp){return `<p class="modal-copy">일반 특성: 7세대 · 숨겨진 특성: 최신 도감 슬롯<br>숨겨진 특성이 있는 종은 등장 시 3%, 이로치 4%와 독립 추첨합니다.</p>${(sp.abilities??[]).map(slot=>{const a=db.abilities[slot.id];return `<article class="ability-detail"><h3>${slot.hidden?'<span class="hidden-mark" aria-label="숨겨진 특성">★</span> ':''}${esc(a.name)} <small>${slot.hidden?'숨겨진 특성':'일반 특성'}</small></h3><p>${esc(a.description)}</p>${abilityNotes[a.slug]?`<p class="ability-note">게임 적용: ${esc(abilityNotes[a.slug])}</p>`:''}</article>`;}).join('')}`;}
function showAbility(){if(busy)return;modal(`<h2 class="modal-title">${shinyMark(game.pet)}${esc(game.species.name)}의 특성</h2><p><strong>${esc(abilityLabel(game.pet))}</strong></p>${abilityDetails(game.species)}`,'ABILITY');}
function save(){try{localStorage.setItem(KEY,JSON.stringify(game.s));$('save-status').textContent='이 브라우저에 자동 저장';}catch{$('save-status').textContent='저장 불가 · 백업을 내려받으세요';saveWarning='브라우저 저장을 사용할 수 없어요. 아래 저장 백업으로 진행 상황을 보관하세요.';}}
function say(text){$('message').textContent=text;}
function speak(text){$('speech').textContent=text;}
function modal(html,tag='POkegotchi',mustChoose=false){required=mustChoose;$('modal-tag').textContent=tag;$('modal-body').innerHTML=html;$('close-modal').hidden=mustChoose;if(!$('modal').open)$('modal').showModal();$('modal').scrollTop=0;}
function closeModal(){if(required)return;$('modal').close();}
$('close-modal').onclick=closeModal;$('modal').addEventListener('cancel',e=>{if(required)e.preventDefault();});$('modal').addEventListener('click',e=>{if(e.target===$('modal')&&!required){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function render(){
  $('egg-screen').hidden=game.s.hatched;$('pet-game').hidden=!game.s.hatched;
  if(!game.s.hatched){renderEgg();return;}
  const s=game.s,p=game.pet,sp=game.species,stat=statsFor(db,p.speciesId,p.level,p.ivs),inBattle=!!s.battle;
  $('day').textContent='DAY '+String(s.day).padStart(2,'0');
  $('roster').innerHTML=Object.keys(s.pets).map(Number).map(id=>{const q=s.pets[id],spec=db.pokemon[q.speciesId];return `<button data-pet="${id}" class="${s.active===id?'active':''}" aria-pressed="${s.active===id}" ${busy||s.pending.length||s.progressing?'disabled':''}><img src="${petSprite(q.speciesId,false,q.shiny)}" alt=""><span><strong>${shinyMark(q)}${esc(spec.name)}</strong><small>Lv. ${q.level}${s.active===id?' · 함께하는 중':''}</small></span></button>`;}).join('');
  $('party-count').textContent=Object.keys(s.pets).length+' / 3';
  $('roster').querySelectorAll('[data-pet]').forEach(button=>button.onclick=()=>{const id=Number(button.dataset.pet);if(busy||id===s.active)return;if(s.battle){turn({switch:id});return;}if(game.switch(id)){save();render();say(`${game.species.name}와 함께할 준비가 됐어요.`);}});
  $('pet').src=petSprite(p.speciesId,inBattle,p.shiny);$('pet').alt=sp.name;
  $('pet-name').innerHTML=shinyMark(p)+esc(sp.name);$('level').textContent='Lv. '+p.level;$('dex-no').textContent='NO.'+String(p.speciesId).padStart(3,'0');$('pet-nameplate').innerHTML=shinyMark(p)+esc(sp.name)+` <span>Lv.${p.level}</span>`;
  $('types').innerHTML=sp.typeIds.map(badge).join('');
  const floor=db.experience[sp.growthRateId][p.level],next=game.nextXp();$('xp-text').textContent=next===null?'MAX LEVEL':Math.max(0,next-p.exp).toLocaleString()+' EXP';$('xp-bar').style.width=(next===null?100:clamp((p.exp-floor)/(next-floor)*100,0,100))+'%';
  $('vitals').innerHTML=[['hp','♥ 체력',p.hp,stat.hp],['hunger','♨ 포만감',p.hunger,100],['friend','♡ 친밀도',p.friendship,255]].map(([cls,label,v,max])=>`<div class="vital ${cls}"><span>${label}</span><strong>${v} / ${max}</strong><div class="bar"><i style="width:${v/max*100}%"></i></div></div>`).join('');
  $('fatigue-text').textContent=s.fatigue+' / 100';$('fatigue-bar').style.width=s.fatigue+'%';$('coins').textContent=s.coins.toLocaleString()+' P';
  $('pet-stats').innerHTML=statGrid(stat);
  $('move-count').textContent=p.moves.length+' / 4';$('moves').innerHTML=Array.from({length:4},(_,i)=>{const m=db.moves[p.moves[i]];return m?`<div class="move move-tile" style="${typeSkin(m.typeId)}">${moveFace(m,i)}</div>`:`<div class="move empty"><span class="move-slot">${String(i+1).padStart(2,'0')}</span><span>아직 배우지 않은 기술</span></div>`;}).join('');
  $('pet-ability').innerHTML=shinyMark({...p,shiny:false})+esc(abilityLabel(p));$('pet-ability').disabled=busy;$('pet-ability').onclick=showAbility;
  $('held-item').textContent='지닌 도구 · '+(ITEMS[p.heldItem]?.name??'없음');$('open-tms').disabled=busy||!game.ready();$('open-shop').disabled=busy||!game.ready();$('open-bag').disabled=busy||!game.ready();renderEvolutions();$('release-pet').disabled=busy||!game.ready();$('release-pet').onclick=confirmNewEgg;
  $('journal').innerHTML=s.journal.slice(0,4).map(j=>`<div class="journal-entry"><span>DAY ${esc(j.day)}</span><span>${esc(j.text)}</span></div>`).join('');
  $('battle').disabled=busy||!!game.can('battle');$('feed').disabled=busy||!!game.can('feed');$('sleep').disabled=busy||!!game.can('sleep');
  $('battle').title=game.can('battle')||'피로 35 · 포만감 18 소모';$('feed').title=game.can('feed')||'피로 15 · 포만감 35, 친밀도 12 회복';
  $('actions').hidden=inBattle;$('battle-controls').hidden=!inBattle;$('enemy').hidden=!inBattle;$('enemy-card').hidden=!inBattle;$('battle-player-hp').hidden=!inBattle;
  renderTrainerBanner(inBattle?game.s.battle:null);$('scene').classList.toggle('fighting',inBattle);$('location').textContent=inBattle?(s.battle.kind==='trainer'?`트레이너 · ${s.battle.enemyIndex+1}/3`:'풀숲에서 만난 친구'):'초록빛 쉼터';$('weather').textContent=inBattle?(s.battle.kind==='trainer'?'TRAINER BATTLE':'WILD BATTLE'):'맑음 · 산들바람';
  $('action-title').textContent=inBattle?'어떤 기술을 사용할까?':'함께 할 일';$('action-caption').textContent=inBattle?`TURN ${s.battle.turn} · ${ {sun:'강한 햇살',rain:'비',sand:'모래바람',hail:'싸라기눈'}[s.battle.weather]??'맑음'} · PP는 전투마다 회복`:'행동은 한 번에 하나씩';
  for(const id of ['dex-button','learnset','help','sources'])$(id).disabled=busy||s.pending.length>0||s.progressing;$('export-save').disabled=busy||!game.ready();
  if(inBattle)renderBattle();
}
const evolutionLocations={8:'영원의숲 · 이끼 낀 바위',10:'천관산 · 특수 자기장',48:'217번도로 · 얼음 바위'};
function evolutionText(e){
 if(e.personalityBranch)return `레벨 ${e.minLevel} 이상 · 개체별 고정 분기 (각 50%)`;
 if(e.trigger==='use-item')return esc(e.itemName)+' 사용';
 if(e.trigger==='trade')return e.heldItemName?`${esc(e.heldItemName)} 지닌 채 교환`:'교환으로 진화';
 if(e.locationId)return `${esc(evolutionLocations[e.locationId]??e.locationName)} 근처에서 레벨업 (D/P/Pt 조건)`;
 if(e.minFriendship)return `친밀도 ${e.minFriendship} 이상${e.timeOfDay?' · '+(e.timeOfDay==='day'?'낮':'밤'):''}에 레벨업`;
 const relation={1:'공격 > 방어','-1':'공격 < 방어',0:'공격 = 방어'};
 return `레벨 ${e.minLevel} 이상${e.relativePhysicalStats!==null&&e.relativePhysicalStats!==undefined?' · '+relation[e.relativePhysicalStats]:''}에서 레벨업`;
}
function renderEvolutions(){
 const p=game.pet,evos=game.species.evolutions,disabled=busy||!game.ready();
 $('evolution').innerHTML=evos.length?evos.map(e=>`<div class="evo-preview"><img class="pixel" src="${petSprite(e.to,false,game.pet.shiny)}" alt="${esc(db.pokemon[e.to].name)}"><div><strong>${esc(db.pokemon[e.to].name)}</strong><p>${evolutionText(e)}</p></div></div>${e.trigger==='use-item'||e.trigger==='trade'?`<button class="evo-button" data-evolve="${e.to}" ${disabled?'disabled':''}>${e.trigger==='trade'?'NPC 교환':'진화 도구 사용'}</button>`:''}`).join(''):'<p class="complete">✦ 마지막 진화에 도달했어요.<br>우리의 모험은 계속돼요!</p>';
 if(evos.some(e=>e.timeOfDay||e.locationId)){
  const c=game.s.evolutionContext??{timeOfDay:'day',locationId:null};
  $('evolution').innerHTML+=`<div class="evo-context"><label>모험 시간<select id="evo-time" ${disabled?'disabled':''}><option value="day" ${c.timeOfDay==='day'?'selected':''}>낮</option><option value="night" ${c.timeOfDay==='night'?'selected':''}>밤</option></select></label><label>진화 여행지<select id="evo-place" ${disabled?'disabled':''}><option value="" ${c.locationId===null?'selected':''}>초록빛 쉼터</option>${Object.entries(evolutionLocations).map(([id,label])=>`<option value="${id}" ${c.locationId===Number(id)?'selected':''}>${label}</option>`).join('')}</select></label><p>선택한 환경에서 다음 레벨업 때 진화를 확인해요. 신오 여행지는 D/P/Pt의 조건을 이 게임에 옮긴 장소입니다.</p></div>`;
  const change=()=>{game.setEvolutionContext($('evo-time').value,$('evo-place').value?Number($('evo-place').value):null);save();render();};$('evo-time').onchange=change;$('evo-place').onchange=change;
 }
 if(p.speciesId===236){const st=statsFor(db,p.speciesId,p.level,p.ivs);$('evolution').innerHTML+=`<p class="modal-copy">현재 공격 <strong>${st.attack}</strong> · 방어 <strong>${st.defense}</strong><br>태어날 때 정해진 능력치를 바탕으로, 레벨업 후 두 수치를 비교해 진화해요.</p>`;}
 $('evolution').querySelectorAll('[data-evolve]').forEach(b=>b.onclick=()=>confirmStone(Number(b.dataset.evolve)));
}

// Original pixel marks drawn as inline SVG: no external icon requests.
const statusMarks={
 poison:['독','#7937a0','매 턴 종료 시 최대 HP의 1/8 피해','M5 2h6v2h2v6h-2v3H5v-3H3V4h2z M5 5v2h2V5z M9 5v2h2V5z M7 9v2h2V9z'],
 paralysis:['마비','#755400','속도 감소 · 25% 확률로 행동 불가','M8 1h5l-4 5h4L5 15l2-7H3z'],
 burn:['화상','#a83720','매 턴 지속 피해 · 물리 공격력 감소','M8 1v4h3V3l3 6v4h-2v2H4v-2H2V9l3-5v4h2z'],
 sleep:['잠듦','#3c5798','잠에서 깰 때까지 행동 불가','M2 3h7v2L4 9h5v2H1V9l5-4H2z M10 7h5v2l-3 3h3v2h-6v-2l3-3h-2z'],
 freeze:['얼음','#14647a','얼어붙어 행동 불가 · 행동 시 20% 확률로 해동','M7 1h2v5l3-3 2 2-3 2h4v2h-4l3 3-2 2-3-3v4H7v-4l-3 3-2-2 3-3H1V7h4L2 4l2-2 3 3z'],
 confusion:['혼란','#904064','혼란으로 자신을 공격할 수 있음','M3 2h10v2h2v9h-2v2H3v-2H1V6h2v5h2v2h6V6H6v3h3v2H4V4H3z'],
 seeded:['씨뿌리기','#38652a','매 턴 종료 시 체력을 상대에게 빼앗김','M7 7H3V5H1V1h4v2h2v2h2V3h2V1h4v4h-2v2H9v6h3v2H4v-2h3z']
};
function statusBadges(f){
 const active=[...(statusMarks[f.status]?[f.status]:[]),...(f.confused>0?['confusion']:[]),...(f.seeded?['seeded']:[])];
 if(!active.length)return '';
 return `<div class="battle-statuses" aria-label="현재 전투 상태">${active.map(key=>{const [label,color,detail,path]=statusMarks[key];return `<span class="battle-status" style="--status-color:${color}" tabindex="0" aria-label="${label}: ${detail}"><svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" fill-rule="evenodd" d="${path}"/></svg><b>${label}</b><span class="status-detail" aria-hidden="true">${detail}</span></span>`;}).join('')}</div>`;
}
function hpCard(f){const sp=db.pokemon[f.speciesId];return `<strong>${shinyMark(f)}${esc(sp.name)}</strong><small>Lv.${f.level}</small>${statusBadges(f)}<span class="battle-ability" title="${esc(abilityLabel(f))}">${esc(abilityOf(db,f)?.name??'')}</span><div class="bar"><i style="width:${f.hp/f.maxHp*100}%;background:${f.hp/f.maxHp<.25?'#cd8b7e':'#8fb574'}"></i></div><span class="hp-num">${f.hp} / ${f.maxHp}</span><div class="types">${game.fighterTypes(f).map(badge).join('')}</div>`;}

function renderTrainerBanner(b){
 const visible=b?.kind==='trainer';$('trainer-banner').hidden=!visible;if(!visible)return;
 $('trainer-name').textContent=b.trainerName??'숲길 트레이너';
 $('trainer-team').setAttribute('aria-label',`상대 포켓몬 ${3-b.enemyIndex}마리 남음, 현재 ${b.enemyIndex+1}번째`);
 $('trainer-team').innerHTML=Array.from({length:3},(_,i)=>`<span class="trainer-ball ${i<b.enemyIndex?'defeated':i===b.enemyIndex?'current':''}" aria-hidden="true"></span>`).join('')+`<small>${3-b.enemyIndex}마리 남음</small>`;
}
function renderBattle(){const b=game.s.battle;if(!b)return;$('pet').src=petSprite(b.player.transformedSpeciesId??b.player.speciesId,true,b.player.transformed?b.player.transformedShiny:b.player.shiny);$('pet').alt=db.pokemon[b.player.transformedSpeciesId??b.player.speciesId].name;$('enemy').src=petSprite(b.enemy.transformedSpeciesId??b.enemy.speciesId,false,b.enemy.transformed?b.enemy.transformedShiny:b.enemy.shiny);$('enemy').alt=db.pokemon[b.enemy.transformedSpeciesId??b.enemy.speciesId].name;$('enemy-card').innerHTML=hpCard(b.enemy);$('battle-player-hp').innerHTML=hpCard(b.player);
  $('battle-stat-values').innerHTML=battleStatPanel(b.player,'내 친구')+battleStatPanel(b.enemy,'상대');
  $('battle-moves').innerHTML=b.player.moves.map((slot,i)=>{const m=db.moves[slot.id];return `<button class="battle-move move-tile" style="${typeSkin(m.typeId)}" data-move="${slot.id}" ${busy||slot.pp<=0||slot.id===b.player.disabledMove?'disabled':''} aria-label="${esc(m.name)} · ${esc(typeLabel(m.typeId))} · PP ${slot.pp}">${moveFace(m,i,slot.pp,b.player.transformed?5:m.pp,game.moveMatchup(m,b.player,b.enemy))}<span class="move-accuracy">명중 ${m.accuracy??'필중'}</span></button>`;}).join('');
  if(game.canStruggle(b.player))$('battle-moves').innerHTML+='<button class="battle-move" data-move="-1" '+(busy?'disabled':'')+'><strong>발버둥</strong><small>공격기를 배우지 않았거나 PP가 소진되면 사용 가능 · 반동 피해</small></button>';
  $('battle-moves').querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>turn(Number(b.dataset.move)));$('flee').disabled=busy;$('battle-bag').disabled=busy;$('battle-catch').textContent=b.kind==='trainer'?'포획 불가':'포획하기';$('battle-catch').disabled=busy||b.kind==='trainer'||Object.keys(game.s.pets).length>=3;
}
async function care(action){if(busy)return;try{const error=game.can(action);if(error){say(error);return;}busy=true;game[action]();save();render();
  if(action==='feed'){$('pet').classList.add('eating');$('action-fx').textContent='♥';speak('냠냠! 정말 맛있어.');say('포만감 +35 · HP 30% 회복 · 친밀도 +12. 기분 좋은 식사예요.');await wait(1300);$('pet').classList.remove('eating');}
  else{$('scene').classList.add('resting');$('pet').classList.add('sleeping');$('action-fx').textContent='z Z';speak('쿨쿨… 내일도 함께 놀자.');say('친구가 잠들었어요. 하루의 피로를 푹 쉬며 회복해요.');await wait(1600);$('scene').classList.remove('resting');$('pet').classList.remove('sleeping');speak('잘 잤다! 새로운 하루야.');say(`DAY ${game.s.day}. 피로도 0, 친구의 HP가 회복됐어요. 오늘은 뭘 할까요?`);}
  $('action-fx').textContent='';busy=false;render();}catch(e){busy=false;say(e.message);render();}}
async function playTrainerIntro(b){
 if(b.kind!=='trainer'||b.introSeen)return;
 b.introSeen=true;save();busy=true;render();
 const layer=$('trainer-intro'),scene=$('scene'),img=$('intro-trainer-image'),skip=$('skip-trainer-intro');
 const trainer=TRAINERS.find(t=>t.id===b.trainerId);
 $('intro-trainer-name').textContent=b.trainerName??'숲길 트레이너';
 img.onerror=()=>{img.onerror=null;img.src='assets/trainers/forest-trainer.svg';};
 img.src=trainer?.sprite??'assets/trainers/forest-trainer.svg';img.alt=b.trainerName??'숲길 트레이너';
 layer.hidden=false;scene.classList.add('trainer-introducing');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 skip.focus({preventScroll:true});
 try{await new Promise(resolve=>{const timer=setTimeout(resolve,reduced?900:2600);skip.onclick=()=>{clearTimeout(timer);resolve();};});}
 finally{skip.onclick=null;layer.hidden=true;scene.classList.remove('trainer-introducing');busy=false;render();$('battle-moves').querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
}
async function startBattle(){
 if(busy)return;
 try{game.startBattle();save();render();const b=game.s.battle;
  if(b.kind==='trainer'){say(`${b.trainerName}가 승부를 걸었어요!`);await playTrainerIntro(b);say(`${b.trainerName}의 ${db.pokemon[b.enemy.speciesId].name} 등장! 상대 3마리를 모두 쓰러뜨리세요.`);}
  else say(`야생 ${b.enemy.shiny?'★ 이로치 ':''}${db.pokemon[b.enemy.speciesId].name}가 나타났어요! 사용할 기술을 선택하세요.`);
  if(b.abilityLogs?.length)say($('message').textContent+' '+b.abilityLogs.join(' '));
 }catch(e){busy=false;render();say(e.message);}
}
function sayBattle(logs){$('message').innerHTML=logs.map(l=>`<span class="battle-line ${l.includes('효과가 굉장')?'damage-super':l.includes('효과가 별로')?'damage-resist':l.includes('효과가 없')?'damage-immune':''}">${esc(l)}</span>`).join(' ');}
async function turn(command){
 if(busy||!game.s.battle)return;busy=true;closeModal();render();
 try{
  const out=typeof command==='number'?game.act(command):command.item?game.battleItem(command.item):game.battleSwitch(command.switch);save();
  if(command?.item&&ITEMS[command.item]?.kind==='ball'){$('action-fx').className='action-fx capture-fx';$('action-fx').textContent='◉';await wait(550);}
  for(const event of out.events){const el=event.who==='player'?$('pet'):$('enemy'),target=event.who==='player'?$('enemy'):$('pet');el.classList.add('attacking');await wait(180);el.classList.remove('attacking');
   if(event.damage||event.immune){const color=event.immune?'immune':event.effect>1?'super':event.effect<1?'resist':'normal';target.classList.add('hurt');$('action-fx').className='action-fx damage-fx damage-'+color;$('action-fx').textContent=event.immune?'효과 없음':`−${event.damage}${event.effect>1?' 굉장해!':event.effect<1?' 약한 효과':''}`;await wait(450);target.classList.remove('hurt');}
  }
  $('action-fx').textContent='';$('action-fx').className='action-fx';busy=false;render();sayBattle(out.logs);
  if(out.result){speak(out.result==='caught'?'새 친구가 생겼어!':out.result==='win'?'우리 정말 잘했어!':'조금 쉬었다 다시 해보자.');await wait(300);pump();}
 }catch(e){busy=false;$('action-fx').textContent='';render();say(e.message);}
}
function pump(){const event=game.s.pending[0]??(game.s.progressing?game.progress():null);save();render();if(!event){if(required){required=false;$('modal').close();}return;}
  if(event.kind==='move'){const m=db.moves[event.moveId],p=game.pet;modal(`<h2 class="modal-title">새로운 기술을 배울 수 있어요!</h2><p class="modal-copy">${esc(game.species.name)}가 레벨 ${event.level}에 도달했어요.<br>기술은 최대 4개까지 기억할 수 있어요.</p><div class="new-move move-tile" style="${typeSkin(m.typeId)}">${moveFace(m,0)}</div>${p.moves.length<4?'<button class="primary" id="learn-new">빈 칸에 배우기</button>':'<p class="modal-copy">어떤 기술을 잊을까요?</p><div class="learn-options">'+p.moves.map((id,i)=>`<button class="move-tile" style="${typeSkin(db.moves[id].typeId)}" data-replace="${i}">${moveFace(db.moves[id],i)}<small>이 기술 대신 배우기</small></button>`).join('')+'</div>'}<div class="modal-actions"><button class="secondary" id="skip-move">이번에는 배우지 않기</button></div>`,'NEW MOVE',true);
    const choose=i=>{game.chooseMove(i);pump();};if($('learn-new'))$('learn-new').onclick=()=>choose(0);$('modal-body').querySelectorAll('[data-replace]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.replace)));$('skip-move').onclick=()=>choose(null);
  }else{modal(`<h2 class="modal-title">어라? ${esc(game.species.name)}의 모습이…</h2><div class="evolve-art"><img class="pixel" src="${petSprite(event.from,false,game.pet.shiny)}" alt="${esc(db.pokemon[event.from].name)}"><span>→</span><img class="pixel" src="${petSprite(event.to,false,game.pet.shiny)}" alt="${esc(db.pokemon[event.to].name)}"></div><p class="modal-copy">${esc(db.pokemon[event.to].name)}로 진화할 준비가 됐어요.<br>지금 알고 있는 기술은 유지돼요. 진화 후에는 새로운 종의 기술표를 따라요.</p><div class="modal-actions"><button class="primary" id="accept-evo">진화하기</button><button class="secondary" id="defer-evo">다음 레벨에</button></div>`,'A LITTLE BIGGER',true);
    $('accept-evo').onclick=()=>{game.chooseEvolution(true);pump();speak('더 멋진 모습으로 함께할게!');};$('defer-evo').onclick=()=>{game.chooseEvolution(false);pump();};}}
function confirmStone(to){
 if(!game.ready()||busy)return;const e=game.species.evolutions.find(e=>e.to===to);if(!e)return;
 const keys=[...(e.trigger==='trade'?['trade-pass']:[]),...((e.itemId??e.heldItemId)?['evo-'+(e.itemId??e.heldItemId)]:[])],catalog=shopCatalog(db),has=keys.every(k=>game.s.inventory[k]>0);
 modal(`<h2 class="modal-title">${esc(db.pokemon[to].name)}로 진화할까요?</h2><div class="evolve-art"><img class="pixel" src="${petSprite(game.pet.speciesId,false,game.pet.shiny)}" alt=""><span>→</span><img class="pixel" src="${petSprite(to,false,game.pet.shiny)}" alt=""></div><p class="modal-copy">필요 도구: ${keys.map(k=>`${esc(catalog[k].name)} 1개 (보유 ${game.s.inventory[k]??0})`).join(' + ')}<br>진행 시 도구가 소모됩니다. 기술과 이로치 여부는 유지돼요.</p><div class="modal-actions"><button id="confirm-stone" class="primary" ${!has?'disabled':''}>진화하기</button><button id="visit-shop" class="secondary">상점에서 구매</button><button id="cancel-stone" class="secondary">나중에</button></div>`,'EVOLUTION');
 $('cancel-stone').onclick=closeModal;$('visit-shop').onclick=()=>showShop('evolution');$('confirm-stone').onclick=()=>{try{e.trigger==='trade'?game.trade(to):game.stone(to);save();closeModal();render();say(game.s.journal[0].text);}catch(error){say(error.message);}};
}
const itemSymbol=id=>ITEMS[id]?.kind==='shiny'?'✦':id.startsWith('tm-')?'◎':ITEMS[id]?.kind==='ability'?'★':ITEMS[id]?.kind==='ball'?'◉':ITEMS[id]?.kind==='medicine'?'✚':id==='quick-claw'?'爪':id==='leftovers'?'◒':id==='oran-berry'?'●':'◆';
function showShop(category='all'){
 if(busy||!game.ready())return;
 const catalog=shopCatalog(db),list=Object.entries(catalog).filter(([,i])=>i.kind!=='tm'&&(category==='all'||i.kind===category||(category==='evolution'&&i.kind==='trade')));
 modal(`<div class="shop-banner"><span>◉</span><div><p class="eyebrow">POKÉ MART</p><h2>작은 숲의 상점</h2><p>필요한 도구를 챙기고 모험을 떠나요.</p></div><b>${game.s.coins} P</b></div><nav class="shop-tabs" aria-label="상품 분류">${[['all','전체'],['ball','몬스터볼'],['medicine','회복'],['held','지닌 도구'],['evolution','진화'],['ability','특성'],['shiny','이로치']].map(([id,name])=>`<button data-category="${id}" class="${category===id?'selected':''}">${name}</button>`).join('')}</nav><p id="shop-feedback" role="status"></p><div class="shop-grid">${list.map(([id,i])=>`<article class="shop-item"><span class="item-symbol">${itemSymbol(id)}</span><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p><small>보유 ${game.s.inventory[id]??0}개</small><button data-buy="${id}" ${game.s.coins<i.price||(game.s.inventory[id]??0)>=999?'disabled':''}>${i.price} P · 구매</button></article>`).join('')}</div><button id="shop-to-tms" class="full-link">◎ 기술머신 상점 →</button><button id="shop-to-bag" class="full-link">가방 열기 →</button>`,'POKÉ MART');
 $('modal-body').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>showShop(b.dataset.category));
 $('modal-body').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{try{const item=catalog[b.dataset.buy];game.buy(b.dataset.buy);save();render();showShop(category);$('shop-feedback').textContent=item.name+' 구매 완료!';}catch(e){$('shop-feedback').textContent=e.message;}});$('shop-to-bag').onclick=()=>showBag();$('shop-to-tms').onclick=()=>showTMShop();
}
function showTMShop(onlyCompatible=true){
 if(busy||!game.ready())return;
 const rows=Object.entries(db.tms??{}).filter(([,t])=>!onlyCompatible||game.species.tmMoves?.includes(t.moveId));
 modal(`<div class="shop-banner"><span>◎</span><div><p class="eyebrow">TECHNICAL MACHINE</p><h2>기술머신 상점</h2><p>${esc(game.species.name)} · ${game.s.coins} P</p></div></div><p class="modal-copy">3세대 에메랄드 TM01~50 · 성공 시 1개 소모 · 기술 최대 4개<br>공격 기술은 위력이 높을수록 비싸며, 연속·조건부 기술은 최대 위력 기준으로 가격을 정했어요. 전투 수치·물리/특수는 기존 HGSS 기준입니다.${game.species.tmCompatibilitySource!==game.pet.speciesId?`<br>이 진화형은 3세대에 없으므로 ${esc(db.pokemon[game.species.tmCompatibilitySource].name)}의 습득 조건을 적용해요.`:''}<br>대타출동과 미지원 효과 기술은 판매하지 않습니다.</p><button id="tm-filter" class="secondary">${onlyCompatible?'전체 50개 보기':'이 친구가 배울 수 있는 기술만'}</button><p id="tm-feedback" role="status"></p><div class="shop-grid">${rows.map(([id,t])=>{const m=db.moves[t.moveId],reason=t.enabled?game.tmReason(id):t.reason;return `<article class="shop-item"><span class="item-symbol">◎</span><h3>TM${String(t.number).padStart(2,'0')} ${esc(m.name)}</h3>${badge(m.typeId)}<p>위력 ${m.power??'—'} · 명중 ${m.accuracy??'필중'} · PP ${m.pp}</p><p>${esc(reason??'습득 가능')} · 보유 ${game.s.inventory[id]??0}개</p>${t.enabled?`<button data-tm-buy="${id}" ${reason||game.s.coins<t.price||(game.s.inventory[id]??0)>=999?'disabled':''}>${t.price} P · 구매</button>${!reason&&(game.s.inventory[id]??0)>0?`<button data-tm-learn="${id}">가르치기</button>`:''}`:'<button disabled>구매 불가 · 미지원</button>'}</article>`;}).join('')||'<p>이 친구는 배울 수 있는 기술머신이 없어요.</p>'}</div>`,'TM SHOP');
 $('tm-filter').onclick=()=>showTMShop(!onlyCompatible);
 $('modal-body').querySelectorAll('[data-tm-buy]').forEach(b=>b.onclick=()=>{try{game.buy(b.dataset.tmBuy);save();render();showTMShop(onlyCompatible);$('tm-feedback').textContent='구매 완료! 가르치기를 눌러 사용할 수 있어요.';}catch(e){$('tm-feedback').textContent=e.message;}});
 $('modal-body').querySelectorAll('[data-tm-learn]').forEach(b=>b.onclick=()=>teachTMDialog(b.dataset.tmLearn));
}
function teachTMDialog(id){
 if(busy||!game.ready())return;const t=db.tms[id],m=db.moves[t.moveId],p=game.pet;
 modal(`<h2 class="modal-title">${esc(m.name)} 가르치기</h2><p class="modal-copy">${esc(game.species.name)}에게 사용합니다. 학습이 성공할 때만 기술머신 1개가 소모돼요.${p.moves.length===4?' 잊을 기술을 선택하세요.':''}</p><p id="tm-error" role="status"></p><div class="learn-options">${p.moves.length===4?p.moves.map((mid,i)=>`<button class="move-tile" style="${typeSkin(db.moves[mid].typeId)}" data-tm-slot="${i}">${moveFace(db.moves[mid],i)}</button>`).join(''):'<button data-tm-slot="-1" class="primary">빈 기술 칸에 배우기</button>'}</div><button id="tm-cancel" class="secondary">취소</button>`,'LEARN TM');
 $('tm-cancel').onclick=()=>showTMShop();$('modal-body').querySelectorAll('[data-tm-slot]').forEach(b=>b.onclick=()=>{try{game.teachTM(id,Number(b.dataset.tmSlot));save();render();showTMShop();$('tm-feedback').textContent=game.s.journal[0].text;}catch(e){$('tm-error').textContent=e.message;}});
}
function shinyDialog(){
 if(busy||!game.ready())return;
 modal(`<h2 class="modal-title">${esc(game.species.name)}를 이로치로 바꿀까요?</h2><img class="pixel" src="${petSprite(game.pet.speciesId,false,true)}" width="128" height="128" alt="이로치 미리보기"><p class="modal-copy">별빛물약 1개를 사용해 영구적으로 이로치가 됩니다. 레벨·기술·특성은 유지됩니다.</p><p id="shiny-error" role="status"></p><button id="shiny-confirm" class="primary">별빛물약 사용</button><button id="shiny-cancel" class="secondary">취소</button>`,'SHINY FRIEND');
 $('shiny-cancel').onclick=()=>showBag();$('shiny-confirm').onclick=()=>{try{game.makeShiny();save();render();closeModal();say(game.s.journal[0].text);}catch(e){$('shiny-error').textContent=e.message;}};
}
function showBag(onlyBalls=false){
 if(busy||(!game.ready()&&!game.s.battle))return;const battle=game.s.battle,catalog=shopCatalog(db);
 const items=Object.entries(catalog).filter(([id,i])=>(game.s.inventory[id]??0)>0&&(!onlyBalls||i.kind==='ball'));
 modal(`<h2 class="modal-title">${battle?'전투 가방':'나의 가방'}</h2><p class="modal-copy">${battle?'상처약과 몬스터볼 사용은 한 턴을 사용해요. 포획에 성공하면 전투가 끝나요.':'상처약은 직접 사용하고, 지닌 도구는 친구마다 하나씩 장착해요.'}</p><p>동행 ${Object.keys(game.s.pets).length}/3 · ${esc(game.species.name)}의 도구: ${esc(ITEMS[game.pet.heldItem]?.name??'없음')}</p>${!battle&&game.pet.heldItem?'<button id="unequip" class="secondary">지닌 도구 돌려받기</button>':''}<p id="bag-feedback" role="status"></p><div class="shop-grid">${items.map(([id,i])=>{
 const canBall=battle&&battle.kind!=='trainer'&&i.kind==='ball'&&Object.keys(game.s.pets).length<3;
 const canHeal=medicineUsable(i,battle?battle.player:{...game.pet,maxHp:statsFor(db,game.pet.speciesId,game.pet.level,game.pet.ivs).hp});
 const canTM=!battle&&i.kind==='tm'&&!game.tmReason(id),canShiny=!battle&&i.kind==='shiny'&&!game.pet.shiny;
 const canEquip=!battle&&i.kind==='held',abilityTarget=!battle&&i.kind==='ability'?abilityItemTarget(db,game.pet,id):null;const chance=canBall?captureChance(db,battle.enemy,id):null;
 return `<article class="shop-item"><span class="item-symbol">${itemSymbol(id)}</span><h3>${esc(i.name)} ×${game.s.inventory[id]}</h3><p>${esc(i.description)}</p>${chance!==null?`<p>포획 성공률 ${(chance*100).toFixed(1)}%</p>`:''}<button data-use="${id}" ${!(canBall||canHeal||canEquip||abilityTarget||canTM||canShiny)?'disabled':''}>${i.kind==='tm'?(canTM?'기술 가르치기':game.tmReason(id)||'쉼터에서 사용'):i.kind==='shiny'?(game.pet.shiny?'이미 이로치':'이로치로 변경'):i.kind==='ball'?'던지기':i.kind==='held'?'지니게 하기':i.kind==='ability'?(abilityTarget?esc(db.abilities[abilityTarget.id].name)+'(으)로 변경':'변경 불가'):i.kind==='medicine'?'사용하기':'진화 화면에서 사용'}</button></article>`;
 }).join('')||'<p>가방이 비어 있어요. 상점에서 준비하세요.</p>'}</div>${!battle?'<button id="bag-to-shop" class="full-link">상점으로 →</button>':''}`,'BAG');
 if($('unequip'))$('unequip').onclick=()=>{try{game.equip(null);save();render();showBag();}catch(e){$('bag-feedback').textContent=e.message;}};
 $('modal-body').querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{const id=b.dataset.use;if(!battle&&catalog[id].kind==='tm'){teachTMDialog(id);return;}if(!battle&&catalog[id].kind==='shiny'){shinyDialog();return;}if(battle){turn({item:id});return;}try{ITEMS[id].kind==='ability'?game.changeAbility(id):ITEMS[id].kind==='held'?game.equip(id):game.heal(id);save();render();showBag();}catch(e){$('bag-feedback').textContent=e.message;}});
 if($('bag-to-shop'))$('bag-to-shop').onclick=()=>showShop();
}

function showDex(id=game.pet.speciesId){const sp=db.pokemon[id];modal(`<div class="modal-pet"><img class="pixel" src="${petSprite(id)}" alt="${esc(sp.name)}"><div><p class="eyebrow">NO.${String(id).padStart(3,'0')} · ${esc(sp.genus)}</p><h2>${esc(sp.name)}</h2>${sp.typeIds.map(badge).join(' ')}</div></div><p class="modal-copy">${esc(sp.description)}<br><small>도감 설명 출처 버전: ${esc(sp.descriptionVersion||'PokeAPI')}</small></p><div class="dex-stats"><div><small>키</small><strong>${sp.heightM} m</strong></div><div><small>몸무게</small><strong>${sp.weightKg} kg</strong></div><div><small>학습·진화 기준</small><strong style="font-size:12px">HG / SS</strong></div></div><h3>특성 목록</h3>${abilityDetails(sp)}<p class="modal-copy">종족값 · 7세대 기준 (현재 레벨의 능력치와 달라요)</p><div class="dex-stats">${Object.entries(sp.stats).map(([k,v])=>`<div><small>${{'hp':'HP','attack':'공격','defense':'방어','special-attack':'특수공격','special-defense':'특수방어','speed':'스피드'}[k]}</small><strong>${v}</strong></div>`).join('')}</div><h3 style="font-size:15px">함께 자라는 모습</h3><div style="display:flex;gap:8px;flex-wrap:wrap">${sp.family.map(i=>`<button class="secondary" data-dex="${i}" style="padding:7px"><img class="pixel" src="${petSprite(i)}" alt="" width="55" height="55"><br>${esc(db.pokemon[i].name)}</button>`).join('')}</div><p class="modal-copy">${sp.evolutions.map(e=>`${esc(db.pokemon[e.to].name)}: ${evolutionText(e)}`).join('<br>')||'최종 진화형입니다.'}</p><button class="primary" id="dex-learnset">레벨별 기술표 보기</button>`,'POKÉDEX · HEARTGOLD / SOULSILVER');$('modal-body').querySelectorAll('[data-dex]').forEach(b=>b.onclick=()=>showDex(Number(b.dataset.dex)));$('dex-learnset').onclick=()=>showLearnset(id);}
function showLearnset(id=game.pet.speciesId){const sp=db.pokemon[id],p=game.pet;modal(`<h2 class="modal-title">${esc(sp.name)}의 기술 노트</h2><p class="modal-copy">하트골드·소울실버의 <strong>레벨업 기술</strong>입니다.<br>현재 종이 이미 배울 수 있는 기술은 무료로 다시 떠올릴 수 있어요. 이 표에는 레벨업 기술만 표시합니다. 기술머신은 별도 상점에서 구매하며, 잊은 기술머신 기술은 다시 구매해야 합니다. 미뇽의 7레벨 불꽃세례는 게임 밸런스용 추가 기술입니다.</p><table class="data-table"><thead><tr><th>레벨</th><th>기술 / 타입</th><th>위력</th><th>명중</th><th>PP</th><th></th></tr></thead><tbody>${sp.learnset.map(l=>{const m=db.moves[l.moveId],known=id===p.speciesId&&p.moves.includes(m.id),can=id===p.speciesId&&l.level<=p.level&&!known&&game.ready();return `<tr class="${id===p.speciesId&&l.level<=p.level?'available':''}"><td>${l.level===0?'진화':l.level===1?'기본':l.level}${l.gameOverride?' · 게임 추가':''}</td><td>${esc(m.name)}<br>${badge(m.typeId)}</td><td>${m.power??'—'}</td><td>${m.accuracy??'—'}</td><td>${m.pp}</td><td>${known?'<small>사용 중</small>':can?`<button class="text-btn" style="color:#8c63b4" data-recall="${m.id}">떠올리기</button>`:''}</td></tr>`;}).join('')}</tbody></table><p class="modal-copy">본 게임의 1:1 전투는 날씨·교체·일부 부가 효과를 간소화합니다. 레벨별 습득 조건과 기술 4칸 제한은 유지됩니다.</p>`,'MOVE NOTE');$('modal-body').querySelectorAll('[data-recall]').forEach(b=>b.onclick=()=>recallDialog(Number(b.dataset.recall)));}
function recallDialog(id){const p=game.pet,m=db.moves[id];if(p.moves.length<4){game.recall(id,0);save();render();showLearnset();return;}modal(`<h2 class="modal-title">${esc(m.name)} 떠올리기</h2><p class="modal-copy">새 기술을 위해 잊을 기술을 선택하세요.</p><div class="learn-options">${p.moves.map((mid,i)=>`<button class="move-tile" style="${typeSkin(db.moves[mid].typeId)}" data-slot="${i}">${moveFace(db.moves[mid],i)}</button>`).join('')}</div><div class="modal-actions"><button class="secondary" id="back-learnset">돌아가기</button></div>`,'MOVE REMINDER');$('modal-body').querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{game.recall(id,Number(b.dataset.slot));save();render();showLearnset();});$('back-learnset').onclick=()=>showLearnset();}
function showHelp(){modal(`<h2 class="modal-title">세 친구와 보내는 하루</h2><div class="modal-copy"><p>알에서 첫 친구를 만나고 야생 포켓몬을 포획해 최대 3마리와 함께해요. 같은 종도 각각 키울 수 있어요.</p><p>쉼터에서 친구를 선택하면 육성 대상이 바뀝니다. 전투 중에는 선택한 친구로 교대하며 한 턴을 사용해요. 출전한 친구가 기절하면 전투는 종료돼요.</p><p>처음 10번은 야생 전투, 11번째부터 20% 확률로 트레이너가 등장해요. 트레이너전 직후는 반드시 야생이에요. 상대 3마리는 시작 시 선택한 친구보다 1~3레벨 낮고 각각 이로치 확률 4%예요. 포획은 불가능하며 3마리 승리 시 합산 경험치와 240 P를 받아요. 이전 저장은 업데이트 후 전투부터 횟수를 세어요.</p><p>피로도 100은 팀이 함께 사용해요. 전투 +35, 식사 +15. 잠자기는 하루를 넘기고 모두의 HP와 피로도를 회복해요.</p><p>상점에서 볼·상처약·지닌 도구·진화 도구를 구매하세요. 전투 중 가방 사용은 한 턴, 도구 장착은 쉼터에서 가능해요. 기술은 4칸, 상태이상은 현재 전투에서만 유지돼요.</p><p>알과 야생의 이로치 확률은 각각 ${SHINY_CHANCE*100}%입니다. 포획도 HGSS 최종 성공률 ×1.1(최대 100%)입니다. 10%포인트를 더하는 방식은 아니에요.</p><p>특성은 알·야생·트레이너 모두 랜덤이며, 숨겨진 특성이 있는 종은 3% 확률로 초록색 ★가 표시됩니다. 노란색 이로치 ★와 동시에 표시될 수 있어요. 특성캡슐은 일반 특성끼리, 특성패치는 일반 ↔ 숨겨진 특성으로 바꿉니다. 특성 상세에서 이 게임의 적용 범위를 확인할 수 있어요.</p><p>전투 승리당 1% 확률로 별빛물약을 제외한 상점 도구 중 하나를 1개 얻어요. 기술머신도 드롭될 수 있어요. 트레이너전은 3마리 모두 이긴 뒤 한 번 추첨하고, 포획·도주·패배에는 드롭이 없습니다.</p><p>별빛물약은 20,000 P로 구매해 친구를 이로치로 바꿉니다. 기술머신 상점은 3세대 목록·습득 조건을 사용하며 성공 시 1개를 소모합니다. 4세대 추가 진화형은 3세대에 존재하는 직계 진화 전 포켓몬의 조건을 따릅니다. 전투 위력·물리/특수 분류는 기존 HGSS 기준입니다. 이번 패치에서 전투 경험치를 이전의 60%로 줄였습니다.</p><p>놓아주기는 선택한 친구만 떠나보내며 가방·포인트·다른 친구는 유지돼요. 마지막 친구를 놓아주면 새 알을 만나요.</p><p>저장은 이 브라우저에 보관돼요. 기존 버전 저장은 자동 변환하며 변환 전 사본도 남겨요.</p></div><label class="import-label">저장 백업 불러오기<input id="import-save" type="file" accept=".json,application/json"></label><p id="import-message" class="modal-copy"></p>`,'HOW TO PLAY');$('import-save').onchange=importSave;}
function showSources(){modal(`<h2 class="modal-title">실제 데이터, 작은 게임의 규칙</h2><div class="modal-copy"><p><strong>학습·진화·타입: HGSS / 종족값·기술 분류: 7세대.</strong><br>야생 상대 ${db.enemyIds.length}종 / 전체 데이터 ${Object.keys(db.pokemon).length}종, ${Object.keys(db.moves).length}개 기술을 JSON으로 저장했습니다.</p><p>레벨업 기술표는 해당 버전의 데이터만 사용해요. 타입·기술의 위력/명중/PP는 HGSS 당시의 변경 내역을 반영했습니다. 친밀도 진화 기준은 당시의 220을 적용합니다. 따라서 삐·푸푸린 계열은 이 버전에서 노말타입입니다.</p><p>피로도·식사·수면·포인트와 경험치 보상은 이 게임만의 육성 규칙이에요. 배루키 계열은 부화 때 정한 공격·방어 개체값을 반영합니다. 나머지 개체값·노력치·성격은 간소화합니다. 일반 특성 슬롯·주요 전투 효과는 7세대, 숨겨진 특성 슬롯은 현재 PokeAPI 데이터를 사용합니다. 도감에 모든 후보가 표시되며 적용 범위는 특성 상세에 안내합니다. 선제공격손톱·먹다남은음식·오랭열매가 구현되어 있고, 진화 도구는 상점에서 구매합니다. 맑음·비·모래바람·싸라기눈은 5턴 지속하며 교대 특성도 반영합니다. 성별·더블배틀·벽·대타출동 관련 효과는 적용되지 않습니다. 복잡한 기술·부가 효과·연속 공격의 일부 처리 순서는 간소화됩니다. PP는 전투를 시작할 때 회복됩니다.</p><p>야생 상대는 전설·환상 5종을 제외한 1세대 146종입니다. 상대 레벨은 내 친구보다 0~2 낮아요. 3단계 계열은 미진화 → 20 이상 중간 → 36 이상 최종 순서이며 실제 진화 최소 레벨보다 일찍 등장하지 않습니다. 2단계 계열은 중간 단계를 건너뛰고 36 이상에 최종형이 나옵니다. 진화 없는 종은 20 이상, 종족값 합계 450 이상인 종은 30 이상에 등장합니다. 이는 이 게임의 등장 규칙이며 내 친구의 실제 진화 조건은 그대로입니다.</p><p>공격 기술 타입과 상대의 모든 타입을 곱해 0·¼·½·1·2·4배 상성을 적용합니다. 같은 타입 기술은 추가로 1.5배, 적응력은 2배입니다. 고정 피해는 타입 무효만 적용하고 배율 보너스는 받지 않습니다. 발버둥은 타입 상성과 같은 타입 보너스를 받지 않습니다.</p><p>종족값과 기술의 물리·특수·변화 분류는 7세대 기준입니다. 물리는 공격/방어, 특수는 특수공격/특수방어를 사용하며 고정 피해 기술은 예외입니다. 기본 능력치는 종족값·레벨·기존 개체값으로 계산합니다. 노력치는 0, 성격 보정은 1배로 간소화합니다. 스피드는 같은 우선도의 행동 순서를 정합니다. 기술 위력·타입·학습표·진화는 기존 HGSS 규칙을 유지합니다.</p><p>PokeAPI는 커뮤니티 데이터베이스이며 Pokémon의 공식 API는 아닙니다.</p><ul>${[...db.meta.sources,{name:"특성 데이터 · PokeAPI",url:"https://pokeapi.co/docs/v2/#abilities"},{name:"특성캡슐 / 특성패치 규칙",url:"https://bulbapedia.bulbagarden.net/wiki/Ability_Patch"}].map(x=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.name)}</a></li>`).join('')}</ul><p>캐릭터 스프라이트 출처: PokeAPI sprites / HGSS. 배경: AI로 제작한 픽셀 풍경.<br>Pokémon 및 캐릭터의 권리는 각 권리자에게 있습니다.</p><p><a href="data/pokedex.json" download>도감·기술·진화 JSON 다운로드 ↓</a></p></div>`,'DATA & CREDITS');}
function exportSave(){if(!game.ready()||busy)return;download(JSON.stringify(game.s,null,2),`pokegotchi-day-${game.s.day}.json`);say('저장 백업을 내려받았어요. 게임 안내에서 다시 불러올 수 있어요.');}
function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function importSave(e){const file=e.target.files[0];if(!file)return;try{if((game.s.hatched&&!game.ready())||busy)throw Error('현재 전투 또는 성장을 먼저 마쳐주세요.');if(file.size>2000000)throw Error('저장 파일이 너무 큽니다.');const state=migrateState(db,validateState(db,JSON.parse(await file.text())));modal(`<h2 class="modal-title">저장한 하루로 돌아갈까요?</h2><p class="modal-copy">DAY ${state.day}의 저장을 불러옵니다. 현재 이 브라우저의 진행 상황을 덮어씁니다.</p><div class="modal-actions"><button class="primary" id="confirm-import">불러오기</button><button class="secondary" id="cancel-import">취소</button></div>`,'LOAD SAVE');$('confirm-import').onclick=()=>{game=new Game(db,state);save();closeModal();render();say(`DAY ${state.day}의 저장을 불러왔어요.`);};$('cancel-import').onclick=closeModal;}catch(err){$('import-message').textContent=err.message;}}
function hatchOddsText(data){
 const table=data.hatchTable,total=table.reduce((n,row)=>n+row.weight,0);
 const percent=weight=>Number((weight/total*100).toFixed(4))+'%';
 const rareIds=[132,147,133],rare=rareIds.map(id=>table.find(row=>row.id===id)).filter(Boolean);
 const common=table.filter(row=>!rareIds.includes(row.id));
 const parts=rare.map(row=>data.pokemon[row.id].name+' '+percent(row.weight));
 if(common.length){const uniform=common.every(row=>row.weight===common[0].weight);parts.push(uniform?`나머지 ${common.length}종은 각각 약 ${percent(common[0].weight)}`:`나머지 ${common.length}종 합계 ${percent(common.reduce((n,row)=>n+row.weight,0))}`);}
 return parts.join(' · ');
}
function renderEgg(){
 $('hatch-odds').textContent=hatchOddsText(db);$('ability-odds').textContent='이로치 ★ 4% · 숨겨진 특성 ★ 3% (해당 특성이 있는 종)';
  $('day').textContent='DAY '+String(game.s.day).padStart(2,'0');$('open-tms').disabled=true;$('open-shop').disabled=true;$('open-bag').disabled=true;$('help').disabled=busy;$('sources').disabled=busy;$('export-save').disabled=true;
  $('hatch-egg').disabled=busy;$('hatch-egg').onclick=hatchEgg;
}
async function hatchEgg(){
  if(busy||game.s.hatched)return;
  busy=true;game.hatch();save(); // Commit the random result before any animation, including refreshes.
  $('hatch-egg').disabled=true;$('help').disabled=true;$('sources').disabled=true;
  $('hatch-egg').classList.add('hatching');$('hatch-hint').textContent='어라? 알이 움직이고 있어요…';
  await wait(1500);
  $('hatch-egg').classList.remove('hatching');busy=false;render();
  speak('반가워! 앞으로 잘 부탁해.');say(game.s.journal[0].text);
  modal(`<div class="hatch-reveal"><p class="eyebrow">${game.pet.shiny?'★ SHINY FRIEND':[132,133,147].includes(game.pet.speciesId)?`RARE FRIEND · ${Number((db.hatchTable.find(row=>row.id===game.pet.speciesId).weight/db.hatchTable.reduce((n,row)=>n+row.weight,0)*100).toFixed(4))}%`:'HELLO, LITTLE FRIEND'}</p><img class="pixel" src="${petSprite(game.pet.speciesId,false,game.pet.shiny)}" alt="${esc(game.species.name)}"><h2 class="modal-title">${shinyMark(game.pet)}${esc(game.species.name)}가 태어났어요!</h2><p>${esc(abilityLabel(game.pet))}</p><p class="modal-copy">이제 이 친구와 함께 먹고, 쉬고, 모험해요.<br>둘만의 첫날을 시작해 볼까요?</p><button class="primary" id="meet-pet">함께 시작하기</button></div>`,'A NEW FRIEND');
  $('meet-pet').onclick=closeModal;
}
function confirmNewEgg(){
 if(busy||!game.ready())return;
 modal(`<h2 class="modal-title">${esc(game.species.name)}를 놓아줄까요?</h2><p class="modal-copy">선택한 친구의 육성 기록은 삭제됩니다. 다른 친구·가방·포인트·날짜는 유지하고 지닌 도구는 돌려받아요.${Object.keys(game.s.pets).length===1?' 마지막 친구를 놓아주면 새 알을 받습니다.':''}</p><div class="modal-actions"><button id="backup-before-reset" class="secondary">현재 저장 백업</button><button id="confirm-new-egg" class="primary">이 친구 놓아주기</button><button id="cancel-new-egg" class="secondary">취소</button></div>`,'GOODBYE');
 $('backup-before-reset').onclick=exportSave;$('cancel-new-egg').onclick=closeModal;$('confirm-new-egg').onclick=()=>{try{game.release();save();closeModal();render();}catch(e){say(e.message);}};
}
async function init(){try{const response=await fetch('data/pokedex.json?v=pokegotchi-270');if(!response.ok)throw Error('도감 데이터를 불러오지 못했어요.');db=await response.json();let state=null;try{const raw=localStorage.getItem(KEY);if(raw){state=JSON.parse(raw);if(state.schemaVersion!==3||Object.values(state.pets??{}).some(p=>p.abilitySlot===undefined)){try{localStorage.setItem(KEY+'-legacy-backup',raw);}catch{}state=migrateState(db,state);}validateState(db,{...state,battle:null,pending:[],progressing:false});if(state.pending.some(e=>!['move','evolution'].includes(e.kind)||(e.kind==='move'&&!db.moves[e.moveId])||(e.kind==='evolution'&&!db.pokemon[e.to])))throw Error('성장 정보 오류');if(state.battle){for(const f of [state.battle.player,state.battle.enemy]){if((f.abilitySlot!==undefined&&![1,2,3].includes(f.abilitySlot))||!db.pokemon[f.speciesId]||!Array.isArray(f.moves)||!f.moves.every(m=>db.moves[m.id]&&Number.isFinite(m.pp))||!Number.isFinite(f.hp)||!f.stages)throw Error('전투 정보 오류');}}}}catch(error){throw Error('기존 저장은 그대로 보관했어요. '+error.message);}
    game=new Game(db,state??freshState(db));$('open-tms').onclick=()=>showTMShop();$('open-shop').onclick=()=>showShop();$('open-bag').onclick=()=>showBag();$('battle-bag').onclick=()=>showBag();$('battle-catch').onclick=()=>showBag(true);$('battle').onclick=startBattle;$('feed').onclick=()=>care('feed');$('sleep').onclick=()=>care('sleep');$('flee').onclick=()=>{if(busy)return;try{game.flee();save();render();say('쉼터로 돌아왔어요. 피로도는 그대로 유지돼요.');}catch(e){say(e.message);}};$('help').onclick=showHelp;$('sources').onclick=showSources;$('dex-button').onclick=()=>showDex();$('learnset').onclick=()=>showLearnset();$('export-save').onclick=exportSave;
    render();if(!game.s.hatched){$('hatch-egg').onclick=hatchEgg;save();return;}save();if(game.s.battle)say('진행 중이던 전투를 이어서 시작해요. 기술을 선택하세요.');else say(saveWarning||`${game.species.name}가 주인님을 기다리고 있어요. 오늘은 함께 무엇을 할까요?`);if(game.s.pending.length||game.s.progressing)pump();
  }catch(e){say(e.message+' 새로고침해서 다시 시도해 주세요.');$('actions').innerHTML='<p class="error-view">게임 데이터를 불러오지 못했습니다. <button onclick="location.reload()">다시 시도</button></p>';}}
init();
