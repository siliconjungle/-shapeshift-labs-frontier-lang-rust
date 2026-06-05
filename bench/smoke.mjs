import { performance } from 'node:perf_hooks';
import { createDocument, entityNode, actionNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitRust } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'Doc', nodes: [
  entityNode({ id: 'ent_todo', name: 'Todo', fields: [
    { id: 'field_title', name: 'title', type: 'Text' },
    { id: 'field_done', name: 'done', type: 'Bool' }
  ] }),
  actionNode({ id: 'action_update', name: 'update_todo', input: 'Todo', returns: 'Patch' })
] });

const start = performance.now();
let bytes = 0;
for (let index = 0; index < 500; index += 1) bytes += emitRust(document).length;
console.log(JSON.stringify({ emits: 500, bytes, durationMs: Number((performance.now() - start).toFixed(2)) }));
