<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerGroupRequest;
use App\Http\Requests\Customer\UpdateCustomerGroupRequest;
use App\Models\CustomerGroup;
use Illuminate\Http\Request;

class CustomerGroupController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('customer_groups.view');
        $companyId = $request->attributes->get('company_id');
        
        $query = CustomerGroup::where('company_id', $companyId);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $groups = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $groups
        ]);
    }

    public function store(StoreCustomerGroupRequest $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $group = CustomerGroup::create([
            'company_id' => $companyId,
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'status' => $request->status ?? 'ACTIVE',
            'created_by' => $request->user()->id
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer group created successfully',
            'data' => $group
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $this->authorize('customer_groups.view');
        $companyId = $request->attributes->get('company_id');
        
        $group = CustomerGroup::where('company_id', $companyId)->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $group
        ]);
    }

    public function update(UpdateCustomerGroupRequest $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        $group = CustomerGroup::where('company_id', $companyId)->findOrFail($id);
        
        $group->update([
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'status' => $request->status,
            'updated_by' => $request->user()->id
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer group updated successfully',
            'data' => $group
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $this->authorize('customer_groups.delete');
        $companyId = $request->attributes->get('company_id');
        
        $group = CustomerGroup::where('company_id', $companyId)->findOrFail($id);
        
        if ($group->customers()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete customer group because it is assigned to one or more customers.'
            ], 422);
        }

        $group->delete();

        return response()->json([
            'success' => true,
            'message' => 'Customer group deleted successfully'
        ]);
    }
}
