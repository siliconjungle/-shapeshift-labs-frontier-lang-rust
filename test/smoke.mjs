import assert from 'node:assert/strict';
import { actionNode, capabilityNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitRust, renderRustAst, toRustAst } from '../dist/index.js';

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
assert.equal(ast.kind, 'rust.module');
assert.ok(ast.items.some((item) => item.kind === 'struct' && item.name === 'Todo'));
assert.ok(ast.items.some((item) => item.kind === 'capabilityDescriptor' && item.name === 'HTTP_REQUEST'));
assert.equal(ast.items.find((item) => item.kind === 'struct' && item.name === 'Todo').sourceRef.semanticNodeId, 'entity_todo');
assert.equal(renderRustAst(ast), out);
assert.match(out, /pub struct TodoInput/);
assert.match(out, /HTTP_REQUEST_CAPABILITY/);
assert.match(out, /reqwest::Client::execute/);
assert.match(out, /pub struct Todo/);
assert.match(out, /BTreeSet<String>/);
assert.match(out, /pub fn add_todo/);
