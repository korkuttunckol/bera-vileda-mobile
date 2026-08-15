# LogoApi IIS — LAN browser CORS (3C-3)

## Diagnosis (BERA side — no code change required)

Safari BERA shows:

> **Logo cari API erişilemedi. Yerel cari verileri korunur.**

That exact string is thrown only when `fetch()` **rejects in the `catch` block** of `logoCustomerApiClient.ts` (network / CORS / blocked response), **not** on HTTP 4xx/5xx or JSON parse errors:

```62:75:src/features/settings/services/logoCustomerApiClient.ts
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    // ...
    throw new LogoCustomerApiError(
      'Logo cari API erişilemedi. Yerel cari verileri korunur.',
```

| Client | Result | Why |
|--------|--------|-----|
| Mac `curl` → `http://192.168.1.11/LogoApi/cariler.ashx` | OK (1431 rows) | curl does **not** enforce CORS |
| Safari BERA `fetch` same URL | fails → message above | Cross-origin (`localhost`/`127.0.0.1` → `192.168.1.11`) without `Access-Control-Allow-Origin` → browser hides body and rejects `fetch` |

HTTP error paths would say `HTTP ${status}`; JSON problems would say `JSON olarak okunamadı` / `dizi formatında`. So this is **not** empty body, not 500, not mapping — it is **browser blocked access**, almost always **CORS**.

### Confirm on Mac (before IIS change)

```bash
curl -sI -H "Origin: http://localhost:5173" \
  -H "Accept: application/json" \
  http://192.168.1.11/LogoApi/cariler.ashx | tr -d '\r'
```

Expect today: **no** `Access-Control-Allow-Origin` header (or missing CORS headers).

Safari Console typically shows something like:

- `Origin http://localhost:5173 is not allowed by Access-Control-Allow-Origin`
- or `Fetch API cannot load ... due to access control checks`
- Network: request may appear “failed” / CORS error even if IIS returned 200

## Fix (IIS only — minimum)

**Do not change** BERA sync/mapper/service. **Do not change** SQL.

1. On Windows Server, open `C:\inetpub\LogoApi\`.
2. If there is **no** `web.config`, copy `deploy/LogoApi/web.config` from this repo.
3. If `web.config` already exists, **merge** only the `<httpProtocol><customHeaders>…</customHeaders></httpProtocol>` CORS entries (and optionally the OPTIONS `<rewrite>` rule if URL Rewrite is installed).
4. Recycle the LogoApi application pool (or save `web.config` to trigger recycle).
5. Re-check:

```bash
curl -sI -H "Origin: http://localhost:5173" \
  -H "Accept: application/json" \
  http://192.168.1.11/LogoApi/cariler.ashx | tr -d '\r'
```

Must include:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

6. Retry BERA → **Logo'dan Cari Verilerini Al**.

### Scope

| Endpoint | Effect |
|----------|--------|
| `cariler.ashx` | Browser GET allowed (CORS headers) |
| `stoklar.ashx` | Same site-level headers — behavior/SQL unchanged |
| SQL / ashx query | Untouched |

### Optional ashx fallback (only if web.config cannot be used)

At the very start of `ProcessRequest` in `cariler.ashx` (and later `stoklar.ashx` if needed):

```csharp
context.Response.AddHeader("Access-Control-Allow-Origin", "*");
context.Response.AddHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
context.Response.AddHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
if (string.Equals(context.Request.HttpMethod, "OPTIONS", StringComparison.OrdinalIgnoreCase))
{
    context.Response.StatusCode = 204;
    context.Response.End();
    return;
}
```

Prefer **site `web.config`** so both endpoints stay consistent without editing query code.

## Out of scope

- NAT / port forward
- BERA Vite proxy
- Changing `logoCustomerSyncService` / mapping
- Firestore push / sales-rep filter UI
