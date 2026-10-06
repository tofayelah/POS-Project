<?php

namespace App\Services;

use App\Models\PosTerminal;
use App\Models\PosSession;
use Illuminate\Support\Facades\DB;
use Exception;

class PosService
{
    protected PosShiftService $posShiftService;

    public function __construct(?PosShiftService $posShiftService = null)
    {
        $this->posShiftService = $posShiftService ?? app(PosShiftService::class);
    }

    public function getTerminals($companyId, $filters = [])
    {
        $query = PosTerminal::where('company_id', $companyId);
        if (isset($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        return $query->get();
    }

    public function createTerminal($companyId, $data)
    {
        $data['company_id'] = $companyId;
        return PosTerminal::create($data);
    }

    public function openSession($companyId, $terminalId, $cashierId, $openingCash, $notes = null)
    {
        return $this->posShiftService->openShift($companyId, $terminalId, $cashierId, $openingCash, $notes);
    }

    public function closeSession($companyId, $sessionId, $closingCash, $closedById, $notes = null)
    {
        return $this->posShiftService->closeShift($companyId, $sessionId, $closedById, $closingCash, $notes);
    }

    public function getSessionReconciliation($companyId, $sessionId)
    {
        return $this->posShiftService->getShiftReconciliation($companyId, $sessionId);
    }

    public function getShiftService(): PosShiftService
    {
        return $this->posShiftService;
    }
}
