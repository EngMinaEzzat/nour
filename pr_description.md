💡 **What:**
Replaced an N+1 `Promise.all` loop executing individual `count()` queries per category with a single aggregate query. The new implementation collects all category IDs, fetches product counts using `inArray` and `groupBy`, and maps the totals back to the respective categories in memory.

🎯 **Why:**
The previous implementation performed a network round trip to the database for every single category returned. For stores with many categories, this caused severe latency and database connection strain. Grouping the counts into a single query fundamentally solves this bottleneck.

📊 **Measured Improvement:**
Due to database provisioning limitations in the isolated sandbox environment, a runtime baseline could not be captured. However, theoretically, the improvement reduces the number of database queries from `O(N)` to `O(1)` where N is the number of categories. This reduces the DB query overhead from potentially hundreds of round-trips to exactly 1 query, vastly decreasing response latency and CPU time for this route.
