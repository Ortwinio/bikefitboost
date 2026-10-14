# W1 settings visual review

Build: `9O6KBlF3eDI7MQEGJ8vIg`.
Guard source hash: `760dbd7c777e6c71489ec7fd7df57fc7748a5614b25ed8de9227ded2e8b3f98a`.
Command: `scripts/usability-check.mjs --local --scope=U3 --filter=settings --automated-only`.

All 12 settings cases pass automated checks: NL/EN, 390/1440, free/enforced, flag-off and paid fixtures. Build provenance is valid. No failed automated checks or serious/critical axe violations. The existing mobile sidebar has a moderate region-landmark finding; its screen-reader profile link is outside a landmark.

I opened and reviewed all 18 screenshots at original resolution, including the six mobile menu states. The final build regenerated the same 18 byte-identical image hashes listed below, so the observations apply to the final evidence.

- Rule 12: pass for this changed surface. The preference is inline and adds no overlay, urgency, paid obstruction or navigation interference.
- Rule 14: pass for this changed surface. NL/EN text describes read/navigation access and the rider's switch; no promises of autonomous writes or invented performance claims.
- Rule 15: pass for visible settings layout together with automated target/contrast checks. The labeled switch and permanent explanation remain legible, with no clipping at either width. Mobile menu navigation/close controls remain visible. This is not a separate keyboard-focus screenshot review.
- Rules 5 and 9: automated pass. Other rules are not applicable to these settings cases.

This is a scoped manual review, not a whole-U3 release approval. The filtered runner intentionally leaves scopePassed/releasePassed false and manualOutstanding true; its full-scope finalizer rejects filtered reports. No stale evidence or fabricated whole-scope approval was supplied.

Account pages use deterministic auth/Convex fixtures and real components/styles; they do not prove production authentication or persistence. Native Next navigation is covered separately on the public browser check, not by these account fixture screenshots.

## Evidence hashes

| Screenshot | SHA-256 |
|---|---|
| settings-nl-390.png | 7a5502a65d3b2d7191fcd1b41bcc040e3b0688e63799fe3e082f2b477ca35a87 |
| settings-nl-390-menu-open.png | 7e0a3d7f9169896fe929a057b1ecc5c92d61040723dde920a8cd7d6881f2f864 |
| settings-nl-1440.png | 8302aa26d0bf91ee7016314d6002d854b97a5f256d9e5d31041e806b754387a0 |
| settings-en-390.png | 89df7176bd4cd74f95e930b8550240871bb347b4338063c10da7c925c32f8bde |
| settings-en-390-menu-open.png | 269f426d587c1970146bf9218fc50ca039f8a9606325d9a92866225146978cd6 |
| settings-en-1440.png | 3f0db8836956d7ea2f680a154671bf59da3eda770bc9c42b197ab105b6d500cb |
| settings-flag-off-nl-390.png | a9a35a869554c7bea915279495a0e48156134a7be3956d4db99b7d833c4a1bff |
| settings-flag-off-nl-390-menu-open.png | 42e32df1533ba89b914346571cfe79a40014a046af8d36bb97ef6947d03734f7 |
| settings-flag-off-nl-1440.png | 3997bc6a733516543f44de76c0c4ed1d61ebbe46cf87cb86eea0dd60945fc66e |
| settings-flag-off-en-390.png | 16e25570afc112f90a7d8dd8e892215df0899989a4d6f86371a395d86d3398ac |
| settings-flag-off-en-390-menu-open.png | 3f6b591d98734d0fcc0a34721337d7fe0e6e7ff32645c5b46a3d7fa855293620 |
| settings-flag-off-en-1440.png | 3dd59544377539275b6524fb7c2fb2fa8f1a00f374022d26dafd9085d34c6a61 |
| settings-paid-nl-390.png | fb4d7441da54dec7c3897f18a11ab10a03144c1508102b57bdfb5c0eeddd4057 |
| settings-paid-nl-390-menu-open.png | 5b5e9ebb09e3557bbe95e659b67053a26181fdeb980e8cc76779693833d6a47d |
| settings-paid-nl-1440.png | 8aed88b1606b46ed00a28ecae54159de22dc54f1499285398b3c5cd2e79b52a8 |
| settings-paid-en-390.png | f07d40e88090a66a480cf2e4763a5357abd065b4c1630738aeb80a5269f3bffc |
| settings-paid-en-390-menu-open.png | 9116c4c6c00595a8e92ecfc23d35a1a115ae063442cf754723703e0d1b6f6bcd |
| settings-paid-en-1440.png | 76c08dddb00cc30f707b42db1b88b099bfd5cb10e20baea9e22aba147d5bf778 |
