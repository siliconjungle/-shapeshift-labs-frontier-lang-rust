import assert from 'node:assert/strict';
import { createDocument, entityNode, actionNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitRust, emitRustWithSourceMap } from '../dist/index.js';

for (let index = 0; index < 100; index += 1) {
  const document = createDocument({ id: `doc_${index}`, name: `Doc${index}`, nodes: [
    entityNode({ id: `ent_${index}`, name: 'Todo', fields: [{ id: `field_title_${index}`, name: 'title', type: 'Text' }] }),
    actionNode({ id: `action_${index}`, name: 'update_todo', input: 'Todo', returns: 'Patch' })
  ] });
  const output = emitRust(document);
  const mapped = emitRustWithSourceMap(document, { targetPath: `doc_${index}.rs` });
  const todoMapping = mapped.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === `ent_${index}`);
  assert.match(output, /pub struct Todo/);
  assert.match(output, /pub fn update_todo/);
  assert.equal(mapped.code, output);
  assert.equal(mapped.sourceMap.target.language, 'rust');
  assert.equal(todoMapping.generatedSpan.targetPath, `doc_${index}.rs`);
}
