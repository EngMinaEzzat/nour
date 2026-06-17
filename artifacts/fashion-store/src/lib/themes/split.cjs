const fs = require('fs');
const path = require('path');

const code = fs.readFileSync('artifacts/fashion-store/src/lib/themes/registry.ts', 'utf8');

const regex = /\{\s*id:\s*"([^"]+)",[\s\S]*?\},(?=\s*\{|\s*\])/g;
let match;

const listDir = 'artifacts/fashion-store/src/lib/themes/list';
if (!fs.existsSync(listDir)) fs.mkdirSync(listDir, { recursive: true });

let allExports = [];

while ((match = regex.exec(code)) !== null) {
  const id = match[1];
  const objStr = match[0].replace(/,\s*$/, '');
  const varName = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/-/g, '') + 'Theme';
  
  const fileContent = 'import type { VisualTheme } from "../types";\n\nexport const ' + varName + ': VisualTheme = ' + objStr + ';\n';
  fs.writeFileSync(path.join(listDir, id + '.ts'), fileContent);
  allExports.push({ id, varName });
}

const indexContent = '// Auto-generated registry\n' +
allExports.map(e => 'import { ' + e.varName + ' } from "./list/' + e.id + '";').join('\n') + '\n\n' +
'export const VISUAL_THEMES = [\n' +
allExports.map(e => '  ' + e.varName + ',').join('\n') + '\n' +
'];\n';

fs.writeFileSync('artifacts/fashion-store/src/lib/themes/registry.ts', indexContent);

// Types
fs.writeFileSync('artifacts/fashion-store/src/lib/themes/types.ts', 'import type { ThemeConfig } from "../store-config";\n\nexport interface VisualTheme {\n  id: string;\n  nameKey: string;\n  descKey: string;\n  emoji: string;\n  gradient: string;\n  preview: { bg: string; accent: string; text: string };\n  theme: Partial<ThemeConfig>;\n  imagePrefix?: string;\n}\n');
