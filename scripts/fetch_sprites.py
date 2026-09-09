"""Fetch the snapshot's HGSS sprites once, for fully local runtime assets."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,json
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT
BASE='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/heartgold-soulsilver/'
def fetch(task):
 i,back=task
 p=DIST/'assets/sprites'/f'{i}{"-back" if back else ""}.png'
 if p.exists():return
 for attempt in range(3):
  try:
   data=urllib.request.urlopen(BASE+('back/' if back else '')+f'{i}.png',timeout=30).read()
   assert data.startswith(b'\x89PNG\r\n\x1a\n')
   p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);return
  except Exception:
   if attempt==2:raise
if __name__=='__main__':
 db=json.loads((DIST/'data/pokedex.json').read_text())
 with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(fetch,[(i,b) for i in db['pokemon'] for b in (False,True)]))
 print('All',len(db['pokemon'])*2,'sprites available.')
