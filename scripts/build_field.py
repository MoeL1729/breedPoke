"""Reproducible Gen-8 weather/room/terrain expansion. Run after build_fairy.py.
Sources: PokeAPI CSV (moves/history/metadata/learnsets/machines).
Effect reference: Pokemon Showdown data/moves.ts and data/mods/gen8/moves.ts.
"""
import csv,json,os,collections
from pathlib import Path
R=Path(__file__).resolve().parents[1]
B=Path(os.environ.get('POKEDAYS_CACHE',str(R/'.data-cache/base')))
def rows(n):
 path=B/(n+'.csv')
 if not path.exists():path=R/'.data-cache/abilities'/(n+'.csv')
 if not path.exists():path=R/'.data-cache/tm'/(n+'.csv')
 with path.open() as f:return list(csv.DictReader(f))
db=json.loads((R/'data/pokedex.json').read_text())
ids={201,240,241,258,356,433,472,580,581,604,678,311,694,797,798,803,804,805}
raw={int(r['id']):r for r in rows('moves')};names={int(r['move_id']):r['name'] for r in rows('move_names') if r['local_language_id']=='3'}
meta={int(r['move_id']):r for r in rows('move_meta')};changes=rows('move_changelog');vg={int(r['id']):int(r['order']) for r in rows('version_groups')}
stats={r['id']:r['identifier'] for r in rows('stats')};statrows=rows('move_meta_stat_changes')
flagNames={r['id']:r['identifier'] for r in rows('move_flags')};flags=collections.defaultdict(list)
for r in rows('move_flag_map'):flags[int(r['move_id'])].append(flagNames[r['move_flag_id']])
num=lambda v:int(v) if v not in ('',None) else None
for mid in ids:
 r=dict(raw[mid]);mm=meta[mid]
 for k in ['type_id','power','pp','accuracy','priority','target_id']:
  h=sorted([x for x in changes if int(x['move_id'])==mid and vg[int(x['changed_in_version_group_id'])]>vg[22] and x.get(k) not in ('',None)],key=lambda x:vg[int(x['changed_in_version_group_id'])])
  if h:r[k]=h[0][k]
 db['moves'][str(mid)]={'id':mid,'name':names[mid],'slug':r['identifier'],'typeId':int(r['type_id']),'power':num(r['power']),'accuracy':num(r['accuracy']),'pp':int(r['pp']),'priority':int(r['priority']),'damageClass':{1:'status',2:'physical',3:'special'}[int(r['damage_class_id'])],'damageClassGeneration':8,'target':'user' if r['target_id']=='7' else 'opponent','targetId':int(r['target_id']),'effectId':num(r['effect_id']) or 0,'effectChance':num(r['effect_chance']),'meta':{k:num(mm.get(v)) or 0 for k,v in {'ailment':'meta_ailment_id','ailmentChance':'ailment_chance','statChance':'stat_chance','healing':'healing','drain':'drain','minHits':'min_hits','maxHits':'max_hits','flinchChance':'flinch_chance','critRate':'crit_rate'}.items()},'statChanges':[{'stat':stats[x['stat_id']],'label':{'attack':'공격','defense':'방어','special-attack':'특수공격','special-defense':'특수방어','speed':'스피드','accuracy':'명중률','evasion':'회피율'}[stats[x['stat_id']]],'change':int(x['change'])} for x in statrows if int(x['move_id'])==mid],'flags':flags[mid],'mechanicsGeneration':8}

texts={201:'5턴 모래바람. 바위의 특수방어 1.5배. 땅·바위·강철 및 방진 등의 면역을 제외하고 턴마다 HP 1/16 피해.',240:'5턴 비. 물 공격 1.5배, 불꽃 공격 절반. 번개·폭풍 명중 검사 생략.',241:'5턴 쾌청. 불꽃 공격 1.5배, 물 공격 절반. 솔라빔 즉시 발사. 번개·폭풍 기본 명중 50.',258:'5턴 싸라기눈. 얼음 및 관련 특성의 면역을 제외하고 턴마다 HP 1/16 피해. 눈보라 명중 검사 생략. 8세대 기준이며 눈과 다름.',356:'5턴 중력. 모두 접지, 명중률 5/3배. 공중날기·뛰어오르기 등을 사용할 수 없음.',433:'5턴 같은 우선도 안에서 느린 포켓몬부터 행동. 재사용하면 해제.',472:'5턴 방어·특수방어 기본 능력치 교환. 랭크는 유지. 재사용하면 해제.',580:'5턴 그래스필드. 접지된 포켓몬의 풀 기술 1.3배, 턴마다 HP 1/16 회복. 접지 대상의 지진·땅고르기·매그니튜드 피해 감소.',581:'5턴 미스트필드. 접지된 포켓몬의 새 상태이상·혼란 방지. 받는 드래곤 기술 위력 절반.',604:'5턴 일렉트릭필드. 접지된 포켓몬의 전기 기술 1.3배, 새 잠듦 방지.',678:'5턴 사이코필드. 접지된 포켓몬의 에스퍼 기술 1.3배. 접지된 대상을 향한 상대의 선공 기술 차단.',311:'날씨가 유효하면 위력 100. 쾌청 불꽃 / 비 물 / 모래바람 바위 / 싸라기눈 얼음. 날씨 억제 중에는 노말·위력 50.',694:'싸라기눈일 때만 설치. 5턴 물리·특수 피해 절반. 급소·고정 피해 제외. 장막과 중복되지 않으며 날씨가 끝나도 유지.',797:'사이코필드에서 사용자가 접지되어 있으면 위력 1.5배. 에스퍼 필드 보정도 적용.',798:'지형 필드가 없으면 실패. 명중하여 피해를 준 뒤 지형 필드 제거.',803:'8세대 위력 70. 그래스필드에서 사용자가 접지되어 있으면 우선도 +1.',804:'일렉트릭필드에서 상대가 접지되어 있으면 위력 2배.',805:'사용자가 접지되고 지형 필드가 있으면 위력 100 및 전기/풀/페어리/에스퍼 타입으로 변화.'}
for mid,txt in texts.items():db['moves'][str(mid)]['effectDescription']=txt
# Exact Gen-8 values, before Gen-9 Grassy Glide nerfs.
db['moves']['803']['power']=70
learn=collections.defaultdict(list);compat=collections.defaultdict(set);tutor=collections.defaultdict(set)
for r in rows('pokemon_moves'):
 sid=int(r['pokemon_id']);mid=int(r['move_id']);v=int(r['version_group_id'])
 if str(sid) not in db['pokemon'] or mid not in ids or v not in [20,21,22]:continue
 method=r['pokemon_move_method_id']
 if method=='1':learn[sid].append(r)
 if method=='4':compat[sid].add(mid)
 if method=='3':tutor[sid].add(mid)
for sid,rs in learn.items():
 sp=db['pokemon'][str(sid)];v=max(int(r['version_group_id']) for r in rs)
 for r in rs:
  mid=int(r['move_id'])
  if int(r['version_group_id'])==v and not any(x['moveId']==mid for x in sp['learnset']):sp['learnset'].append({'moveId':mid,'level':int(r['level']),'order':int(r['order'] or 0),'source':'gen8-field-supplement'})
 sp['learnset'].sort(key=lambda x:(x['level'],x.get('order',0),x['moveId']))
existing={t['moveId'] for t in db['tms'].values()}
for r in rows('machines'):
 mid=int(r['move_id']);num=int(r['machine_number'])
 if int(r['version_group_id'])!=20 or mid not in ids or mid in existing:continue
 code=('TR'+str(num-100).zfill(2)) if num>=100 else ('TM'+str(num).zfill(2))
 db['tms']['tm-field-'+code.lower()]={'number':num,'code':code,'moveId':mid,'enabled':True,'reason':'','price':600 if not db['moves'][str(mid)]['power'] else ((300+db['moves'][str(mid)]['power']*12+49)//50)*50,'effectivePower':db['moves'][str(mid)]['power'] or 0,'generation':8}
 for sp in db['pokemon'].values():
  if mid in compat[sp['id']]:sp['tmMoves']=sorted(set(sp.get('tmMoves',[]))|{mid})
 existing.add(mid)
for mid in [797,798,803,804,805]:
 power={797:120,798:130,803:70,804:140,805:100}[mid]
 db['tms'][f'field-tutor-{mid}']={'number':mid,'code':'가르침','moveId':mid,'enabled':True,'reason':'','price':((300+power*12+49)//50)*50,'effectivePower':power,'generation':8,'sourceKind':'tutor'}
 for sp in db['pokemon'].values():
  if mid in tutor[sp['id']]:sp['tmMoves']=sorted(set(sp.get('tmMoves',[]))|{mid})
# Aurora Veil is a real Gen-7 TM, absent from SwSh TM list; expose it separately.
db['tms']['tm-field-gen7-70']={'number':70,'code':'TM70','moveId':694,'enabled':True,'reason':'','price':600,'effectivePower':0,'generation':7}
for r in rows('pokemon_moves'):
 if r['move_id']=='694' and r['pokemon_move_method_id']=='4' and int(r['version_group_id']) in [17,18] and r['pokemon_id'] in db['pokemon']:
  sp=db['pokemon'][r['pokemon_id']];sp['tmMoves']=sorted(set(sp.get('tmMoves',[]))|{694})
# Catalog entries let future species use the same hooks; species' canonical slots are untouched.
a=rows('abilities');an={int(r['ability_id']):r['name'] for r in rows('ability_names') if r['local_language_id']=='3'}
notes={'drizzle':'등장 시 5턴 비. 축축한바위로 8턴.','drought':'등장 시 5턴 쾌청. 뜨거운바위로 8턴.','sand-stream':'등장 시 5턴 모래바람. 보송보송바위로 8턴.','snow-warning':'등장 시 5턴 싸라기눈. 차가운바위로 8턴.','electric-surge':'등장 시 일렉트릭필드.','grassy-surge':'등장 시 그래스필드.','misty-surge':'등장 시 미스트필드.','psychic-surge':'등장 시 사이코필드.','surge-surfer':'일렉트릭필드일 때 스피드 2배.','slush-rush':'싸라기눈일 때 스피드 2배 및 싸라기눈 피해 면역.','grass-pelt':'그래스필드일 때 방어 1.5배.','air-lock':'양쪽 날씨 효과 억제. 지속 턴은 계속 감소.','forecast':'날씨에 따라 노말/불꽃/물/얼음 타입으로 변화. 이미지 폼은 기본폼 유지.'}
for r in a:
 if r['identifier'] in notes:
  aid=int(r['id']);db['abilities'][str(aid)]={'id':aid,'slug':r['identifier'],'name':an[aid],'description':notes[r['identifier']]}
db['meta']['fieldExpansion']={'generation':8,'moves':sorted(ids),'spaceEffects':['trickRoom','wonderRoom','gravity'],'terrainBoost':1.3,'excluded':['magic-room','primal-weather','snow-gen9'],'sources':['https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv','https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts','https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts']}
(R/'data/pokedex.json').write_text(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n')
print('Moves',len(db['moves']),'Abilities',len(db['abilities']),'Machines',len(db['tms']))
