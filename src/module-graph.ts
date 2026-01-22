import fs from 'fs/promises';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { verbose } from './verbose.js';

// We need to use createRequire for traverse because it is a CJS module and sometimes has issues with ESM imports in tsx
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const _traverse = require('@babel/traverse');
const traverseDefault = _traverse.default || _traverse;

type FilePath = string;

export async function generateModuleGraph(files: { path: FilePath }[]): Promise<string> {
  const graph: string[] = [];

  for (const file of files) {
    try {
      const code = await fs.readFile(file.path, 'utf-8');
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'] // Enable common plugins just in case
      });

      const filename = path.basename(file.path);
      const imports: string[] = [];
      const exports: string[] = [];

      traverseDefault(ast, {
        ImportDeclaration(path: any) {
          const source = path.node.source.value;
          const specifiers = path.node.specifiers.map((spec: any) => {
            if (spec.type === 'ImportDefaultSpecifier') {
              return `default as ${spec.local.name}`;
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              return `* as ${spec.local.name}`;
            } else {
              // ImportSpecifier
              return spec.imported.name === spec.local.name
                ? spec.imported.name
                : `${spec.imported.name} as ${spec.local.name}`;
            }
          });
          imports.push(`from '${source}': { ${specifiers.join(', ')} }`);
        },
        ExportNamedDeclaration(path: any) {
          if (path.node.declaration) {
             // export const x = ...; export function y() ...
             if (path.node.declaration.declarations) {
               path.node.declaration.declarations.forEach((decl: any) => {
                 exports.push(decl.id.name);
               });
             } else if (path.node.declaration.id) {
               exports.push(path.node.declaration.id.name);
             }
          } else if (path.node.specifiers) {
             // export { x, y }
             path.node.specifiers.forEach((spec: any) => {
               exports.push(spec.exported.name);
             });
          }
        },
        ExportDefaultDeclaration(path: any) {
          exports.push('default');
        },
        ExportAllDeclaration(path: any) {
          exports.push(`* from '${path.node.source.value}'`);
        }
      });

      if (imports.length > 0 || exports.length > 0) {
        let entry = `File: ${filename}\n`;
        if (imports.length > 0) {
          entry += `  Imports:\n    ${imports.join('\n    ')}\n`;
        }
        if (exports.length > 0) {
          entry += `  Exports: ${exports.join(', ')}\n`;
        }
        graph.push(entry);
      }
    } catch (e) {
      verbose.log(`Failed to parse ${file.path} for module graph`, e);
      // We continue even if one file fails
    }
  }

  return graph.join('\n');
}
