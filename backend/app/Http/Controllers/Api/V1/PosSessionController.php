<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PosService;
use App\Models\PosSession;
use Illuminate\Http\Request;

class PosSessionController extends Controller
{
    protected $posService;
    
    public function __construct(PosService $posService)
    {
        $this->posService = $posService;
    }
    
    public function open(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'pos_terminal_id' => 'required|exists:pos_terminals,id',
            'opening_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);
        
        try {
            $session = $this->posService->openSession(
                $companyId,
                $validated['pos_terminal_id'],
                $request->user()->id,
                $validated['opening_cash'],
                $validated['notes'] ?? null
            );
            return response()->json(['success' => true, 'data' => $session], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }
    
    public function close(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'closing_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);
        
        try {
            $session = $this->posService->closeSession(
                $companyId,
                $id,
                $validated['closing_cash'],
                $request->user()->id,
                $validated['notes'] ?? null
            );
            return response()->json(['success' => true, 'data' => $session]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }
    
    public function current(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $session = PosSession::with('terminal')
            ->where('company_id', $companyId)
            ->where('cashier_id', $request->user()->id)
            ->where('status', 'OPEN')
            ->first();
            
        if (!$session) {
            return response()->json(['success' => false, 'message' => 'No active session found'], 404);
        }
        
        return response()->json(['success' => true, 'data' => $session]);
    }
}
