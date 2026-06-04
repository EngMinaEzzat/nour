🔒 [fix potential XSS in SEO templates]

🎯 **What:** The `renderStorePage`, `renderProductPage`, and `renderCategoryPage` functions were rendering a few properties like `availability`, `ogType`, and `twitterCard` without HTML escaping in string interpolation, which could potentially lead to Cross-Site Scripting (XSS).
⚠️ **Risk:** If a malicious user manages to inject payloads into variables that are interpolated unescaped into HTML structure, they might compromise the public store pages. Even if the current paths or variables like `availability` strings seem hardcoded (`"متاح"` or `"نفذت الكمية"`), failing to systematically escape all dynamic content in templates leaves the door open to severe vulnerabilities when logic evolves.
🛡️ **Solution:** Systematically wrapped all remaining unescaped interpolated string variables in `seo-public.ts` with the robust `esc()` HTML encoding function, strictly adhering to defense-in-depth principles.
