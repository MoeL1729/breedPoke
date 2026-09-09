"""Build a HeartGold/SoulSilver snapshot. Run fetch_data.py first."""
from pathlib import Path
import csv,json,hashlib
from datetime import datetime,timezone
from fetch_data import CACHE,BASE,fetch,FILES,ROOT
ENEMY_IDS=[i for i in range(1,152) if i not in [144,145,146,150,151]]
IDS=ENEMY_IDS+[173,174,238]
LEGACY_STARTERS=[25,4,1,7,50,52,238,174,173]
STARTERS=LEGACY_STARTERS+[147]
HATCH_TABLE=[{'id':i,'weight':11} for i in LEGACY_STARTERS]+[{'id':147,'weight':1}]
EXTRA=['pokemon_stats_past','item_names','items','move_meta_ailments']
t={n:fetch(n)[1] for n in FILES+EXTRA}
num=lambda x: int(x) if x not in ('',None) else None
index=lambda n,key='id':{int(r[key]):r for r in t[n]}
order={int(r['id']):int(r['order']) for r in t['version_groups']}
GROUP=10;GEN=4
names={int(r['pokemon_species_id']):r for r in t['pokemon_species_names'] if r['local_language_id']=='3'}
moveNames={int(r['move_id']):r['name'] for r in t['move_names'] if r['local_language_id']=='3'}
itemNames={int(r['item_id']):r['name'] for r in t['item_names'] if r['local_language_id']=='3'}
stats=index('stats');species=index('pokemon_species');pk=index('pokemon')
learn={i:[] for i in IDS}
for r in t['pokemon_moves']:
 i=int(r['pokemon_id'])
 if i in learn and r['version_group_id']==str(GROUP) and r['pokemon_move_method_id']=='1':
  learn[i].append({'level':int(r['level']),'moveId':int(r['move_id']),'order':num(r['order']) or 0})
for i in IDS:learn[i]=sorted(learn[i],key=lambda r:(r['level'],r['order'],r['moveId']))
used={r['moveId'] for x in learn.values() for r in x}
meta=index('move_meta','move_id');rawmoves=index('moves')
labels={'attack':'공격','defense':'방어','special-attack':'특수공격','special-defense':'특수방어','speed':'스피드','accuracy':'명중률','evasion':'회피율'}
moves={}
for i in sorted(used):
 r=dict(rawmoves[i]);ch=[x for x in t['move_changelog'] if x['move_id']==str(i) and order[int(x['changed_in_version_group_id'])]>order[GROUP]]
 # Each changelog field is the value BEFORE its changed-in version; nearest future change wins.
 for k in ['type_id','power','pp','accuracy','priority','target_id','effect_id','effect_chance']:
  hist=sorted([x for x in ch if x.get(k)!=''],key=lambda x:order[int(x['changed_in_version_group_id'])])
  if hist:r[k]=hist[0][k]
 m=meta.get(i,{})
 moves[i]={'id':i,'name':moveNames.get(i,r['identifier']),'slug':r['identifier'],'typeId':int(r['type_id']),'power':num(r['power']),'accuracy':num(r['accuracy']),'pp':int(r['pp']),'priority':int(r['priority']),'damageClass':{1:'status',2:'physical',3:'special'}[int(r['damage_class_id'])],'target':'user' if r['target_id']=='7' else 'opponent','targetId':int(r['target_id']),'effectId':num(r['effect_id']),'effectChance':num(r['effect_chance']),'meta':{'ailment':num(m.get('meta_ailment_id')) or 0,'ailmentChance':num(m.get('ailment_chance')) or 0,'statChance':num(m.get('stat_chance')) or 0,'healing':num(m.get('healing')) or 0,'drain':num(m.get('drain')) or 0,'minHits':num(m.get('min_hits')),'maxHits':num(m.get('max_hits'))},'statChanges':[{'stat':stats[int(x['stat_id'])]['identifier'],'label':labels.get(stats[int(x['stat_id'])]['identifier'],stats[int(x['stat_id'])]['identifier']),'change':int(x['change'])} for x in t['move_meta_stat_changes'] if x['move_id']==str(i)]}
 # Growth raises only Special Attack in generation IV; Attack was added in generation V.
 if r['identifier']=='growth':moves[i]['statChanges']=[{'stat':'special-attack','label':'특수공격','change':1}]
 # HGSS Charm and Sweet Kiss are Normal, not Fairy (restored by changelog above).
sourceFlavors={}
pokemon={}
for i in IDS:
 s=species[i];r=pk[i]
 typ=[x for x in t['pokemon_types'] if x['pokemon_id']==str(i)]
 past=[x for x in t['pokemon_types_past'] if x['pokemon_id']==str(i) and int(x['generation_id'])>=GEN]
 if past:
  gen=min(int(x['generation_id']) for x in past);typ=[x for x in past if int(x['generation_id'])==gen]
 base={stats[int(x['stat_id'])]['identifier']:int(x['base_stat']) for x in t['pokemon_stats'] if x['pokemon_id']==str(i)}
 for stat in list(base):
  sid=next(k for k,v in stats.items() if v['identifier']==stat)
  hist=sorted([x for x in t['pokemon_stats_past'] if x['pokemon_id']==str(i) and x['stat_id']==str(sid) and int(x['generation_id'])>=GEN],key=lambda x:int(x['generation_id']))
  if hist:base[stat]=int(hist[0]['base_stat'])
 flavor=[x for x in t['pokemon_species_flavor_text'] if x['species_id']==str(i) and x['language_id']=='3' and x['version_id'] in ['15','16']]
 if not flavor:flavor=[x for x in t['pokemon_species_flavor_text'] if x['species_id']==str(i) and x['language_id']=='3']
 f=flavor[0] if flavor else None
 evol=[]
 for dest in IDS:
  if species[dest]['evolves_from_species_id']!=str(i):continue
  rows=[x for x in t['pokemon_evolution'] if x['evolved_species_id']==str(dest) and order[int(x['version_group_id'])]<=order[GROUP] and not x['evolved_form_id'] and (not x['base_form_id'] or int(x['base_form_id'])==i)]
  for x in rows:
   item=num(x['trigger_item_id']);friend=num(x['minimum_happiness'])
   evol.append({'to':dest,'trigger':'use-item' if item else 'trade' if x['evolution_trigger_id']=='2' else 'level-up','minLevel':num(x['minimum_level']),'minFriendship':220 if friend else None,'itemId':item,'itemName':itemNames.get(item),'sourceRowId':int(x['id']),'note':'HGSS 친밀도 진화 기준 220 적용' if friend else None})
 # Earlier games use 70 base friendship for these species; Cleffa/Clefairy/Clefable start at 140.
 friend=140 if i in [113,173,35,36] else 70
 pokemon[i]={'id':i,'slug':s['identifier'],'name':names[i]['name'],'genus':names[i]['genus'],'description':' '.join(f['flavor_text'].split()) if f else '', 'descriptionVersionId':int(f['version_id']) if f else None,'descriptionVersion':next((v['identifier'] for v in t['versions'] if f and v['id']==f['version_id']),None),'heightM':int(r['height'])/10,'weightKg':int(r['weight'])/10,'typeIds':[int(x['type_id']) for x in sorted(typ,key=lambda x:int(x['slot']))],'stats':base,'baseFriendship':friend,'growthRateId':int(s['growth_rate_id']),'learnset':learn[i],'evolutions':evol,'family':[j for j in IDS if species[j]['evolution_chain_id']==s['evolution_chain_id']],'sprite':f'assets/sprites/{i}.png','backSprite':f'assets/sprites/{i}-back.png'}
# Encounter stages use the Kanto-only family tree: later-generation babies/evolutions
# do not shift Kanto stages. These are game encounter gates, not evolution rules.
parents={i:num(species[i]['evolves_from_species_id']) for i in ENEMY_IDS}
parents={i:p if p in ENEMY_IDS else None for i,p in parents.items()}
children={i:[j for j in ENEMY_IDS if parents[j]==i] for i in ENEMY_IDS}
def unlock(i):
 parent=parents[i]
 if parent is None:
  if children[i]:return 1
  return 30 if sum(pokemon[i]['stats'].values())>=450 else 20
 edges=[e for e in pokemon[parent]['evolutions'] if e['to']==i]
 actual=min((e['minLevel'] or 1 for e in edges),default=1)
 return max(20 if children[i] else 36,actual,unlock(parent)+1)
for i in ENEMY_IDS:
 low=unlock(i)
 high=min((unlock(j)-1 for j in children[i]),default=100)
 pokemon[i]['encounter']={'stage':'basic' if not parents[i] and children[i] else 'single' if not parents[i] else 'middle' if children[i] else 'final','minLevel':low,'maxLevel':high}
typeNames={int(r['type_id']):r['name'] for r in t['type_names'] if r['local_language_id']=='3'}
types={int(r['id']):{'slug':r['identifier'],'name':typeNames[int(r['id'])]} for r in t['types'] if int(r['generation_id'])<=GEN and int(r['id'])<100}
chart={i:{} for i in types}
for r in t['type_efficacy']:
 a,b=int(r['damage_type_id']),int(r['target_type_id'])
 if a in types and b in types:chart[a][b]=int(r['damage_factor'])/100
for r in sorted(t['type_efficacy_past'],key=lambda x:-int(x['generation_id'])):
 if int(r['generation_id'])>=GEN:chart[int(r['damage_type_id'])][int(r['target_type_id'])]=int(r['damage_factor'])/100
exp={i:{} for i in {p['growthRateId'] for p in pokemon.values()}}
for r in t['experience']:
 g=int(r['growth_rate_id'])
 if g in exp:exp[g][int(r['level'])]=int(r['experience'])
result={'schemaVersion':1,'meta':{'title':'POKÉ DAYS version-pinned Pokédex','versionGroup':'heartgold-soulsilver','versionGroupId':GROUP,'generation':GEN,'retrievedAt':datetime.now(timezone.utc).isoformat(),'source':'PokeAPI community-maintained dataset (not an official Pokémon API)','canonicalFields':['species','learnset level-up HGSS only','evolution levels and items','generation-IV friendship threshold','generation-IV types and base stats','historical move power accuracy PP type','experience curves'],'adaptedRules':['Wild opponents: 146 Kanto species excluding Articuno, Zapdos, Moltres, Mewtwo and Mew. Kanto-only evolution stages; middle gates >=20; final gates >=36 and actual minimum evolution level; non-evolving species >=20 or >=30 for base stat total >=450. Enemy level is partner level minus 0 to 2.','Game day advances by sleeping, not real-world date.','Daily fatigue 100; battle +35; feeding +15; sleep resets.','One random starter hatches from an egg (Dratini 1%; each of the nine original starters 11%); only that partner is raised; initial level 10; feed friendship +12; sleep +3; level-up +5.','Battle reward XP = 40 + 3 × enemy level squared, 80 points; stone purchase and use costs 300.','One-on-one battle engine simplifies utility, weather, trapping and some secondary move effects; no abilities, held items, IV/EV/natures or breeding.','PP is restored each encounter; learning slots remain capped at four.','Move Reminder is free for the current species level-up learnset at or below current level.'],'sources':[{'name':'Official battle guide: dual types, STAB, physical/special','url':'https://diamondpearl.pokemon.com/en-us/trainersguide/fundamentals/battling/'},{'name':'PokeAPI documentation','url':'https://pokeapi.co/docs/v2'},{'name':'PokeAPI source CSV','url':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv'},{'name':'HGSS Pikachu learnset cross-check','url':'https://pokemondb.net/pokedex/pikachu/moves/4'},{'name':'HGSS Charmander learnset cross-check','url':'https://pokemondb.net/pokedex/charmander/moves/4'},{'name':'Generation II–VII friendship threshold','url':'https://bulbapedia.bulbagarden.net/wiki/Friendship_Evolution'},{'name':'Pixel sprites','url':'https://github.com/PokeAPI/sprites'}],'sourceFiles':[{'url':BASE+n+'.csv','sha256':hashlib.sha256((CACHE/(n+'.csv')).read_bytes()).hexdigest()} for n in FILES+EXTRA]},'starterIds':STARTERS,'legacyStarterIds':LEGACY_STARTERS,'hatchTable':HATCH_TABLE,'enemyIds':ENEMY_IDS,'pokemon':pokemon,'moves':moves,'types':types,'typeChart':chart,'experience':exp}
out=ROOT/'data/pokedex.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('Saved',out,'species',len(pokemon),'moves',len(moves),'learnset rows',sum(len(p['learnset']) for p in pokemon.values()))
for i in STARTERS:print(pokemon[i]['name'],pokemon[i]['evolutions'],[(x['level'],moves[x['moveId']]['name']) for x in learn[i]][:6])
