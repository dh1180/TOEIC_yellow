#!/usr/bin/env python3
"""Apply reviewed-by-project candidate overlays after the original Anki/PR2 pipeline.

This script NEVER certifies English usage, translations, senses or source rights.
Keep Anki note IDs and original provided examples unchanged.
Run after: python3 scripts/curate_examples.py
"""
from __future__ import annotations
import collections
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORD_FILE = ROOT / "src/data/words.json"
MANIFEST_FILE = ROOT / "src/data/manifest.json"
OVERRIDES_FILE = ROOT / "data/qa-editorial-overrides.json"
QUEUE_FILE = ROOT / "data/content-review-queue.csv"
WORD_FIXES = {
    "1766527463138": ("exhaust emissions", "fuel emission"),
    "1766527462731": ("take legal action against", "take an action against"),
    "1766527462799": ("make a forecast", "make forecast"),
    "1766527462832": ("whereabouts", "whereabout"),
    "1766527462853": ("operating budget", "operation budget"),
    "1766527461496": ("claim a refund", "claim refund"),
    "1766527461511": ("unplug the device", "unplug device"),
    "1766527461596": ("make an adjustment", "make adjustment"),
    "1766527461633": ("draw a conclusion", "make a conclusion"),
    "1766527461654": ("going-away party", "going away party"),
    "1766527461713": ("time off", "time-off"),
    "1766527461766": ("interdepartmental", "inter department"),
    "1766527461807": ("dock at the pier", "land at the dock"),
    "1766527461829": ("toll fee", "toll price"),
    "1766527461894": ("accounts payable", "account payable"),
    "1766527461924": ("call an urgent meeting", "call on urgent meeting"),
    "1766527460774": ("discount coupon", "discounted coupon"),
    "1766527461016": ("user-friendly", "user friendly"),
    "1766527461032": ("post a notice on", "post an notice on"),
    "1766527461043": ("board a flight", "board flight"),
    "1766527460527": ("sports tournament", "sport tournament"),
    "1766527460582": ("over the Internet", "over the lnternet"),
    "1766527458672": ("CEO (chief executive officer)", "CEO(chief executive officer)"),
    "1766527461470": ("chief financial officer (CFO)", "chief financial officer(CEO)"),
    "1766527461936": ("in the distant past", "in the distance past"),
    "1766527462263": ("settle down to work", "set down to work"),
    "1766527462290": ("make an outside call", "make on outside call"),
    "1766527461879": ("until the first of next month", "until the first next month"),
    "1766527462256": ("arrange items on the shelf", "arrange item on the shelf"),
    "1766527460162": ("dressed in a suit", "dressed in suit"),
    "1766527460164": ("full-time work", "full time work"),
    "1766527461412": ("profitable", "profitable(<->unprofitable)"),
    "1766527460427": ("seamless", "seamless(=without trouble)"),
    "1766527462312": ("ambiance", "ambiance(=ambience)"),
    "1766527458821": ("turn off", "turn off(↔turn on)"),
    "1766527460440": ("fold in half", "flod in half"),
    "1766527462326": ("reach a solution", "reach the solution"),
    "1766527458892": ("publishing company", "publication company"),
}
VALID_OVERLAY_SOURCES = {"editorial-draft", "provided-crosslink"}


def main() -> None:
    words = json.loads(WORD_FILE.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8"))
    by_id = {w["id"]: w for w in words}
    if len(words) != 5101 or len(by_id) != 5101 or len(overrides) != 3472:
        raise SystemExit("Unexpected corpus or QA override count")
    for wid, (correct, original) in WORD_FIXES.items():
        w = by_id[wid]
        if w["word"] not in (correct, original):
            raise SystemExit(f"Unexpected headword change for {wid}")
        w["wordOriginal"], w["word"] = original, correct

    for wid, correction in overrides.items():
        w = by_id.get(wid)
        if not w:
            raise SystemExit(f"Unknown override ID: {wid}")
        if len(w["examples"]) != 1:
            raise SystemExit(f"Will not replace original multi-example note: {wid}")
        current_source = w["examples"][0]["source"]
        example = correction["examples"][0]
        if current_source not in {"generated-context", *VALID_OVERLAY_SOURCES}:
            raise SystemExit(f"Will not replace provided/editorial source: {wid}")
        if example["source"] not in VALID_OVERLAY_SOURCES:
            raise SystemExit(f"Bad QA source at {wid}")
        w["examples"] = [example]

    proposal = by_id["1766527460356"]
    if proposal["word"] != "put forward" or proposal["meaningKo"] not in ("앞당기다", "제안하다, 내세우다; (회의·일정 등을) 앞당기다"):
        raise SystemExit("Put forward sense does not match source expectation")
    proposal["meaningKoOriginal"] = "앞당기다"
    proposal["meaningKo"] = "제안하다, 내세우다; (회의·일정 등을) 앞당기다"

    # More precise Korean senses for employment, notification and loan-default usage.
    sense_corrections = {
        "1766527462962": ("민감한, 세심한 주의가 필요한", "섬세한, 깨지기 쉬운; 세심한 주의가 필요한"),
        "1766527462970": ("(품위·지위 등을) 떨어뜨리다", "떨어뜨리다, 저하시키다; 품위를 손상시키다"),
        "1766527462995": ("심야 고속", "야간 급행열차, 심야 고속편"),
        "1766527463007": ("~을 몸에 지니다", "지니다, 표시하고 있다; 운반하다"),
        "1766527463025": ("대부하여", "대여 중인, 빌려 온"),
        "1766527463026": ("잔액이 부족한", "(계좌가) 잔액을 초과해 인출된, 마이너스인"),
        "1766527463029": ("축적하다, 모으다", "(이자·혜택 등이) 쌓이다, 발생하다"),
        "1766527463045": ("은행 자동 이체", "계좌 직접 입금, 급여 자동 입금"),
        "1766527463051": ("피(被)신탁인, 수탁자", "수탁자"),
        "1766527463059": ("외진, 변경의", "외곽의, 중심부에서 떨어진"),
        "1766527463067": ("점검, 정비; 철저히 조사하다", "전면 점검·정비; 전면적으로 정비하다"),
        "1766527463073": ("(물가를) 끌어내리다, (통화를) 수축시키다", "바람을 빼다; (물가 등을) 낮추다"),
        "1766527463086": ("아치 길", "아치형 통로"),
        "1766527463133": ("(자원 등의) 고갈", "고갈, 감소"),
        "1766527463138": ("연료 배기", "배기가스, 배기가스 배출량"),
        "1766527463140": ("방목, 목초지", "방목, 풀을 뜯는 일"),
        "1766527463147": ("지구상의", "육상의; 지구의"),
        "1766527463153": ("처방전을 조제 받다", "처방약을 조제받다"),
        "1766527463158": ("전문의", "전문 분야 종사자; 의료인, 의사"),
        "1766527463159": ("되풀이하여 반복하는", "반복되는, 되풀이되는"),
        "1766527463161": ("별관, 부속 건물", "(건물의) 한쪽 부분, 별관"),
        "1766527463175": ("비정상적으로 빠른 심장 박동", "심장이 빠르거나 세게 또는 불규칙하게 뛰는 느낌, 심계항진"),
        "1766527462135": ("심장마비", "심장 발작, 심근경색"),
        "1766527462153": ("백신, 예방 접종", "예방 접종"),
        "1766527462172": ("1회분 복용량", "복용량, 투여량"),
        "1766527462388": ("표적 집단", "표적 집단 면접에 참여하는 소규모 집단"),
        "1766527462394": ("추진력, 탄성", "추진력, 기세; 운동량"),
        "1766527462416": ("훈련", "훈련, 규율, 자기 절제"),
        "1766527462432": ("섞다, 혼합하다", "섞다, 섞이다; 사람들과 어울리다"),
        "1766527462435": ("착실함, 끈기", "안정성, 흔들림이 없음; 꾸준함"),
        "1766527462437": ("~을 일치시키다", "흡수하다, 동화하다; (정보를) 이해하고 자기 것으로 만들다"),
        "1766527462443": ("낭비하다, 흩뜨리다", "흩뜨리다, 흩어지다; (열 등을) 분산시키다; 낭비하다"),
        "1766527462451": ("~을 끌어내리다, ~을 하락시키다", "끌어내리다, 하락시키다; 철거하다"),
        "1766527462460": ("상당한 정도의, 인지할 수 있는", "인지할 수 있는, 감지할 수 있는"),
        "1766527462462": ("주의하다, 말하다", "말하다, 언급하다; 발언"),
        "1766527462489": ("모을 수 있는", "수집할 만한, 수집 가치가 있는"),
        "1766527462510": ("바꾸다", "(쿠폰·상품권 등을) 사용하다, 교환하다"),
        "1766527462562": ("당황하게 하다, 혼란스럽게 만들다", "모호하게 만들다, 혼란스럽게 하다"),
        "1766527462570": ("(가치·품질이) 떨어지다", "물러가다, 줄어들다, 약해지다"),
        "1766527462594": ("당황하게 하다, 혼란스럽게 만들다", "모호하게 만들다, 혼란스럽게 하다"),
        "1766527462602": ("(가치·품질이) 떨어지다", "물러가다, 줄어들다, 약해지다"),
        "1766527462620": ("사실상", "사실에 근거해, 사실에 부합하게"),
        "1766527462642": ("(공항의) 회전식 수화물 컨베이어", "회전목마; 공항의 회전식 수하물 컨베이어"),
        "1766527462662": ("(물건을) 압수하다", "(당국이 차량·물건 등을) 압류하거나 억류하다"),
        "1766527462676": ("합병", "소속, 제휴, 연계"),
        "1766527462695": ("신용대출 한도액", "신용 한도, 신용카드 이용 한도"),
        "1766527462719": ("~와 다투다", "~와 싸우다, ~에 대처하다"),
        "1766527462731": ("~를 고소하다", "~을 상대로 법적 조치를 취하다"),
        "1766527462757": ("국적을 상실한 사람; 고국을 떠나다", "자국을 떠나 외국에 사는 사람; 국외로 이주하다"),
        "1766527462783": ("무리, 집단", "한 번에 만든 분량; 한 묶음, 한 무리"),
        "1766527462808": ("계기에 표시된", "표시된, 명시된"),
        "1766527462815": ("보답을 받는, 보상으로서의", "보람 있는, 만족감을 주는"),
        "1766527462829": ("이윤 차액", "이익률, 이윤율"),
        "1766527462837": ("사실상, 실제로", "실질적으로, 내용 면에서"),
        "1766527462859": ("통계학", "통계 자료; 통계학"),
        "1766527462884": ("~의 선두를 유지하다", "~을 놓치지 않고 파악하다, ~을 계속 관리하다"),
        "1766527462939": ("인용구, 인용, 표창장", "인용, 출처 표기; 표창장"),
        "1766527461395": ("할당, 분배", "할당, 배정; 배정량"),
        "1766527461487": ("가까스로, 거의 ~하지 않는", "심하게, 몹시; 잘못, 서투르게"),
        "1766527461535": ("기대하던, 대망의", "예상된, 기대한"),
        "1766527461671": ("서고, 서가", "여러 더미로 쌓인 책"),
        "1766527461739": ("주목하다", "주의하다, 유의하다"),
        "1766527461807": ("부두에 정박하다", "부두에 접안하다"),
        "1766527461818": ("차고", "주차장, 주차 건물"),
        "1766527461889": ("수용하다", "기꺼이 받아들이는, 수용적인"),
        "1766527461894": ("지급 계정", "매입채무, 미지급금"),
        "1766527461938": ("(액체 등이) 세는", "(물 등이) 새는"),
        "1766527461950": ("풍부하게, 아주 분명한", "풍부하게; 아주, 더없이"),
        "1766527461961": ("불안하여", "불안하게; 단단히 고정되지 않게"),
        "1766527461974": ("투입", "투입, 입력; 의견, 조언"),
        "1766527462006": ("쿵쾅거리는", "망치질, 망치로 두드리는 소리"),
        "1766527462008": ("주거 개선용의", "주택 개보수, 주거 환경 개선"),
        "1766527462013": ("잠자리를 준비하다", "침대를 정리하다, 이부자리를 정돈하다"),
        "1766527462042": ("붙박이 가구", "고정 설비, 붙박이 가구"),
        "1766527462044": ("가사", "가사; (호텔의) 객실 청소 및 정돈"),
        "1766527462058": ("물줄기", "수역, 물이 모여 있는 곳"),
        "1766527462073": ("해안에", "해안에서 조금 떨어진 곳에"),
        "1766527462104": ("순전한, 얇은", "순전한; 얇고 비치는; 깎아지른"),
        "1766527460758": ("~을 내밀다, 내뿜다", "(제안·의견 등을) 제시하다; ~을 내밀다, 내뿜다"),
        "1766527460794": ("가게 앞 공간", "가게 정면, 점포 전면"),
        "1766527460901": ("화재 탐지기", "연기 감지기"),
        "1766527461063": ("(비행 시의) 도중하차, 경유지", "(여행 중) 경유 대기 시간, 중간 체류"),
        "1766527461139": ("(규칙을) 위반하다", "기분을 상하게 하다; (규칙을) 위반하다"),
        "1766527461247": ("택배회사", "택배 서비스, 배송 업체"),
        "1766527461320": ("설탕을 입힘", "(케이크 등에 바르는) 아이싱, 설탕 크림"),
        "1766527461330": ("주방용품", "주방 가전제품"),
        "1766527461338": ("음식 시중, 한 끼 분의 음식", "(음식의) 1인분, 한 번에 제공하는 양"),
        "1766527460696": ("할인율", "할인 요금"),
        "1766527460675": ("(우편물의) 전송 주소", "우편물을 전달받을 주소"),
        "1766527460501": ("공예품", "유물, 인공물, 공예품"),
        "1766527460508": ("꽃꽃이", "꽃꽂이, 꽃꽂이 장식"),
        "1766527460527": ("운동 경기", "스포츠 대회, 경기 대회"),
        "1766527460632": ("증명하다", "확인하다, 검증하다; 증명하다"),
        "1766527459736": ("도움의, (음식물) 한 그릇", "(음식의) 한 사람 몫, 한 그릇"),
        "1766527459791": ("떠나다, 출발하다", "(버스·기차 등에서) 내리다; 떠나다, 출발하다"),
        "1766527459462": ("주체, 테마", "주제, 테마"),
        "1766527460164": ("정규직", "전일제 근무, 상근 일자리"),
        "1766527462197": ("필요이상으로 교육을 받은", "해당 직무에 필요한 수준보다 자격·경력이 높은"),
        "1766527460223": ("통지서를 보내다", "통지하다, 알림을 보내다"),
        "1766527462279": ("태만, 불이행", "채무불이행; 의무 불이행"),
        "1766527461452": ("~에 대한 대금", "요금을 청구하다; ~에 대한 요금"),
        "1766527461438": ("조금씩", "하나씩, 부분별로; 조금씩"),
        "1766527461439": ("부분, 몫", "비율, 부분, 몫"),
        "1766527461445": ("~까지", "~까지; 최대"),
        "1766527458544": ("진열, 배열", "배열, 다양한 종류; 진열"),
        "1766527458611": ("사용되는", "사용 중인, 쓰이고 있는"),
        "1766527458618": ("~에 속하다, 의 소유물이다", "~에 속하다, ~의 소유이다"),
        "1766527458762": ("식료품점", "식료품점, 식료품의"),
        "1766527460379": ("쓰레기 어지르다, 흐트러뜨리다", "쓰레기; 쓰레기를 함부로 버리다"),
        "1766527460416": ("~으로 가득 차다", "~으로 채우다; ~으로 가득 차다"),
        "1766527460419": ("성공의 길", "성공의 열쇠, 성공의 핵심 요소"),
        "1766527460425": ("친목회", "재회, 동창회, 친목 모임"),
        "1766527460427": ("(끊어짐이 없이) 매끄러운, 문제없는", "끊김 없이 매끄러운, 원활한"),
        "1766527462299": ("지시하는, 지배적인", "지침, 지시; 지시하는"),
        "1766527458811": ("최신의", "완전히 새로운, 새것인"),
        "1766527460435": ("임원 회의", "이사회 회의"),
        "1766527460466": ("근무 교대", "교대 근무, 근무 시간대"),
        "1766527462323": ("~에게 양보하다", "~에게 양보하다; ~로 대체되다"),
        "1766527462345": ("견습으로", "수습 기간 중인; 보호 관찰 중인"),
        "1766527460864": ("계획적인, 고의의", "설계된, 계획된; 의도적인"),
        "1766527462803": ("견적의, 추측의", "추정된, 예상된; 견적상의"),
        "1766527458880": ("의류 상품", "의류 제품군, 의류 컬렉션"),
        "1766527458886": ("철, 다리미질을 하다", "철; 다림질하다"),
        "1766527458959": ("제품 상표", "제품 로고"),
        "1766527462356": ("채널을 고정시키다", "계속 시청·청취하다; 후속 소식을 기다리다"),
        "1766527462363": ("소풍", "소풍, 짧은 여행, 견학"),
        "1766527458547": ("방지하다", "피하다, 회피하다; 방지하다"),
        "1766527458487": ("가져오다", "가져오다; (수익·이익을) 벌어들이다"),
        "1766527458813": ("개발자", "개발자; (부동산·제품) 개발업자·개발회사"),
        "1766527459044": ("여행, 여행 가다", "여행, 이동; 여행하다; 교통의"),
        "1766527458834": ("반복하다", "반복하다; (고객이) 재방문하는, 단골의"),
        "1766527458827": ("관리, 통제, 관리하다, 통제하다", "관리, 통제, 제어; 조종 장치; 관리하다, 통제하다"),
        "1766527459163": ("신문, 잡지, 일지", "학술지, 전문지; 신문, 잡지; 일지"),
        "1766527460138": ("건강 상태", "체력, 건강 상태; 건강 관리"),
        "1766527460728": ("보완하다, 보충하다", "보충물, (잡지 등의) 부록; 보완하다, 보충하다"),
        "1766527461381": ("액수, 값", "수치, 통계, 실적; 액수"),
        "1766527461396": ("자선 단체", "자선, 자선 단체; 자선행사"),
        "1766527463107": ("유지", "유지보수, 정비; 관리"),
        "1766527459378": ("당황한, 당황하게 하다", "화가 난, 속상한, 당황한; 화나게 하다"),
        "1766527459672": ("상품, 소중하게 여기다", "상, 상금, 상품; 소중하게 여기다"),
        "1766527462727": ("의정서", "의정서, 협약; 의전, 절차"),
        "1766527459245": ("장소", "행사장, 회의장; 개최 장소"),
    }
    for sid, (before, after) in sense_corrections.items():
        sense_word = by_id[sid]
        if sense_word["meaningKo"] not in (before, after):
            raise SystemExit(f"Sense drift for {sid}: {sense_word['meaningKo']}")
        sense_word["meaningKoOriginal"] = before
        sense_word["meaningKo"] = after

    rare = by_id["1766527463149"]
    if rare["word"] != "toxication" or rare["examples"][0]["source"] != "project-authored":
        raise SystemExit("Unexpected original specialized term")
    if rare["meaningKo"] not in ("중독", "독성화, 독성 대사산물로의 전환; (드물게) 중독"):
        raise SystemExit("Original toxication meaning changed; review manually")
    rare["meaningKoOriginal"] = "중독"
    rare["meaningKo"] = "독성화, 독성 대사산물로의 전환; (드물게) 중독"
    rare["examples"][0].update(
        en="In toxicology, toxication describes the conversion of a substance into a toxic metabolite.",
        ko="독성학에서 toxication은 물질이 독성 대사산물로 전환되는 과정을 뜻합니다.",
        reviewReason="Specialized biochemistry meaning checked against a dictionary; translation needs independent review."
    )
    # Correct one clear source-English preposition error in its original note and
    # every crosslinked candidate, without erasing the Anki original.
    original_en = "Abigail feels a move to overseas could help her career."
    corrected_en = "Abigail believes a move overseas could help her career."
    corrected_ko = "애비게일은 해외 이주가 자신의 경력에 도움이 될 것이라고 생각합니다."
    corrected_ids = []
    for word in words:
        for example in word["examples"]:
            if example["en"] == original_en:
                example["enOriginal"] = original_en
                example["koOriginal"] = example["ko"]
                example["en"] = corrected_en
                example["ko"] = corrected_ko
                example["correctionNote"] = (
                    "Removed incorrect 'to' before adverb overseas; "
                    "manual usage correction, independently unverified."
                )
                corrected_ids.append(word["id"])
            elif example["en"] == corrected_en and "enOriginal" in example:
                corrected_ids.append(word["id"])
    expected_ids = {"1766527458122", "1766527459131", "1766527460344"}
    if set(corrected_ids) != expected_ids:
        raise SystemExit(f"Original sentence/crosslink correction mismatch: {corrected_ids}")

    sources = collections.Counter(e["source"] for w in words for e in w["examples"])
    if sources["provided"] != 1481 or sum(n for s,n in sources.items() if s != "provided") != 3863:
        raise SystemExit(f"Source count mismatch: {sources}")

    manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    manifest.update(contentRevision=22, projectReviewedExamples=sources["project-authored"],
        editorialDraftExamples=sources["editorial-draft"],
        providedCrosslinkedExamples=sources["provided-crosslink"],
        generatedContextExamples=sources["generated-context"],
        quotedTokenPromptExamples=0, independentlyVerifiedExamples=0)
    WORD_FILE.write_text(json.dumps(words, ensure_ascii=False, separators=(",",":")) + "\n", encoding="utf-8")
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def review_reason(source):
        return {
            "project-authored": "Project-authored draft; independent language review and rights check pending",
            "editorial-draft": "AI-authored contextual draft with Korean translation; independent human language review pending",
            "provided-crosslink": "Crosslinked original sentence; verify headword sense in context",
            "generated-context": "Rule-generated text; grammar, meaning and translation pending"
        }[source]

    with QUEUE_FILE.open("w", encoding="utf-8-sig", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(("id","day","category","word","meaningKo","en","ko","method","reviewReason"))
        for w in words:
            if w["examples"][0]["source"] == "provided":
                continue
            e = w["examples"][0]
            wr.writerow((w["id"],w["day"],w["category"],w["word"],w["meaningKo"],
                e["en"],e["ko"],e.get("method",e["source"]),review_reason(e["source"])))
    print(f"Applied {len(overrides)} QA source overlays and source-grammar correction. Regenerate structural audit next.")


if __name__ == "__main__":
    main()
