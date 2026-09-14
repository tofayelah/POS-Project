#!/bin/bash
mkdir -p backend/app/Models
mkdir -p backend/app/Http/Controllers/Api/V1

# User Model (update)
cat << 'PHP_EOF' > backend/app/Models/User.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $guarded = ['id'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['email_verified_at' => 'datetime', 'password' => 'hashed', 'last_login_at' => 'datetime'];

    public function roles() { return $this->belongsToMany(Role::class); }
    public function companies() { return $this->belongsToMany(Company::class, 'user_company_access'); }
    public function businessUnits() { return $this->belongsToMany(BusinessUnit::class, 'user_business_unit_access'); }
    public function branches() { return $this->belongsToMany(Branch::class, 'user_branch_access'); }
    public function warehouses() { return $this->belongsToMany(Warehouse::class, 'user_warehouse_access'); }
}
PHP_EOF

# Role Model
cat << 'PHP_EOF' > backend/app/Models/Role.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Role extends Model {
    protected $guarded = ['id'];
    public function permissions() { return $this->belongsToMany(Permission::class); }
    public function users() { return $this->belongsToMany(User::class); }
}
PHP_EOF

# Permission Model
cat << 'PHP_EOF' > backend/app/Models/Permission.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Permission extends Model {
    protected $guarded = ['id'];
    public function roles() { return $this->belongsToMany(Role::class); }
}
PHP_EOF

# Company Model
cat << 'PHP_EOF' > backend/app/Models/Company.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Company extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function businessUnits() { return $this->hasMany(BusinessUnit::class); }
    public function branches() { return $this->hasMany(Branch::class); }
}
PHP_EOF

# BusinessUnit Model
cat << 'PHP_EOF' > backend/app/Models/BusinessUnit.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class BusinessUnit extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function company() { return $this->belongsTo(Company::class); }
    public function branches() { return $this->hasMany(Branch::class); }
}
PHP_EOF

# Branch Model
cat << 'PHP_EOF' > backend/app/Models/Branch.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Branch extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function company() { return $this->belongsTo(Company::class); }
    public function businessUnit() { return $this->belongsTo(BusinessUnit::class); }
}
PHP_EOF

# Warehouse Model
cat << 'PHP_EOF' > backend/app/Models/Warehouse.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Warehouse extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function company() { return $this->belongsTo(Company::class); }
    public function businessUnit() { return $this->belongsTo(BusinessUnit::class); }
    public function branch() { return $this->belongsTo(Branch::class); }
}
PHP_EOF

# Setting Model
cat << 'PHP_EOF' > backend/app/Models/Setting.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Setting extends Model {
    protected $guarded = ['id'];
}
PHP_EOF

# AuditLog Model
cat << 'PHP_EOF' > backend/app/Models/AuditLog.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AuditLog extends Model {
    protected $guarded = ['id'];
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];
    public function auditable() { return $this->morphTo(); }
    public function user() { return $this->belongsTo(User::class); }
}
PHP_EOF
