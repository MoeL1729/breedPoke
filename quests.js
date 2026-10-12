// Game-original quest goals. Counters are permanent and start with this update.
const count=(key,target,label)=>({kind:'counter',key,target,label});
const types=(type,target,label)=>({kind:'types',type,target,label});
const caught=(id,label)=>({kind:'caught',id,target:1,label});
const q=(id,title,place,tone,level,requirements)=>({id,title,place,tone,level,mythical:true,symbol:'✧',requirements});
export const MYTHICAL_QUESTS=[
 q(151,'작은 생명의 지도','비밀의 숲','psychic',40,[{kind:'collection',target:50,label:'서로 다른 포켓몬 50종 수집'},{kind:'map',target:1,label:'도감에서 오래된 지도 받기'}]),
 q(251,'다시 자라는 숲','시간의 사당','forest',40,[types(12,10,'풀 포켓몬 10종 수집'),count('evolutions',10,'포켓몬 10회 진화')]),
 q(385,'별에게 전하는 소원','별빛 언덕','psychic',40,[count('sleeps',30,'잠자기 30회'),{kind:'friendship',target:3,label:'친밀도 220 이상 친구 3마리 보유 (박스 포함)'}]),
 q(386,'우주에서 온 신호','운석 연구소','psychic',50,[types(14,10,'에스퍼 포켓몬 10종 수집'),{kind:'trainerWins',target:20,label:'트레이너전 20승'}]),
 q(489,'작은 바다의 노래','산호 여울','water',40,[types(11,12,'물 포켓몬 12종 수집'),count('feeds',30,'식사 30회')]),
 q(490,'바다의 왕자','해저 궁전','water',45,[caught(489,'피오네 수집'),count('wins:11',30,'물 친구가 생존 참여한 전투 30승')]),
 q(491,'악몽을 넘어서','달 없는 섬','psychic',50,[types(8,8,'고스트 포켓몬 8종 수집'),count('statusWins',20,'상태이상에 걸린 상대를 쓰러뜨려 전투 20승')]),
 q(492,'감사의 꽃밭','꽃향기 정원','forest',40,[count('evolve:12',15,'풀 타입 친구 15회 진화'),count('feed:12',30,'풀 친구에게 식사 30회')]),
 q(493,'모든 만남의 끝','시작의 제단','psychic',70,[{kind:'mythicals',target:22,label:'아르세우스를 제외한 환상 22종 수집'},{kind:'collection',target:180,label:'포켓몬 180종 수집'},{kind:'legendWins',target:10,label:'레전드 트레이너 10승'}]),
 q(494,'승리를 부르는 불씨','승리의 등대','fire',50,[count('evolve:10',20,'불꽃 타입 친구 20회 진화'),{kind:'trainerWins',target:25,label:'트레이너전 25승'}]),
 q(647,'물결 위의 검','수련의 샘','water',45,[count('wins:11',25,'물 친구가 생존 참여한 전투 25승'),count('wins:2',25,'격투 친구가 생존 참여한 전투 25승')]),
 q(648,'친구들의 합주','메아리 극장','psychic',45,[count('wins:1',30,'노말 친구가 생존 참여한 전투 30승'),count('tmLearned',10,'기술머신으로 기술 10회 습득')]),
 q(649,'고대의 강철 날개','화석 격납고','electric',50,[types(7,15,'벌레 포켓몬 15종 수집'),count('evolve:9',10,'강철 타입 친구 10회 진화')]),
 q(719,'빛나는 원석','보석 동굴','ice',45,[types(6,12,'바위 포켓몬 12종 수집'),types(18,8,'페어리 포켓몬 8종 수집')]),
 q(720,'차원 너머의 초대','차원의 문','psychic',50,[count('wins:14',30,'에스퍼 친구가 생존 참여한 전투 30승'),count('wins:8',20,'고스트 친구가 생존 참여한 전투 20승')]),
 q(721,'증기로 잇는 두 세계','증기 분화구','fire',50,[count('wins:10',30,'불꽃 친구가 생존 참여한 전투 30승'),count('evolve:11',10,'물 타입 친구 10회 진화')]),
 q(801,'기계에 담긴 마음','기계 정원','electric',50,[types(9,10,'강철 포켓몬 10종 수집'),count('healedHP',2000,'회복약으로 실제 HP 총 2,000 회복')]),
 q(802,'그림자의 수련','그림자 도장','psychic',50,[count('wins:2',25,'격투 친구가 생존 참여한 전투 25승'),types(8,8,'고스트 포켓몬 8종 수집')]),
 q(807,'번개처럼 달려라','번개 절벽','electric',50,[count('wins:13',40,'전기 친구가 생존 참여한 전투 40승'),count('battleItems',30,'전투에서 볼·회복약 30회 사용')]),
 q(808,'작은 금속 수집가','너트 공방','electric',40,[types(9,8,'강철 포켓몬 8종 수집'),count('spent',10000,'도구·기술머신 상점에서 총 10,000 P 사용')]),
 q(809,'거대한 금속의 심장','거인의 용광로','electric',55,[caught(808,'멜탄 수집'),count('evolve:9',15,'강철 타입 친구 15회 진화'),count('wins:9',30,'강철 친구가 생존 참여한 전투 30승')]),
 q(893,'정글의 유대','덩굴의 심장','forest',50,[count('wins:17',30,'악 친구가 생존 참여한 전투 30승'),count('feed:12',50,'풀 친구에게 식사 50회')]),
 q(1025,'복숭아 가면의 비밀','복숭아 사당','psychic',60,[types(4,15,'독 포켓몬 15종 수집'),count('poisonWins',20,'독에 걸린 상대를 쓰러뜨려 전투 20승'),{kind:'legendWins',target:3,label:'레전드 트레이너 3승'}])
];
export function questProgress(db,s,id){
 const q=MYTHICAL_QUESTS.find(q=>q.id===Number(id));if(!q)return null;
 const owned=s.caughtSpecies??[];
 const requirements=q.requirements.map(r=>{
  let value=0;
  switch(r.kind){
   case 'counter':value=s.questStats?.[r.key]??0;break;
   case 'collection':value=owned.length;break;
   case 'types':value=owned.filter(id=>db.pokemon[id]?.typeIds.includes(r.type)).length;break;
   case 'caught':value=Number(owned.includes(r.id));break;
   case 'map':value=Number(!!s.ancientMapClaimed);break;
   case 'friendship':value=[...Object.values(s.pets),...Object.values(s.box??{})].filter(p=>p.friendship>=220).length;break;
   case 'trainerWins':value=s.trainerWins??0;break;
   case 'legendWins':value=s.legendWins??0;break;
   case 'mythicals':value=owned.filter(id=>id!==493&&db.mythicalIds.includes(id)).length;break;
  }
  return {...r,value,done:value>=r.target};
 });
 return {...q,requirements,complete:requirements.every(r=>r.done)};
}
