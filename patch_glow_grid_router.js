const fs = require('fs');

const path = 'artifacts/fashion-store/src/pages/storefront.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the import to the correct file name
content = content.replace(
  'import { GlowGridStorefront } from "@/components/themes/storefronts/GlowGridStorefront";',
  'import { GlowGridStorefront } from "@/components/themes/storefronts/GlowGridStorefront";'
);
// It looks correct, let's verify if the file exists in the correct folder
