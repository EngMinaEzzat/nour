## 2025-05-15 - [N+1 query in category listing]
**Learning:** Found an N+1 query pattern where `GET /categories` was fetching product counts in a loop after retrieving the category list. This results in 1 + N database roundtrips.
**Action:** Use `LEFT JOIN` with `GROUP BY` and `count(table.id)` to fetch related aggregate data in a single query. Always use `getTableColumns(table)` when selecting from the primary table to ensure all schema fields are returned and prevent API regressions.
