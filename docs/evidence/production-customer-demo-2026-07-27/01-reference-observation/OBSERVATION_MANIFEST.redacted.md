# D1 Authenticated Reference Observation

Date: 2026-07-27 JST  
Gate: PASS

## Observation result

An already authenticated Owner-authorized Chrome session reached the requested
Manager dashboard for `2026-07-27`. The authenticated manager shell was present
and no login/password form was present.

Read-only observation covered:

- authenticated dashboard entry and global navigation;
- List, Floor, and Chart operator views;
- reservation, waitlist, finished, and block operational categories;
- a new, unsaved blank reservation form and its local discard confirmation;
- desktop, iPad/tablet, 390px, and 320px responsive behavior;
- focus, sticky regions, internal scrollers, persistent action regions, and
  mobile navigation changes.

No reservation, customer, waitlist entry, block, status, staff assignment,
setting, notification, or provider state was created or changed. An
announcement acknowledgement was deliberately not activated. The blank form
was discarded without a backend mutation.

## Repository-safe output

The GHOST-owned replacement specifications are under
`docs/research/tablecheck-informed-demo/`:

- page topology, behavior/state mapping, responsive matrix, and provenance;
- shell and service ribbon;
- global rail;
- queue/exception rail;
- List;
- Floor;
- Chart;
- Inspector;
- reservation create/edit wizard;
- six-command center;
- Waitlist;
- table block;
- staff/table assignment;
- synthetic customer;
- mobile bottom sheet/wizard;
- demo login, cue, lease, expiry, and reset.

All 15 required component specifications are present. They use GHOST-owned
terminology, exact `VIP-1` through `VIP-8` geometry, synthetic-only data, and the
warm-white/white/graphite/champagne palette contract. The responsive contract
explicitly replaces clipped reference mobile columns with a List-first,
bottom-sheet workflow.

## Privacy and intellectual-property boundary

- Raw screenshots in repository: 0.
- Raw DOM/a11y/network payloads in repository: 0.
- Private customer or reservation data in repository: 0.
- Third-party CSS, assets, brand marks, and copied UI text in repository: 0.
- Credential values in repository: 0.
- Third-party venue/table geometry copied: 0.

Raw observation artifacts were held only in a mode-700 temporary directory,
were not supplied to builders, and were permanently removed after the redacted
specifications passed review. The temporary CDP bridge and copied connection
metadata were stopped and removed. The authenticated browser was returned to
the requested dashboard route.

The repository scan found only the six intentionally cited public reference
URLs in `PROVENANCE.md`. Phone-pattern candidates were the documented demo
dates/expiry, and secret-term candidates were input-policy prose; no private
value was present. `git diff --check` passed.

## Gate statement

- Authenticated observation: PASS.
- Reference-system mutation: 0.
- Raw PII repository: 0.
- Raw screenshot repository: 0.
- Required specifications: 15/15.
- GHOST-owned replacement boundary: PASS.

