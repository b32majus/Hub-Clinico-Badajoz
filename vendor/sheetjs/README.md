# SheetJS vendored dependency

This folder contains a local copy of **SheetJS Community Edition**, used by the
Farmacia v0.2 demo to read drug-catalog Excel files client-side, avoiding any
external CDN dependency.

## File

- `xlsx.full.min.js`

## Purpose

Client-side Excel parsing for the drug-catalog autocomplete feature in the
Farmacia validation screen. The Excel is loaded via `fetch()` (or a manual
file-input fallback) and parsed entirely in the browser using SheetJS.

## Reason for vendoring

The demo must not rely on external CDNs (cdnjs, jsdelivr, unpkg, etc.),
especially for hospital/institutional environments with restricted or
air-gapped network access. Bundling the dependency locally ensures the
demo works without internet connectivity to third-party hosts.

## Version

0.18.5 (community browser build)

## Source

https://sheetjs.com/ — SheetJS Community Edition

## License

**Apache 2.0**

SheetJS Community Edition is distributed under the Apache License, Version 2.0.

Copyright (C) 2012-present SheetJS LLC

See the `LICENSE` file in this folder for the full license text.

Required attribution text:

```
SheetJS Community Edition -- https://sheetjs.com/
Copyright (C) 2012-present   SheetJS LLC
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Added

2026-06-06 — vendored for Farmacia v0.2 dual drug-catalog autocomplete.
