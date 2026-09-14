<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Permission extends Model {
    protected $guarded = ['id'];
    public function roles() { return $this->belongsToMany(Role::class, 'role_permission'); }
}
