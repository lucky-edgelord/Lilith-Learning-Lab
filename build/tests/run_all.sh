#!/usr/bin/env bash
# Run every test. Usage (from build/): bash tests/run_all.sh [screenshot dir]
set -euo pipefail
cd "$(dirname "$0")/.."
SHOTS="${1:-/tmp/lilith-shots}"; WEB="$(mktemp -d)"
trap 'rm -rf "$WEB"' EXIT
python3 build_web.py --web "$WEB" >/dev/null
step() { echo "== $1"; shift; "$@"; }
step "course format" node tests/test_course.js
step "AI engine" node tests/test_ai.js
step "CORS proxy" node tests/proxy_test.mjs
step "workspace + Android bridge" python3 tests/workspace_test.py "$WEB"
step "AI UI" python3 tests/ai_ui_test.py "$WEB" ../courses "$SHOTS"
step "C64 machine" node c64c/c64lab/test_machine.js
step "C64 labs (BASIC + asm)" bash -c "python3 c64c/export_labs.py >/dev/null && node c64c/c64lab/test_labs.js"
step "C64 labs (C, cc65)" python3 c64c/c64lab/test_c_labs.py
step "narrator fuzz" node tests/narrate_fuzz.js
step "audio UI" python3 tests/audio_ui_test.py "$WEB" ../courses
step "app UI" python3 tests/ui_test.py "$WEB" ../courses "$SHOTS"
step "store" python3 tests/store_test.py "$WEB" ../courses
step "course editor" python3 tests/editor_test.py ../courses "$SHOTS"
echo "ALL TESTS PASSED"
