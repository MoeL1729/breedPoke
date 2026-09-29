"""Reproducible, species-aware Gen-II–IX egg shop, capped at SV Indigo Disk.
The shop combines historical learning records; it is not a transfer simulator.
Only audited engine effects are sold. No invented breeding/TM compatibility.
"""
import csv,json,pathlib,collections,math
R=pathlib.Path(__file__).resolve().parents[1]
def rows(n,folder='tm'):
 with (R/'.data-cache'/folder/(n+'.csv')).open() as f:return list(csv.DictReader(f))
db=json.loads((R/'data/pokedex.json').read_text());raw={int(r['id']):r for r in rows('moves')};names={int(r['move_id']):r['name'] for r in rows('move_names') if r['local_language_id']=='3'}
meta={int(r['move_id']):r for r in rows('move_meta')};sc=rows('move_meta_stat_changes');stat={r['id']:r['identifier'] for r in rows('stats')};vg={int(r['id']):r for r in rows('version_groups')};ch=rows('move_changelog');flags={r['id']:r['identifier'] for r in rows('move_flags','abilities')};fm=collections.defaultdict(list)
for r in rows('move_flag_map','abilities'):fm[int(r['move_id'])].append(flags[r['move_flag_id']])
num=lambda x:int(x) if x not in ('',None) else None
field={'spikes','toxic-spikes','stealth-rock','rapid-spin','defog','gravity','trick-room','reflect','light-screen','safeguard','mist','tailwind','toxic','haze','ingrain','aqua-ring','roar','whirlwind','leech-seed','brick-break'}
# Deliberately narrow audit: damage, status, stat changes, heal, drain, recoil, fixed damage.
extra=set('belly-drum dragon-dance swords-dance growth agility amnesia nasty-plot bulk-up calm-mind iron-defense feather-dance cotton-spore scary-face charm metal-sound screech tickle recover slack-off milk-drink soft-boiled heal-order rest protect detect thunder-wave hypnosis sleep-powder spore poison-powder stun-spore will-o-wisp confuse-ray supersonic counter mirror-coat dragon-rage seismic-toss night-shade extreme-speed mach-punch aqua-jet bullet-punch ice-shard vacuum-wave quick-attack feint-attack swift shock-wave aerial-ace magical-leaf vital-throw flail low-kick grass-knot gyro-ball crunch bite fire-fang ice-fang thunder-fang thunder-punch fire-punch ice-punch drain-punch giga-drain mega-drain absorb leech-life aqua-tail dragon-pulse dragon-rush dragon-claw outrage double-edge take-down headbutt iron-head zen-headbutt rock-slide ancient-power silver-wind ominous-wind cross-chop air-slash leaf-blade night-slash slash shadow-claw razor-leaf double-kick arm-thrust bullet-seed icicle-spear rock-blast pin-missile fury-attack fury-swipes tail-slap spike-cannon double-hit comet-punch twineedle bind wrap fire-spin whirlpool clamp sand-tomb magma-storm'.split())
# Outrage needs forced repeat/confusion and is deliberately excluded until that engine exists.
extra.discard('outrage')
safe={i for i,r in raw.items() if int(r['generation_id'])<=9 and int(r['type_id'])<=17 and (r['identifier'] in field|extra or r['effect_id']=='1' and r['power'] and r['target_id'] in ['10','11'])}
def ensure(i):
 k=str(i)
 if k in db['moves']:return
 r=dict(raw[i]);generation=int(r['generation_id'])
 if generation<=4:
  for key in ['type_id','power','pp','accuracy','priority','target_id']:
   hist=sorted([x for x in ch if int(x['move_id'])==i and int(vg[int(x['changed_in_version_group_id'])]['order'])>int(vg[10]['order']) and x.get(key) not in ('',None)],key=lambda x:int(vg[int(x['changed_in_version_group_id'])]['order']))
   if hist:r[key]=hist[0][key]
 m=meta.get(i,{})
 db['moves'][k]={'id':i,'name':names.get(i,r['identifier']),'slug':r['identifier'],'typeId':int(r['type_id']),'power':num(r['power']),'accuracy':num(r['accuracy']),'pp':int(r['pp']),'priority':int(r['priority']),'damageClass':{1:'status',2:'physical',3:'special'}[int(r['damage_class_id'])],'damageClassGeneration':7 if generation<=7 else generation,'target':'user' if r['target_id']=='7' else 'opponent','targetId':int(r['target_id']),'effectId':int(r['effect_id'] or 0),'meta':{k:num(m.get(v)) or 0 for k,v in {'ailment':'meta_ailment_id','ailmentChance':'ailment_chance','statChance':'stat_chance','healing':'healing','drain':'drain','minHits':'min_hits','maxHits':'max_hits','flinchChance':'flinch_chance','critRate':'crit_rate'}.items()},'statChanges':[{'stat':stat[x['stat_id']],'label':{'attack':'공격','defense':'방어','special-attack':'특수공격','special-defense':'특수방어','speed':'스피드','accuracy':'명중률','evasion':'회피율'}[stat[x['stat_id']]],'change':int(x['change'])} for x in sc if int(x['move_id'])==i],'flags':fm[i]}
for i,r in raw.items():
 if r['identifier'] in field:ensure(i)
# Additional actual Gen-IV TMs: Stealth Rock, Trick Room (no fictitious Spikes TM).
for t in db['tms'].values():t.setdefault('generation',3)
for n in [5,6,16,20,33]:db['tms'][f'tm-{n:02}'].update(enabled=True,reason='')
for n,mid in [(76,446),(92,433)]:db['tms'][f'tm-{n}']={'number':n,'moveId':mid,'enabled':True,'reason':'','price':600,'effectivePower':0,'generation':4}
records=collections.defaultdict(list)
for r in rows('pokemon_moves'):
 v=int(r['version_group_id'])
 if v not in vg or v>27 or int(vg[v]['generation_id'])>9:continue
 records[int(r['pokemon_id'])].append((v,int(r['move_id']),int(r['pokemon_move_method_id'])))
parents={e['to']:p['id'] for p in db['pokemon'].values() for e in p['evolutions']}
for p in db['pokemon'].values():
 pid=p['id'];anc=[pid]
 while anc[-1] in parents:anc.append(parents[anc[-1]])
 for v,mid,method in records[pid]:
  if v==10 and method==4 and mid in [446,433] and mid not in p['tmMoves']:p['tmMoves'].append(mid)
 p['tmMoves'].sort()
 eggs={};bonus={};tmset={mid for a in anc for v,mid,method in records[a] if method==4}
 for a in anc:
  nonEgg=collections.defaultdict(set)
  for v,mid,method in records[a]:
   if method in [1,3,4]:nonEgg[v].add(mid)
  for v,mid,method in records[a]:
   if mid not in safe:continue
   source={'speciesId':a,'versionGroup':vg[v]['identifier'],'generation':int(vg[v]['generation_id']),'method':{1:'level-up',2:'egg',3:'tutor'}.get(method,'machine')}
   if method==2 and mid not in nonEgg[v]:
    if mid not in eggs or int(vg[v]['order'])>eggs[mid][0]:eggs[mid]=(int(vg[v]['order']),source)
   if method in [1,2,3] and mid not in tmset:
    if mid not in bonus or int(vg[v]['order'])>bonus[mid][0]:bonus[mid]=(int(vg[v]['order']),source)
 # Bonus is separate from the permanent egg shelf; at most six distinct legal moves.
 p['eggMoves']=sorted(eggs);p['bonusMoves']=sorted(set(bonus)-set(eggs))
 p['eggMoveSources']={str(i):v[1] for i,v in eggs.items()};p['bonusMoveSources']={str(i):bonus[i][1] for i in p['bonusMoves']}
 for i in set(eggs)|set(p['bonusMoves']):ensure(i)
# Gen-IV Rapid Spin never raises Speed (added only in Gen VIII).
db['moves']['229']['statChanges']=[]
db['moves']['229']['meta']['statChance']=0
db['fieldRules']={'generation':4,'defog':'target side only','rapidSpinSpeedBoost':False,'modernExceptions':['Gen7 abilities','Heavy-Duty Boots (Gen8)'],'source':['https://bulbapedia.bulbagarden.net/wiki/Spikes_(move)','https://bulbapedia.bulbagarden.net/wiki/Leech_Seed_(move)','https://pokeapi.co/docs/v2/']}
db['eggShopRules']={'unlockTrainerWins':5,'bonusSlots':6,'refresh':'game day, saved per species','generations':'2–9 through Scarlet/Violet Indigo Disk','eggOnly':'egg method and no level/tutor/machine method for that source species in the same version group','bonus':'legal level/egg/tutor move absent from all machine records of this species and its ancestors through Gen9; permanent egg shelf excluded','compatibility':'historical union with ancestors; game-specific paid teaching, no breeding or transfer simulator','supportedMoveIds':sorted(safe & {int(i) for i in db['moves']}),'source':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv','retrieved':'2026-09-29'}
(R/'data/pokedex.json').write_text(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n')
print('Moves',len(db['moves']),'TM',len(db['tms']),'enabled',sum(t['enabled'] for t in db['tms'].values()))
print('Egg species',sum(bool(p['eggMoves']) for p in db['pokemon'].values()),'unique egg moves',len({m for p in db['pokemon'].values() for m in p['eggMoves']}),'bonus species >=6',sum(len(p['bonusMoves'])>=6 for p in db['pokemon'].values()))
for i in [1,4,7,172,133,132,147]:
 p=db['pokemon'][str(i)];print(p['name'],'egg',len(p['eggMoves']),'bonus',len(p['bonusMoves']))
