# Spades UX-Shield Architectural Specification
Greenfield extension. Cosmetic + procedural only. No declarativeNetRequest, no HTML-stream filtering, no MAIN-world injection, no ML/NLP.
Isolated world only. Default lists are hostname-specific.
<2ms budget applies to synchronous content-script work on the document_start turn. Flicker is solved by not awaiting storage/SW before applying packaged CSS.

## Repo layout (extension)
src/engine/types.ts — Rule AST, HostBucket, list directives
src/engine/parser.ts — streaming line parser
src/engine/compiler.ts — AST → CSS strings + procedural program
src/engine/domain-index.ts — reversed-label trie + path predicates
src/engine/util.ts — helpers

## Module 1 — Filter List DSL
Supported markers: ##, #@#, #?#
Procedural ops: :has-text, :matches-path, :matches-attr, :matches-css, :upward, :watch-attr, :min-text-length
Actions: :uncheck, :click-dismiss, :remove-attr, :remove-class, :remove, :style, :unlock-scroll
Reject at compile: :xpath(), :others(), ##^, #$#, +js(), :style() containing url/javascript. Reject :has-text on bare div/span/p/*.
