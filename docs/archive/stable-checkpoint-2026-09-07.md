# FENIX Stable Checkpoint — 2026-09-07

## Purpose

This document records the known-good state reached on 2026-09-07 after fixing Word Search Studio DECO persistence. It is a recovery/reference checkpoint, not a request for further refactoring.

## Canonical source and deployed preview

- Source repository: `opalkop/fenix`
- Working source branch: `feature/fenix-portable-mobile`
- Known-good functional source commit before this documentation-only commit: `5f68f7f017e4c3c812652bc68402851c3e979f17`
- Commit message: `Harden Word Search Deco save cycle`

- Preview repository: `opalkop/fenix-fp-preview`
- Deployed branch: `main`
- Known-good deployed preview commit: `4ce236b14db1abb1ec2432ad10b3c5eaadd20c51`
- Commit message: `Harden Word Search Deco save cycle`
- GitHub Pages deployment for this commit completed successfully on 2026-09-07.
- Public preview: `https://opalkop.github.io/fenix-fp-preview/#projectLibrary`

## Frozen recovery branch

A dedicated recovery branch was created from the known-good source commit:

`checkpoint/stable-word-search-deco-2026-09-07`

This branch exists so the exact working code state can be compared or restored later if a regression is introduced.

## Word Search DECO — confirmed working behavior

The following production flow was manually verified on the public preview on 2026-09-07:

1. Open Word Search Studio.
2. Select a global asset pack, e.g. `Ocean Fantasy`.
3. Select one or more DECO assets.
4. Set the number/scale of decorations and render the page.
5. Save the page to Project Pages.
6. Leave the Studio.
7. Re-open the saved Word Search page for editing.
8. Previously selected DECO assets are restored.
9. Re-saving the page does not lose the DECO selection.

User confirmation after deployment: the save -> close -> edit -> save cycle works.

## Persistence contract

A saved Word Search page must keep both forms of DECO identity:

- `recipe.settings.decoAssetRefs`
  - project-local asset IDs used by the renderer
- `recipe.settings.decoLibraryRefs`
  - stable references to the corresponding global library assets

The page schema must preserve these settings without filtering them out.

## Current DECO architecture

### Global picker

`modules/word-search-studio/word-search-global-deco-picker.js`

Responsibilities:

- lists global library packs using `FenixCore.listLibraryPacks()`
- reads global assets using `FenixCore.listLibraryAssets()`
- prefers the active/saved pack
- preserves stable global asset IDs via `data-library-id`
- links selected library assets into the current project with `FenixCore.linkLibraryAsset()` when needed
- restores selections from the currently saved project page
- rebuilds the picker after relevant Fenix state/library/storage events

### Word Search page save

`modules/word-search-studio/word-search.js`

The page settings contain both:

- `decoAssetRefs`
- `decoLibraryRefs`

The local fallback DECO list must also preserve `libraryRef` / `data-library-id` so the stable global reference is not lost during a later save.

### Page schema

`core/page-schema.js`

`FenixPageSchema.normalize()` clones the full settings object into `recipe.settings`; it is not expected to strip Word Search DECO fields.

## DECO rendering contract

`modules/word-search-studio/word-search-core.js`

Selected DECO refs are deduplicated before rendering. The renderer shuffles selected refs and slots, then uses each selected decoration once before any selected asset is repeated.

Regression test already present:

`tests/word-search-deco-uniqueness.test.cjs`

Expected result: with three selected DECO refs and `decoCount: 3`, three distinct selected assets are rendered.

## Regression checklist — run after every future Word Search/asset-library change

- [ ] Global DECO pack selector is visible and lists available packs.
- [ ] `Ocean Fantasy` can be selected.
- [ ] Selecting a DECO asset links it to the project when required.
- [ ] Selected DECO renders in Word Search preview.
- [ ] Saving creates/updates the project page without losing DECO.
- [ ] Leaving and reopening the saved page restores the same DECO selections.
- [ ] Re-saving an edited page preserves both `decoAssetRefs` and `decoLibraryRefs`.
- [ ] Multiple selected DECO do not repeat until all selected refs have been used once.
- [ ] Existing Word Search pages without `decoLibraryRefs` continue to load through fallback logic.
- [ ] Book Builder still receives the saved Word Search page; no unrelated default page is introduced.
- [ ] No global asset library data is deleted or duplicated by the save/edit cycle.

## Important guardrails

Do not refactor or replace the Word Search DECO persistence path merely for cleanup while production work is ongoing.

In particular, avoid changes that:

- remove `decoLibraryRefs`
- replace stable library IDs with names/filenames only
- rebuild checkboxes without `data-library-id`
- overwrite the global picker with a local-only `findAssets({tag:"deco"})` list
- unlink/delete global assets as a side effect of editing a page
- change page normalization so unknown recipe settings are discarded

Any future modification in these areas should be tested against this checkpoint before deployment.

## Known non-DECO risks that remain separate

This checkpoint only certifies the Word Search DECO save/edit cycle described above. It does not certify every Fenix module.

Known areas that should remain separate tasks instead of being changed incidentally:

- preset asset rebinding reliability
- full browser E2E for Studio save -> exact edit-state restore
- Book Builder exact-page assembly and protection from unintended/default pages
- cross-device project and asset synchronization edge cases

## Recovery rule

If Word Search DECO persistence regresses, first compare the affected code with source commit:

`5f68f7f017e4c3c812652bc68402851c3e979f17`

and recovery branch:

`checkpoint/stable-word-search-deco-2026-09-07`

Do not immediately rewrite the feature from scratch. Identify the diff that broke the save -> close -> edit -> save contract and restore the smallest compatible change.
