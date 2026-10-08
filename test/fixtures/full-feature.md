---
title: Full Feature Study Guide
description: Exercise all question types and features
author: Test Author
tags: [testing, demo]
---

# Full Feature Study Guide

> Introductory overview paragraph.

## Section Alpha

### What is the capital of France?

> Think about the Eiffel Tower.

- [ ] London
- [x] Paris
- [ ] Berlin

Paris is the capital and largest city of France.

### Select all primary colors of light

> Think about additive color mixing.

- [x] Red
- [x] Green
- [x] Blue
- [ ] Yellow

RGB color model uses red, green, and blue.

### Is the Earth flat?

> Think about gravity and orbital photos.

- [ ] True
- [x] False

The Earth is an oblate spheroid.

## Section Beta

### Match the language to its typing discipline

> Consider compile-time vs runtime type checks.

| Language | Typing |
| --- | --- |
| TypeScript | Static |
| Python | Dynamic |
| Rust | Static |

### Name the protocol used to securely browse the web

> Look for the padlock in the browser address bar.

#### HTTPS

HTTPS encrypts communication using TLS.

### What does this TypeScript function return?

> Examine the return expression carefully.

```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

Explain why the return type is explicitly annotated.

### Explain the trade-offs of database indexing

Describe the internal data structure used and the trade-offs between read and write performance.

> Think about B-Trees and disk block reads.

#### Rubric
- [ ] Mentions B-Tree or balanced tree data structure
- [ ] Explains search complexity reduction to logarithmic time
- [ ] Mentions disk I/O reduction or block reads
- [ ] Notes tradeoff: writes and updates become slower

#### Model Answer
Database indexes commonly utilize B-tree or B+ tree data structures to organize sorted pointers to table rows. By structuring keys hierarchically, indexes reduce disk I/O operations and lookup complexity from O(N) linear scans to O(log N) operations. However, maintaining index trees introduces overhead: insert, update, and delete queries run slower because the database must update index nodes and balance tree pages upon every modification.
