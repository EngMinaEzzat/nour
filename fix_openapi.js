const fs = require('fs');

let content = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

content = content.replace(
  `          planCode,\n          subscriptionStatus,\n        ]`,
  `          planCode,\n          subscriptionStatus,\n          trialEndsAt,\n        ]`
);

fs.writeFileSync('lib/api-spec/openapi.yaml', content);
