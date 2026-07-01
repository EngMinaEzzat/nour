const fs = require('fs');
const filePaths = ['lib/api-client-react/src/generated/api.schemas.ts'];

for (const filePath of filePaths) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    `  subscriptionStatus: AuthResponseSubscriptionStatus;`,
    `  subscriptionStatus: AuthResponseSubscriptionStatus;\n  trialEndsAt?: string | null;`
  );

  fs.writeFileSync(filePath, content);
}
