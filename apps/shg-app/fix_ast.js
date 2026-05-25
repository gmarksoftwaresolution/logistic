const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const files = [
  'src/components/FilterModal.tsx',
  'src/components/OrderCard.tsx',
  'src/components/RejectReasonModal.tsx',
  'src/screens/DashboardScreen.tsx',
  'src/screens/OrderDetailsScreen.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/screens/SettingsScreen.tsx'
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  let hasUseContext = false;
  let hasLanguageContext = false;

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === 'react') {
        const specifiers = path.node.specifiers;
        const useContextSpecifier = specifiers.find(s => s.imported && s.imported.name === 'useContext');
        if (useContextSpecifier) {
          hasUseContext = true;
        } else {
          specifiers.push(t.importSpecifier(t.identifier('useContext'), t.identifier('useContext')));
          hasUseContext = true;
        }
      }
      if (path.node.source.value.includes('LanguageContext')) {
        hasLanguageContext = true;
      }
    },
    FunctionDeclaration(path) {
      // Find main exported functions or components
      if (path.node.id && /^[A-Z]/.test(path.node.id.name)) {
        injectT(path.node.body);
      }
    },
    ArrowFunctionExpression(path) {
      if (path.parent.type === 'VariableDeclarator' && path.parent.id && /^[A-Z]/.test(path.parent.id.name)) {
        if (path.node.body.type === 'BlockStatement') {
          injectT(path.node.body);
        }
      }
    }
  });

  function injectT(bodyNode) {
    if (bodyNode.type !== 'BlockStatement') return;
    const body = bodyNode.body;
    const hasT = body.some(n => 
      n.type === 'VariableDeclaration' && 
      n.declarations.some(d => 
        d.id.type === 'ObjectPattern' && d.id.properties.some(p => p.key && p.key.name === 't')
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

  // Inject LanguageContext import if missing
  let output = generate(ast, {}, code).code;
  if (!hasLanguageContext && !output.includes('LanguageContext')) {
    output = `import { LanguageContext } from '../context/LanguageContext';\n` + output;
  } else if (!hasLanguageContext) {
    // maybe we can just prepend it
    output = `import { LanguageContext } from '../context/LanguageContext';\n` + output;
  }

  fs.writeFileSync(filePath, output);
});
console.log('Fixed AST imports and declarations!');
