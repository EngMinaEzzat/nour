## 2024-06-25 - Fix SSRF Vulnerability in Facebook Moderator
**Learning:** `new URL(base + "/" + path)` can be manipulated by an attacker who controls `path` to navigate up directories (`../../`) or even switch origins (e.g. `//evil.com` or `http://evil.com`), leading to SSRF if the URL is then passed to `fetch`.
**Action:** Always parse the generated URL and assert that `url.origin` matches the expected base origin and `url.pathname` strictly begins with the expected API base path prefix.
