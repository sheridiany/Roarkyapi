#!/usr/bin/env python3
"""Online SQLite/config backup for the /opt/roarkapi deployment."""

import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import tarfile
import tempfile


def main():
    os.umask(0o077)
    root = Path("/opt/roarkapi")
    destination = root / "backups/hourly"
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (destination / ".lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        archive = destination / ("roark-hourly-" + stamp + ".tar.gz")
        with tempfile.TemporaryDirectory(dir=destination) as temporary:
            staging = Path(temporary)
            with sqlite3.connect("file:" + str(root / "data/roarkapi.db") + "?mode=ro", uri=True) as source:
                with sqlite3.connect(staging / "roarkapi.db") as copy:
                    source.backup(copy)
                    if copy.execute("pragma quick_check").fetchone()[0] != "ok":
                        raise RuntimeError("Backup integrity check failed")
                    counts = {
                        table: copy.execute("select count(*) from " + table).fetchone()[0]
                        for table in ("users", "tokens", "channels", "abilities", "options", "logs", "top_ups")
                    }
            shutil.copyfile(root / "compose.yml", staging / "compose.yml")
            shutil.copyfile(root / ".env", staging / "config.env")
            shutil.copyfile("/etc/nginx/conf.d/api.roarkist.com.conf", staging / "nginx.conf")
            compose = (staging / "compose.yml").read_text()
            match = re.search(r"\./releases/([^:\s]+):/app/roarkapi", compose)
            if match is None:
                raise RuntimeError("Cannot identify active release")
            binary = root / "releases" / match.group(1)
            digest = hashlib.sha256()
            with binary.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
            manifest = {"created_at_utc": stamp, "release": binary.name,
                        "binary_sha256": digest.hexdigest(), "row_counts": counts}
            (staging / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
            pending = staging / "archive.tar.gz"
            with tarfile.open(pending, "w:gz") as bundle:
                for name in ("roarkapi.db", "compose.yml", "config.env", "nginx.conf", "manifest.json"):
                    bundle.add(staging / name, arcname=name)
            os.replace(pending, archive)
        digest = hashlib.sha256()
        with archive.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        archive.with_suffix(archive.suffix + ".sha256").write_text(digest.hexdigest() + "  " + archive.name + "\n")
        owned = sorted(path for path in destination.iterdir()
                       if re.fullmatch(r"roark-hourly-\d{8}T\d{12}Z\.tar\.gz", path.name))
        for previous in owned[:-48]:
            previous.unlink()
            previous.with_suffix(previous.suffix + ".sha256").unlink(missing_ok=True)
        print(str(archive))


if __name__ == "__main__":
    main()
