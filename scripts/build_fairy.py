"""Reproducible Gen-8 Fairy supplement. Run after build_mythical.py.
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
 with path.open() as f:return list(csv.DictReader(f))
db=json.loads((R/'data/pokedex.json').read_text())
ids={186,204,236,574,577,581,583,584,585,605,608,705}
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
 db['moves'][str(mid)]={'id':mid,'name':names[mid],'slug':r['identifier'],'typeId':18,'power':num(r['power']),'accuracy':num(r['accuracy']),'pp':int(r['pp']),'priority':int(r['priority']),'damageClass':{1:'status',2:'physical',3:'special'}[int(r['damage_class_id'])],'damageClassGeneration':8,'target':'user' if r['target_id']=='7' else 'opponent','targetId':int(r['target_id']),'effectId':num(r['effect_id']) or 0,'effectChance':num(r['effect_chance']),'meta':{k:num(mm.get(v)) or 0 for k,v in {'ailment':'meta_ailment_id','ailmentChance':'ailment_chance','statChance':'stat_chance','healing':'healing','drain':'drain','minHits':'min_hits','maxHits':'max_hits','flinchChance':'flinch_chance','critRate':'crit_rate'}.items()},'statChanges':[{'stat':stats[x['stat_id']],'label':{'attack':'공격','defense':'방어','special-attack':'특수공격','special-defense':'특수방어','speed':'스피드','accuracy':'명중률','evasion':'회피율'}[stats[x['stat_id']]],'change':int(x['change'])} for x in statrows if int(x['move_id'])==mid],'flags':flags[mid],'mechanicsGeneration':8}
texts={186:'명중하면 상대를 혼란에 빠뜨립니다. 신비의부적·마이페이스·접지 상태의 미스트필드는 혼란을 막습니다.',204:'상대의 공격을 2단계 낮춥니다. 능력치 하락 방지 효과가 적용됩니다.',236:'최대 HP의 1/2 회복. 쾌청은 약 2/3, 비·모래바람·싸라기눈은 1/4. 날씨부정·에어록이면 1/2.',574:'명중률·회피율을 무시하는 소리 공격. 방어·방음에는 막힙니다.',577:'실제로 준 피해의 75%만큼 HP 회복. 큰뿌리는 회복량 증가, 해감액은 회복 대신 피해.',581:'5턴 동안 땅에 닿은 양쪽 포켓몬의 새 상태이상·혼란을 방지하고 드래곤 기술 위력을 절반으로 낮춥니다. 기존 상태는 치료하지 않으며 페어리 위력은 오르지 않습니다.',583:'물리 공격. 10% 확률로 상대의 공격을 1단계 낮춥니다.',584:'추가 효과가 없는 특수 공격.',585:'특수 공격. 30% 확률로 상대의 특수공격을 1단계 낮춥니다.',605:'추가 효과가 없는 특수 공격. 이 게임의 1:1 전투에서는 상대 1마리를 공격합니다.',608:'우선도 +1로 상대의 공격을 1단계 낮춥니다.',705:'명중한 뒤 자신의 특수공격이 반드시 2단계 내려갑니다. 빗나가거나 방어에 막히면 내려가지 않습니다.'}
for mid,txt in texts.items():db['moves'][str(mid)]['effectDescription']=txt
# A doubles-only move must not silently turn into the old generic SpDef boost.
db['moves']['578']['unsupportedReason']='트릭가드는 현재 1:1 전투에서 지원하지 않습니다.'
learn=collections.defaultdict(list);compat=collections.defaultdict(set)
for r in rows('pokemon_moves'):
 mid=int(r['move_id']);sid=int(r['pokemon_id']);v=int(r['version_group_id'])
 if mid not in ids or str(sid) not in db['pokemon']:continue
 if v in [20,21,22,23] and r['pokemon_move_method_id']=='1':learn[sid].append(r)
 if v in [20,21,22] and r['pokemon_move_method_id']=='4':compat[sid].add(mid)
for sid,rs in learn.items():
 sp=db['pokemon'][str(sid)];v=max(int(r['version_group_id']) for r in rs)
 # Replace Fairy level rows only where that move has an actual Gen-8 record.
 records=[r for r in rs if int(r['version_group_id'])==v];mids={int(r['move_id']) for r in records}
 sp['learnset']=[x for x in sp['learnset'] if x['moveId'] not in mids]
 seen=set()
 for r in records:
  key=(int(r['move_id']),int(r['level']))
  if key in seen:continue
  seen.add(key);sp['learnset'].append({'moveId':key[0],'level':key[1],'order':int(r['order'] or 0),'source':'gen8-fairy-supplement'})
 sp['learnset'].sort(key=lambda x:(x['level'],x.get('order',0),x['moveId']))
for mid,n,code in [(204,29,'TM29'),(577,87,'TM87'),(581,89,'TM89'),(583,90,'TR90'),(605,92,'TR92')]:
 power=db['moves'][str(mid)]['power'] or 0;price=((300+power*12+49)//50)*50 if power else 600
 db['tms'][f'tm-gen8-{n}']={'number':n,'code':code,'moveId':mid,'enabled':True,'reason':'','price':price,'generation':8,'effectivePower':power}
 for sp in db['pokemon'].values():
  sp['tmMoves']=sorted((set(sp.get('tmMoves',[]))-{mid})|({mid} if mid in compat[sp['id']] else set()))
db['meta']['fairyMoves']={'generation':8,'supportedIds':sorted(ids),'machineVersionGroups':[20,21,22],'sources':['https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv','https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts','https://github.com/smogon/pokemon-showdown/blob/master/data/mods/gen8/moves.ts']}
(R/'data/pokedex.json').write_text(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n')
print('Fairy moves',len(ids),'Total moves',len(db['moves']),'TMs',len(db['tms']))
