# Backup and Restore Procedures

## Database Backup Strategy
Our primary production database is currently hosted on a managed PostgreSQL provider (e.g., Supabase/Vercel Postgres).

1. **Owner**: Operations/DevOps Lead
2. **Frequency**: 
   - Automated continuous archiving (WAL logs) by the managed provider.
   - Daily full logical backups (e.g., `pg_dump`) exported to cold object storage.
3. **Point-in-Time Recovery (PITR)**: 
   - Managed providers usually support PITR for 7-30 days. We rely on this for accidental deletions or corruption events.
4. **Manual Export Fallback**:
   - `pg_dump -U $DB_USER -h $DB_HOST -d $DB_NAME -F c -f backup.dump`
5. **Media and Object Storage**:
   - Backups of uploaded product images and storefront assets rely on the CDN/Object storage provider's bucket versioning or replication.
6. **Secrets and Environment Variables**:
   - Kept in Vercel. Exported via `vercel env pull` during local restore drills.

## Non-Production Restore Drill
We conduct monthly restore drills to ensure our backup data is usable.
**Never run a restore drill against the production database.**

### Prerequisites
1. A fresh, isolated staging database.
2. The latest database dump file.
3. Node.js environment.

### Execution
Run the safe restore drill script locally. The script requires explicit environment flags and refuses to target the production database.

```powershell
$env:DB_RESTORE_TARGET="postgres://user:pass@localhost:5432/nour_staging"
$env:ALLOW_RESTORE_DRILL="true"
node scripts/backup-restore-drill.mjs
```

### Verification Checklist
After the restore completes, verify:
- [ ] You can log in with a known merchant account on staging.
- [ ] Product counts match the pre-backup baseline.
- [ ] Order histories are intact.
- [ ] No connections point to the production database.
- [ ] Test payments on staging successfully route to provider sandbox environments (verify that `isMockAllowed=true` or safe API keys are present).

### Limitations
- Webhook endpoints from real payment providers (e.g., Paymob) cannot be re-routed to localhost/staging during a drill without modifying the live provider console.
- Sentry errors or analytics from the restored instance might pollute production logs if environment overrides are missing.
