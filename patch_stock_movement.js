const fs = require('fs');
let code = fs.readFileSync('backend/app/Models/StockMovement.php', 'utf8');

const regex = /protected static function boot\(\)[\s\S]*?parent::boot\(\);[\s\S]*?static::creating\(function \(\$model\) \{[\s\S]*?if \(empty\(\$model->uuid\)\) \{[\s\S]*?\$model->uuid = \(string\) Str::uuid\(\);[\s\S]*?\}[\s\S]*?\}\);[\s\S]*?\}/;

const newBoot = `protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });

        static::updating(function ($model) {
            throw new \\Exception("StockMovement records are immutable and cannot be updated.");
        });

        static::deleting(function ($model) {
            throw new \\Exception("StockMovement records are immutable and cannot be deleted.");
        });
    }`;

code = code.replace(regex, newBoot);
fs.writeFileSync('backend/app/Models/StockMovement.php', code);
