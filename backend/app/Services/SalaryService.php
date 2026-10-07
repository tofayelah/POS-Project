<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\SalaryComponent;
use App\Models\SalaryStructure;
use App\Models\SalaryStructureItem;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SalaryService
{
    // ==========================================
    // SALARY COMPONENTS
    // ==========================================

    public function listComponents(int $companyId)
    {
        return SalaryComponent::where('company_id', $companyId)->orderBy('type')->orderBy('name')->get();
    }

    public function createComponent(int $companyId, array $data, ?int $userId = null): SalaryComponent
    {
        $code = strtoupper($data['code']);
        $exists = SalaryComponent::where('company_id', $companyId)->where('code', $code)->exists();
        if ($exists) {
            throw new ConflictHttpException("Salary component code '{$code}' already exists.");
        }

        $component = SalaryComponent::create([
            'company_id' => $companyId,
            'name' => $data['name'],
            'code' => $code,
            'type' => strtoupper($data['type']), // EARNING, DEDUCTION
            'calculation_method' => strtoupper($data['calculation_method'] ?? 'FIXED'), // FIXED, PERCENTAGE_OF_BASIC
            'default_amount' => (float) ($data['default_amount'] ?? 0),
            'is_taxable' => array_key_exists('is_taxable', $data) ? (bool) $data['is_taxable'] : true,
            'is_statutory' => array_key_exists('is_statutory', $data) ? (bool) $data['is_statutory'] : false,
            'status' => strtoupper($data['status'] ?? 'ACTIVE'),
        ]);

        AuditLog::log($companyId, $userId, 'SALARY_COMPONENT_CREATED', $component->id, 'SalaryComponent', "Created salary component {$component->name} ({$component->code})");

        return $component;
    }

    public function seedDefaultComponentsIfEmpty(int $companyId): void
    {
        $count = SalaryComponent::where('company_id', $companyId)->count();
        if ($count > 0) return;

        $defaults = [
            ['name' => 'Basic Salary', 'code' => 'BASIC', 'type' => 'EARNING', 'calculation_method' => 'FIXED', 'default_amount' => 0],
            ['name' => 'House Rent Allowance', 'code' => 'HOUSE_RENT', 'type' => 'EARNING', 'calculation_method' => 'PERCENTAGE_OF_BASIC', 'default_amount' => 40],
            ['name' => 'Medical Allowance', 'code' => 'MEDICAL', 'type' => 'EARNING', 'calculation_method' => 'FIXED', 'default_amount' => 2000],
            ['name' => 'Conveyance Allowance', 'code' => 'CONVEYANCE', 'type' => 'EARNING', 'calculation_method' => 'FIXED', 'default_amount' => 1500],
            ['name' => 'Food Allowance', 'code' => 'FOOD', 'type' => 'EARNING', 'calculation_method' => 'FIXED', 'default_amount' => 1000],
            ['name' => 'Festival Bonus', 'code' => 'BONUS', 'type' => 'EARNING', 'calculation_method' => 'FIXED', 'default_amount' => 0],
            ['name' => 'Income Tax Withholding', 'code' => 'TAX', 'type' => 'DEDUCTION', 'calculation_method' => 'FIXED', 'default_amount' => 0],
            ['name' => 'Provident Fund', 'code' => 'PROVIDENT_FUND', 'type' => 'DEDUCTION', 'calculation_method' => 'PERCENTAGE_OF_BASIC', 'default_amount' => 5],
        ];

        foreach ($defaults as $item) {
            SalaryComponent::create(array_merge($item, ['company_id' => $companyId, 'status' => 'ACTIVE']));
        }
    }

    // ==========================================
    // SALARY STRUCTURES
    // ==========================================

    public function listStructures(int $companyId)
    {
        return SalaryStructure::where('company_id', $companyId)
            ->with(['items.component', 'employee'])
            ->orderByDesc('id')
            ->get();
    }

    public function getEmployeeStructure(int $companyId, int $employeeId): ?SalaryStructure
    {
        return SalaryStructure::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->where('status', 'ACTIVE')
            ->with(['items.component'])
            ->latest('effective_from')
            ->first();
    }

    public function createSalaryStructure(int $companyId, array $data, ?int $userId = null): SalaryStructure
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $employeeId = $data['employee_id'] ?? null;
            $employee = $employeeId ? Employee::where('company_id', $companyId)->findOrFail($employeeId) : null;
            $name = $data['name'] ?? ($employee ? "Salary for {$employee->full_name}" : 'Salary Structure');
            $code = !empty($data['code']) ? strtoupper($data['code']) : ('STR-' . date('Ym') . '-' . rand(100, 999));
            $effectiveFrom = $data['effective_from'] ?? date('Y-m-d');

            // Deduce basic salary if not explicitly given
            $basic = (float) ($data['basic_salary'] ?? 0);
            if ($basic <= 0 && !empty($data['items'])) {
                foreach ($data['items'] as $it) {
                    $compId = $it['salary_component_id'] ?? $it['component_id'] ?? null;
                    if ($compId) {
                        $c = SalaryComponent::where('company_id', $companyId)->find($compId);
                        if ($c && ($c->code === 'BASIC' || str_contains(strtoupper($c->name), 'BASIC'))) {
                            $basic = (float) ($it['amount'] ?? $it['value'] ?? $c->default_amount);
                            break;
                        }
                    }
                }
            }

            if ($employee) {
                // Deactivate previous active structures for employee
                SalaryStructure::where('company_id', $companyId)
                    ->where('employee_id', $employee->id)
                    ->where('status', 'ACTIVE')
                    ->update(['status' => 'INACTIVE', 'effective_to' => $effectiveFrom]);
            }

            $structure = SalaryStructure::create([
                'company_id' => $companyId,
                'employee_id' => $employee?->id,
                'name' => $name,
                'code' => $code,
                'effective_from' => $effectiveFrom,
                'effective_to' => $data['effective_to'] ?? null,
                'basic_salary' => $basic,
                'gross_salary' => $basic,
                'net_salary' => $basic,
                'status' => 'ACTIVE',
                'created_by' => $userId,
            ]);

            $totalEarnings = 0;
            $totalDeductions = 0;

            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    $compId = $item['salary_component_id'] ?? $item['component_id'] ?? null;
                    if (!$compId) continue;

                    $component = SalaryComponent::where('company_id', $companyId)->findOrFail($compId);
                    $val = $item['amount'] ?? $item['value'] ?? null;
                    $pct = $item['percentage'] ?? null;
                    $calcType = $item['calculation_type'] ?? $component->calculation_method;

                    if ($calcType === 'PERCENTAGE_OF_BASIC' && $pct === null) {
                        $pct = (float) $val;
                    }

                    if ($calcType === 'PERCENTAGE_OF_BASIC' && $pct !== null) {
                        $amount = round($basic * ($pct / 100), 4);
                    } else {
                        $amount = round((float) ($val ?? $component->default_amount), 4);
                    }

                    SalaryStructureItem::create([
                        'salary_structure_id' => $structure->id,
                        'salary_component_id' => $component->id,
                        'amount' => $amount,
                        'percentage' => $pct,
                    ]);

                    if ($component->type === 'EARNING') {
                        if ($component->code !== 'BASIC') {
                            $totalEarnings += $amount;
                        }
                    } else {
                        $totalDeductions += $amount;
                    }
                }
            }

            $gross = round($basic + $totalEarnings, 4);
            $net = max(0, round($gross - $totalDeductions, 4));

            $structure->update([
                'gross_salary' => $gross,
                'net_salary' => $net,
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'SALARY_STRUCTURE_CREATED',
                $structure->id,
                'SalaryStructure',
                "Created salary structure {$structure->name} ({$structure->code}): Basic ৳{$basic}, Gross ৳{$gross}, Net ৳{$net}"
            );

            return $structure->fresh(['items.component', 'employee']);
        });
    }

    public function assignStructureToEmployee(int $companyId, int $employeeId, int $structureId, string $effectiveFrom, ?int $userId = null): SalaryStructure
    {
        return DB::transaction(function () use ($companyId, $employeeId, $structureId, $effectiveFrom, $userId) {
            $employee = Employee::where('company_id', $companyId)->findOrFail($employeeId);
            $template = SalaryStructure::where('company_id', $companyId)->with('items')->findOrFail($structureId);

            // Deactivate previous active structures for employee
            SalaryStructure::where('company_id', $companyId)
                ->where('employee_id', $employee->id)
                ->where('status', 'ACTIVE')
                ->update(['status' => 'INACTIVE', 'effective_to' => $effectiveFrom]);

            $empStructure = SalaryStructure::create([
                'company_id' => $companyId,
                'employee_id' => $employee->id,
                'name' => $template->name,
                'code' => $template->code,
                'effective_from' => $effectiveFrom,
                'basic_salary' => $template->basic_salary,
                'gross_salary' => $template->gross_salary,
                'net_salary' => $template->net_salary,
                'status' => 'ACTIVE',
                'created_by' => $userId,
            ]);

            foreach ($template->items as $item) {
                SalaryStructureItem::create([
                    'salary_structure_id' => $empStructure->id,
                    'salary_component_id' => $item->salary_component_id,
                    'amount' => $item->amount,
                    'percentage' => $item->percentage,
                ]);
            }

            AuditLog::log(
                $companyId,
                $userId,
                'SALARY_STRUCTURE_ASSIGNED',
                $empStructure->id,
                'SalaryStructure',
                "Assigned salary structure {$template->name} to employee {$employee->employee_number}"
            );

            return $empStructure->fresh(['items.component', 'employee']);
        });
    }
}
