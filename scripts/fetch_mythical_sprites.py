"""Bundle PokeAPI pixel sprites; use front sprite when no back sprite exists."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,urllib.error,json,shutil
R=Path(__file__).resolve().parents[1]
IDS=[151,251,385,386,489,490,491,492,493,494,647,648,649,719,720,721,801,802,807,808,809,893,1025]
BASE='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'
def download(url):
 data=urllib.request.urlopen(url,timeout=30).read()
 assert data.startswith(b'\x89PNG\r\n\x1a\n')
 return data
def fetch(job):
 sid,shiny=job;folder=R/'assets'/('shiny' if shiny else 'sprites');front=folder/f'{sid}.png';back=folder/f'{sid}-back.png';source=BASE+('shiny/' if shiny else '')+f'{sid}.png'
 if not front.exists():front.write_bytes(download(source))
 fallback=False
 if not back.exists():
  try:back.write_bytes(download(BASE+'back/'+('shiny/' if shiny else '')+f'{sid}.png'))
  except urllib.error.HTTPError as e:
   if e.code!=404:raise
   shutil.copy(front,back);fallback=True
 return {'id':sid,'shiny':shiny,'source':source,'backUsesFront':fallback}
with ThreadPoolExecutor(max_workers=6) as pool:result=list(pool.map(fetch,[(i,s) for i in IDS for s in [False,True]]))
(R/'assets/mythical-sources.json').write_text(json.dumps(result,indent=2))
target=R/'assets/types/18.png'
if not target.exists():target.write_bytes(download('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/sword-shield/18.png'))
print('Mythical sprites and Fairy type ready; back fallbacks',sum(x['backUsesFront'] for x in result))
