const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('import { LanguageContext }')) {
  code = code.replace(/import React, \{[^\}]+\} from 'react';/, (match) => {
    return match + "\nimport { LanguageContext } from '../context/LanguageContext';";
  });
}

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
});

let keysFile = 'extracted_keys.json';
let extracted = {};
if (fs.existsSync(keysFile)) {
  extracted = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
}

// Check how many keys already exist to continue the counter
let count = Object.keys(extracted).length + 1;

function getSlug(str) {
  let slug = str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (slug.length > 20) slug = slug.substring(0, 20);
  if (!slug) slug = 'str';
  return 'su_' + slug + '_' + count++;
}

traverse(ast, {
  // Inject const { t: tFn } = useContext(LanguageContext) into the main function component
  FunctionDeclaration(path) {
    if (path.node.id && path.node.id.name && path.node.id.name.endsWith('Screen')) {
      const body = path.node.body.body;
      const hasT = body.some(n => 
        n.type === 'VariableDeclaration' && 
        n.declarations.some(d => 
          d.id.type === 'ObjectPattern' && d.id.properties.some(p => p.key.name === 't')
        )
      );
      if (!hasT) {
        const tDecl = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.objectPattern([t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)]),
            t.callExpression(t.identifier('useContext'), [t.identifier('LanguageContext')])
          )
        ]);
        body.unshift(tDecl);
      }
    }
  },

  JSXText(path) {
    const text = path.node.value.replace(/\s+/g, ' ').trim();
    if (text.length > 0 && /[a-zA-Z]/.test(text)) {
      const key = getSlug(text);
      extracted[key] = text;
      path.replaceWith(t.jsxExpressionContainer(
        t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
      ));
    }
  },

  JSXAttribute(path) {
    const name = path.node.name.name;
    if (['placeholder', 'title', 'label', 'text1', 'text2', 'subtitle'].includes(name)) {
      if (path.node.value && path.node.value.type === 'StringLiteral') {
        const text = path.node.value.value.trim();
        if (text && /[a-zA-Z]/.test(text)) {
          const key = getSlug(text);
          extracted[key] = text;
          path.node.value = t.jsxExpressionContainer(
            t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
          );
        }
      }
    }
  },

  CallExpression(path) {
    // Toast.show({ text1: '...', text2: '...' })
    if (
      path.node.callee.type === 'MemberExpression' &&
      path.node.callee.object.name === 'Toast' &&
      path.node.callee.property.name === 'show'
    ) {
      const arg = path.node.arguments[0];
      if (arg && arg.type === 'ObjectExpression') {
        arg.properties.forEach(prop => {
          if (prop.key.name === 'text1' || prop.key.name === 'text2') {
            if (prop.value.type === 'StringLiteral' && prop.value.value.trim().length > 0) {
              const text = prop.value.value.trim();
              const key = getSlug(text);
              extracted[key] = text;
              prop.value = t.callExpression(t.identifier('t'), [t.stringLiteral(key)]);
            }
          }
        });
      }
    }
  }
});

const output = generate(ast, {}, code);
fs.writeFileSync(filePath, output.code);
fs.writeFileSync(keysFile, JSON.stringify(extracted, null, 2));
console.log('Done processing', filePath);
