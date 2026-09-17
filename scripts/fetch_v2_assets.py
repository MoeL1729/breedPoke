from pathlib import Path
import json,csv,urllib.request,concurrent.futures,time
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'data/pokedex.json';d=json.loads(p.read_text());cache=Path('/workspace/scratch/pokedays-data-cache/pokemon_species.csv')
raw=cache.read_text() if cache.exists() else urllib.request.urlopen('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv',timeout=30).read().decode()
rates={r['id']:int(r['capture_rate']) for r in csv.DictReader(raw.splitlines())}
for id,sp in d['pokemon'].items():sp['captureRate']=rates[id]
d['meta']['sources'] += [{'name':'Gen III/IV catch formula','url':'https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/'},{'name':'Quick Claw','url':'https://bulbapedia.bulbagarden.net/wiki/Quick_Claw'},{'name':'Shiny odds','url':'https://bulbapedia.bulbagarden.net/wiki/Shiny_Pok%C3%A9mon'}]
p.write_text(json.dumps(d,ensure_ascii=False,indent=2))
folder=ROOT/'assets/shiny';folder.mkdir(exist_ok=True)
base='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/heartgold-soulsilver/'
jobs=[(id,back) for id in d['pokemon'] for back in [False,True]]
def fetch(job):
 id,back=job;dest=folder/(id+('-back' if back else '')+'.png')
 if dest.exists() and dest.read_bytes().startswith(b'\x89PNG'):return
 url=base+('back/shiny/' if back else 'shiny/')+id+'.png'
 for attempt in range(3):
  try:
   b=urllib.request.urlopen(url,timeout=20).read()
   if not b.startswith(b'\x89PNG'):raise ValueError(url)
   dest.write_bytes(b);return
  except Exception:
   if attempt==2:raise
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
 for n,_ in enumerate(pool.map(fetch,jobs),1):
  if n%80==0:print('Shiny sprites',n,'/',len(jobs),flush=True)
print('Capture rates and shiny sprites ready',flush=True)
