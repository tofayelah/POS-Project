<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Maintenance Safety Controls
    |--------------------------------------------------------------------------
    |
    | Strict production guards against accidental data loss and demo injection.
    | Destructive data reset and demo data creation are strictly blocked
    | in production by default unless explicitly opted in.
    |
    */

    'allow_destructive_reset' => (bool) env('ALLOW_DESTRUCTIVE_DATA_RESET', false),

    'allow_demo_in_production' => (bool) env('ALLOW_DEMO_DATA_IN_PRODUCTION', false),

    'backup_disk' => env('MAINTENANCE_BACKUP_DISK', 'local'),

    'backup_dir' => env('MAINTENANCE_BACKUP_DIR', 'backups'),

    'retention_days' => (int) env('MAINTENANCE_BACKUP_RETENTION_DAYS', 30),
];
