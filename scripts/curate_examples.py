#!/usr/bin/env python3
"""Replace pedagogically useless quoted-token prompts with contextual usage drafts.

Always preserve the Anki note ID, DAY/category, and user-provided examples.
Rule-generated examples are intentionally marked as *unreviewed*, not certified
English/Korean translations. Editorial examples are project-authored, not official.

Rerunnable after scripts/import_anki.py, but never overwrite any provided example.
Requires textblob's bundled English Pattern POS tagger, not downloaded NLTK corpora.
"""
import csv, json, pathlib, re, collections, hashlib
from textblob.en import tag
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data/words.json'
WORDS=json.loads(DATA.read_text(encoding='utf-8'))

# Editorially hand-written cards. Whole-sentence translation checked against the
# chosen English context, not against all dictionary senses of a headword.
CURATED={
'warn':('The notice warns passengers not to leave luggage unattended.','안내문은 승객들에게 짐을 방치하지 말라고 경고합니다.'),
'incompetent':('The contractor was dismissed after repeated incompetent work.','그 계약업체는 반복적으로 무능한 업무 수행을 한 뒤 해고되었습니다.'),
'turn over':('Turn over the document to read the instructions on the back.','뒷면의 안내를 읽으려면 문서를 뒤집으세요.'),
'send':('Please send the revised contract by email before noon.','정오 전에 수정된 계약서를 이메일로 보내 주세요.'),
'under warranty':('The broken printer is still under warranty.','고장 난 프린터는 아직 보증 기간 중입니다.'),
'unbiased':('The committee requested an unbiased evaluation of the proposal.','위원회는 제안서에 대한 편견 없는 평가를 요청했습니다.'),
'carpool':('Several employees carpool to the office every morning.','직원 몇 명은 매일 아침 차를 함께 타고 출근합니다.'),
'load A onto B':('The workers load the boxes onto the delivery truck.','작업자들이 상자를 배송 트럭에 싣습니다.'),
'alarming':('The sudden increase in costs is alarming.','갑작스러운 비용 증가는 걱정스러운 일입니다.'),
'overtime rate':('The overtime rate is listed in the employment contract.','초과근무 수당률은 근로계약서에 명시되어 있습니다.'),
'driving direction':('Check the driving direction before entering the one-way street.','일방통행로에 들어가기 전에 주행 방향을 확인하세요.'),
'counterfeit':('Customs officers seized counterfeit products at the port.','세관 직원들이 항구에서 위조 상품을 압수했습니다.'),
'oversight':('The error was caused by an oversight during the final review.','그 오류는 최종 검토 과정의 부주의 때문에 발생했습니다.'),
'wholesaler':('The retailer purchases most products directly from a wholesaler.','그 소매업체는 대부분의 제품을 도매업자에게 직접 구매합니다.'),
'make room for':('We moved the shelves to make room for new equipment.','새 장비를 놓을 공간을 마련하려고 선반을 옮겼습니다.'),
'spotless':('The hotel room was spotless when the guests arrived.','투숙객들이 도착했을 때 호텔 객실은 아주 깨끗했습니다.'),
'assess':('The auditor will assess the company’s financial risks.','감사인은 회사의 재무 위험을 평가할 것입니다.'),
'cave':('The tour guide led visitors into the cave.','관광 안내원이 방문객들을 동굴 안으로 안내했습니다.'),
'arrange item on the shelf':('Staff members arrange items on the shelf before the store opens.','직원들이 매장 개점 전에 선반에 상품을 진열합니다.'),
'carry a large parcel':('A courier arrived to carry a large parcel upstairs.','택배 기사가 큰 소포를 위층으로 운반하러 왔습니다.'),
'alteration':('The tailor charged a small fee for the alteration.','재단사는 옷 수선에 소액의 비용을 청구했습니다.'),
'inaugurate':('The mayor will inaugurate the new community center on Friday.','시장은 금요일에 새 주민센터의 개관식을 진행할 예정입니다.'),
'overstaffed':('The branch was overstaffed during the slow season.','그 지점은 비수기에 필요 이상의 직원을 두고 있었습니다.'),
'people on foot':('The crossing is reserved for people on foot.','그 횡단로는 보행자 전용입니다.'),
'line worker':('Each line worker wears protective gloves during production.','생산 중에는 모든 작업 라인 근로자가 보호 장갑을 착용합니다.'),
'in the distance past':('The building was constructed in the distant past.','그 건물은 아주 오래전에 지어졌습니다.'),
'by a considerable margin':('Our team won the contract by a considerable margin.','우리 팀은 상당한 차이로 계약 경쟁에서 승리했습니다.'),
'seminar':('The marketing seminar begins at ten tomorrow morning.','마케팅 세미나는 내일 오전 10시에 시작됩니다.'),
'punishment':('The policy specifies the punishment for repeated violations.','정책에는 반복적인 위반에 대한 처벌이 명시되어 있습니다.'),
'sustain':('The company needs additional funding to sustain its operations.','회사는 운영을 지속하기 위해 추가 자금이 필요합니다.'),
'chat':('Employees often chat during their lunch break.','직원들은 점심시간에 자주 담소를 나눕니다.'),
'stance':('The director explained her stance on remote work.','이사는 원격 근무에 대한 자신의 입장을 설명했습니다.'),
'demolish':('The city plans to demolish the abandoned warehouse.','시는 버려진 창고를 철거할 계획입니다.'),
'reset':('Please reset the machine before the next test.','다음 시험 전에 기계를 재설정해 주세요.'),
'workbench':('The technician placed the tools on the workbench.','기술자는 공구를 작업대 위에 놓았습니다.'),
'pose':('The photographer asked the participants to pose for a group picture.','사진사는 참가자들에게 단체 사진을 위해 포즈를 취해 달라고 요청했습니다.'),
'in order to do':('We moved the meeting online in order to save time.','시간을 절약하기 위해 회의를 온라인으로 옮겼습니다.'),
'lakefront':('The restaurant has a beautiful view of the lakefront.','그 식당에서는 호숫가가 아름답게 보입니다.'),
'embellish':('The designer used simple patterns to embellish the invitation.','디자이너는 초대장을 장식하기 위해 단순한 무늬를 사용했습니다.'),
'label':('Please label every box before shipping it.','배송 전에 모든 상자에 라벨을 붙여 주세요.'),
'gymnasium':('The school gymnasium is closed for maintenance.','학교 체육관은 유지 보수 때문에 문을 닫았습니다.'),
'correspondent':('The foreign correspondent reported from the conference.','해외 특파원이 그 회의 현장에서 보도했습니다.'),
"take one's place":('A temporary worker will take her place during her absence.','그녀가 자리를 비우는 동안 임시 직원이 대신할 예정입니다.'),
'on display':('The new products are on display near the entrance.','신제품들이 입구 근처에 진열되어 있습니다.'),
'usher':('An usher showed us to our seats before the performance.','공연 전에 안내원이 우리를 좌석으로 안내했습니다.'),
'intently':('The trainees listened intently to the safety instructions.','교육생들은 안전 지침을 주의 깊게 들었습니다.'),
'chief':('The chief engineer approved the revised design.','수석 엔지니어가 수정된 설계를 승인했습니다.'),
'trustworthy':('The accounting team needs a trustworthy supplier.','회계팀에는 신뢰할 수 있는 공급업체가 필요합니다.'),
'warm-up':('The instructor led a short warm-up before the exercise.','강사가 운동 전에 짧은 준비 운동을 진행했습니다.'),
'obsess about':('Try not to obsess about minor mistakes in the report.','보고서의 사소한 실수에 지나치게 집착하지 마세요.'),
'inn':('We stayed at a small inn near the train station.','우리는 기차역 근처의 작은 여관에 묵었습니다.'),
'stand in for':('Kim will stand in for the manager during the conference.','김 씨가 회의 동안 관리자를 대신할 것입니다.'),
'set down to work':('The team settled down to work after the briefing.','팀은 브리핑 후 일에 착수했습니다.'),
'be mounted on':('The security camera will be mounted on the ceiling.','보안 카메라는 천장에 설치될 예정입니다.'),
'off chance':('I called on the off chance that a room was available.','혹시 빈방이 있을까 하는 희박한 가능성에 전화를 걸었습니다.'),
'in a moment':('The receptionist will be with you in a moment.','접수 담당자가 잠시 후 응대할 것입니다.'),
'substantiate':('The report must substantiate its claims with evidence.','그 보고서는 주장을 증거로 입증해야 합니다.'),
'discontinue':('The manufacturer will discontinue the older model next year.','제조업체는 내년에 구형 모델의 생산을 중단할 예정입니다.'),
'landlord':('The landlord agreed to repair the heating system.','집주인은 난방 시설을 수리하는 데 동의했습니다.'),
'mainland':('The ferry connects the island with the mainland.','그 여객선은 섬과 본토를 연결합니다.'),
'gadget':('This small gadget measures the room temperature.','이 작은 기기는 실내 온도를 측정합니다.'),
'prevail':('After several meetings, a compromise finally prevailed.','여러 차례 회의를 거친 끝에 타협안이 결국 받아들여졌습니다.'),
'respectfully':('The employee respectfully disagreed with the proposal.','직원은 제안에 정중하게 반대했습니다.'),
'opposing':('The two departments expressed opposing views on the budget.','두 부서는 예산에 대해 상반된 견해를 나타냈습니다.'),
'blurry':('The scanned document was too blurry to read.','스캔한 문서가 너무 흐릿해서 읽을 수 없었습니다.'),
'however':('The proposal is expensive; however, it could save time.','그 제안은 비용이 많이 들지만 시간을 절약할 수 있습니다.'),
'readily':('The supplier readily agreed to the revised delivery date.','공급업체는 수정된 배송 날짜에 흔쾌히 동의했습니다.'),
'exit':('Please use the emergency exit during the drill.','훈련 중에는 비상구를 이용해 주세요.'),
'gallery':('The art gallery opens at eleven on weekends.','미술관은 주말 오전 11시에 문을 엽니다.'),
'rare':('It is rare for the supplier to miss a deadline.','그 공급업체가 기한을 어기는 일은 드뭅니다.'),
'concerning':('We received an email concerning the delayed shipment.','배송 지연과 관련된 이메일을 받았습니다.'),
'otherwise':('Please confirm the reservation today; otherwise, it may be canceled.','오늘 예약을 확인해 주세요. 그렇지 않으면 취소될 수 있습니다.'),
'fluent in':('Applicants must be fluent in English and Korean.','지원자는 영어와 한국어에 능숙해야 합니다.'),
'in a pile':('The forms were left in a pile on the reception desk.','서류들이 접수대 위에 수북이 쌓여 있었습니다.'),
'lighthouse':('The lighthouse can be seen from the harbor.','항구에서 등대가 보입니다.'),
'wildlife':('The park protects local wildlife and natural habitats.','그 공원은 지역 야생 동물과 자연 서식지를 보호합니다.'),
'lavish':('The hotel is known for its lavish interior design.','그 호텔은 호화로운 실내 장식으로 유명합니다.'),
'stellar':('The employee received an award for stellar performance.','그 직원은 뛰어난 성과로 상을 받았습니다.'),
'compliment':('The customer gave the chef a compliment on the meal.','손님이 음식에 대해 요리사를 칭찬했습니다.'),
'counterpart':('Our sales manager met her counterpart from the partner company.','영업 관리자가 협력사 측의 동급 담당자를 만났습니다.'),
'once in a while':('We hold informal team lunches once in a while.','우리는 가끔 비공식적인 팀 점심 모임을 갖습니다.'),
'in particular':('The auditor examined the travel expenses in particular.','감사인은 특히 출장비를 자세히 조사했습니다.'),
'put into effect':('The new safety rules will be put into effect next month.','새로운 안전 규정은 다음 달에 시행됩니다.'),
'by no means':('The schedule is by no means final yet.','그 일정은 아직 결코 확정된 것이 아닙니다.'),
'beside the point':('The price of the old equipment is beside the point.','오래된 장비의 가격은 지금 논점과 무관합니다.'),
'out of order':('The elevator is out of order until further notice.','엘리베이터는 추후 안내가 있을 때까지 고장 상태입니다.'),
'without respect to':('The rules apply without respect to age or position.','그 규정은 나이나 직위에 관계없이 적용됩니다.'),
'just in case':('Please bring a copy of the receipt just in case.','혹시 모르니 영수증 사본을 가져오세요.'),
'look forward to':('We look forward to working with your team.','귀사 팀과 함께 일하기를 기대합니다.'),
'get over':('The company worked hard to get over the supply shortage.','회사는 공급 부족 문제를 극복하기 위해 노력했습니다.'),
'make on outside call':('Use this phone to make an outside call.','외부로 전화를 걸려면 이 전화를 사용하세요.'),
'until the first next month':('The offer is valid until the first of next month.','그 제안은 다음 달 1일까지 유효합니다.'),
'chief financial officer(CEO)':('The chief financial officer (CFO) presented the annual budget.','최고재무책임자(CFO)가 연간 예산을 발표했습니다.'),
'toxication':('The safety officer explained the risk of intoxication.','안전 관리자가 중독 위험을 설명했습니다.'),
'be in the red':('The company was in the red for two quarters.','그 회사는 두 분기 동안 적자 상태였습니다.'),
'be in the black':('The company returned to the black this year.','그 회사는 올해 다시 흑자를 기록했습니다.'),
'one-way ticket':('She bought a one-way ticket to Busan.','그녀는 부산행 편도 승차권을 구입했습니다.'),
'at no extra charge':('Breakfast is included at no extra charge.','조식은 추가 비용 없이 제공됩니다.'),
'not A but B':('The delay was caused not by traffic but by a mechanical problem.','지연은 교통이 아니라 기계 문제 때문에 발생했습니다.'),
'if I\'m not mistaken':("If I'm not mistaken, the meeting begins at nine.",'제 기억이 맞다면 회의는 9시에 시작합니다.'),
'not only A but also B':('The program supports not only employees but also their families.','이 프로그램은 직원뿐 아니라 가족도 지원합니다.'),
'keep A informed of B':('Please keep the client informed of any schedule changes.','일정이 변경되면 고객에게 계속 알려 주세요.'),
'submit A to B':('Submit the proposal to the director before Friday.','금요일 전에 이사에게 제안서를 제출하세요.'),
'regard A as B':('We regard customer feedback as an opportunity to improve.','우리는 고객 의견을 개선의 기회로 여깁니다.'),
'convert A to B':('The technician converted the file to a PDF document.','기술자가 파일을 PDF 문서로 변환했습니다.'),
'combine A with B':('Combine the survey results with the sales figures.','설문 조사 결과를 매출 수치와 합치세요.'),
'keep A up to date':('Please keep the manager up to date on the project.','프로젝트 최신 소식을 관리자에게 계속 알려 주세요.'),
'credit A with B(credit B to A)':('The team credited the engineer with the discovery.','팀은 그 발견의 공로를 엔지니어에게 돌렸습니다.'),
'be allowed to do':('Visitors are allowed to take photos in the lobby.','방문객은 로비에서 사진을 찍어도 됩니다.'),
'be reluctant to do':('Employees may be reluctant to adopt unfamiliar software.','직원들은 익숙하지 않은 소프트웨어를 도입하기 꺼릴 수 있습니다.'),
'have difficulty (in) -ing':('Some customers have difficulty using the new website.','일부 고객들은 새 웹사이트를 사용하는 데 어려움을 겪습니다.'),
'have a tendency to do':('The machine has a tendency to overheat during long shifts.','그 기계는 장시간 작업 중 과열되는 경향이 있습니다.'),
'be in the mood for -ing':('After work, she was in the mood for watching a movie.','퇴근 후 그녀는 영화를 보고 싶은 기분이었습니다.'),
'put A in jeopardy':('A sudden delay could put the entire project in jeopardy.','갑작스러운 지연은 전체 프로젝트를 위험에 빠뜨릴 수 있습니다.'),
'rest one\'s chin on one\'s hand':('She rested her chin on her hand while reading.','그녀는 읽으면서 손으로 턱을 괴었습니다.'),
'load A onto B':('The workers loaded the boxes onto the truck.','작업자들은 상자를 트럭에 실었습니다.'),
'leave A up to B':('We will leave the final decision up to the director.','최종 결정은 이사에게 맡길 것입니다.'),
'blame A on B':('The report blamed the delay on a shipping error.','보고서는 지연을 배송 오류 탓으로 돌렸습니다.'),
'give A a ride':('Could you give me a ride to the station?','역까지 저를 태워 줄 수 있나요?'),
'do A a favor':('Could you do me a favor and print this document?','부탁 하나만 들어줘서 이 문서를 인쇄해 줄래요?'),
'vary from A to B':('Delivery times vary from two to five business days.','배송 기간은 영업일 기준 2일에서 5일까지 다양합니다.'),
'lock oneself out of one\'s house':('He locked himself out of his house after forgetting his key.','그는 열쇠를 깜빡해 집 밖에서 문을 잠근 채 들어가지 못했습니다.'),
}
# Some source strings describe English phrases with dummy slots. Display a corrected
# usage sentence without silently altering the original headword or its stable ID.
# Additional manually edited phrase contexts (tracked in a reviewable TSV).
for line in (ROOT/'data/editorial_examples.tsv').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'):continue
    k,en,ko=line.split('\t')
    CURATED[k]=en,ko
LOWER={k.lower():v for k,v in CURATED.items()}

# Domain-specific cues: choose contexts appropriate to ordinary business English.
ROLE_KO=('관리자','직원','사람','노동자','기사','요원','고객','손님','연설자','참가자','대표','책임자','상인','판매원','담당','컨설턴트','기술자','대리인','연구자','집주인','도매업자','특파원','공급업자','도우미','경영자','회계사','변호사')
VENUE_KO=('건물','사무실','극장','공원','병원','학교','방문 장소','공간','가게','매장','식당','장소','창고','박물관','호텔','주택','우체국','도서관','체육관','여관','공항','정류장','전시장','갤러리','해안','공장','항구','터미널','동굴','거주지')
OBJECT_KO=('장치','기계','서류','문서','장비','제품','물건','상자','봉투','도구','도서','전화기','컴퓨터','공구','차량','의자','탁자','기기','기구','표지','화면','수하물','선박','부품','접시','포장','청구서','영수증','열쇠','파일','선반','펜','가방','용기','램프','컴퓨터','프린터','기계','약품','계약서')
EVENT_KO=('회의','행사','축제','체육 경기','연회','모임','공연','세미나','강연','워크숍','박람회','기념식','파티','휴가','수업','시험','마감일','인터뷰','면접','시연','견학')
FINANCE_KO=('비용','금액','가격','세금','예산','수당','자금','수익','이익','급여','임금','매출','청구','요금','대출','할인','환불','계좌','금융','지출','채무','저축')
ABSTRACT_KO=('경향','능력','문제','관리','기록','정보','상태','정책','조건','결과','원칙','수준','차이','기술','경험','성능','관계','평가','효율','변화','감정','가치','전략','성과','위험','정확','이유','해결','효과','성격','기회','방식','계획','전망','발생','상황')
CONNECTIVES={'however':('The plan is costly; however, it may save time.','계획에는 비용이 많이 들지만 시간을 절약할 수 있습니다.'),'therefore':('The road is closed; therefore, deliveries will be delayed.','도로가 폐쇄되었으므로 배송이 지연될 것입니다.'),'moreover':('The product is durable; moreover, it is affordable.','그 제품은 내구성이 좋고 게다가 가격도 합리적입니다.'),'nevertheless':('The project was difficult; nevertheless, the team succeeded.','프로젝트는 어려웠지만 그럼에도 팀은 성공했습니다.'),'subsequently':('The company reviewed the complaint and subsequently issued a refund.','회사는 불만을 검토한 후 환불했습니다.'),'instead':('Please email the document instead of mailing it.','서류를 우편으로 보내는 대신 이메일로 보내 주세요.'),'otherwise':CURATED['otherwise'],'meanwhile':('The staff prepared the room; meanwhile, the guests waited outside.','직원들이 방을 준비하는 동안 손님들은 밖에서 기다렸습니다.'),'furthermore':('The service is fast; furthermore, it is inexpensive.','그 서비스는 빠르고 게다가 저렴합니다.')}

VERB_DOC=('submit','send','file','prepare','review','revise','proofread','draft','publish','print','photocopy','copy','sign','attach','enclose','mail','forward','complete','edit','approve','issue','circulate','withdraw','scan','transmit','translate','distribute','present','check','read','verify','compile','summarize','rewrite','certify')
VERB_EQUIP=('repair','install','inspect','clean','operate','maintain','replace','test','adjust','assemble','fix','service','check','upgrade','recondition','lubricate','calibrate','reset','disassemble','transport','deliver','move','pack','unpack','store','refurbish','label','paint','polish','lock','unlock','switch','power','start','stop','use')
VERB_PLAN=('implement','revise','approve','review','assess','evaluate','propose','announce','modify','finalize','adapt','adopt','develop','execute','organize','manage','extend','change','cancel','improve','adjust','expand','restructure','simplify','update','endorse','authorize','reject','accept','schedule','postpone','reschedule','reconsider','discuss')
VERB_STAFF=('train','hire','recruit','mentor','supervise','instruct','assist','guide','encourage','reward','promote','motivate','evaluate','interview','dismiss','fire','support','consult','advise','inform','notify','remind','warn','contact','congratulate','recognize','thank','welcome')
VERB_INTRANS=('arrive','depart','leave','go','come','return','travel','relocate','walk','run','swim','talk','chat','laugh','rest','pause','wait','disappear','vanish','emerge','occur','happen','proceed','continue','recur','rise','fall','decline','fluctuate','increase','decrease','expand','grow','improve','recover','retire','resign','graduate','register','participate','volunteer','cooperate','collaborate','meet','work','exercise','sleep','commute','carpool','succeed','fail','listen','compete','concentrate','conclude','settle','recover','prevail')
DEGREE_ADV=('highly','very','extremely','particularly','especially','significantly','relatively','quite','fairly','rather','somewhat','remarkably','incredibly','exceptionally','unusually','surprisingly','undeniably','immeasurably','absolutely','totally','completely','entirely','partially','largely','mostly','primarily','mainly','substantially','moderately','slightly','marginally')
FREQUENCY_ADV=('always','usually','normally','regularly','often','frequently','occasionally','sometimes','rarely','seldom','never','periodically','annually','monthly','weekly','daily','constantly','continuously','intermittently','repeatedly','habitually')
NON_PRED_ADJ=('former','latter','previous','next','current','annual','monthly','weekly','daily','first','last','second','third','chief','main','principal','primary','secondary','potential','prospective','former','federal','international','local','regional','domestic','global','financial','legal','medical','municipal','electrical','mechanical','technical','administrative','corporate','commercial','official','original','initial','final','future','existing','remaining','further','former','nearby','following','preceding','several','various','each','every','both')

# Terminal prepositions in a verb construction need an object, not a dangling suffix.
PREP_TAIL={'of':'the report','to':'the new schedule','for':'the upcoming event','with':'the new team','on':'the project','about':'the proposal','in':'the training program','at':'the updated plan','from':'the original budget','into':'the new system','by':'the supplier','against':'the contract'}
PREP_START=('in ','on ','at ','under ','over ','by ','with ','without ','for ','from ','during ','before ','after ','within ','through ','against ','despite ','across ','throughout ','upon ','around ','inside ','outside ','near ','beyond ','beneath ','between ','until ','owing to ','due to ','according to ','in spite of ','regardless of ')
VERB_FIRST=('take ','get ','make ','give ','put ','keep ','have ','be ','do ','go ','come ','set ','let ','run ','bring ','work ','try ','carry ','pick ','send ','call ','look ','turn ','stand ','move ','hold ','break ','follow ','pay ','reach ','meet ','find ','check ','press ','open ','close ','arrange ','write ','read ','walk ','cross ','lead ','allow ','offer ','sign ','report ','accept ','return ','provide ','use ','fill ','book ','stay ','wait ','cut ','drop ','raise ','drive ','watch ','speak ','listen ','order ','buy ','sell ','buy ','install ','apply ','talk ','cover ','hand ','come ','take ','leave ','build ','clean ','attend ','visit ','reduce ','learn ','throw ','step ','stop ','start ','assign ','submit ','earn ','change ','sell ','file ','request ','contact ','prepare ','discuss ','note ','ensure ','perform ','respond ','minimize ','maximize ','rely ','consist ','contribute ','apply ','deal ','participate ','tend ','belong ','agree ','depend ','result ','respond ','refer ','pertain ','specialize ','insist ','stick ','devote ','plan ','attempt ','decide ','avoid ','help ','expect ','consider ','prefer ','insure ','prevent ','aim ','prepare ','assist ','adapt ','adjust ','compare ','become ','consider ','remove ')


def first_sense(ko):
    # Only for choosing patterns; glossary itself remains unchanged.
    s=re.split(r'[;,;；/]|\s+또는\s+',ko,maxsplit=1)[0]
    return s.strip().strip('()').replace('~을','').replace('~를','').strip()


def article(term):
    # Conservative: we rarely need to insert 'a'/'an' with arbitrary phrases.
    return 'an' if term[:1].lower() in 'aeiou' else 'a'


def tidy(term):
    return re.sub(r'\s+',' ',term.strip())


def instantiate(t):
    # A/B and similar mnemonic slots, without modifying the original word.
    t=re.sub(r"one['’]s",'her',t,flags=re.I)
    t=re.sub(r'\boneself\b','herself',t,flags=re.I)
    t=re.sub(r'\b[A]\b','the sample',t)
    t=re.sub(r'\b[B]\b','the laboratory',t)
    t=re.sub(r'\bsb\b','the manager',t,flags=re.I)
    t=re.sub(r'\bsth\b','the proposal',t,flags=re.I)
    t=t.replace(' -ing',' working').replace('(-ing)','(working)').replace(' to do',' to complete the task')
    return tidy(t)


def infer_pos(t,gloss):
    from textblob.en import tag
    lower=t.lower()
    result=tag(t)[0][1]
    if lower in NON_PRED_ADJ:return 'JJ'
    if lower in VERB_INTRANS or lower in VERB_DOC or lower in VERB_EQUIP or lower in VERB_PLAN or lower in VERB_STAFF:return 'VB'
    if lower in ('sold','selling','undergoing','governing','running','working') and gloss.endswith(('된','하는','있는')):return 'JJ'
    if lower.endswith('ly') and lower not in ('friendly','lovely','likely','costly','early','timely','orderly','lively','elderly','monthly','weekly','daily','hourly','yearly','family','supply','reply','assembly','rally','ally'):return 'RB'
    # Inflected participles are often nouns or adjectives in the supplied deck.
    if lower.endswith(('ing','ed')) and result.startswith('VB'):
        if re.search(r'(한|된|인|는|스러운|적인|어린|없는|많은|작은|좋은|나쁜|있는|긴)$',gloss):return 'JJ'
        if not gloss.endswith(('하다','되다','받다','나다','쓰다','읽다','주다','치다','들다','보다','가다','오다','시키다','다')):return 'NN'
    # The first listed Korean sense is the best tie-breaker for verb/noun homographs.
    if gloss.endswith(('하다','되다','나다','두다','놓다','보내다','쓰다','읽다','주다','치다','들다','보다','가다','오다','시키다','얻다','앉다','서다','끄다','자다','다')):
        if re.search(r'(의|적인|한|인|는|된|스러운|있는|없는|어느)$',gloss):return 'JJ'
        return 'VB'
    if re.search(r'(된|한|하는|적인|인|스러운|로운|있는|없는|어린|작은|많은|적은|빠른|느린|싶은|고픈|불가능한)$',gloss):
        if not result.startswith('NN'):return 'JJ'
    if not result.startswith(('JJ','RB')):return 'NN'
    return result


def template_for(word,meaning,number):
    t=tidy(word)
    lower=t.lower()
    gloss=first_sense(meaning)
    if lower in CONNECTIVES:
        en,ko=CONNECTIVES[lower];return en,ko,'curated','editorial'
    if re.search(r'\([^)]*(=|/).*\)',t) or '[' in t or re.search(r'\b[A-Z]\b',t) or '...' in t or '-ing' in t or 'one\'s' in t:
        # Don't invent questionable inflections in ambiguous grammatical patterns.
        # In this tier the text is a contextual usage *draft* and remains labeled.
        t=instantiate(re.sub(r'\s*\([^)]*=[^)]*\)','',t))
    single=bool(re.fullmatch(r"[\wÀ-ÿ'-]+",t))
    if single:
        pos=infer_pos(t,gloss)
        if pos.startswith('RB'):
            if lower in FREQUENCY_ADV:
                return f'The staff {t} reviews the delivery schedule before work.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adverb-frequency','needs-review'
            if lower in DEGREE_ADV:
                return f'The revised schedule is {t} important to the team.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adverb-degree','needs-review'
            if lower in ('unfortunately','undoubtedly','apparently','obviously','surely','certainly','presumably','reportedly','notably','ostensibly','intriguingly','surprisingly','interestingly','admittedly','clearly','naturally','perhaps','probably','possibly','hopefully','evidently'):
                return f'{t.capitalize()}, the delivery is expected to arrive tomorrow.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adverb-sentence','needs-review'
            if lower in ('utterly','completely','totally','entirely','absolutely','thoroughly','perfectly'):
                return f'The manager found the explanation {t} convincing.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adverb-intensifier','needs-review'
            if lower in ('technically','strictly','personally','frankly','officially','generally','essentially','basically'):
                return f'{t.capitalize()}, the deadline is next Friday.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adverb-comment','needs-review'
            if lower in ('broadly','widely','largely'):
                return f'The new policy was {t} supported by employees.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adverb-extent','needs-review'
            if lower in ('tastefully','elegantly','beautifully','finely','meticulously'):
                return f'The hotel lobby was {t} decorated.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adverb-style','needs-review'
            return f'The manager responded {t} to the customer’s request.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adverb-manner','needs-review'
        if pos.startswith('JJ'):
            if lower in NON_PRED_ADJ:
                if lower in ('several','various','both','many','few','each','every'):
                    return f'The manager reviewed {t} reports before the meeting.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adjective-quantifier','needs-review'
                return f'The team reviewed the {t} report before the meeting.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adjective-attributive','needs-review'
            if any(x in meaning for x in ('서류','문서','문장','글자','인쇄','읽기','작성')):
                return f'The document was {t} when it arrived.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adjective-document','needs-review'
            if any(x in meaning for x in ('비싼','싼','저렴','가격','비용','할인','비싸','저가','선불')):
                return f'The hotel offered a {t} rate to conference guests.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adjective-price','needs-review'
            if any(x in meaning for x in ('화장','미용','화학','법률','기술','건축','의료','식물')):
                return f'The company introduced new {t} products.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adjective-domain','needs-review'
            if any(x in meaning for x in ('인간','사람','건강','병든','피곤','불안','괴로워','알레르기','당황','행복','슬픈','신뢰','친절')):
                return f'The customer seemed {t} after the announcement.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adjective-person','needs-review'
            return f'The manager described the new proposal as {t}.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-adjective-predicative','needs-review'
        if pos.startswith('VB'):
            if lower in VERB_DOC:target='the report'
            elif lower in VERB_EQUIP:target='the equipment'
            elif lower in VERB_PLAN:target='the proposed plan'
            elif lower in VERB_STAFF:target='the employees'
            elif lower in VERB_INTRANS:
                return f'The staff may {t} after the scheduled meeting.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-verb-intransitive','needs-review'
            elif '돈' in meaning or '금' in meaning or '지급' in meaning:target='the invoice'
            elif '계약' in meaning or '서명' in meaning:target='the contract'
            elif any(y in meaning for y in ('기록','문서','작성','보고','제출','계산','첨부','인쇄')):target='the report'
            elif any(y in meaning for y in ('운반','운송','배송','싣','쌓','포장','배송','운전','적재')):target='the shipment'
            elif any(y in meaning for y in ('고용','선발','교육','훈련','알리','문의','칭찬','위로')):target='the new employees'
            else:target='the new procedure'
            return f'The team will {t} {target} before Friday.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-verb-transitive','needs-review'
        # noun default; use Korean subject cues to give a plausible scenario
        if any(y in gloss for y in ROLE_KO):
            return f'The {t} attended the meeting on Monday.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-noun-person','needs-review'
        if any(y in gloss for y in VENUE_KO):
            return f'The {t} is located near the city center.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-noun-place','needs-review'
        if any(y in gloss for y in OBJECT_KO):
            return f'The staff checked the {t} before opening the office.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-noun-object','needs-review'
        if any(y in gloss for y in EVENT_KO):
            return f'The {t} is scheduled for Friday afternoon.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-noun-event','needs-review'
        if any(y in gloss for y in FINANCE_KO):
            return f'The finance department reviewed the {t} carefully.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-noun-finance','needs-review'
        if any(y in gloss for y in ABSTRACT_KO):
            return f'The report explains the {t} in more detail.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-noun-abstract','needs-review'
        return f'The team discussed the {t} during the planning meeting.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-noun-general','needs-review'
    # Multiword phrases
    if lower.startswith(PREP_START):
        if re.search(r'\b(?:due to|owing to|according to|in relation to|in response to|regardless of|in spite of)$',lower):t+=' the revised schedule'
        if lower.startswith(('in','on','at','under','over','with','without','by','for','from','through')):
            return f'The employee completed the task {t}.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-adverbial','needs-review'
        return f'{t[:1].upper()+t[1:]}, the team reviewed the proposal.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-prepositional','needs-review'
    if lower.startswith('be '):
        complement=t[3:]
        if complement.startswith(('held','conducted','presented','completed','announced','delivered','accepted','displayed','replaced','installed','sent')):
            return f'The event will be {complement} next Friday.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-passive','needs-review'
        if complement.startswith(('in','on','at','under','out','over','around','available','able','ready','open','closed','responsible','eligible','interested','familiar','similar','different','likely','aware','reluctant','eager','capable','unaware','qualified')):
            tail=PREP_TAIL.get(complement.split()[-1],'')
            if tail and not complement.endswith(('the project','the plan')):complement+=' '+tail
            return f'The employees need to be {complement} before the event.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-be','needs-review'
        return f'The manager explained why it is important to be {complement}.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-be-generic','needs-review'
    # Sense-aware multiword verb expressions missed by the fixed first-word list.
    if lower in ('sold out','fully booked','well known','on time','available for rent'):
        return f'The tickets were {t} by Friday.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-adjective','needs-review'
    if lower.startswith(VERB_FIRST) or (gloss.endswith(('하다','되다','나다','보다','다')) and tag(t.split(' ')[0])[0][1].startswith('VB')):

        # Complete phrasal verb fragments with an object when required.
        tail=lower.rsplit(' ',1)[-1]
        if tail in PREP_TAIL:t+=' '+PREP_TAIL[tail]
        return f'The employees agreed to {t} before Friday.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-verb','needs-review'
    if lower.startswith(('a ','an ','the ','some ','several ','all ','every ','both ','many ','few ','no ')):
        if t.endswith(' of'):
            object_name={'a loaf of':'bread','a piece of':'paper','a sheet of':'paper','a copy of':'the report','a number of':'participants','a variety of':'products','a complete line of':'products','a great deal of':'work','a lot of':'people','a string of':'delays','a series of':'meetings'}.get(lower,'the materials')
            return f'The company ordered {t} {object_name} yesterday.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-determiner-of','needs-review'

        return f'The report included {t} in the final summary.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-noun-determiner','needs-review'
    if lower.startswith(('not ','as ','so ','too ','more ','less ','very ','much ','quite ','rather ','almost ','nearly ','hardly ','only ','just ','even ','well ','far ','still ','no ')):
        return f'The manager explained that this was {t}.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-modifier','needs-review'
    # noun phrase with no determiner. Full noun phrase is more natural after 'the'.
    return f'The team reviewed the {t} during the meeting.',f'핵심 뜻: {meaning} (문장 번역 미검수)','rule-phrase-noun','needs-review'


def matches_lemma(word,en):
    """Rough lexical occurrence check, not grammatical or semantic proof."""
    w=word.lower().strip()
    if not w:return False
    # If user source provided a placeholder notation, only test the lexical anchor.
    w=re.sub(r'\([^)]*\)','',w)
    tokens=re.findall(r"[a-zà-ž]+",w)
    if not tokens:return True
    anchor=next((x for x in tokens if len(x)>=4),tokens[0])
    stem=anchor
    text=en.lower()
    candidates={stem,stem+'s',stem+'es',stem+'d',stem+'ed',stem+'ing',stem[:-1]+'ies' if stem.endswith('y') else stem+'ing'}
    if stem.endswith('e'):candidates.add(stem[:-1]+'ing')
    if stem.endswith('y'):candidates.add(stem[:-1]+'ied')
    return any(re.search(r'(?<![a-z])'+re.escape(c)+r'(?![a-z])',text) for c in candidates)


raw_provided=0
source_counts=collections.Counter()
review=[]
for w in WORDS:
    if any(e['source']=='provided' for e in w['examples']):
        for e in w['examples']:
            if e['source']=='provided':
                raw_provided+=1
                e['en']=e['en'].replace('r?sum?', 'résumé').replace('caf?', 'café')
                e.setdefault('reviewStatus','provided-unverified')
        continue
    en,ko,rule,status=template_for(w['word'],w['meaningKo'],int(w['id']))
    if w['word'].lower() in LOWER:
        en,ko=LOWER[w['word'].lower()]
        status='project-reviewed';rule='editorial-written'
    if status=='editorial':status='project-reviewed'
    # No token-name quotations: this is intended as real contextual English usage.
    if not en.rstrip().endswith(('.','?','!')):en+='.'
    if not ko.strip():raise ValueError('Missing KO')
    e={'en':en,'ko':ko,'source':'project-authored' if status=='project-reviewed' else 'generated-context',
       'reviewStatus':status,'method':rule}
    if not matches_lemma(w['word'],en):
        e['reviewReason']='headword/collocation realization needs a check'
    w['examples']=[e]
    source_counts[e['source']]+=1
    if status!='project-reviewed' or e.get('reviewReason'):
        review.append({'id':w['id'],'day':w['day'],'category':w['category'],'word':w['word'],'meaningKo':w['meaningKo'],
                       'en':en,'ko':ko,'method':rule,'reviewReason':e.get('reviewReason','automated English/context and Korean translation unreviewed')})
assert len(WORDS)==5101 and raw_provided==1481 and sum(source_counts.values())==3863

DATA.write_text(json.dumps(WORDS,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
manifest=json.loads((ROOT/'src/data/manifest.json').read_text(encoding='utf-8'))
manifest.update({'contentRevision':2,'projectReviewedExamples':source_counts['project-authored'],
                 'generatedContextExamples':source_counts['generated-context'],
                 'quotedTokenPromptExamples':0,'providedExampleReviewStatus':'not-independently-verified',
                 'generatedReviewStatus':'pending-human-review'})
(ROOT/'src/data/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'data').mkdir(exist_ok=True)
with (ROOT/'data/content-review-queue.csv').open('w',encoding='utf-8-sig',newline='') as f:
    cols=['id','day','category','word','meaningKo','en','ko','method','reviewReason']
    writer=csv.DictWriter(f,fieldnames=cols);writer.writeheader();writer.writerows(review)
print('Output:',len(WORDS),'source_counts',source_counts,'pending',len(review),'provided',raw_provided)
print('rule usage:',collections.Counter(r['method'] for r in review).most_common())
print('unmatched terms:',sum('headword/' in r['reviewReason'] for r in review))
