# FENIX — Studio architecture

## Refactor rule
This refactor is deliberately non-invasive: existing Studio UX, renderers, recipes, page output and exercise selectors remain untouched. The responsibility map is a guardrail for future development, not a migration of current features.

## One Studio = one primary user action

| Studio | Primary action | Owns long-term |
|---|---|---|
| Maze | find a route | maze pathfinding |
| Word Search | find words | letter-grid word search |
| Coloring | color | printable coloring |
| Tracing | follow a trace | line/shape/asset tracing |
| Matching | connect related items | identical pairs, picture-shadow, generic pairing |
| Dot to Dot | connect dots | classic and guided dots |
| Alphabet | learn letters | recognition, case, letter tracing, missing letters, simple words |
| Math | count/calculate | operations, quantity, comparison, counting, pyramids, numeric sequences |
| Logic | discover a rule | sequences, odd-one-out, matrices, picture sudoku, analogies |
| Hidden Objects | search a scene | search-and-find targets among distractors |
| Complete the Picture | reconstruct a drawing | halves, grid copy, missing part, mirror drawing |

## Existing overlaps — compatibility freeze
These existing features are NOT removed in this refactor because that would change current Studio logic/UX:

- Matching: letter-case -> future ownership Alphabet.
- Matching: number-quantity and operation-result -> future ownership Math.
- Hidden Objects: pairs -> conceptually Matching; odd-one-out -> Logic; hidden letters/numbers should not define the future Studio.
- Complete the Picture: shadow-trace -> conceptually Tracing.

They remain available until a separately approved migration. New development should follow the ownership map and should not add further overlap.

## Hidden Objects direction
Future identity: **Search & Find**. A dense scene contains controlled targets and distractors. Controls may cover target count, distractor count, scale, rotation, density, repetition and Solutions. It should not become a container for unrelated mini-games.

## Complete the Picture direction
Future identity: **Drawing / Copy & Complete**. Focus on spatial reconstruction: complete half, grid copy, missing fragment and mirror drawing. New tracing mechanics belong to Tracing Studio.

## Safety invariant
A structural refactor must not modify existing Studio HTML/CSS/controller/core files unless explicitly approved. Architecture metadata lives separately in `config/studio-responsibilities.js`.