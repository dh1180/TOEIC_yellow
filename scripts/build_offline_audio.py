"""Build an offline Android audio pack from the user's Anki deck and a local Piper voice."""
from __future__ import annotations

import argparse
import hashlib
import io
import os
import json
import re
import sqlite3
import tempfile
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import lameenc
import onnxruntime
import zstandard
from piper import PiperVoice
from piper.config import SynthesisConfig

from import_anki import clean

ROOT = Path(__file__).resolve().parents[1]
ZSTD_MAGIC = bytes.fromhex("28b52ffd")
SAMPLE = "Please confirm your reservation before Friday."


def unpack(data):
    if data.startswith(ZSTD_MAGIC):
        with zstandard.ZstdDecompressor().stream_reader(io.BytesIO(data)) as reader:
            return reader.read()
    return data


def fields(data):
    source = io.BytesIO(data)

    def varint(first):
        value, shift = 0, 0
        while first:
            byte = first[0]
            value |= (byte & 127) << shift
            if byte < 128:
                return value
            shift += 7
            first = source.read(1)
        raise ValueError("Truncated Anki media map")

    while key := source.read(1):
        field, kind = divmod(varint(key), 8)
        if kind == 0:
            yield field, varint(source.read(1))
        elif kind == 2:
            size = varint(source.read(1))
            value = source.read(size)
            if len(value) != size:
                raise ValueError("Truncated Anki media map")
            yield field, value
        else:
            raise ValueError(f"Unexpected Anki media field type {kind}")


def original_media(archive):
    data = unpack(archive.read("media"))
    if data.lstrip().startswith(b"{"):
        return {name: (key, None) for key, name in json.loads(data).items()}
    entries = [dict(fields(item)) for field, item in fields(data) if field == 1]
    return {entry[1].decode(): (str(i), entry.get(3)) for i, entry in enumerate(entries)}


def read_notes(path):
    with zipfile.ZipFile(path) as archive, tempfile.TemporaryDirectory() as temporary:
        database = Path(temporary) / "collection.sqlite"
        database.write_bytes(unpack(archive.read("collection.anki21b")))
        db = sqlite3.connect(database)
        try:
            return {str(wid): data.split("\x1f", 1)[0] for wid, data in db.execute("SELECT id, flds FROM notes")}
        finally:
            db.close()


def spoken_word(text):
    return re.sub(r"\s*\((?:[=↔<>]|<-).*?\)", "", text).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--anki", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--model-config", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--cuda", action="store_true")
    parser.add_argument("--reverse", action="store_true")
    args = parser.parse_args()
    words = json.loads((ROOT / "src/data/words.json").read_text(encoding="utf8"))
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    (output / "manifest.json").unlink(missing_ok=True)
    notes = read_notes(args.anki)

    opts = onnxruntime.SessionOptions()
    opts.intra_op_num_threads = 1
    opts.inter_op_num_threads = 1
    provider = "CUDAExecutionProvider" if args.cuda else "CPUExecutionProvider"
    if args.cuda:
        onnxruntime.preload_dlls(directory="")
    voice = PiperVoice.load(args.model, config_path=args.model_config)
    providers = [(provider, {"cudnn_conv_algo_search": "HEURISTIC"}), "CPUExecutionProvider"] if args.cuda else [provider]
    voice.session = onnxruntime.InferenceSession(str(args.model), sess_options=opts, providers=providers)
    if voice.session.get_providers()[0] != provider:
        raise RuntimeError(f"Requested ONNX Runtime provider is unavailable: {provider}")

    config = SynthesisConfig(length_scale=1.02)
    counts = {"originalWords": 0, "generatedWords": 0, "examples": 0}

    def synthesize(text, target):
        if args.resume and target.is_file() and target.stat().st_size > 512:
            return
        chunks = list(voice.synthesize(text, syn_config=config))
        if not chunks:
            raise ValueError(f"No speech for {text!r}")
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(40)
        encoder.set_in_sample_rate(chunks[0].sample_rate)
        encoder.set_channels(1)
        encoder.set_quality(3)
        audio = bytearray()
        for chunk in chunks:
            audio.extend(encoder.encode(chunk.audio_int16_bytes))
        audio.extend(encoder.flush())
        temporary = target.with_suffix(f".{os.getpid()}.part")
        temporary.write_bytes(audio)
        temporary.replace(target)

    jobs = []
    with zipfile.ZipFile(args.anki) as archive:
        media = original_media(archive)
        for word in words:
            wid = word["id"]
            raw = notes.get(wid, "")
            match = re.search(r"\[sound:([^\]]+)\]", raw)
            target = output / f"w_{wid}.mp3"
            if match and clean(raw) == word["word"] and match[1] in media:
                key, checksum = media[match[1]]
                audio = unpack(archive.read(key))
                if checksum and hashlib.sha1(audio).digest() != checksum:
                    raise ValueError(f"Anki audio checksum mismatch for {wid}")
                target.write_bytes(audio)
                counts["originalWords"] += 1
            else:
                jobs.append((spoken_word(word["word"]), target))
                counts["generatedWords"] += 1
            for position, example in enumerate(word["examples"]):
                jobs.append((example["en"], output / f"e_{wid}_{position}.mp3"))
                counts["examples"] += 1
    jobs.append((SAMPLE, output / "sample.mp3"))
    if args.reverse:
        jobs.reverse()
    print(f"{counts['originalWords']} original word clips; preparing {len(jobs)} synthesized clips", flush=True)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for index, _ in enumerate(pool.map(lambda job: synthesize(*job), jobs), 1):
            if index % 200 == 0:
                print(f"{index}/{len(jobs)} synthesized clips ready", flush=True)
    (output / "manifest.json").write_text(json.dumps(counts, indent=2) + "\n", encoding="utf8")
    print(counts, flush=True)


if __name__ == "__main__":
    main()
