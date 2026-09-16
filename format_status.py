import subprocess

out = subprocess.check_output(['git', 'status', '--short']).decode('utf-8').strip().split('\n')

for line in out:
    file_path = line[3:]
    classification = "B. REQUIRED FOR PREVIOUS SPRINT / EXISTING ERP"
    reason = "Core application file"
    
    if "patch_" in file_path or "test-" in file_path or "setup-org" in file_path or "check-" in file_path or ".patch" in file_path or ".tar.gz" in file_path or "verify-mock.js" in file_path or "generate_" in file_path or file_path == "test_db.php":
        classification = "E. GENERATED / TEMPORARY FILE"
        reason = "Agent execution script or temporary file"
    elif "backend/app/Http/Controllers/Api/V1/Reports/" in file_path:
        classification = "A. REQUIRED FOR SPRINT 12.9"
        reason = "DashboardReportController containing Phase 2 KPI backend implementation"
    elif "backend/app/Http/Middleware/" in file_path:
        classification = "A. REQUIRED FOR SPRINT 12.9"
        reason = "Contains SetCurrentCompanyScope with Phase 1 IDOR security fix"
    elif "backend/tests/" in file_path:
        classification = "A. REQUIRED FOR SPRINT 12.9"
        reason = "Contains Phase 1 security regression tests"
    elif "backend/database/" in file_path:
        classification = "A. REQUIRED FOR SPRINT 12.9"
        reason = "Contains Phase 1 migrations and ReportPermissionsSeeder"
    
    print(f"- {file_path}\n  Classification: {classification}\n  Reason: {reason}")
