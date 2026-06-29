export interface RustSourceSpan {
  readonly path?: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface RustSemanticProofGap {
  readonly code: string;
  readonly status: 'not-claimed' | string;
  readonly summary: string;
  readonly failClosed: true;
  readonly semanticEquivalenceClaim: false;
}

export type RustSemanticRecordKind =
  | 'use'
  | 'mod'
  | 'struct'
  | 'enum'
  | 'trait'
  | 'impl'
  | 'fn'
  | 'method'
  | 'const'
  | 'static'
  | 'type'
  | 'macro'
  | string;

export interface RustSemanticRecord {
  readonly kind: RustSemanticRecordKind;
  readonly name: string;
  readonly key: string;
  readonly identityKey: string;
  readonly parentKey?: string;
  readonly visibility?: string;
  readonly modifiers?: readonly string[];
  readonly sourceSpan: RustSourceSpan;
  readonly structuralSpan: RustSourceSpan;
  readonly bodySpan?: RustSourceSpan;
  readonly sourceHash: string;
  readonly headerHash: string;
  readonly recordHash: string;
  readonly proofGaps?: readonly RustSemanticProofGap[];
}

export interface RustSemanticTreeSummary {
  readonly records: number;
  readonly proofGaps: number;
  readonly use: number;
  readonly mod: number;
  readonly struct: number;
  readonly enum: number;
  readonly trait: number;
  readonly impl: number;
  readonly fn: number;
  readonly method: number;
  readonly const: number;
  readonly static: number;
  readonly type: number;
  readonly macro: number;
  readonly [key: string]: number | string | undefined;
}

export interface RustSemanticTree {
  readonly kind: 'frontier.lang.rustSemanticTree';
  readonly version: 1;
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly records: readonly RustSemanticRecord[];
  readonly treeHash: string;
  readonly summary: RustSemanticTreeSummary;
  readonly proofGaps: readonly RustSemanticProofGap[];
  readonly parser: {
    readonly name: 'frontier-rust-source-scanner' | string;
    readonly sourceBackedSpans: true;
    readonly exactAst: false;
    readonly hostParserRequiredFor: readonly string[];
  };
}

export interface RustSemanticMergeEvidence {
  readonly kind: 'frontier.lang.rustSemanticMergeEvidence';
  readonly version: 1;
  readonly status: 'ready' | 'needs-review' | string;
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly treeHash: string;
  readonly records: readonly RustSemanticRecord[];
  readonly proofGaps: readonly RustSemanticProofGap[];
  readonly autoMergeClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly borrowCheckEquivalenceClaim: false;
  readonly macroExpansionEquivalenceClaim: false;
  readonly traitResolutionEquivalenceClaim: false;
}

export interface RustItemRecordQuery {
  readonly kind?: RustSemanticRecordKind;
  readonly name?: string;
  readonly key?: string;
  readonly parentKey?: string;
  readonly predicate?: (record: RustSemanticRecord) => boolean;
}

export declare function parseRustSemanticTree(sourceText: string, options?: { readonly sourcePath?: string }): RustSemanticTree;
export declare function createRustSemanticMergeEvidence(sourceText: string, options?: { readonly sourcePath?: string }): RustSemanticMergeEvidence;
export declare function queryRustItemRecords(treeOrEvidence: RustSemanticTree | RustSemanticMergeEvidence, query?: RustItemRecordQuery): readonly RustSemanticRecord[];
export declare function summarizeRustSemanticTree(treeOrEvidence: RustSemanticTree | RustSemanticMergeEvidence): RustSemanticTreeSummary & {
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly treeHash?: string;
  readonly status: 'ready' | 'needs-review' | string;
};
