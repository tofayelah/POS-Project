<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AccountingPeriodController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $periods = AccountingPeriod::where('company_id', $companyId)
            ->with('fiscalYear')
            ->orderBy('start_date', 'desc')
            ->get();
            
        return response()->json(['success' => true, 'data' => $periods]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'fiscal_year_id' => [
                'required',
                'exists:fiscal_years,id',
                Rule::exists('fiscal_years', 'id')->where('company_id', $companyId)
            ],
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);
        
        // Check for overlaps
        $overlap = AccountingPeriod::where('company_id', $companyId)
            ->where(function ($query) use ($validated) {
                $query->whereBetween('start_date', [$validated['start_date'], $validated['end_date']])
                      ->orWhereBetween('end_date', [$validated['start_date'], $validated['end_date']])
                      ->orWhere(function ($q) use ($validated) {
                          $q->where('start_date', '<=', $validated['start_date'])
                            ->where('end_date', '>=', $validated['end_date']);
                      });
            })->exists();
            
        if ($overlap) {
            throw new ConflictHttpException("Accounting period dates overlap with an existing period.");
        }
        
        $validated['company_id'] = $companyId;
        $validated['status'] = 'OPEN';
        
        $period = AccountingPeriod::create($validated);
        
        AuditLog::log($companyId, $request->user()->id, 'ACCOUNTING_PERIOD_CREATED', $period->id, 'AccountingPeriod', "Created Period {$period->name}");
        
        return response()->json(['success' => true, 'data' => $period], 201);
    }
    
    public function lock(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $period = AccountingPeriod::where('company_id', $companyId)->findOrFail($id);
        
        if ($period->status === 'CLOSED') throw new ConflictHttpException("Cannot lock a closed period.");
        
        $period->status = 'LOCKED';
        $period->save();
        
        AuditLog::log($companyId, $request->user()->id, 'ACCOUNTING_PERIOD_LOCKED', $period->id, 'AccountingPeriod', "Locked Period {$period->name}");
        
        return response()->json(['success' => true, 'data' => $period]);
    }

    public function unlock(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $period = AccountingPeriod::where('company_id', $companyId)->findOrFail($id);
        
        if ($period->status === 'CLOSED') throw new ConflictHttpException("Cannot unlock a closed period.");
        
        $period->status = 'OPEN';
        $period->save();
        
        AuditLog::log($companyId, $request->user()->id, 'ACCOUNTING_PERIOD_UNLOCKED', $period->id, 'AccountingPeriod', "Unlocked Period {$period->name}");
        
        return response()->json(['success' => true, 'data' => $period]);
    }

    public function close(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $period = AccountingPeriod::where('company_id', $companyId)->findOrFail($id);
        
        $period->status = 'CLOSED';
        $period->save();
        
        AuditLog::log($companyId, $request->user()->id, 'ACCOUNTING_PERIOD_CLOSED', $period->id, 'AccountingPeriod', "Closed Period {$period->name}");
        
        return response()->json(['success' => true, 'data' => $period]);
    }
}
