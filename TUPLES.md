## GPT-5

Short version: **yes, integrate `libtuple` as BASIC9000’s universal value layer**. Make tuples the *canonical* encoding for:

- 
the VM constant pool & values,

- 
the **Blocks** RPC wire format,

- 
on-device/headless persistence (keyspace + range scans).

Keep MsgPack/JSON as *adapters* for web APIs, but treat tuples as the truth. That gives you stable ordering, compact binary, zero-copy slices, and location-transparent handles — perfect for headless + embedded + the future C/C++ VM. (And it meshes with BASIC9000’s network-native direction. [GitHub](https://github.com/Foundation42/BASIC9000))

Below is a concrete path that you can implement right away.

# 1) Value model: BASIC9000 ⇄ Tuple atoms

Define a tight mapping so conversion is mechanical and lossless:

BASIC9000Tuple atom`NULL``null``BOOL``bool``NUMBER``int64` if integral-range else `float64``STRING``utf8``ARRAY<ANY>``tuple` (ordered)`TYPE {...}` record`tuple` with field order table (see note)`BYTES` (optional alias)`bytes``UUID`/`TIME` (optional)dedicated atoms if `libtuple` has them; else tagged tuple like `("uuid", bytes16)`
**Records:** store a per-TYPE *field-order vector* once in the constant pool; encode values as a plain tuple in that order. That keeps the wire clean, but your runtime still knows field names.

Provide two helpers:

```ts
// JS side
toTuple(value: B9Value): Tuple
fromTuple(t: Tuple): B9Value

```

And mirrors in C/C++.

# 2) Constant pool & hashing

- 
Emit **constant-pool entries** already encoded as tuple bytes.

- 
Derive **stable content IDs**: `cid = Hash(tuple_bytes)` for de-dup, memoization, and remote code cache.

- 
In the C/C++ VM, keep a small **intern table** keyed by the tuple bytes span (no JSON step).

# 3) Blocks RPC over tuples (location-transparent)

Make **every RPC frame a single top-level tuple**. Length-prefix frames with a varint (or netstring) on stream/transports.

**Call frame**

```
("CALL", block_id, fn_sym, args_tuple, span_id, capability_token?)

```

**Return frame**

```
("RET", ok_bool, value_or_error_tuple, span_id)

```

Notes:

- 
`args_tuple` is literally the positional arguments as a tuple.

- 
`span_id` traces across hops.

- 
`capability_token` is optional and **not** included in cache keys to prevent replay artifacts.

- 
For in-process calls, **bypass encode/decode** and pass pointers to tuple buffers.

You can still expose **MsgPack/JSON** externally by bridging:

```
HTTP/WS client → (JSON/MsgPack) → bridge → (Tuple frames) → VM

```

# 4) Headless daemon & discovery using tuple keys

Use tuples for your on-disk/in-mem keyspace. Example layout:

```
("b9","block", ns, name, ver)              -> registry entry tuple
("b9","prog",  program_id, "bytecode")     -> bytes
("b9","prog",  program_id, "const", idx)   -> tuple bytes
("b9","mbox",  task_id, seq)               -> message tuple
("b9","kv",    namespace, key_tuple)       -> user data
("b9","stats", counter_name)               -> numbers

```

Now you get **prefix/range scans** “for free”:

- 
list all blocks: range over `("b9","block", …)`

- 
drain a mailbox: range over `("b9","mbox", task_id, *)`

- 
enumerate program constants: range over `("b9","prog", pid, "const", *)`

This unlocks *deterministic replay*, time-travel debugging, and cross-device sync later.

# 5) Scheduler mailboxes on tuples

Represent messages as plain tuples:

```
("MSG", to_task, from_task, payload_tuple, ts)

```

Store them in the tuple store (headless) or an in-RAM skiplist (embedded), same schema. Your `SEND/RECV` op just moves tuple spans; no JSON churn.

# 6) BASIC examples (unchanged at call site)

No syntax change for users — they benefit from the reliability.

```basic
LET midi = USE "co/pilot/midi:1.0"
midi.NOTE_ON(0, 60, 127)   ' → ("CALL", "co/pilot/midi:1.0", "NOTE_ON", (0,60,127), span, cap)

```

# 7) Interop shims (keep them tiny)

- 
**toJSON(tuple)** and **fromJSON(json)** for debug logs and web demos.

- 
**toMsgPack(tuple)** and **fromMsgPack(buffer)** if you want a drop-in MsgPack path for third-party clients.

- 
Put them **behind the daemon**; your core VM only knows tuples.

# 8) C/C++ VM integration notes

- 
Treat tuple buffers as **immutable spans** (`const uint8_t* p, size_t n`).

- 
Parsing: expose a **cursor API** (peek tag, read value, descend into nested tuple) that does not allocate.

- 
Construction: use a **TupleBuilder** with a small fixed scratch (stack) + optional arena for larger aggregates.

- 
Records: hand the VM a view that points straight into tuple fields; only copy when mutating.

- 
Range scans: on embedded, back with a light B-tree/LSM or in-RAM ordered map; on desktop, use LevelDB/RocksDB or your own file.

# 9) Caching & idempotency (a free win)

Because calls and args are tuples, introduce optional **result cache keys**:

```
cache_key = ("ret-cache", block_id, fn_sym, args_tuple_hash)

```

Great for pure/read-mostly RPCs (e.g., HTTP GET wrappers), and perfect for intermittent networks.

# 10) Minimal Node headless sketch (bridge)

```ts
// pseudo-code
ws.on("message", (frameBytes) => {
  const call = Tuple.decode(frameBytes)    // ["CALL", id, fn, args, span, cap]
  const [_, id, fn, args, span, cap] = call

  const impl = registry.resolve(id)
  impl.invoke(fn, args)                    // args is already a tuple view
    .then(value => ws.send(Tuple.encode(["RET", true, value, span])))
    .catch(err  => ws.send(Tuple.encode(["RET", false, toTupleError(err), span])))
})

```

# 11) Migration plan (incremental, low risk)

1. 
**Define `b9_tuple.ts`** in the JS VM: value↔tuple mapping, plus tests.

2. 
**Constant pool**: begin emitting tuple-encoded constants + hashing.

3. 
**Blocks RPC**: add a tuple transport to the headless daemon (keep JSON path for now).

4. 
**Mailboxes**: switch message payloads to tuples internally.

5. 
**C/C++ VM**: start with a read-only tuple parser + constant-pool loader; then add a builder.

6. 
**Persistence**: wrap your tuple store (or Rocks/LevelDB) to expose the keyspace layout above.

# 12) Guardrails & compat

- 
**Version the frame** if you wish: `("B9v1", "CALL", ...)` to allow future evolution.

- 
**Security**: capability tokens travel in a separate field and are not part of cache keys.

- 
**Diagnostics**: add `DEBUG.TUPLE(value)` in BASIC to pretty-print tuples for devs.

- 
**Feature flags**: gate tuple transport behind `--transport=tuple|json` during rollout.

### What you’ll get

- 
One compact, ordered, binary representation across **VM ↔ RPC ↔ storage**.

- 
Zero-copy slices and deterministic hashing.

- 
Clean C/C++ portability with no JSON baggage.

- 
Range scans and location transparency that feel designed-in, not bolted on.





# TUPLE.md — BASIC9000 Tuple Wire & Storage Spec (v0.1)

**Status:** Draft addendum to Language Spec v0.1
**Scope:** Canonical binary value format, RPC frames, persistence keyspace, and interop.
**Applies to:** JS/TS VM, C/C++ VM, Headless Daemon.

---

## 0. Rationale (tl;dr)

* **One format everywhere:** constants, runtime values, RPC frames, and storage all use **Tuples**.
* **Deterministic & compact:** ordered, binary, stable hashing, zero‑copy slices.
* **Adaptors at the edge:** JSON/MsgPack only for external APIs.

---

## 1. Data Model Mapping

| BASIC9000         | Tuple Atom           | Notes                                                |
| ----------------- | -------------------- | ---------------------------------------------------- |
| `NULL`            | `null`               | singletons are canonical                             |
| `BOOL`            | `bool`               | `true`/`false`                                       |
| `NUMBER`          | `int64` or `float64` | choose `int64` if exact and in range, else `float64` |
| `STRING`          | `utf8`               | immutable                                            |
| `BYTES` (alias)   | `bytes`              | opaque                                               |
| `ARRAY<ANY>`      | `tuple`              | ordered, heterogeneous                               |
| `RECORD (TYPE)`   | `tuple`              | encoded by field order (see 1.1)                     |
| `TIME` (optional) | `int64`              | epoch ms or tagged tuple `("time", int64)`           |
| `UUID` (optional) | `bytes16`            | or tagged tuple `("uuid", bytes16)`                  |

### 1.1 RECORD encoding

* Each `TYPE` definition gets a **Field Order Vector (FOV)** in the constant pool, e.g. `Vector → ["x","y"]`.
* A `Vector { x:3, y:4 }` value encodes as the tuple `(3,4)`.
* Decoding consults the FOV to reattach field names; mutation respects field positions.
* Records of different `TYPE`s **do not unify** even if shapes match (nominal typing), but tools may offer optional structural checks.

### 1.2 ANY

* `ANY` values retain their tuple encoding as‑is. Tooling may include a light type tag `("type","name")` for debug only; the VM ignores it.

---

## 2. Constant Pool

* Pool entries are stored **already encoded** as tuple bytes.
* **Content ID (CID)**: `cid = HASH(tuple_bytes)` (e.g., Blake3). Used for de‑dup and remote code cache.
* String and FOV tables live in the pool as ordinary tuples.

---

## 3. RPC Framing (Blocks)

All RPC messages are **single top‑level tuples**. On stream transports, frames are **varint length‑prefixed** (or netstring). On datagrams, one frame per packet.

### 3.1 Frames

```
("B9v1","CALL", block_id: utf8, fn: utf8, args: tuple, span: bytes8, cap?: bytes)
("B9v1","RET",  ok: bool, value_or_error: tuple, span: bytes8)
("B9v1","PING", ts: int64)
("B9v1","PONG", ts: int64)
```

* `span` traces a logical call across hops; 8 bytes is enough for local tracing; can be extended later.
* `cap` (capability) is optional and **never** included in cache keys.
* `value_or_error` encodes `ERROR` as a tuple `("err", code:int, message:utf8, data?:tuple)`.

### 3.2 Semantics

* **Idempotency hint:** If `(block_id, fn, args)` is pure, responders **may** cache by `("ret-cache", block_id, fn, HASH(args))`.
* **Backpressure:** Receivers may reply with `("err", E_BUSY, ... )`; callers retry with exponential backoff.

---

## 4. Storage Keyspace (Headless/Embedded)

Use tuples as keys; values are tuple bytes (or raw bytes for bytecode). Example layout:

```
("b9","block", ns, name, ver)                 -> registry entry tuple
("b9","prog",  prog_id, "bytecode")            -> bytes
("b9","prog",  prog_id, "const", idx)          -> tuple bytes
("b9","mail",  task_id, seq)                    -> message tuple
("b9","task",  task_id, "meta")                -> tuple (state, created_ms, parent?)
("b9","kv",    namespace, key_tuple)            -> tuple (user data)
("b9","metrics", name)                          -> number
("b9","trace", span, seq)                       -> tuple (event)
```

**Range scans:**

* List blocks: prefix scan `("b9","block", …)`
* Drain mailbox: prefix `("b9","mail", task_id, *)`
* Enumerate constants: prefix `("b9","prog", pid, "const", *)`

---

## 5. Scheduler & Mailboxes

Messages are tuples written to the store (headless) or in‑RAM queues (embedded):

```
("MSG", to:bytes8, from:bytes8, payload:tuple, ts:int64)
```

Embedded builds may keep an in‑RAM ring; persistence is optional.

---

## 6. Interop Bridges

* **JSON bridge:** `toJSON(tuple)`, `fromJSON(json)`; debug‑friendly pretty printer.
* **MsgPack bridge (optional):** `toMsgPack(tuple)`, `fromMsgPack(buf)` for external clients.
* **HTTP/WS daemon:** accepts JSON or MsgPack at the edge and converts to tuple frames for the VM.

---

## 7. C/C++ Integration

### 7.1 Read API (zero‑alloc cursor)

```c
typedef struct { const uint8_t* p; size_t n; } b9_span;

typedef struct b9_tcursor b9_tcursor;  // opaque

b9_tcursor* b9_topen(b9_span bytes);     // parse header; returns cursor
void        b9_tclose(b9_tcursor*);
int         b9_tpeek(b9_tcursor*, int* tag);          // look at next atom
int         b9_tbool(b9_tcursor*, bool* out);
int         b9_tint(b9_tcursor*, int64_t* out);
int         b9_tfloat(b9_tcursor*, double* out);
int         b9_tstr(b9_tcursor*, b9_span* out);
int         b9_tbytes(b9_tcursor*, b9_span* out);
int         b9_tenter(b9_tcursor*, size_t* arity);    // enter tuple; returns element count
int         b9_tnext(b9_tcursor*);                    // advance within current tuple
int         b9_texit(b9_tcursor*);                    // leave tuple
```

All functions return 0 on success, non‑zero error code on malformed data.

### 7.2 Build API (single‑pass builder)

```c
typedef struct b9_tbld b9_tbld;

b9_tbld* b9_tb_new(void* scratch, size_t scratch_len);   // uses caller‑provided buffer
int      b9_tb_begin_tuple(b9_tbld*, size_t arity);
int      b9_tb_bool(b9_tbld*, bool v);
int      b9_tb_int(b9_tbld*, int64_t v);
int      b9_tb_float(b9_tbld*, double v);
int      b9_tb_str(b9_tbld*, const char* s, size_t n);
int      b9_tb_bytes(b9_tbld*, const void* p, size_t n);
int      b9_tb_end_tuple(b9_tbld*);
int      b9_tb_finish(b9_tbld*, b9_span* out);           // returns finalized span
```

The builder never allocates; it writes into the provided scratch/arena.

### 7.3 Value adapters

Expose `b9_to_tuple(b9_value v, b9_tbld* tb)` and `b9_from_tuple(b9_tcursor*, b9_value* out)`; both are pure and reentrant.

---

## 8. Security & Capability Handling

* Capability tokens (`cap`) live **outside** args for cache safety.
* Enforce **policy** in the daemon before dispatch.
* Consider signing frames for untrusted networks: `("B9v1","CALL-SIG", ..., sig:bytes)` where `sig = Sign(priv, HASH(frame_without_sig))`.

---

## 9. Versioning

* Frame header `"B9v1"` guards future changes.
* Tuple tags must remain stable; if atom set expands, bump to `B9v2` or require feature negotiation via a tuple capability: `("HELLO", features:tuple)`.

---

## 10. Testing (goldens & fuzz)

* **Goldens:** For each spec example, include tuple hex dumps and reparse checks.
* **Round‑trip:** `fromTuple(toTuple(value)) == value` for core types.
* **Differential:** JS VM vs C/C++ VM produce identical tuple frames for the same program and inputs.
* **Corpus:** Seed fuzzer with small nested tuples, long strings, and boundary integers (±2^31, ±2^53).

---

## 11. Examples

### 11.1 CALL/RET

* CALL: `("B9v1","CALL","co/pilot/midi:1.0","NOTE_ON", (0,60,127), 0x0102030405060708, <cap>)`
* RET (ok): `("B9v1","RET", true, ("ok"), 0x0102030405060708)`
* RET (error): `("B9v1","RET", false, ("err", 12, "No port", ("want",0)), 0x...)`

### 11.2 Keyspace

* Block reg: `("b9","block","co","pilot","midi","1.0") → ("ws","wss://host/midi")`
* Program const: `("b9","prog", 0xA1B2, "const", 7) → ("hello")`
* Mailbox: `("b9","mail", 0xDEADBEAF, 42) → ("MSG", tidA, tidB, ("go"), 1726400000000)`

---

## 12. Migration Plan

1. Implement JS `toTuple/fromTuple` + tests.
2. Emit tuple‑encoded constant pool + CIDs.
3. Add tuple transport to headless (keep JSON for now).
4. Switch mailboxes to tuples.
5. Add C++ tuple reader; load constant pool directly.
6. Migrate persistence to tuple keyspace.

---

*End of TUPLE.md v0.1*
