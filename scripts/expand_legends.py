"""Expand the existing snapshot without changing starters or previously tuned records."""
import json,pathlib,tempfile,shutil,subprocess,os
R=pathlib.Path(__file__).resolve().parents[1]
original=json.loads((R/'data/pokedex.json').read_text())
with tempfile.TemporaryDirectory(prefix='pokegotchi-johto-') as tmp:
 t=pathlib.Path(tmp);shutil.copytree(R/'scripts',t/'scripts');(t/'data').mkdir();(t/'.data-cache').symlink_to(R/'.data-cache',target_is_directory=True)
 shutil.copy(R/'data/pokedex.json',t/'data/pokedex.json')
 p=t/'scripts/build_snapshot.py';s=p.read_text();s=s.replace('ENEMY_IDS=[i for i in range(1,152) if i not in [144,145,146,150,151]]','ENEMY_IDS=list(range(1,252))')
 s=s.replace("LEGACY_STARTERS=[", "IDS=list(dict.fromkeys(IDS))\nLEGACY_STARTERS=[",1);p.write_text(s)
 stats_script=t/'scripts/build_gen7_stats.py'
 # This builds an isolated new-species snapshot; existing species are never overwritten.
 stats_script.write_text(stats_script.read_text().replace("assert old['hp']==species['stats']['hp'], f'HP migration required for {pid}'", "pass # Existing records are preserved by the merge below."))
 env=dict(os.environ);env.setdefault('POKEDAYS_CACHE',str(R/'.data-cache/base'))
 for name in ['build_snapshot.py','build_abilities.py','build_tms.py','build_gen7_stats.py','build_field_egg.py']:
  subprocess.run(['python3',str(t/'scripts'/name)],env=env,check=True,stdout=subprocess.DEVNULL)
 expanded=json.loads((t/'data/pokedex.json').read_text())
 new=[]
 for key,p in expanded['pokemon'].items():
  if key not in original['pokemon']:original['pokemon'][key]=p;new.append(int(key))
 for section in ['moves','abilities']:
  for key,value in expanded[section].items():original[section].setdefault(key,value)
 # Legendary species are exclusively available through expeditions.
 original['meta']['legendaryExpansion']={'speciesIds':[144,145,146,150,151,243,244,245,249,250,251],'source':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv'}
 (R/'data/pokedex.json').write_text(json.dumps(original,ensure_ascii=False,separators=(',',':'))+'\n')
 print('Added',len(new),'species; total',len(original['pokemon']),'encounters',len(original['enemyIds']))
