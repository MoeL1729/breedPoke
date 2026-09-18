"""Build bundled Gen-7 regular / current hidden ability data from PokeAPI CSV snapshots."""
import csv,json,pathlib,urllib.request,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'.data-cache'/'abilities';CACHE.mkdir(parents=True,exist_ok=True)
SOURCE='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
def rows(name):
 p=CACHE/name
 if not p.exists():
  existing=pathlib.Path('/tmp/ability-data')/name
  p.write_bytes(existing.read_bytes() if existing.exists() else urllib.request.urlopen(SOURCE+name,timeout=40).read())
 with p.open() as f:return list(csv.DictReader(f))
db=json.loads((ROOT/'data/pokedex.json').read_text())
current=rows('pokemon_abilities.csv');past=rows('pokemon_abilities_past.csv')
aids=set()
for sid,sp in db['pokemon'].items():
 now=[r for r in current if r['pokemon_id']==sid]
 slots={int(r['slot']):r for r in now}
 # Past rows specify the last generation to which a slot override applies.
 for slot in list(slots):
  history=sorted([r for r in past if r['pokemon_id']==sid and int(r['slot'])==slot and int(r['generation_id'])>=7],key=lambda r:int(r['generation_id']))
  if history:slots[slot]=history[0]
 regular=[{'id':int(r['ability_id']),'slot':s,'hidden':False} for s,r in slots.items() if r['is_hidden']=='0' and r['ability_id']]
 hidden=[{'id':int(r['ability_id']),'slot':int(r['slot']),'hidden':True} for r in now if r['is_hidden']=='1' and r['ability_id']]
 sp['abilities']=regular+hidden;aids.update(a['id'] for a in sp['abilities'])
names={int(r['ability_id']):r['name'] for r in rows('ability_names.csv') if r['local_language_id']=='3'}
flavors=rows('ability_flavor_text.csv');abilities={}
for r in rows('abilities.csv'):
 i=int(r['id'])
 if i not in aids:continue
 f=[a for a in flavors if int(a['ability_id'])==i and a['language_id']=='3']
 gen7=[a for a in f if a['version_group_id'] in ['17','18']]
 chosen=max(gen7 or f,key=lambda a:int(a['version_group_id']),default={'flavor_text':''})
 abilities[str(i)]={'id':i,'slug':r['identifier'],'name':names.get(i,r['identifier']),'description':' '.join(chosen['flavor_text'].split())}
db['abilities']=abilities
flags={r['id']:r['identifier'] for r in rows('move_flags.csv')}
for m in db['moves'].values():m['flags']=[]
for r in rows('move_flag_map.csv'):
 if r['move_id'] in db['moves']:db['moves'][r['move_id']]['flags'].append(flags[r['move_flag_id']])
for r in rows('move_meta.csv'):
 if r['move_id'] in db['moves']:
  db['moves'][r['move_id']]['meta']['flinchChance']=int(r['flinch_chance'])
  db['moves'][r['move_id']]['meta']['critRate']=int(r['crit_rate'])
db['abilityRules']={'regularGeneration':7,'hiddenSource':'PokeAPI current standard species slots','retrieved':'2026-09-18','hiddenChance':.03,'sources':[SOURCE+x for x in ['pokemon_abilities.csv','pokemon_abilities_past.csv','ability_names.csv','ability_flavor_text.csv']]}
(ROOT/'data/pokedex.json').write_text(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n')
print(len(abilities),'abilities;',len(db['pokemon']),'species')
print(', '.join(x['slug'] for x in abilities.values()))
