"""Cache real HGSS type labels from PokeAPI sprites; no network at game runtime."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
BASE='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-iv/heartgold-soulsilver/'
def fetch(i):
 p=ROOT/'assets/types'/f'{i}.png';p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():
  for attempt in range(3):
   try:
    data=urllib.request.urlopen(BASE+f'{i}.png',timeout=25).read()
    assert data.startswith(b'\x89PNG\r\n\x1a\n');p.write_bytes(data);break
   except Exception:
    if attempt==2:raise
 return {'typeId':i,'source':BASE+f'{i}.png','sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
if __name__=='__main__':
 with ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(fetch,range(1,18)))
 (ROOT/'assets/types/SOURCES.json').write_text(json.dumps({'repository':'https://github.com/PokeAPI/sprites','images':rows},indent=2))
 print('17 HGSS type images ready')
