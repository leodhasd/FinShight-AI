# FinSight AI — AI Coach Premium UI Enhancement (Phase 6)

## Scope
- Premium AI Coach header
- Improved suggestion chips
- Full-width premium chat composer
- Larger auto-growing textarea
- Send button inside the composer
- Better message bubbles
- Typing indicator animation
- Smooth UI animations
- Responsive layout
- Light/Dark mode support

## Status
- [x] Inspect existing AI Coach component + related CSS
- [x] Verify existing premium UI foundation (composer, chips, typing indicator, animations)
- [x] Confirm light/dark theme setup (CSS variables + `.light` overrides)
- [x] Confirm baseline build passes

## Implementation Steps
- [ ] Make inline markdown renderer theme-aware (headings, bold, italic, code)
- [ ] Replace dark-only skeleton / header / trash-button / kbd / error / status classes with theme-aware CSS classes
- [ ] Upgrade suggestion chips with accent sparkle dot + polish
- [ ] Enlarge auto-growing textarea (min/max height) for premium composer
- [ ] Refine message bubbles + typing indicator polish
- [ ] Add new theme-aware utility classes to `index.css` (dark + light)
- [ ] Verify production build passes
- [ ] Fix only compile/UI errors if any
- [ ] Stop and report

## Verification
- [ ] `npm run build` succeeds in `frontend/`

