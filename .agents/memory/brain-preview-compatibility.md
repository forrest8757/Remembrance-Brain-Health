---
name: Brain preview compatibility
description: WebGL limitations in preview verification and uploaded-model semantics
---

Keep a genuine rendered still of the uploaded model available when interactive WebGL cannot start.

**Why:** Both screenshot and testing browsers returned no WebGL/WebGL2 context, even when software rendering was requested. The GLB was reachable; an error-only fallback left the hero visually empty.

**How to apply:** Distinguish asset/network errors from missing graphics support. Verify the still fallback in preview, and do not claim live GPU rendering or drag behavior was browser-tested when only the fallback was visible.