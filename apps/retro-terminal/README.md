# Retro Terminal Shell

Launches the CRT-style BASIC9000 REPL backed by the core interpreter. It auto-builds the TypeScript runtime before spawning Electron.

## Scripts

```bash
npm install        # once, in apps/retro-terminal
npm start          # builds core and starts Electron shell
npm run start:dev  # skips core rebuild, for quick UI tweaks
```

## Boot Script

`boot.bas` runs automatically for each new session. It shows how to drive the terminal host namespace:

- `TERMINAL.CLEAR()` wipes the screen
- `TERMINAL.STATUS("text")` updates the status bar
- `TERMINAL.OVERLAY("message", durationMs)` flashes a glyph overlay
- `TERMINAL.BELL()` rings the terminal bell

Edit `boot.bas` or run your own programs via the REPL prompt. Host APIs such as `HTTP`, `JSON`, `TIME`, `ARRAY`, `SYS` etc. are available immediately.

## Host Namespace Quick Reference

| Namespace | Highlights |
|-----------|------------|
| `TERMINAL` | `WRITE`, `CLEAR`, `STATUS`, `OVERLAY`, `BELL` |
| `SYS`      | `SLEEP(ms)`, `PLATFORM()`, `TICKS()` |
| `TIME`     | `NOW()`, `FROM(value)`, `FORMAT(value, pattern)` |
| `HTTP`     | `GET(url)`, `POST(url, body)`, `STATUS(url)` |
| `JSON`     | `PARSE(text)`, `GET(handle, path)`, `TYPE(handle, path)` |
| `ARRAY`    | `SORT(array)`, `REVERSE(array)`, `JOIN(array, delimiter)` |
| `STR`      | `FIND`, `LEFT`, `RIGHT`, `MID`, `REPLACE`, `REVERSE` |
| `FS`       | `READ`, `WRITE`, `APPEND`, `DELETE`, `LIST` |

(See `src/interpreter/host-defaults.ts` for the full catalog.)

## Ideas

- Drop a BASIC script into `boot.bas` that spawns matrix rain, status monitors, or overlay animations.
- Use `SYS.SLEEP` inside loops for non-blocking style delays (thanks to async host bridge).
- Combine `HTTP`, `JSON`, and `TERMINAL` to surface live API data in the CRT.
