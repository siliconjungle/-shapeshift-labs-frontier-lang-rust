const ItemPattern = /(^|\n)([ \t]*(?:#\[[^\n]*\][ \t]*(?:\n[ \t]*)?)*)((?:pub(?:\([^)]*\))?[ \t]+)?)(async[ \t]+)?(unsafe[ \t]+)?(extern(?:[ \t]+"[^"]+")?[ \t]+)?(macro_rules!|use|mod|struct|enum|trait|impl|fn|const|static|type)(?=\s|$)/g;
const MethodPattern = /(^|\n)([ \t]*(?:#\[[^\n]*\][ \t]*(?:\n[ \t]*)?)*)((?:pub(?:\([^)]*\))?[ \t]+)?)(async[ \t]+)?(unsafe[ \t]+)?fn[ \t]+([A-Za-z_][A-Za-z0-9_]*)/g;

export function parseRustSemanticTree(sourceText, options = {}) {
  const source = String(sourceText ?? '');
  const lineStarts = createLineStarts(source);
  const masked = maskRustTrivia(source);
  const records = [];
  for (const match of masked.matchAll(ItemPattern)) {
    const startOffset = match.index + match[1].length;
    if (braceDepthAt(masked, startOffset) !== 0) continue;
    const kind = match[7];
    const headerEnd = findHeaderEnd(masked, startOffset);
    const body = itemBodySpan(masked, headerEnd);
    const endOffset = body?.fullEndOffset ?? headerEnd;
    const header = source.slice(startOffset, Math.min(headerEnd, source.length));
    const name = rustItemName(kind, header);
    const key = rustItemKey(kind, name, header, records.length);
    const record = rustRecord({
      source,
      lineStarts,
      sourcePath: options.sourcePath,
      kind: normalizeRustKind(kind),
      name,
      key,
      header,
      startOffset,
      endOffset,
      body,
      visibility: match[3] ? match[3].trim() : undefined,
      modifiers: [match[4], match[5], match[6]].filter(Boolean).map((value) => value.trim())
    });
    records.push(record);
    if (kind === 'impl' && body) records.push(...scanImplMethods(source, masked, lineStarts, options, record, body));
  }
  const proofGaps = uniqueProofGaps([
    ...records.flatMap((record) => record.proofGaps ?? []),
    ...sourceProofGaps(masked)
  ]);
  const summary = summarizeRecords(records, proofGaps);
  return {
    kind: 'frontier.lang.rustSemanticTree',
    version: 1,
    sourcePath: options.sourcePath,
    sourceHash: stableHash(source),
    records,
    treeHash: stableHash(JSON.stringify(records.map(recordDigest))),
    summary,
    proofGaps,
    parser: {
      name: 'frontier-rust-source-scanner',
      sourceBackedSpans: true,
      exactAst: false,
      hostParserRequiredFor: ['macro-expansion', 'name-resolution', 'type-checking', 'borrow-checking']
    }
  };
}

export function createRustSemanticMergeEvidence(sourceText, options = {}) {
  const tree = parseRustSemanticTree(sourceText, options);
  return {
    kind: 'frontier.lang.rustSemanticMergeEvidence',
    version: 1,
    status: tree.proofGaps.length ? 'needs-review' : 'ready',
    sourcePath: tree.sourcePath,
    sourceHash: tree.sourceHash,
    treeHash: tree.treeHash,
    records: tree.records,
    proofGaps: tree.proofGaps,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    borrowCheckEquivalenceClaim: false,
    macroExpansionEquivalenceClaim: false,
    traitResolutionEquivalenceClaim: false
  };
}

export function queryRustItemRecords(treeOrEvidence, query = {}) {
  const records = treeOrEvidence?.records ?? [];
  return records.filter((record) => {
    if (query.kind && record.kind !== query.kind) return false;
    if (query.name && record.name !== query.name) return false;
    if (query.key && record.key !== query.key) return false;
    if (query.parentKey && record.parentKey !== query.parentKey) return false;
    return query.predicate ? query.predicate(record) : true;
  });
}

export function summarizeRustSemanticTree(treeOrEvidence) {
  const records = treeOrEvidence?.records ?? [];
  const proofGaps = treeOrEvidence?.proofGaps ?? [];
  return {
    sourcePath: treeOrEvidence?.sourcePath,
    sourceHash: treeOrEvidence?.sourceHash,
    treeHash: treeOrEvidence?.treeHash,
    status: proofGaps.length ? 'needs-review' : 'ready',
    ...summarizeRecords(records, proofGaps)
  };
}

function scanImplMethods(source, masked, lineStarts, options, parent, body) {
  const bodyText = masked.slice(body.startOffset, body.endOffset);
  const methods = [];
  for (const match of bodyText.matchAll(MethodPattern)) {
    const startOffset = body.startOffset + match.index + match[1].length;
    const headerEnd = findHeaderEnd(masked, startOffset);
    const methodBody = itemBodySpan(masked, headerEnd);
    const endOffset = methodBody?.fullEndOffset ?? headerEnd;
    const name = match[6];
    methods.push(rustRecord({
      source,
      lineStarts,
      sourcePath: options.sourcePath,
      kind: 'method',
      name,
      key: `${parent.key}::${name}`,
      parentKey: parent.key,
      header: source.slice(startOffset, Math.min(headerEnd, source.length)),
      startOffset,
      endOffset,
      body: methodBody,
      visibility: match[3] ? match[3].trim() : undefined,
      modifiers: [match[4], match[5]].filter(Boolean).map((value) => value.trim())
    }));
  }
  return methods;
}

function rustRecord(input) {
  const sourceText = input.source.slice(input.startOffset, input.endOffset);
  const sourceSpan = span(input.lineStarts, input.startOffset, input.endOffset, input.sourcePath);
  const record = cleanObject({
    kind: input.kind,
    name: input.name,
    key: input.key,
    identityKey: `rust:${input.key}`,
    parentKey: input.parentKey,
    visibility: input.visibility,
    modifiers: input.modifiers?.length ? input.modifiers : undefined,
    sourceSpan,
    structuralSpan: sourceSpan,
    bodySpan: input.body ? span(input.lineStarts, input.body.startOffset, input.body.endOffset, input.sourcePath) : undefined,
    sourceHash: stableHash(sourceText),
    headerHash: stableHash(input.header),
    proofGaps: recordProofGaps(input.kind, input.header, sourceText)
  });
  return { ...record, recordHash: stableHash(JSON.stringify(recordDigest(record))) };
}

function rustItemName(kind, header) {
  if (kind === 'use') return header.replace(/^.*\buse\s+/, '').replace(/;.*$/s, '').trim();
  if (kind === 'impl') {
    const normalized = header.replace(/\s+/g, ' ');
    const traitImpl = /\bimpl(?:\s*<[^>]*>)?\s+(.+?)\s+for\s+([A-Za-z_][A-Za-z0-9_:<>]*)/.exec(normalized);
    if (traitImpl) return `${traitImpl[2].replace(/<.*$/, '')}.${traitImpl[1].trim()}.impl`;
    const inherent = /\bimpl(?:\s*<[^>]*>)?\s+([A-Za-z_][A-Za-z0-9_:<>]*)/.exec(normalized);
    return inherent ? `${inherent[1].replace(/<.*$/, '')}.impl` : 'anonymous.impl';
  }
  const macro = kind === 'macro_rules!' ? /macro_rules!\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(header) : undefined;
  if (macro) return macro[1];
  const named = new RegExp(`\\b${kind}\\s+([A-Za-z_][A-Za-z0-9_]*)`).exec(header);
  return named ? named[1] : `${kind}.anonymous`;
}

function rustItemKey(kind, name, header, index) {
  if (kind === 'use') return `use:${name || index}`;
  if (kind === 'impl') return `impl:${name || index}`;
  if (kind === 'macro_rules!') return `macro:${name || index}`;
  return `${normalizeRustKind(kind)}:${name || index}:${stableHash(header).split(':')[1].slice(0, 8)}`;
}

function normalizeRustKind(kind) {
  return kind === 'macro_rules!' ? 'macro' : kind;
}

function recordProofGaps(kind, header, sourceText) {
  const gaps = [];
  if (/\bcfg(?:_attr)?\b/.test(header)) gaps.push(proofGap('rust-cfg-conditional-compilation-boundary', 'Conditional compilation changes the active semantic graph by target and feature set.'));
  if (/#\[(?:derive|proc_macro|proc_macro_attribute|proc_macro_derive)\b/.test(header)) gaps.push(proofGap('rust-macro-expansion-boundary', 'Attribute and derive macros require host compiler expansion evidence.'));
  if (kind === 'macro' || kind === 'macro_rules!' || /\w!\s*[\(\{\[]/.test(sourceText)) gaps.push(proofGap('rust-macro-expansion-boundary', 'Macro definitions or invocations require expansion evidence before semantic equivalence claims.'));
  if (/\bunsafe\b/.test(header) || /\bunsafe\s*\{/.test(sourceText)) gaps.push(proofGap('rust-unsafe-boundary', 'Unsafe Rust requires runtime and safety evidence outside source-shape matching.'));
  if (/\bextern\b/.test(header)) gaps.push(proofGap('rust-ffi-boundary', 'Extern items require ABI and linked symbol evidence.'));
  if (kind === 'impl' && /\sfor\s/.test(header)) gaps.push(proofGap('rust-trait-resolution-boundary', 'Trait impl admission requires name and trait resolution evidence.'));
  return uniqueProofGaps(gaps);
}

function sourceProofGaps(masked) {
  const gaps = [];
  let balance = 0;
  for (const char of masked) {
    if (char === '{') balance += 1;
    if (char === '}') balance -= 1;
    if (balance < 0) break;
  }
  if (balance !== 0) gaps.push(proofGap('rust-parser-recovery-boundary', 'Unbalanced braces require a real Rust parser before merge admission.'));
  return gaps;
}

function braceDepthAt(source, offset) {
  let depth = 0;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth = Math.max(0, depth - 1);
  }
  return depth;
}

function itemBodySpan(source, headerEnd) {
  if (source[headerEnd] !== '{') return undefined;
  const brace = headerEnd;
  const end = matchingBrace(source, brace);
  return end < 0 ? undefined : { startOffset: brace + 1, endOffset: end, fullEndOffset: end + 1 };
}

function findHeaderEnd(source, startOffset) {
  let index = startOffset;
  while (index < source.length && source[index] !== '{' && source[index] !== ';' && source[index] !== '\n') index += 1;
  if (source[index] === '\n') {
    const nextBrace = source.indexOf('{', index);
    const nextSemi = source.indexOf(';', index);
    if (nextBrace >= 0 && (nextSemi < 0 || nextBrace < nextSemi)) return nextBrace;
  }
  return Math.min(index + (source[index] === ';' ? 1 : 0), source.length);
}

function matchingBrace(source, openOffset) {
  let depth = 0;
  for (let index = openOffset; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function maskRustTrivia(source) {
  let output = '';
  let state = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (state === 'line') { output += char === '\n' ? '\n' : ' '; if (char === '\n') state = 'code'; continue; }
    if (state === 'block') { output += char === '\n' ? '\n' : ' '; if (char === '*' && next === '/') { output += ' '; index += 1; state = 'code'; } continue; }
    if (state === 'string') { output += char === '\n' ? '\n' : ' '; if (char === '\\') { output += next === '\n' ? '\n' : ' '; index += 1; } else if (char === '"') state = 'code'; continue; }
    if (state === 'char') { output += char === '\n' ? '\n' : ' '; if (char === '\\') { output += next === '\n' ? '\n' : ' '; index += 1; } else if (char === "'") state = 'code'; continue; }
    if (char === '/' && next === '/') { output += '  '; index += 1; state = 'line'; continue; }
    if (char === '/' && next === '*') { output += '  '; index += 1; state = 'block'; continue; }
    if (char === '"') { output += ' '; state = 'string'; continue; }
    if (char === "'") { output += ' '; state = 'char'; continue; }
    output += char;
  }
  return output;
}

function summarizeRecords(records, proofGaps) {
  const counts = Object.fromEntries(['use', 'mod', 'struct', 'enum', 'trait', 'impl', 'fn', 'method', 'const', 'static', 'type', 'macro'].map((kind) => [kind, 0]));
  for (const record of records) counts[record.kind] = (counts[record.kind] ?? 0) + 1;
  return { records: records.length, proofGaps: proofGaps.length, ...counts };
}

function recordDigest(record) {
  return { kind: record.kind, name: record.name, key: record.key, parentKey: record.parentKey, sourceHash: record.sourceHash, headerHash: record.headerHash, proofGaps: record.proofGaps?.map((gap) => gap.code) ?? [] };
}

function proofGap(code, summary) {
  return { code, status: 'not-claimed', summary, failClosed: true, semanticEquivalenceClaim: false };
}

function uniqueProofGaps(gaps) {
  return [...new Map(gaps.map((gap) => [gap.code, gap])).values()];
}

function span(lineStarts, startOffset, endOffset, path) {
  return cleanObject({ path, startOffset, endOffset, ...positionRange(lineStarts, startOffset, endOffset) });
}

function createLineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) if (source[index] === '\n') starts.push(index + 1);
  return starts;
}

function positionRange(lineStarts, startOffset, endOffset) {
  const start = positionAt(lineStarts, startOffset);
  const end = positionAt(lineStarts, endOffset);
  return { startLine: start.line, startColumn: start.column, endLine: end.line, endColumn: end.column };
}

function positionAt(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) low = mid + 1;
    else high = mid - 1;
  }
  const lineIndex = Math.max(0, high);
  return { line: lineIndex + 1, column: offset - lineStarts[lineIndex] + 1 };
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function cleanObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}
