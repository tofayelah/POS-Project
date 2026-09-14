<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Role extends Model {
    protected $guarded = ['id'];
    public function permissions() { return $this->belongsToMany(Permission::class, 'role_permission'); }
    public function users() { return $this->belongsToMany(User::class); }
}
