1.  **Analyze the CI Failure**:
    *   The CI failed during the `pnpm --filter @workspace/db run migrate` step.
    *   Error message: `DrizzleQueryError: Failed query: ALTER TABLE "order_items" ADD COLUMN "variant_id" integer;` followed by `cause: error: column "variant_id" of relation "order_items" already exists`.
    *   This indicates that a migration file (`.sql` file in `lib/db/drizzle/`) is trying to add a column `variant_id` to the `order_items` table, but the column already exists in the database schema or was previously applied in a different way or in another migration that didn't get tracked correctly, OR it's a duplicate/erroneous migration.
    *   According to the memory: *To safely delete an erroneous or duplicate Drizzle migration without causing checksum desyncs, you must remove the `.sql` migration file and delete its corresponding entry from the `meta/_journal.json` file.*

2.  **Locate the Erroneous Migration**:
    *   Search for `variant_id` in the migration files (`lib/db/drizzle/*.sql`).
    *   Identify which migration is trying to add this column.

3.  **Fix Strategy**:
    *   If there are multiple migrations adding the same column, we need to find the incorrect one (usually the latest one that is failing).
    *   Delete the `.sql` file for the failed migration.
    *   Remove its entry from `lib/db/drizzle/meta/_journal.json`.
    *   Verify the fix by running `pnpm --filter @workspace/db run migrate` locally. Wait, the problem only occurs when the CI spins up a fresh postgres DB and runs all migrations. The CI error indicates that *another* migration already added `variant_id`, or the table creation itself includes `variant_id`, and then a subsequent migration tries to add it again.
    *   Let's inspect the migrations.

4.  **Execute the Fix**:
    *   Find and remove the duplicate migration file.
    *   Update `_journal.json`.
    *   Pre-commit checks.
    *   Submit the fix.
