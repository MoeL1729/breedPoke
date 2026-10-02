"""Cache normal/shiny front/back HGSS images for nonlegendary Johto species."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request
R=Path(__file__).resolve().parents[1]
BASE='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/heartgold-soulsilver/'
def fetch(task):
 i,back,shiny=task;p=R/'assets'/('shiny' if shiny else 'sprites')/f'{i}{"-back" if back else ""}.png'
 if p.exists():return
 for attempt in range(3):
  try:
   data=urllib.request.urlopen(BASE+('back/' if back else '')+('shiny/' if shiny else '')+f'{i}.png',timeout=25).read()
   assert data.startswith(b'\x89PNG\r\n\x1a\n');p.write_bytes(data);return
  except Exception:
   if attempt==2:raise
jobs=[(i,b,s) for i in range(152,252) if i not in [243,244,245,249,250,251] for b in [False,True] for s in [False,True]]
with ThreadPoolExecutor(max_workers=12) as pool:
 for n,_ in enumerate(pool.map(fetch,jobs),1):
  if n%80==0:print('Images',n,'/',len(jobs),flush=True)
print('Johto sprites ready')
