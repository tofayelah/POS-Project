# Production Disaster Recovery

This document outlines the disaster recovery plan for the POS/ERP system.

## 1. Failure Scenarios and Responses

### Scenario A: Database Corruption or Data Loss
- **Trigger**: Malicious action, accidental deletion, or storage failure.
- **Action**: 
  1. Immediately stop the web container to prevent further state corruption.
  2. Provision a new database volume if hardware failure is suspected.
  3. Execute the Restore Procedure defined in `PRODUCTION_BACKUP_AND_RESTORE.md` using the most recent uncorrupted backup.
  4. Manually re-enter any known critical transactions missing between the backup time and the failure time based on external paper trails/receipts if available.

### Scenario B: Server/Hardware Failure
- **Trigger**: The host machine becomes entirely unreachable.
- **Action**:
  1. Provision a new host machine on a different availability zone/provider.
  2. Clone the application repository.
  3. Retrieve the latest `.env` backup from the secure vault.
  4. Run `docker-compose up -d --build`.
  5. Execute the Restore Procedure to pull the latest database and storage backups.
  6. Update DNS records (A/CNAME) to point to the new host IP.

### Scenario C: Security Compromise
- **Trigger**: Unauthorized access detected.
- **Action**:
  1. Sever external access (shut down Nginx or update firewall rules).
  2. Identify the vulnerability (e.g., compromised credentials, unpatched dependency).
  3. Rotate ALL secrets: `APP_KEY`, database passwords, API keys, and user session tokens (`php artisan cache:clear` and DB session clearing).
  4. Restore database to a point *before* the compromise if data tampering occurred.
  5. Deploy patched code and bring the system back online.

## 2. Verification Post-Recovery
After any disaster recovery:
1. Verify the exact total of the `Sales` matching the `Customer Ledger`.
2. Verify total `Inventory Valuation`.
3. Verify Journal balances (`Total Debit == Total Credit`).
4. Ensure standard login workflows function correctly.

## 3. Rollback
If the disaster recovery itself fails or causes further instability, retain the state of the *original* corrupted/failed system (do not delete the broken volumes) so forensic analysis and alternative data extraction methods can be attempted.
