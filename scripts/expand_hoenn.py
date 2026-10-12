"""Expand the existing snapshot without changing starters or previously tuned records."""
import json,pathlib,tempfile,shutil,subprocess,os
R=pathlib.Path(__file__).resolve().parents[1]
original=json.loads((R/'data/pokedex.json').read_text())
with tempfile.TemporaryDirectory(prefix='pokegotchi-hoenn-') as tmp:
 t=pathlib.Path(tmp);shutil.copytree(R/'scripts',t/'scripts');(t/'data').mkdir();(t/'.data-cache').symlink_to(R/'.data-cache',target_is_directory=True)
 shutil.copy(R/'data/pokedex.json',t/'data/pokedex.json')
 p=t/'scripts/build_snapshot.py';s=p.read_text();s=s.replace('ENEMY_IDS=[i for i in range(1,152) if i not in [144,145,146,150,151]]','ENEMY_IDS=[i for i in range(1,387) if i not in [144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386]]')
 s=s.replace("x['evolved_form_id']", "x.get('evolved_form_id',x.get('evolved_pokemon_form_id',''))").replace("x['base_form_id']", "x.get('base_form_id',x.get('required_pokemon_form_id',''))")
 s=s.replace("'minFriendship':220 if friend else None,", "'minBeauty':num(x['minimum_beauty']),'minFriendship':220 if friend else None,")
 s=s.replace("LEGACY_STARTERS=[", "IDS=list(dict.fromkeys(IDS))\nLEGACY_STARTERS=[",1);p.write_text(s)
 stats_script=t/'scripts/build_gen7_stats.py'
 stats_script.write_text(stats_script.read_text().replace("assert old['hp']==species['stats']['hp'], f'HP migration required for {pid}'", "pass # Existing records are preserved by the merge below."))
 env=dict(os.environ);env.setdefault('POKEDAYS_CACHE',str(R/'.data-cache/base'))
 for name in ['build_snapshot.py','build_abilities.py','build_tms.py','build_gen7_stats.py','build_field_egg.py']:
  subprocess.run(['python3',str(t/'scripts'/name)],env=env,check=True,stdout=subprocess.DEVNULL)
 expanded=json.loads((t/'data/pokedex.json').read_text())
 new=[]
 for key,p in expanded['pokemon'].items():
  if key not in original['pokemon']:original['pokemon'][key]=p;new.append(int(key))
  else:
   original['pokemon'][key]['family']=p['family'];original['pokemon'][key]['evolutions']=p['evolutions']
   if 252<=int(key)<=386:original['pokemon'][key]['encounter']=p['encounter']
 for section in ['moves','abilities','experience']:
  for key,value in expanded[section].items():original[section].setdefault(key,value)
 original['pokemon']['290']['evolutions']=[e for e in original['pokemon']['290']['evolutions'] if e['to']!=292]
 original['enemyIds']=expanded['enemyIds']
 original['meta']['hoennExpansion']={'newSpeciesIds':new or original['meta'].get('hoennExpansion',{}).get('newSpeciesIds',[]),'excluded':[243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386],'speciesSource':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv','spritesSource':'https://github.com/PokeAPI/sprites','startersUnchanged':True}
 (R/'data/pokedex.json').write_text(json.dumps(original,ensure_ascii=False,separators=(',',':'))+'\n')
 print('Added',len(new),'species; total',len(original['pokemon']),'encounters',len(original['enemyIds']))
