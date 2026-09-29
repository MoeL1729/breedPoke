"""Gen-III Emerald TM list/compatibility; existing HGSS combat values retained."""
import csv,json,pathlib,urllib.request,math
R=pathlib.Path(__file__).resolve().parents[1];C=R/'.data-cache/tm';C.mkdir(parents=True,exist_ok=True)
def rows(n):
 p=C/(n+'.csv')
 if not p.exists():p.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'+n+'.csv',timeout=60).read())
 with p.open() as f:return list(csv.DictReader(f))
db=json.loads((R/'data/pokedex.json').read_text());machines=[r for r in rows('machines') if r['version_group_id']=='6' and 1<=int(r['machine_number'])<=50]
assert len(machines)==50
# Omit unsupported move mechanics instead of selling simplified substitutes.
excluded={1:'공격 전 집중·피격 취소 미구현',5:'강제 교대 미구현',6:'맹독 누적 피해 미구현',10:'개체값별 타입·위력 미구현',12:'도발 미구현',16:'빛의장막 미구현',20:'신비의부적 미구현',33:'리플렉터 미구현',41:'트집 미구현',43:'지형별 부가 효과 미구현',45:'성별·헤롱헤롱 미구현',46:'도둑질 기술의 도구 이동 미구현',48:'스킬스웹 미구현',49:'가로챔 미구현'}
raw={int(r['id']):r for r in rows('moves')};names={int(r['move_id']):r['name'] for r in rows('move_names') if r['local_language_id']=='3'}
metas={int(r['move_id']):r for r in rows('move_meta')};changes=rows('move_changelog');order={int(r['id']):int(r['order']) for r in rows('version_groups')};stats={r['id']:r['identifier'] for r in rows('stats')};statChanges=rows('move_meta_stat_changes')
num=lambda x:int(x) if x not in ('',None) else None
labels={'attack':'공격','defense':'방어','special-attack':'특수공격','special-defense':'특수방어','speed':'스피드','accuracy':'명중률','evasion':'회피율'}
for row in machines:
 i=int(row['move_id']);key=str(i)
 if key in db['moves']:continue
 r=dict(raw[i]);ch=[x for x in changes if x['move_id']==key and order[int(x['changed_in_version_group_id'])]>order[10]]
 for k in ['type_id','power','pp','accuracy','priority','target_id']:
  hist=sorted([x for x in ch if x.get(k) not in ('',None)],key=lambda x:order[int(x['changed_in_version_group_id'])])
  if hist:r[k]=hist[0][k]
 m=metas.get(i,{})
 db['moves'][key]={'id':i,'name':names[i],'slug':r['identifier'],'typeId':int(r['type_id']),'power':num(r['power']),'accuracy':num(r['accuracy']),'pp':int(r['pp']),'priority':int(r['priority']),'damageClass':{1:'status',2:'physical',3:'special'}[int(r['damage_class_id'])],'target':'user' if r['target_id']=='7' else 'opponent','targetId':int(r['target_id']),'meta':{k:num(m.get(v)) or 0 for k,v in {'ailment':'meta_ailment_id','ailmentChance':'ailment_chance','statChance':'stat_chance','healing':'healing','drain':'drain','minHits':'min_hits','maxHits':'max_hits','flinchChance':'flinch_chance','critRate':'crit_rate'}.items()},'statChanges':[{'stat':stats[x['stat_id']],'label':labels[stats[x['stat_id']]],'change':int(x['change'])} for x in statChanges if x['move_id']==key]}
# Reuse cached move flag sources downloaded for abilities, covering new TM moves.
flags={r['id']:r['identifier'] for r in rows('move_flags')}
for m in db['moves'].values():m['flags']=[]
for r in rows('move_flag_map'):
 if r['move_id'] in db['moves']:db['moves'][r['move_id']]['flags'].append(flags[r['move_flag_id']])
allowed={int(r['move_id']) for r in machines};compat={}
for r in rows('pokemon_moves'):
 if r['version_group_id']=='6' and r['pokemon_move_method_id']=='4' and int(r['move_id']) in allowed:compat.setdefault(int(r['pokemon_id']),set()).add(int(r['move_id']))
parent={e['to']:p['id'] for p in db['pokemon'].values() for e in p['evolutions']}
for p in db['pokemon'].values():
 ancestor=p['id']
 while ancestor>386 and ancestor in parent:ancestor=parent[ancestor]
 p['tmCompatibilitySource']=ancestor;p['tmMoves']=sorted(compat.get(ancestor,set()))
db['tms']={}
for r in sorted(machines,key=lambda x:int(x['machine_number'])):
 n=int(r['machine_number']);m=db['moves'][r['move_id']];mid=m['id'];effective=(102 if m['slug'] in ['return','frustration'] else 140 if m['slug']=='facade' else (m['power'] or 0)*(m['meta'].get('maxHits') or 1))
 price=600 if m['damageClass']=='status' else int(math.ceil((300+effective*12)/50)*50)
 db['tms'][f'tm-{n:02}']={'number':n,'moveId':mid,'enabled':n not in excluded,'reason':excluded.get(n,''),'price':price,'effectivePower':effective}
db['tmRules']={'versionGroup':'emerald','generation':3,'combatValues':'HGSS (existing battle engine)','postGen3Compatibility':'nearest pre-Gen4 evolutionary ancestor','consumedOnLearn':True,'retrieved':'2026-09-23','source':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv','unsupported':'Unavailable TMs cannot be purchased or taught; Substitute is not a Gen-III TM.'}
(R/'data/pokedex.json').write_text(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n')
print('TMs',len(db['tms']),'enabled',sum(x['enabled'] for x in db['tms'].values()))
print([(k,db['moves'][str(v['moveId'])]['name'],v['price']) for k,v in db['tms'].items() if v['enabled']])
