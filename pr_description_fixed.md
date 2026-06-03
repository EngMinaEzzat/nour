🎯 **What:**
Fix the CI failure related to duplicate column `variant_id` on the `order_items` table. The CI fails during the workspace database migration due to `variant_id` being added in `0002_variant_images_stock.sql` and then mistakenly added *again* in `0005_kind_colonel_america.sql`.

📊 **Coverage:**
What scenarios are now tested:
- Removing the conflicting column additions from `0005_kind_colonel_america.sql` and `0005_snapshot.json`.
- Workspace database migrations run smoothly without hitting the schema duplicate constraint error `column "variant_id" of relation "order_items" already exists`.
- Drizzle check sum is successfully updated because we removed duplicate `variant_id` from the snapshot as well, preventing DB desync.

✨ **Result:**
The database migration succeeds in fresh environments (like GitHub CI and any new contributor local setups).
