const fs = require('fs');

const files = [
  'src/components/FilterModal.tsx',
  'src/components/OrderCard.tsx',
  'src/components/RejectReasonModal.tsx',
  'src/screens/DashboardScreen.tsx',
  'src/screens/OrderDetailsScreen.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/screens/SettingsScreen.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Ensure useContext is imported from React
  if (!content.includes('useContext')) {
    content = content.replace(/import React(?:,?\s*\{[^\}]*\})?\s*from 'react';/, (match) => {
      if (match.includes('{')) {
        return match.replace('{', '{ useContext, ');
      }
      return match.replace("from 'react'", ", { useContext } from 'react'");
    });
  }

  // Ensure LanguageContext is imported
  if (!content.includes('LanguageContext')) {
    content = content.replace(/(import .* from 'react';)/, "$1\nimport { LanguageContext } from '../context/LanguageContext';");
  }

  // Inject const context = useContext(LanguageContext); const { t } = context || { t: (k) => k };
  const names = ['FilterModal', 'OrderCard', 'RejectReasonModal', 'OrderDetailsScreen', 'DashboardScreen', 'ProfileScreen', 'SettingsScreen'];
  names.forEach(name => {
    if (content.includes('function ' + name) || content.includes('const ' + name)) {
      if (!content.includes('useContext(LanguageContext)')) {
        const replacement = `$1\n  const context = useContext(LanguageContext);\n  const t = context ? context.t : (k: string) => k;\n`;
        // Match function name() { or const name = () => {
        content = content.replace(new RegExp(`(function\\s+${name}[^)]*\\)\\s*\\{)`), replacement);
        content = content.replace(new RegExp(`(const\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{)`), replacement);
      }
    }
  });

  fs.writeFileSync(file, content);
});
console.log('Fixed imports and t injections.');
