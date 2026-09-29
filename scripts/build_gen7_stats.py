"""Run after build_snapshot, build_abilities and build_tms; pin stat/category data."""
import csv, json, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'.data-cache/stats7'; CACHE.mkdir(parents=True,exist_ok=True)
def rows(name):
 p=CACHE/(name+'.csv')
 if not p.exists():
  p.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'+name+'.csv',timeout=60).read())
 return list(csv.DictReader(p.open()))
stat_names={r['id']:r['identifier'] for r in rows('stats') if int(r['id'])<=6}
current=rows('pokemon_stats'); past=rows('pokemon_stats_past'); moves={r['id']:r for r in rows('moves')}
p=ROOT/'data/pokedex.json'; db=json.loads(p.read_text()); changed=[]
for pid, species in db['pokemon'].items():
 old=species['stats'].copy()
 for sid,key in stat_names.items():
  base=next(int(r['base_stat']) for r in current if r['pokemon_id']==pid and r['stat_id']==sid)
  history=sorted((r for r in past if r['pokemon_id']==pid and r['stat_id']==sid and int(r['generation_id'])>=7),key=lambda r:int(r['generation_id']))
  species['stats'][key]=int(history[0]['base_stat']) if history else base
 if old!=species['stats']: changed.append((pid,old,species['stats']))
 # All included species retain the same HP base; saved HP therefore remains valid.
 assert old['hp']==species['stats']['hp'], f'HP migration required for {pid}'
for mid,move in db['moves'].items():
 source=moves[mid]
 assert int(source['generation_id'])<=7
 # Included Gen I–IV moves have no category overrides in Showdown gen7/gen8 mods.
 move['damageClass']={'1':'status','2':'physical','3':'special'}[source['damage_class_id']]
 move['damageClassGeneration']=7
meta=db['meta']; meta['statGeneration']=7; meta['damageClassGeneration']=7
for entry in [
 {'name':'7세대 종족값 · PokeAPI 현재/과거 능력치','url':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv'},
 {'name':'7세대 기술 분류 검증 · Pokémon Showdown','url':'https://github.com/smogon/pokemon-showdown/blob/master/data/mods/gen7/moves.ts'}]:
 if entry not in meta['sources']: meta['sources'].append(entry)
p.write_text(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n')
print('Updated base stats:',len(changed),'species; HP unchanged; categories:',len(db['moves']))
for pid,old,new in changed: print(pid, {k:(old[k],new[k]) for k in old if old[k]!=new[k]})
