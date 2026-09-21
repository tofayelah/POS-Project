<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'name' => fake()->company(),
            'code' => strtoupper(fake()->lexify('???')) . '-' . fake()->numberBetween(100, 999),
            'country' => 'BD',
            'currency_code' => 'BDT',
            'status' => 'active',
        ];
    }
}
