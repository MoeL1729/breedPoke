"""Download and normalize cached PokeAPI CSV source into a version-pinned JSON snapshot."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,csv,io,json,hashlib,time,os
ROOT=Path(__file__).resolve().parents[1]
CACHE=Path(os.environ.get('POKEDAYS_CACHE',str(ROOT/'.data-cache')));CACHE.mkdir(parents=True,exist_ok=True)
BASE='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
FILES=['version_groups','versions','pokemon','pokemon_species','pokemon_species_names','pokemon_evolution','pokemon_moves','moves','move_names','move_changelog','move_meta','move_meta_stat_changes','stats','pokemon_stats','pokemon_types','pokemon_types_past','type_names','types','type_efficacy','type_efficacy_past','experience','pokemon_species_flavor_text']
def fetch(name):
 p=CACHE/(name+'.csv')
 if not p.exists():
  for attempt in range(3):
   try:
    data=urllib.request.urlopen(BASE+name+'.csv',timeout=40).read();p.write_bytes(data);break
   except Exception:
    if attempt==2:raise
 return name,list(csv.DictReader(io.StringIO(p.read_text(encoding='utf-8-sig'))))
if __name__=='__main__':
 with ThreadPoolExecutor(max_workers=8) as pool:
  data=dict(pool.map(fetch,FILES))
 print(json.dumps({n:len(v) for n,v in data.items()},ensure_ascii=False,indent=2))

