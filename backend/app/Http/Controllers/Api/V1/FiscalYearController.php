<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FiscalYear;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class FiscalYearController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $years = FiscalYear::where('company_id', $companyId)
            ->orderBy('start_date', 'desc')
            ->get();
            
        return response()->json(['success' => true, 'data' => $years]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);
        
        // Check for overlaps
        $overlap = FiscalYear::where('company_id', $companyId)
            ->where(function ($query) use ($validated) {
                $query->whereBetween('start_date', [$validated['start_date'], $validated['end_date']])
                      ->orWhereBetween('end_date', [$validated['start_date'], $validated['end_date']])
                      ->orWhere(function ($q) use ($validated) {
                          $q->where('start_date', '<=', $validated['start_date'])
                            ->where('end_date', '>=', $validated['end_date']);
                      });
            })->exists();
            
        if ($overlap) {
            throw new ConflictHttpException("Fiscal year dates overlap with an existing fiscal year.");
        }
        
        $validated['company_id'] = $companyId;
        $validated['status'] = 'OPEN';
        
        // If it's the first one, make it current
        if (!FiscalYear::where('company_id', $companyId)->exists()) {
            $validated['is_current'] = true;
        }
        
        $fy = FiscalYear::create($validated);
        
        AuditLog::log($companyId, $request->user()->id, 'FISCAL_YEAR_CREATED', $fy->id, 'FiscalYear', "Created Fiscal Year {$fy->name}");
        
        return response()->json(['success' => true, 'data' => $fy], 201);
    }
    
    public function close(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $fy = FiscalYear::where('company_id', $companyId)->findOrFail($id);
        
        $fy->status = 'CLOSED';
        $fy->save();
        
        AuditLog::log($companyId, $request->user()->id, 'FISCAL_YEAR_CLOSED', $fy->id, 'FiscalYear', "Closed Fiscal Year {$fy->name}");
        
        return response()->json(['success' => true, 'data' => $fy]);
    }
}
