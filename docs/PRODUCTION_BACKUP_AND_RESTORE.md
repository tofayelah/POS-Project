# Production Backup and Restore Procedures

## 1. PostgreSQL Database Backup
Create a daily or hourly cron job to execute pg_dump:
```bash
docker exec -t erp_db pg_dumpall -c -U erp_user > /backups/dump_$(date +%Y-%m-%d).sql
```
Encrypt and upload the SQL dump to an off-site location (e.g., AWS S3, Google Cloud Storage) immediately.

## 2. Uploads and File Storage Backup
Archive the Laravel storage directory to capture all user-uploaded files and attachments:
```bash
tar -czvf /backups/storage_$(date +%Y-%m-%d).tar.gz ./backend/storage/app/public/
```
Upload this alongside the database backup.

## 3. Configuration and Secrets Backup
Manually securely store the `.env` file containing the `APP_KEY`, database passwords, and other integration credentials. Use a secure password manager or encrypted vault. **Do not store this with standard database backups.**

## 4. Restore Order and Procedures
*Warning: The restore procedure has been documented but has NOT been actively tested in a live environment. It is strongly recommended to rehearse this in a staging environment.*

1. **Stop Application Traffic**: Turn down Nginx or block external traffic to prevent writes.
   ```bash
   docker-compose stop nginx app
   ```
2. **Restore the Database**:
   ```bash
   cat /backups/dump_YYYY-MM-DD.sql | docker exec -i erp_db psql -U erp_user -d erp_database
   ```
3. **Restore File Storage**:
   ```bash
   tar -xzvf /backups/storage_YYYY-MM-DD.tar.gz -C ./backend/storage/app/public/
   ```
4. **Restore Configuration**: Ensure the `.env` file is properly placed.
5. **Restart and Validate**:
   ```bash
   docker-compose start app nginx
   ```
   Perform a health check and verify data integrity on the Dashboard.
