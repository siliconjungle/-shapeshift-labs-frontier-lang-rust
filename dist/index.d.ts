import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';

export interface EmitRustOptions {
  readonly banner?: string;
}

export declare function emitRust(document: FrontierLangDocument, options?: EmitRustOptions): string;
