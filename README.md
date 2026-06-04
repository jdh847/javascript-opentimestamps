# javascript-opentimestamps (fork)

Fork of [opentimestamps/javascript-opentimestamps](https://github.com/opentimestamps/javascript-opentimestamps)
v0.4.9, modernized for use in the [Sealmark](https://github.com/jdh847/sealmark) Obsidian plugin.

## Why this fork exists

Upstream has been unmaintained since 2021 and depends on the deprecated `request` /
`request-promise` HTTP stack, which pulls in known-vulnerable transitive packages
(`tough-cookie`, `qs`, `uuid`), including 2 critical advisories. That is a poor
supply-chain story for a library whose whole job is cryptographic proof.

## Changes from upstream

- **Network layer**: replaced `request-promise` with a ~60-line `src/http.js` built on
  Node's native `https`/`http`. It implements the small subset of the `request-promise`
  call signature the library actually uses (method, headers, body, timeout,
  `encoding:null` → Buffer, `json:true` → object). Because it is Node http and not a
  browser `fetch`/XHR, it preserves the original CORS-bypass behaviour in Electron
  renderers (e.g. Obsidian). Zero new dependencies.
- **Dependencies**: trimmed to the four packages `src/` actually requires
  (`bitcore-lib`, `minimatch`, `promise`, `properties`). Removed `request`,
  `request-promise`, `bytebuffer`, `commander`, `moment-timezone`, `randomstring`, and
  the entire build/test devDependency toolchain (gulp, browserify, babel, electron).

## Result

`npm audit` drops from **11 vulnerabilities (2 critical, 8 moderate, 1 low)** to
**2 low-severity advisories** in `elliptic` (no upstream fix; affects all versions).
Those are only reachable through Bitcoin signature verification, which OpenTimestamps
proof verification does not perform, so they are not reachable in normal use.

Stamp and verify are otherwise unchanged, validated against live calendars and a
Bitcoin-confirmed proof.

## License

LGPL-3.0, same as upstream (see LICENSE). This fork modifies the files under `src/`
as described above.
