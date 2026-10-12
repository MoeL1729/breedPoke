"""Gen-8 types and all Gen-1..9 mythical species, using cached PokeAPI CSV.
Existing species stats/learnsets, starters and ordinary encounters are retained.
New species: latest main-series level-up records at/before SV Indigo Disk;
Gen-8 records preferred, Gen-7 fallback for species unavailable in Gen 8.
"""
from pathlib import Path
import csv,json,os,collections,hashlib
R=Path(__file__).resolve().parents[1]
BASE=Path(os.environ.get('POKEDAYS_CACHE',str(R/'.data-cache/base')))
def rows(n,folder=None):
 p=(R/'.data-cache'/folder if folder else BASE)/(n+'.csv')
 with p.open() as f:return list(csv.DictReader(f))
def index(rs,k='id'):return {int(r[k]):r for r in rs}
num=lambda x:int(x) if x not in ('',None) else None
p=R/'data/pokedex.json';db=json.loads(p.read_text())
species=index(rows('pokemon_species'));pk=index(rows('pokemon'));names=index([r for r in rows('pokemon_species_names') if r['local_language_id']=='3'],'pokemon_species_id')
myths=[i for i,s in species.items() if s['is_mythical']=='1' and int(s['generation_id'])<=9]
assert len(myths)==23
vg=index(rows('version_groups'));types=rows('pokemon_types');past=rows('pokemon_types_past')
stats=rows('pokemon_stats');paststats=rows('pokemon_stats_past');statnames={r['id']:r['identifier'] for r in rows('stats') if int(r['id'])<=6}
learn=collections.defaultdict(lambda:collections.defaultdict(list));tm=collections.defaultdict(lambda:collections.defaultdict(set))
all_moves=rows('pokemon_moves')
for r in all_moves:
 sid=int(r['pokemon_id']);v=int(r['version_group_id'])
 if sid in myths and v<=27:
  if r['pokemon_move_method_id']=='1':learn[sid][v].append({'level':int(r['level']),'moveId':int(r['move_id']),'order':int(r['order'] or 0)})
  if r['pokemon_move_method_id']=='4':tm[sid][v].add(int(r['move_id']))
flavor=rows('pokemon_species_flavor_text')
for sid in myths:
 if str(sid) in db['pokemon']:continue
 s=species[sid];r=pk[sid];g=int(s['generation_id'])
 available=learn[sid];preferred=[v for v in available if int(vg[v]['generation_id'])<=8 and v!=24]
 v=max(preferred or list(available),key=lambda v:int(vg[v]['order']))
 base={statnames[x['stat_id']]:int(x['base_stat']) for x in stats if int(x['pokemon_id'])==sid and x['stat_id'] in statnames}
 for stat,key in statnames.items():
  history=sorted([x for x in paststats if int(x['pokemon_id'])==sid and x['stat_id']==stat and int(x['generation_id'])>=max(7,g)],key=lambda x:int(x['generation_id']))
  if history:base[key]=int(history[0]['base_stat'])
 f=next((x for x in reversed(flavor) if int(x['species_id'])==sid and x['language_id']=='3'),None)
 db['pokemon'][str(sid)]={'id':sid,'slug':s['identifier'],'name':names[sid]['name'],'genus':names[sid]['genus'],'description':' '.join(f['flavor_text'].split()) if f else names[sid]['genus'],'heightM':int(r['height'])/10,'weightKg':int(r['weight'])/10,'typeIds':[],'stats':base,'captureRate':int(s['capture_rate']),'baseFriendship':int(s['base_happiness']),'growthRateId':int(s['growth_rate_id']),'learnset':sorted(available[v],key=lambda x:(x['level'],x['order'],x['moveId'])),'evolutions':[],'family':[sid],'sprite':f'assets/sprites/{sid}.png','backSprite':f'assets/sprites/{sid}-back.png','learnsetVersion':vg[v]['identifier'],'learnsetVersionGroupId':v,'statGeneration':max(7,g),'tmMoves':sorted(set.union(*tm[sid].values()) if tm[sid] else set()),'eggMoves':[],'bonusMoves':[],'eggMoveSources':{}}
# Type history uses the last generation to which the OLD typing applies.
for key,sp in db['pokemon'].items():
 sid=int(key);t=[r for r in types if int(r['pokemon_id'])==sid];h=[r for r in past if int(r['pokemon_id'])==sid and int(r['generation_id'])>=8]
 if h:
  gen=min(int(r['generation_id']) for r in h);t=[r for r in h if int(r['generation_id'])==gen]
 sp['typeIds']=[int(r['type_id']) for r in sorted(t,key=lambda r:int(r['slot']))]
 sp['typeGeneration']=max(8,int(species[sid]['generation_id']))
 sp['isMythical']=sid in myths
# No GO candy/evolution or breeding bypass of individual quest rewards.
for sid in myths:db['pokemon'][str(sid)]['isMythical']=True
labels={int(r['type_id']):r['name'] for r in rows('type_names') if r['local_language_id']=='3'}
db['types']={str(i):{'id':i,'name':labels[i],'slug':r['identifier']} for i,r in index(rows('types')).items() if 1<=i<=18}
db['typeChart']={str(i):{str(j):1 for j in range(1,19)} for i in range(1,19)}
for r in rows('type_efficacy'):
 if int(r['damage_type_id'])<=18 and int(r['target_type_id'])<=18:db['typeChart'][r['damage_type_id']][r['target_type_id']]=int(r['damage_factor'])/100
# Use current hidden slots; normal slots respect Gen 7 or the debut generation.
a=rows('pokemon_abilities','abilities');ap=rows('pokemon_abilities_past','abilities')
ability=index(rows('abilities','abilities'));an={int(r['ability_id']):r['name'] for r in rows('ability_names','abilities') if r['local_language_id']=='3'};af=rows('ability_flavor_text','abilities')
for sid in myths:
 sp=db['pokemon'][str(sid)]
 if sp.get('abilities'):continue
 slots={int(r['slot']):r for r in a if int(r['pokemon_id'])==sid}
 for slot,r in list(slots.items()):
  if r['is_hidden']=='1':continue
  h=sorted([x for x in ap if int(x['pokemon_id'])==sid and int(x['slot'])==slot and int(x['generation_id'])>=max(7,int(species[sid]['generation_id']))],key=lambda x:int(x['generation_id']))
  if h:slots[slot]=h[0]
 sp['abilities']=[{'id':int(r['ability_id']),'slot':slot,'hidden':r['is_hidden']=='1'} for slot,r in slots.items() if r['ability_id']]
 for entry in sp['abilities']:
  aid=entry['id'];f=next((x for x in reversed(af) if int(x['ability_id'])==aid and x['language_id']=='3'),None)
  db['abilities'].setdefault(str(aid),{'id':aid,'slug':ability[aid]['identifier'],'name':an[aid],'description':' '.join(f['flavor_text'].split()) if f else an[aid]})
raw=index(rows('moves'));mn={int(r['move_id']):r['name'] for r in rows('move_names') if r['local_language_id']=='3'};meta=index(rows('move_meta'),'move_id');ch=rows('move_changelog');sc=rows('move_meta_stat_changes');sn={r['id']:r['identifier'] for r in rows('stats')}
flags={r['id']:r['identifier'] for r in rows('move_flags','abilities')};fm=collections.defaultdict(list)
for r in rows('move_flag_map','abilities'):fm[int(r['move_id'])].append(flags[r['move_flag_id']])
used={m['moveId'] for sid in myths for m in db['pokemon'][str(sid)]['learnset']}|{574,577,583,584,585,605}
for mid in used:
 if str(mid) in db['moves']:continue
 r=dict(raw[mid]);m=meta.get(mid,{});g=int(r['generation_id']);target_group=27 if g>8 else 22
 for k in ['type_id','power','pp','accuracy','priority','target_id']:
  h=sorted([x for x in ch if int(x['move_id'])==mid and int(vg[int(x['changed_in_version_group_id'])]['order'])>int(vg[target_group]['order']) and x.get(k) not in ('',None)],key=lambda x:int(vg[int(x['changed_in_version_group_id'])]['order']))
  if h:r[k]=h[0][k]
 db['moves'][str(mid)]={'id':mid,'name':mn[mid],'slug':r['identifier'],'typeId':int(r['type_id']),'power':num(r['power']),'accuracy':num(r['accuracy']),'pp':int(r['pp']),'priority':int(r['priority']),'damageClass':{1:'status',2:'physical',3:'special'}[int(r['damage_class_id'])],'damageClassGeneration':max(7,g),'target':'user' if r['target_id']=='7' else 'opponent','targetId':int(r['target_id']),'effectId':num(r['effect_id']) or 0,'effectChance':num(r.get('effect_chance')),'meta':{k:num(m.get(v)) or 0 for k,v in {'ailment':'meta_ailment_id','ailmentChance':'ailment_chance','statChance':'stat_chance','healing':'healing','drain':'drain','minHits':'min_hits','maxHits':'max_hits','flinchChance':'flinch_chance','critRate':'crit_rate'}.items()},'statChanges':[{'stat':sn[x['stat_id']],'label':{'attack':'공격','defense':'방어','special-attack':'특수공격','special-defense':'특수방어','speed':'스피드','accuracy':'명중률','evasion':'회피율'}[sn[x['stat_id']]],'change':int(x['change'])} for x in sc if int(x['move_id'])==mid],'flags':fm[mid]}
for key,m in db['moves'].items():
 r=raw[int(key)];typ=int(r['type_id']);h=sorted([x for x in ch if x['move_id']==key and x.get('type_id') and int(vg[int(x['changed_in_version_group_id'])]['order'])>int(vg[22]['order'])],key=lambda x:int(vg[int(x['changed_in_version_group_id'])]['order']))
 if h:typ=int(h[0]['type_id'])
 m['typeId']=typ
# Fairy coverage through genuine Gen-8 level-up records, and a clearly labelled Gen-8 TM extension.
for sp in db['pokemon'].values():
 if 18 not in sp['typeIds']:continue
 available=[r for r in all_moves if int(r['pokemon_id'])==sp['id'] and r['pokemon_move_method_id']=='1' and int(r['version_group_id']) in [20,21,22,23]]
 if not available:continue
 v=max(int(r['version_group_id']) for r in available)
 for r in available:
  mid=int(r['move_id'])
  if int(r['version_group_id'])==v and mid in used and raw[mid]['type_id']=='18' and not any(x['moveId']==mid for x in sp['learnset']):sp['learnset'].append({'level':int(r['level']),'moveId':mid,'order':int(r['order'] or 0),'source':'gen8-fairy-supplement'})
 sp['learnset'].sort(key=lambda x:(x['level'],x.get('order',0),x['moveId']))
for mid,n,price in [(605,92,1300),(577,87,900)]:
 db['tms'][f'tm-gen8-{n}']={'number':n,'code':'TR92' if mid==605 else 'TM87','moveId':mid,'enabled':True,'reason':'','price':price,'generation':8,'effectivePower':db['moves'][str(mid)]['power']}
 for sp in db['pokemon'].values():
  if any(int(r['pokemon_id'])==sp['id'] and int(r['move_id'])==mid and r['pokemon_move_method_id']=='4' and int(r['version_group_id']) in [20,21,22,23] for r in all_moves):sp.setdefault('tmMoves',[]).append(mid)
for gid in {str(sp['growthRateId']) for sp in db['pokemon'].values()}:
 if gid not in db['experience']:db['experience'][gid]={r['level']:int(r['experience']) for r in rows('experience') if r['growth_rate_id']==gid}
db['mythicalIds']=myths;db['meta']['typeGeneration']=8;db['meta']['mythicalExpansion']={'speciesIds':myths,'forms':'default forms only','pecharuntTypeGeneration':9,'learnsets':'Latest available Gen8, fallback Gen7; Pecharunt SV Indigo Disk','source':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv','sourceFiles':[{'file':n,'sha256':hashlib.sha256((BASE/n).read_bytes()).hexdigest()} for n in ['pokemon_species.csv','pokemon_types.csv','pokemon_types_past.csv','type_efficacy.csv','pokemon_moves.csv']]}
p.write_text(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n')
print('Mythicals',len(myths),'Species',len(db['pokemon']),'Moves',len(db['moves']),'Abilities',len(db['abilities']))
