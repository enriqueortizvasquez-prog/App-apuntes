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
messages=[]
for file in pathlib.Path('android/app/build/outputs/androidTest-results').rglob('*.xml'):
    try:
        for failure in ET.parse(file).getroot().iter():
            if failure.tag.endswith(('failure','error')):
                messages.append(file.name+'\n'+failure.get('message','')+'\n'+(failure.text or '')[:2600])
    except Exception:pass
log=pathlib.Path(sys.argv[1]).read_text(errors='replace')
lines=[line for line in log.splitlines() if not line.lstrip().startswith(('at ','... '))]
messages.append('\n'.join(lines)[-6000:])
for i,message in enumerate(messages):
    for n in range(0,len(message),3000):
        text=message[n:n+3000].replace('%','%25').replace('\r','%0D').replace('\n','%0A')
        print('::error title=Android '+str(i+1)+'::'+text)

PY
  rm -f "$log"
  exit "$status"
fi
