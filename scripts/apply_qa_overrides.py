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
}
VALID_OVERLAY_SOURCES = {"editorial-draft", "provided-crosslink"}


def main() -> None:
    words = json.loads(WORD_FILE.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8"))
    by_id = {w["id"]: w for w in words}
    if len(words) != 5101 or len(by_id) != 5101 or len(overrides) != 643:
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

    sources = collections.Counter(e["source"] for w in words for e in w["examples"])
    if sources["provided"] != 1481 or sum(n for s,n in sources.items() if s != "provided") != 3863:
        raise SystemExit(f"Source count mismatch: {sources}")

    manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    manifest.update(contentRevision=3, projectReviewedExamples=sources["project-authored"],
        editorialDraftExamples=sources["editorial-draft"],
        providedCrosslinkedExamples=sources["provided-crosslink"],
        generatedContextExamples=sources["generated-context"],
        quotedTokenPromptExamples=0, independentlyVerifiedExamples=0)
    WORD_FILE.write_text(json.dumps(words, ensure_ascii=False, separators=(",",":")) + "\n", encoding="utf-8")
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def review_reason(source):
        return {
            "project-authored": "Project-authored draft; independent language review and rights check pending",
            "editorial-draft": "QA-authored draft; independent language review pending",
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
    print("Applied 643 QA source overlays. Regenerate structural audit next.")


if __name__ == "__main__":
    main()
