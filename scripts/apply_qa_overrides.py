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
    "1766527458672": ("CEO (chief executive officer)", "CEO(chief executive officer)"),
    "1766527461470": ("chief financial officer (CFO)", "chief financial officer(CEO)"),
    "1766527461936": ("in the distant past", "in the distance past"),
    "1766527462263": ("settle down to work", "set down to work"),
    "1766527462290": ("make an outside call", "make on outside call"),
    "1766527461879": ("until the first of next month", "until the first next month"),
    "1766527462256": ("arrange items on the shelf", "arrange item on the shelf"),
    "1766527460162": ("dressed in a suit", "dressed in suit"),
    "1766527460164": ("full-time work", "full time work"),
}
VALID_OVERLAY_SOURCES = {"editorial-draft", "provided-crosslink"}


def main() -> None:
    words = json.loads(WORD_FILE.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8"))
    by_id = {w["id"]: w for w in words}
    if len(words) != 5101 or len(by_id) != 5101 or len(overrides) != 973:
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
    manifest.update(contentRevision=5, projectReviewedExamples=sources["project-authored"],
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
    print("Applied 973 QA source overlays and source-grammar correction. Regenerate structural audit next.")


if __name__ == "__main__":
    main()
