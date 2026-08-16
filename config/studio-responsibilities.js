"use strict";
/** Architecture-only metadata. Existing Studio UX and logic stay unchanged. */
window.FenixStudioResponsibilities=Object.freeze({
  "maze-studio":Object.freeze({domain:"navigation",purpose:"Find a route from start to finish",owns:["maze-pathfinding"]}),
  "word-search-studio":Object.freeze({domain:"language-puzzle",purpose:"Find words in a letter grid",owns:["word-search"]}),
  "coloring-studio":Object.freeze({domain:"creative",purpose:"Color printable artwork",owns:["coloring"]}),
  "tracing-studio":Object.freeze({domain:"fine-motor",purpose:"Follow a prepared line, contour or dotted trace",owns:["line-tracing","shape-tracing","asset-tracing"]}),
  "matching-studio":Object.freeze({domain:"association",purpose:"Connect two related items",owns:["identical-pairs","picture-shadow","generic-pairs"],legacyOverlap:["letter-case","number-quantity","operation-result"]}),
  "dot-to-dot-studio":Object.freeze({domain:"fine-motor",purpose:"Reconstruct a shape by connecting dots",owns:["connect-dots","guided-dots"]}),
  "alphabet-studio":Object.freeze({domain:"literacy",purpose:"Learn and practise letters",owns:["letter-recognition","letter-case","letter-tracing","missing-letters","simple-words"]}),
  "math-studio":Object.freeze({domain:"numeracy",purpose:"Practise numbers and mathematical reasoning",owns:["operations","number-quantity","comparison","counting","number-pyramids","number-sequences"]}),
  "logic-studio":Object.freeze({domain:"reasoning",purpose:"Discover a rule or logical relationship",owns:["sequences","odd-one-out","matrices","picture-sudoku","analogies"]}),
  "hidden-objects-studio":Object.freeze({domain:"visual-search",purpose:"Search a dense scene for specified targets",owns:["search-and-find"],legacyOverlap:["pairs","odd-one-out","hidden-letters","hidden-numbers"]}),
  "complete-picture":Object.freeze({domain:"drawing",purpose:"Copy, reconstruct or complete artwork",owns:["complete-half","grid-copy","missing-part","mirror-drawing"],legacyOverlap:["shadow-trace"]}),
  "intro-studio":Object.freeze({domain:"book-structure",purpose:"Create introductory book pages",owns:["welcome","mission","mission-tracker","how-to-use","rules","skills"]}),
  "congratulations-studio":Object.freeze({domain:"book-structure",purpose:"Close the activity section",owns:["congratulations"]}),
  "qr-studio":Object.freeze({domain:"book-structure",purpose:"Create the reader continuation/QR page",owns:["qr-page"]}),
  "certificate-studio":Object.freeze({domain:"book-structure",purpose:"Create the completion certificate",owns:["certificate"]})
});
window.FenixStudioArchitecture=Object.freeze({get:slug=>window.FenixStudioResponsibilities[slug]||null,owns:(slug,mechanic)=>Boolean(window.FenixStudioResponsibilities[slug]?.owns?.includes(mechanic)),overlaps:slug=>(window.FenixStudioResponsibilities[slug]?.legacyOverlap||[]).slice()});