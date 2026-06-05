import assert from 'node:assert/strict';
import { actionNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitRust } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'Doc', nodes: [
  typeNode({ id: 'type_input', name: 'TodoInput', fields: [{ id: 'title', name: 'title', type: 'Text' }] }),
  entityNode({ id: 'entity_todo', name: 'Todo', fields: [{ id: 'tags', name: 'tags', type: { kind: 'set', item: 'Text' } }] }),
  actionNode({ id: 'action_add', name: 'add_todo', input: 'TodoInput', returns: 'Patch' })
] });
const out = emitRust(document);
assert.match(out, /pub struct TodoInput/);
assert.match(out, /pub struct Todo/);
assert.match(out, /BTreeSet<String>/);
assert.match(out, /pub fn add_todo/);
