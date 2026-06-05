import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';

export interface EmitRustOptions {
  readonly banner?: string;
  readonly sourceMapId?: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly target?: FrontierProjectionTarget;
  readonly targetPath?: string;
  readonly targetHash?: string;
  readonly semanticIndexId?: string;
  readonly universalAstId?: string;
  readonly nativeAstId?: string;
  readonly nativeSourceId?: string;
  readonly sourceSpansBySemanticNodeId?: Readonly<Record<string, FrontierProjectionSourceSpan>>;
  readonly semanticSymbolIdsBySemanticNodeId?: Readonly<Record<string, string>>;
  readonly semanticOccurrenceIdsBySemanticNodeId?: Readonly<Record<string, string>>;
  readonly lossIdsBySemanticNodeId?: Readonly<Record<string, readonly string[]>>;
  readonly evidence?: readonly FrontierProjectionEvidenceRecord[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface FrontierProjectionTarget {
  readonly language?: string;
  readonly platform?: string;
  readonly packageName?: string;
  readonly emitPath?: string;
  readonly [key: string]: unknown;
}

export interface FrontierProjectionSourceSpan {
  readonly path?: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface FrontierProjectionGeneratedSpan extends FrontierProjectionSourceSpan {
  readonly target?: FrontierProjectionTarget;
  readonly targetPath?: string;
  readonly generatedName?: string;
}

export interface FrontierProjectionEvidenceRecord {
  readonly id: string;
  readonly kind?: string;
  readonly summary?: string;
  readonly [key: string]: unknown;
}

export interface FrontierProjectionSourceMapMapping {
  readonly id: string;
  readonly semanticNodeId: string;
  readonly nativeSourceId?: string;
  readonly semanticSymbolId?: string;
  readonly semanticOccurrenceId?: string;
  readonly sourceSpan?: FrontierProjectionSourceSpan;
  readonly generatedSpan: FrontierProjectionGeneratedSpan;
  readonly target?: FrontierProjectionTarget;
  readonly generatedName?: string;
  readonly evidenceIds?: readonly string[];
  readonly lossIds?: readonly string[];
  readonly precision: 'declaration';
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface FrontierProjectionSourceMap {
  readonly kind: 'frontier.lang.sourceMap';
  readonly version: 1;
  readonly id: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly target?: FrontierProjectionTarget;
  readonly targetPath?: string;
  readonly targetHash?: string;
  readonly semanticIndexId?: string;
  readonly universalAstId?: string;
  readonly nativeAstId?: string;
  readonly nativeSourceId?: string;
  readonly mappings: readonly FrontierProjectionSourceMapMapping[];
  readonly evidence: readonly FrontierProjectionEvidenceRecord[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RustSourceMapResult {
  readonly code: string;
  readonly sourceMap: FrontierProjectionSourceMap;
}

export interface EmitRustWithSourceMapResult extends RustSourceMapResult {
  readonly ast: RustAstModule;
}

export interface RustSourceRef {
  readonly semanticNodeId: string;
  readonly semanticNodeKind?: string;
  readonly semanticNodeName?: string;
  readonly regionIds?: readonly string[];
}

export type RustAstItem =
  | { readonly kind: 'patchEnum'; readonly name: string }
  | { readonly kind: 'typeAlias'; readonly name: string; readonly type: string; readonly sourceRef?: RustSourceRef }
  | { readonly kind: 'capabilityDescriptor'; readonly name: string; readonly capability: string; readonly adapters: readonly { readonly language: string; readonly platform: string; readonly symbol: string }[]; readonly sourceRef?: RustSourceRef }
  | { readonly kind: 'struct'; readonly name: string; readonly fields: readonly { readonly name: string; readonly type: string }[]; readonly sourceRef?: RustSourceRef }
  | { readonly kind: 'function'; readonly name: string; readonly inputType: string; readonly returnType: string; readonly sourceRef?: RustSourceRef };

export interface RustAstModule {
  readonly kind: 'rust.module';
  readonly banner: string;
  readonly items: readonly RustAstItem[];
}

export declare function toRustAst(document: FrontierLangDocument, options?: EmitRustOptions): RustAstModule;
export declare function renderRustAst(ast: RustAstModule): string;
export declare function renderRustAstWithSourceMap(ast: RustAstModule, options?: EmitRustOptions): RustSourceMapResult;
export declare function emitRust(document: FrontierLangDocument, options?: EmitRustOptions): string;
export declare function emitRustWithSourceMap(document: FrontierLangDocument, options?: EmitRustOptions): EmitRustWithSourceMapResult;
