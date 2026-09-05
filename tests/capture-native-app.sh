#!/bin/sh
set -eu
website_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_dir=$(CDPATH= cd -- "$website_dir/.." && pwd)
capture_build=$(mktemp -d /private/tmp/tagalong-website-native.XXXXXX)
# Keep the prepared copies and compiler output for inspection; never modify app files.
printf '%s\n' "$capture_build" > /private/tmp/tagalong-website-capture-build-path
python3 "$website_dir/tests/prepare-native-capture.py" "$capture_build"
python3 - "$capture_build" "$website_dir" <<'PY'
from pathlib import Path
import subprocess,sys
build=Path(sys.argv[1]);site=Path(sys.argv[2])
args=['swiftc','-parse-as-library','-swift-version','5','-D','DEBUG','-module-cache-path',str(build/'modules')]
args += [str(p) for p in sorted((build/'source').rglob('*.swift'))]
args += [str(site/'tests/NativeAppCapture.swift'),'-o',str(build/'capture')]
with (build/'compile.log').open('w') as log:
 result=subprocess.run(args,stdout=log,stderr=subprocess.STDOUT)
if result.returncode:
 print((build/'compile.log').read_text()[-14000:])
 raise SystemExit(result.returncode)
print('Native capture harness compiled.')
PY
TAGALONG_UNIT_TESTS=1 "$capture_build/capture" "$repo_dir" "$website_dir/assets/app-captures" "$capture_build/fixtures" > "$capture_build/render.log" 2>&1
cp "$capture_build/source-hashes.json" "$website_dir/tests/native-capture-provenance.json"
printf 'Native app captures saved; diagnostics: %s\n' "$capture_build"

for chapter in recording live-ai enhanced; do
  ffmpeg -hide_banner -loglevel error -y -framerate 24 -i "$capture_build/motion-frames/$chapter/%04d.png" \
    -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart -an \
    "$website_dir/assets/app-captures/app-$chapter-motion.mp4"
done
printf 'Native motion clips encoded at 24 fps.\n'
