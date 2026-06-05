import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';

export interface EmitRustOptions {
  readonly banner?: string;
}

export type RustAstItem =
  | { readonly kind: 'patchEnum'; readonly name: string }
  | { readonly kind: 'typeAlias'; readonly name: string; readonly type: string }
  | { readonly kind: 'capabilityDescriptor'; readonly name: string; readonly capability: string; readonly adapters: readonly { readonly language: string; readonly platform: string; readonly symbol: string }[] }
  | { readonly kind: 'struct'; readonly name: string; readonly fields: readonly { readonly name: string; readonly type: string }[] }
  | { readonly kind: 'function'; readonly name: string; readonly inputType: string; readonly returnType: string };

export interface RustAstModule {
  readonly kind: 'rust.module';
  readonly banner: string;
  readonly items: readonly RustAstItem[];
}

export declare function toRustAst(document: FrontierLangDocument, options?: EmitRustOptions): RustAstModule;
export declare function renderRustAst(ast: RustAstModule): string;
export declare function emitRust(document: FrontierLangDocument, options?: EmitRustOptions): string;
