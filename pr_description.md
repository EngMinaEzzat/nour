Title: 🧪 Add tests for export-csv buildConditions

Description:
🎯 **What:** The testing gap addressed
This PR addresses the missing unit tests for the `buildConditions` function in `artifacts/api-server/src/lib/export-csv.ts`, which constructs Drizzle ORM conditions for filtering exported CSV data by tenant and date ranges. The function has also been exported so that it can be imported and tested by the test file.

📊 **Coverage:** What scenarios are now tested
The following scenarios for `buildConditions` are now tested:
- When no dates are provided (returns only the tenant ID condition).
- When only `dateFrom` is provided (adds a `gte` condition).
- When only `dateTo` is provided (adds an `lte` condition).
- When both `dateFrom` and `dateTo` are provided (adds both `gte` and `lte` conditions).

✨ **Result:** The improvement in test coverage
Test coverage is improved for the `export-csv` module in the API server by ensuring deterministic testing of condition-building logic for filtering SQL queries using `drizzle-orm`. All unit tests for `export-csv` pass properly without creating mock database data.
