# Hatch — OTTOZEROUNO Restyling Report

Single-pass restyling, phases 1–7. **No git add / no git commit performed.** All
changes live in the working tree; inspect with `git diff` and discard with
`git restore <path>` selectively.

---

## TL;DR

- Tutta la palette amber/cream è stata sostituita da quella OTTOZEROUNO (Deep Teal / Wispy Clouds / Sea Green / Bluejay / Aruba Blue / Fair Aqua / Jojoba / Celandine).
- Tipografia migrata da Inter+Lora a **DM Sans** (caricata via `next/font/google`).
- Token semantici (`--color-primary`, `--color-foreground`, ecc.) sono ora la sola interfaccia per i componenti — niente più hex/rgba hardcoded nel codice applicativo.
- Componenti base (Button, Badge, Toast, Tooltip) ridisegnati; aggiunti **Card** e **Input** come primitive nuove.
- Decorazioni brand (line art + stacked shapes) applicate a 5 punti curati.
- Contrasto WCAG: corretta un'incoerenza tra BRAND.md §5 e WCAG AA (vedi sotto).

---

## File creati

| File | Scopo |
|---|---|
| [components/ui/card.tsx](components/ui/card.tsx) | Primitiva Card con varianti `default`, `large`, `feature` (single-corner rounded), `dark`, `muted`. Sub-componenti `CardHeader`/`Title`/`Description`/`Content`/`Footer`. Non rifattorizzati i pattern esistenti — rimane per uso futuro. |
| [components/ui/input.tsx](components/ui/input.tsx) | Primitive `Input`, `Textarea`, `Label` con focus ring Sea Green. Non rifattorizzati i pattern esistenti. |
| [BRAND.md](BRAND.md) | Copiato nel worktree (era nella repo root). |
| [RESTYLING_REPORT.md](RESTYLING_REPORT.md) | Questo file. |

---

## File modificati (categorie)

### Tokens & layout principale (intervento mirato)

- [app/globals.css](app/globals.css) — Riscritto completamente: `@theme` con palette OTTOZEROUNO + token semantici + radius brand + caption utilities. Body, h1–h4, p ora usano DM Sans con la type scale del brand. Alias temporanei aggiunti in Fase 1 e **rimossi a fine Fase 4** dopo sostituzione globale.
- [app/layout.tsx](app/layout.tsx) — Sostituito `<link>` Google Fonts con `next/font/google` per DM Sans. Rimossi inline styles dal `<body>`.
- [components/TopNav.tsx](components/TopNav.tsx) — Riscritto completamente: gli inline `style={{...}}` (logo, nav links, LangToggle, avatar, progress bar) sono ora classi Tailwind con token semantici.
- [components/Sidebar.tsx](components/Sidebar.tsx) — Stessa bonifica: niente più inline styles, hover/active gestiti da classi, dot colors via token.
- [components/BackButton.tsx](components/BackButton.tsx) — Convertito a classi, hover Sea Green.

### Componenti UI base

- [components/ui/button.tsx](components/ui/button.tsx) — Variants rinominate `default|outline|ghost|destructive|amber` → `primary|secondary|ghost|soft|dark|destructive`. Sizes con `rounded-full` (pill, da BRAND.md §5). Focus ring Sea Green. **Nessun call site esistente**, quindi rename diretto senza alias (regola "≤5 call site" → rename).
- [components/ui/badge.tsx](components/ui/badge.tsx) — Variants ridefinite: `default|primary|info|accent|warning|warm|outline|destructive`. **Nessun call site esistente** (il Badge usato nel VPC dashboard è una funzione locale, non importa questo file).
- [components/ui/toast.tsx](components/ui/toast.tsx) — Colori convertiti a token semantici, icona success in Sea Green.
- [components/ui/tooltip.tsx](components/ui/tooltip.tsx) — Sfondo Deep Teal via `--color-surface-dark`.

### Pagine auth

- [app/login/page.tsx](app/login/page.tsx) — Restyle completo: rimossi tutti gli inline styles, aggiunti decorazioni (line-art md+ + stacked shapes mobile), card con single-corner rounded su desktop, CTA rounded-full Sea Green.
- [app/register/page.tsx](app/register/page.tsx) — Idem (decorazioni speculari: line-art bottom-left, stacked shapes top-right).

### Sweep automatico — hardcoded → token

Tutti gli altri file sotto `app/` (eccetto api/route.ts che hanno solo modifiche cosmetiche di trailing-comma) sono stati attraversati da un sostitutore programmatico che:

1. Ha rimosso ogni `fontFamily: "'Lora', Georgia, serif"` inline (~30 file). Il body usa DM Sans via inheritance; gli h-tag globali sono già DM Sans bold.
2. Ha sostituito alias temporanei con token semantici:
   - `var(--color-amber)` → `var(--color-primary)`
   - `var(--color-amber-hover)` → `var(--color-primary-hover)`
   - `var(--color-amber-light)` → `var(--color-accent)`
   - `var(--color-amber-bg)` → `color-mix(in srgb, var(--color-primary) 10%, transparent)`
   - `var(--color-cream)` → `var(--color-background)`
   - `var(--color-ink)` → `var(--color-foreground)`
   - `var(--color-sage)` → `var(--color-primary)`
   - `var(--color-sage-bg)` → `color-mix(in srgb, var(--color-primary) 10%, transparent)`
   - `var(--color-warm-gray)` → `var(--color-warm)`
   - `var(--color-linen)` → `var(--color-muted)`
   - `var(--color-text-main)` → `var(--color-foreground)`
   - `var(--color-text-muted)` → `var(--color-foreground-muted)`
   - `var(--color-text-faint)` → `var(--color-foreground-faint)`
3. Ha sostituito hex hardcoded con i corrispondenti token (`#C77B3A` → `var(--color-primary)`, `#1A1A18` → `var(--color-foreground)`, `#FAFAF8` → `var(--color-background)`, ecc.).
4. Ha rimappato `rgba(199,123,58,…)` (amber) → `rgba(19,163,137,…)` (sea green), e analogamente per ex-sage e ex-amber-light.
5. Per accessibilità, ha sostituito `color: '#FFFFFF'` con `color: 'var(--color-primary-foreground)'` **solo quando appaiata nello stesso oggetto a `backgroundColor: 'var(--color-primary)'`** (sweep contestuale ±6 righe).

A fine sweep: `grep` di alias e hex vecchi → 0 occorrenze.

### Decorazioni applicate (Fase 5)

| File | Decorazione | Note |
|---|---|---|
| [app/login/page.tsx](app/login/page.tsx) | Line-art Deep Teal in alto-destra (md+) + stacked shapes Bluejay/Aruba bottom-left (mobile-visible). Card con `--radius-corner-one-lg` su md+. | Mai dietro testo critico. |
| [app/register/page.tsx](app/register/page.tsx) | Line-art Sea Green in basso-sinistra (md+) + stacked shapes Sea Green/Aruba top-right (mobile-visible). | Speculare al login per coerenza. |
| [app/dashboard/DashboardClient.tsx](app/dashboard/DashboardClient.tsx) | Line-art Deep Teal (md+) sul lato destro dietro la whitespace dell'header. | Posizionata oltre la grid card. |
| [app/project/[id]/onboarding/page.tsx](app/project/[id]/onboarding/page.tsx) | Line-art Sea Green sul lato sinistro (md+) + stacked shapes Bluejay/Aruba in alto-destra (mobile). | Lo screen di entry-path: brand moment forte. |
| [app/project/[id]/idea/page.tsx](app/project/[id]/idea/page.tsx) | Solo stacked shapes Sea Green/Aruba in alto-destra (mobile-visible). | Decorazione lieve, lo schermo è già denso di form. |

Restanti project pages (abilities, opportunities, evaluations, map, strategy, VPC, BMC, ecc.) **non hanno** decorazioni aggiuntive. La motivazione: sono schermate workflow ad alta densità di contenuto e BRAND.md §6 raccomanda "Decorative elements live in section corners or edges, never centered behind text."

### Icone (Fase 6)

Audit completato: tutti gli import di icone provengono da `lucide-react` (line-style, stroke 2px). Nessuna libreria filled, nessun emoji-as-icon, nessun `<svg fill="currentColor">` decorativo. **Nessun cambio necessario.**

### File con modifiche cosmetiche residue

`app/api/*/route.ts`, `lib/i18n/{en,it}.ts`, `lib/i18n/context.tsx`, `lib/types.ts`, `lib/supabase/server.ts`: queste hanno diff *molto piccoli* derivanti dalla normalizzazione di trailing-comma `, }` → ` }` fatta in Fase 2 (effetto collaterale della pulizia dei `fontFamily` inline). Nessun cambiamento funzionale. Si possono scartare con `git checkout` se la presentazione del diff è prioritaria.

---

## Decisioni prese sui punti ambigui

### Variant rinominate vs. aliasate

- **Button** (`components/ui/button.tsx`): variants vecchie (`default|outline|ghost|destructive|amber`) avevano **0 call site** nel resto dell'app. Per la regola "≤5 call site → rename diretto" ho rinominato a nomi semantici (`primary|secondary|ghost|soft|dark|destructive`) **senza** alias. Documentato in cima al file.
- **Badge** (`components/ui/badge.tsx`): variants vecchie (`default|outline|sage|linen|destructive`) avevano **0 call site** sul Badge importato (il VPC dashboard usa un Badge locale, non questo). Rinominate direttamente a `default|primary|info|accent|warning|warm|outline|destructive`. Documentato.

### Card e Input nuovi — rifattorizzazione opportunistica

Come da istruzioni, **non** ho rifattorizzato i pattern di card/input fatti a mano nelle pagine esistenti. Aggiunti come primitive in `components/ui/` per uso futuro. Le sole pagine dove ho usato direttamente la stessa estetica (input rounded + focus Sea Green) sono `login/page.tsx` e `register/page.tsx`, riscritte da capo perché erano i punti di entry più visibili.

### Contrasto WCAG — deviazione consapevole da BRAND.md §5

**Problema rilevato durante l'implementazione:**

| Combinazione | Contrast ratio | Verdetto |
|---|---|---|
| Wispy Clouds `#F2F2F2` su Sea Green `#13A389` (BRAND.md §5 primary CTA) | **2.67:1** | ❌ Fallisce AA normale (4.5:1), AA Large (3:1) e SC 1.4.11 (3:1 graphic) |
| Deep Teal `#183C40` su Sea Green `#13A389` | **3.87:1** | ✅ Passa AA Large e SC 1.4.11 |
| Bluejay `#138BA3` come testo su sfondi chiari | **3.52:1** | ❌ Fallisce AA normale |

**Decisione (documentata anche in [app/globals.css:24-27](app/globals.css)):** 
- `--color-primary-foreground` → **Deep Teal** invece di Wispy Clouds (deviazione da BRAND.md §5).
- `--color-secondary-foreground` → **Deep Teal** invece di Wispy Clouds.
- Badge `info` variant: testo Deep Teal invece di Bluejay sull'aqua tint.

**Trade-off:** i CTA primari hanno testo verde scuro su verde acqua invece del bianco-su-verde prescritto dal brand. La leggibilità è migliore (3.87:1 vs 2.67:1) ma il contrasto reale rimane sotto la soglia AA normale (4.5:1). Per piena conformità AA su testo body 14px su Sea Green servirebbe un colore con luminanza ≤ 0.156 — nessuna tinta della palette OTTOZEROUNO lo soddisfa senza scurire Sea Green oltre lo spec.

**Mitigazioni applicate:**
- Button labels in `font-medium` su pulsante rounded-full (componente UI → soglia SC 1.4.11 = 3:1).
- Badge `primary` variant: testo Deep Teal (con bold) → 3.87:1.

**Raccomandazione per review umana:** valutare se introdurre una variante `--color-primary-strong` (es. `#0F7A66`, luminanza 0.155 → contrast 4.51:1 con Wispy Clouds) come override accessibile per i contesti pulsante. Non l'ho fatto autonomamente perché aggiunge un colore non presente nel manuale.

### Cosa NON ho toccato

- **Logica di business, handler, supabase calls, routing:** intatti.
- **Markup strutturale:** intatto (eccetto wrapping di alcune sezioni in `<div className="relative">` per posizionare decorazioni assolute).
- **Logo Hatch (`/public/hatch_logo.svg`):** non modificato. BRAND.md §3 dice "Decide upfront whether Hatch uses its own logo... Do not invent a logo without instruction."
- **`REDESIGN_PLAN.md`** (root, struttura nav/dati): non toccato, riguarda un altro tipo di refactor.
- **`framer-motion` animazioni:** intatte.
- **Componenti locali (Badge dentro VPCDashboardClient, ecc.):** ereditano i nuovi token tramite `var(--color-*)` ma non sono stati rinominati.

---

## Cosa merita review umana

1. **Contrasto su CTA primari (vedi sopra).** È la decisione più carica dal punto di vista del brand. Se accettabile darsi 3.87:1 invece di AA strict 4.5:1 per i pulsanti, lo stato attuale va bene. Altrimenti pianificare un colore `primary-strong`.

2. **`--color-primary-foreground = Deep Teal`** propaga ovunque ci sia testo su sfondo Sea Green: pulsanti Dashboard, pulsanti login/register, EN/IT toggle attivo, badge `primary`, twin avatar slot 2. Verifica visiva consigliata su:
   - [app/dashboard/DashboardClient.tsx](app/dashboard/DashboardClient.tsx) (CTA "Nuovo progetto")
   - [components/TopNav.tsx](components/TopNav.tsx) (toggle EN/IT)
   - [app/login/page.tsx](app/login/page.tsx), [app/register/page.tsx](app/register/page.tsx)

3. **Aggiornamento massivo di `rgba(199,123,58,…)` → `rgba(19,163,137,…)`** in inline styles delle pagine `app/project/[id]/**`. Funzionalmente innocuo (sono solo box-shadow/ring colors) ma vale la pena uno smoke test visuale sulle pagine opportunity/twins/report.

4. **Type scale aggressiva.** Il body è 14px Medium come prescritto dal brand: alcuni pattern del codebase usavano 13–15px arbitrari (inline). Quei tag stanno ereditando i nuovi default solo dove non hanno un `fontSize` inline che li sovrascrive. Pagine con form/labels potrebbero apparire un filo più piccole o più grandi: valutare in browser.

5. **Pulizia trailing-comma** (api/route.ts, lib/i18n/*.ts). Cosmetica, harmless. Restorable con `git checkout -- app/api lib/i18n lib/types.ts lib/constants.ts` se infastidisce — anche se per `lib/constants.ts` perderebbe gli aggiornamenti palette voluti.

6. **`framer-motion` v12 + React 19.** Niente cambi qui, ma se le animazioni si comportano stranamente con DM Sans (rare problemi di altezza linea), aprire un task separato.

7. **Decorazioni stacked shapes:** ho usato `translate-x-2 translate-y-2` ovunque. Su mobile <360px potrebbe esserci leggera sovrapposizione con i bordi dei card. Verifica su viewport stretto.

8. **`POTENTIAL_BADGE` e `CHALLENGE_BADGE`** in `lib/constants.ts`: ho dovuto rimappare livelli low→high a sfumature crescenti di Sea Green (vs. l'originale che mescolava giallo/arancio). Per `CHALLENGE_BADGE` ho usato `warning`/`warm`/red per coerenza semantica. Le badge variantate si vedono in OpportunitiesClient / MapClient — valutare se le sfumature sono distinguibili a colpo d'occhio.

---

## git status (74 entry)

```
$ git status --short
 M app/api/aggregate-vpcs/route.ts
 M app/api/chat/route.ts
 M app/api/extract-abilities/route.ts
 M app/api/extract-dimensions/route.ts
 M app/api/extract-opportunities/route.ts
 M app/api/extract-vpc-customer-profile/route.ts
 M app/api/generate-bmc-block/route.ts
 M app/api/generate-report/route.ts
 M app/api/generate-twin-report/route.ts
 M app/api/generate-twins/route.ts
 M app/api/generate-vpc-synthetic-twin/route.ts
 M app/api/generate-vpc-value-map/route.ts
 M app/api/suggest-segments/route.ts
 M app/api/twin-chat/route.ts
 M app/dashboard/DashboardClient.tsx
 M app/dashboard/page.tsx
 M app/globals.css
 M app/layout.tsx
 M app/login/page.tsx
 M app/project/[id]/abilities/AbilitiesClient.tsx
 M app/project/[id]/bmcs/[bmc_id]/page.tsx
 M app/project/[id]/bmcs/new/NewBMCClient.tsx
 M app/project/[id]/bmcs/new/page.tsx
 M app/project/[id]/evaluations/EvaluationsClient.tsx
 M app/project/[id]/evaluations/page.tsx
 M app/project/[id]/idea/page.tsx
 M app/project/[id]/import-bmc/page.tsx
 M app/project/[id]/import-vpc/page.tsx
 M app/project/[id]/map/MapClient.tsx
 M app/project/[id]/map/page.tsx
 M app/project/[id]/onboarding/page.tsx
 M app/project/[id]/opportunities/OpportunitiesClient.tsx
 M app/project/[id]/opportunity/[opp_id]/bmc/BMCClient.tsx
 M app/project/[id]/opportunity/[opp_id]/bmc/page.tsx
 M app/project/[id]/opportunity/[opp_id]/context/ContextClient.tsx
 M app/project/[id]/opportunity/[opp_id]/context/page.tsx
 M app/project/[id]/opportunity/[opp_id]/report/ReportClient.tsx
 M app/project/[id]/opportunity/[opp_id]/report/page.tsx
 M app/project/[id]/opportunity/[opp_id]/twins/interview/InterviewClient.tsx
 M app/project/[id]/opportunity/[opp_id]/twins/interview/page.tsx
 M app/project/[id]/opportunity/[opp_id]/twins/results/ResultsClient.tsx
 M app/project/[id]/opportunity/[opp_id]/twins/results/page.tsx
 M app/project/[id]/opportunity/[opp_id]/twins/setup/TwinSetupClient.tsx
 M app/project/[id]/opportunity/[opp_id]/twins/setup/page.tsx
 M app/project/[id]/opportunity/[opp_id]/vpc/VPCClient.tsx
 M app/project/[id]/opportunity/[opp_id]/vpc/page.tsx
 M app/project/[id]/start-bmc/page.tsx
 M app/project/[id]/start-vpc/page.tsx
 M app/project/[id]/strategy/StrategyClient.tsx
 M app/project/[id]/strategy/WhereToPlayCompletion.tsx
 M app/project/[id]/strategy/page.tsx
 M app/project/[id]/vpcs/VPCDashboardClient.tsx
 M app/project/[id]/vpcs/[vpc_id]/VPCDetailClient.tsx
 M app/project/[id]/vpcs/[vpc_id]/page.tsx
 M app/project/[id]/vpcs/new/NewVPCClient.tsx
 M app/project/[id]/vpcs/new/page.tsx
 M app/project/[id]/vpcs/page.tsx
 M app/register/page.tsx
 M components/BackButton.tsx
 M components/Sidebar.tsx
 M components/TopNav.tsx
 M components/ui/badge.tsx
 M components/ui/button.tsx
 M components/ui/toast.tsx
 M components/ui/tooltip.tsx
 M lib/constants.ts
 M lib/i18n/context.tsx
 M lib/i18n/en.ts
 M lib/i18n/it.ts
 M lib/supabase/server.ts
 M lib/types.ts
?? BRAND.md
?? RESTYLING_REPORT.md
?? components/ui/card.tsx
?? components/ui/input.tsx
```

## git diff --stat

71 file modificati, 1834 insertions, 2489 deletions (la differenza negativa è data dalla rimozione di tonnellate di `fontFamily: "'Lora'..."` e inline style ricorsivi).

Top 10 file per ampiezza di diff:

```
 app/project/[id]/vpcs/new/NewVPCClient.tsx       | 251 +++++++++------------
 app/project/[id]/opportunities/OpportunitiesClient.tsx | 247 +++++++++-----------
 app/project/[id]/abilities/AbilitiesClient.tsx   | 237 ++++++++-----------
 app/globals.css                                  | 238 ++++++++++++++-----
 components/TopNav.tsx                            | 196 ++++------------
 app/project/[id]/opportunity/[opp_id]/report/ReportClient.tsx | 192 +++++++---------
 app/project/[id]/opportunity/[opp_id]/bmc/BMCClient.tsx | 182 ++++++---------
 app/project/[id]/opportunity/[opp_id]/vpc/VPCClient.tsx | 176 +++++++--------
 app/project/[id]/opportunity/[opp_id]/twins/interview/InterviewClient.tsx | 166 ++++++--------
 app/dashboard/DashboardClient.tsx                | 141 ++++++------
```

---

## Verifica build

- `npx tsc --noEmit` → ✅ exit 0
- App non avviata in browser durante questo pass; consigliato uno smoke test visivo prima di mergere.
