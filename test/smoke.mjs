import assert from 'node:assert/strict';
import { actionNode, capabilityNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitRust, emitRustWithSourceMap, renderRustAst, renderRustAstWithSourceMap, toRustAst } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'Doc', nodes: [
  typeNode({ id: 'type_input', name: 'TodoInput', fields: [{ id: 'title', name: 'title', type: 'Text' }] }),
  capabilityNode({ id: 'cap_http', name: 'HttpRequest', capability: 'http.request', adapters: [
    { target: { language: 'rust', platform: 'native', packageName: 'reqwest' }, symbol: 'reqwest::Client::execute', kind: 'library' }
  ] }),
  entityNode({ id: 'entity_todo', name: 'Todo', fields: [{ id: 'tags', name: 'tags', type: { kind: 'set', item: 'Text' } }] }),
  actionNode({ id: 'action_add', name: 'add_todo', input: 'TodoInput', returns: 'Patch' })
] });
const out = emitRust(document);
const ast = toRustAst(document);
const rendered = renderRustAstWithSourceMap(ast, {
  sourceMapId: 'map_doc_rs',
  sourcePath: 'doc.frontier',
  targetPath: 'src/doc.rs',
  semanticIndexId: 'semantic_doc',
  sourceSpansBySemanticNodeId: {
    entity_todo: { path: 'doc.frontier', startLine: 9, startColumn: 1, endLine: 11, endColumn: 2 }
  },
  semanticSymbolIdsBySemanticNodeId: {
    entity_todo: 'symbol_todo'
  },
  lossIdsBySemanticNodeId: {
    entity_todo: ['loss_collection_type']
  },
  evidence: [{ id: 'evidence_projection', kind: 'projection', summary: 'smoke projection evidence' }]
});
const emitted = emitRustWithSourceMap(document, { targetPath: 'src/doc.rs' });
assert.equal(ast.kind, 'rust.module');
assert.ok(ast.items.some((item) => item.kind === 'struct' && item.name === 'Todo'));
assert.ok(ast.items.some((item) => item.kind === 'capabilityDescriptor' && item.name === 'HTTP_REQUEST'));
assert.equal(ast.items.find((item) => item.kind === 'struct' && item.name === 'Todo').sourceRef.semanticNodeId, 'entity_todo');
assert.equal(renderRustAst(ast), out);
assert.equal(rendered.code, out);
assert.equal(emitted.code, out);
assert.equal(emitted.ast.kind, 'rust.module');
assert.equal(rendered.sourceMap.kind, 'frontier.lang.sourceMap');
assert.equal(rendered.sourceMap.id, 'map_doc_rs');
assert.equal(rendered.sourceMap.target.language, 'rust');
assert.equal(rendered.sourceMap.targetPath, 'src/doc.rs');
assert.equal(rendered.sourceMap.semanticIndexId, 'semantic_doc');
const todoMapping = rendered.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === 'entity_todo');
assert.equal(todoMapping.generatedName, 'Todo');
assert.equal(todoMapping.generatedSpan.targetPath, 'src/doc.rs');
assert.equal(todoMapping.generatedSpan.startLine > 0, true);
assert.equal(todoMapping.sourceSpan.path, 'doc.frontier');
assert.equal(todoMapping.semanticSymbolId, 'symbol_todo');
assert.deepEqual(todoMapping.lossIds, ['loss_collection_type']);
assert.deepEqual(todoMapping.evidenceIds, ['evidence_projection']);
assert.deepEqual(todoMapping.metadata.regionIds, ['tags']);
assert.match(out, /pub struct TodoInput/);
assert.match(out, /HTTP_REQUEST_CAPABILITY/);
assert.match(out, /reqwest::Client::execute/);
assert.match(out, /pub struct Todo/);
assert.match(out, /BTreeSet<String>/);
assert.match(out, /pub fn add_todo/);
