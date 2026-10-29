#!/usr/bin/env bash
# Keep failures diagnosable through the GitHub Checks API, without fetching log archives.
set -uo pipefail
log=$(mktemp)
if "$@" >"$log" 2>&1; then
  cat "$log"
  rm -f "$log"
else
  status=$?
  cat "$log"
  python3 - "$log" <<'PY'
import sys,pathlib,xml.etree.ElementTree as ET
text=pathlib.Path(sys.argv[1]).read_text(errors='replace')[-5000:]
for file in pathlib.Path('android/app/build/outputs/androidTest-results').rglob('*.xml'):
    try:
        root=ET.parse(file).getroot()
        for failure in root.iter('failure'):text+='\n'+(failure.text or failure.get('message',''))[-5000:]
    except Exception:pass
text=text[-10000:].replace('%','%25').replace('\r','%0D').replace('\n','%0A')
print('::error title=Diagnóstico Android::'+text)
PY
  rm -f "$log"
  exit "$status"
fi
