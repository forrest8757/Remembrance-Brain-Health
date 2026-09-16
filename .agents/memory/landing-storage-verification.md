---
name: Landing storage verification
description: Distinguish platform preview storage from application storage checks
---

When checking the marketing page's no-browser-storage requirement, distinguish application calls from preview tooling.

**Why:** A fresh-context browser test observed a Replit dev-banner storage read even though the landing route did not mount the demo storage provider. Treating every injected read as application behavior creates a false failure.

**How to apply:** Inspect call provenance and keys; assert that landing interactions do not access application storage. Do not remove the product demo's separate persistence to address an injected preview read.