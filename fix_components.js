const fs = require('fs');

function updateFile(filePath, regex, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content);
}

// In EditorLeftSidebar, we should pass config.brand.personality
updateFile('artifacts/fashion-store/src/components/editor/EditorLeftSidebar.tsx',
  /config\.brand\.category,\n      t,\n    \);/g,
  `config.brand.category,\n      t,\n      config.brand.personality\n    );`
);

// In InspectorPanel, we should pass theme.brand.personality. Wait, where does theme come from?
// the props are: { section, updateSection, theme, categories, onThemeChange }
// Wait, `theme` is actually `StoreConfig['theme']` (so ThemeConfig), no it's `StoreConfig['theme']`. Let me check InspectorPanel props.
