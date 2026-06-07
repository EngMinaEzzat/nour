🎯 What: Added a missing error path test case for the outermost try/catch block in the POST /exports route.
📊 Coverage: We simulate an unexpected failure during the early stages of processing the request (e.g. database failure when saving the export job) by mocking the `db.insert` call. This triggers the 500 error response {"error": "فشل التصدير"}.
✨ Result: The API route is now fully covered including unexpected failures before `buildExportRows` begins executing.
