#!/usr/bin/env python3
from pathlib import Path
path = Path('tools/farmacia_validation_state_v4_check.mjs')
source = path.read_text(encoding='utf-8')
old = "assert.match(truthSource, /option\\.disabled = false/);"
new = "assert.match(truthSource, /option\\.disabled = !!activeLine/);\nassert.match(truthSource, /El tratamiento ya está iniciado/);"
if source.count(old) != 1:
    raise SystemExit(f'expected one validation guard assertion, found {source.count(old)}')
path.write_text(source.replace(old, new, 1), encoding='utf-8')
print('updated validation state check for active-line rectification guard')