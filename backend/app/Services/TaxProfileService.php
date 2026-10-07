<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\TaxProfile;
use App\Models\TaxRegistration;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TaxProfileService
{
    public function getProfile(int $companyId): ?TaxProfile
    {
        return TaxProfile::with('registrations')
            ->where('company_id', $companyId)
            ->first();
    }

    public function createOrUpdateProfile(int $companyId, array $data, ?int $userId = null): TaxProfile
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $profile = TaxProfile::where('company_id', $companyId)->first();
            $oldValues = $profile ? $profile->toArray() : [];

            if ($profile) {
                $profile->update([
                    'business_unit_id' => $data['business_unit_id'] ?? $profile->business_unit_id,
                    'branch_id' => $data['branch_id'] ?? $profile->branch_id,
                    'legal_name' => $data['legal_name'] ?? $profile->legal_name,
                    'trade_name' => $data['trade_name'] ?? $profile->trade_name,
                    'bin' => $data['bin'] ?? $profile->bin,
                    'tin' => $data['tin'] ?? $profile->tin,
                    'vat_registration_number' => $data['vat_registration_number'] ?? $profile->vat_registration_number,
                    'turnover_tax_enrollment_number' => $data['turnover_tax_enrollment_number'] ?? $profile->turnover_tax_enrollment_number,
                    'taxpayer_type' => $data['taxpayer_type'] ?? $profile->taxpayer_type,
                    'tax_jurisdiction' => $data['tax_jurisdiction'] ?? $profile->tax_jurisdiction,
                    'tax_circle' => $data['tax_circle'] ?? $profile->tax_circle,
                    'tax_zone' => $data['tax_zone'] ?? $profile->tax_zone,
                    'commissionerate' => $data['commissionerate'] ?? $profile->commissionerate,
                    'effective_from' => $data['effective_from'] ?? $profile->effective_from,
                    'effective_to' => $data['effective_to'] ?? $profile->effective_to,
                    'status' => $data['status'] ?? $profile->status,
                    'address' => $data['address'] ?? $profile->address,
                    'contact_email' => $data['contact_email'] ?? $profile->contact_email,
                    'contact_phone' => $data['contact_phone'] ?? $profile->contact_phone,
                    'notes' => $data['notes'] ?? $profile->notes,
                ]);
            } else {
                $profile = TaxProfile::create([
                    'company_id' => $companyId,
                    'business_unit_id' => $data['business_unit_id'] ?? null,
                    'branch_id' => $data['branch_id'] ?? null,
                    'legal_name' => $data['legal_name'],
                    'trade_name' => $data['trade_name'] ?? $data['legal_name'],
                    'bin' => $data['bin'] ?? '',
                    'tin' => $data['tin'] ?? '',
                    'vat_registration_number' => $data['vat_registration_number'] ?? null,
                    'turnover_tax_enrollment_number' => $data['turnover_tax_enrollment_number'] ?? null,
                    'taxpayer_type' => $data['taxpayer_type'] ?? TaxProfile::TYPE_VAT_REGISTERED,
                    'tax_jurisdiction' => $data['tax_jurisdiction'] ?? 'Bangladesh',
                    'tax_circle' => $data['tax_circle'] ?? null,
                    'tax_zone' => $data['tax_zone'] ?? null,
                    'commissionerate' => $data['commissionerate'] ?? null,
                    'effective_from' => $data['effective_from'] ?? now()->toDateString(),
                    'effective_to' => $data['effective_to'] ?? null,
                    'status' => $data['status'] ?? TaxProfile::STATUS_ACTIVE,
                    'address' => $data['address'] ?? null,
                    'contact_email' => $data['contact_email'] ?? null,
                    'contact_phone' => $data['contact_phone'] ?? null,
                    'notes' => $data['notes'] ?? null,
                ]);
            }

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => $oldValues ? 'TAX_PROFILE_UPDATED' : 'TAX_PROFILE_CREATED',
                'auditable_type' => TaxProfile::class,
                'auditable_id' => $profile->id,
                'old_values' => $oldValues ?: null,
                'new_values' => $profile->toArray(),
            ]);

            return $profile;
        });
    }

    public function listRegistrations(int $companyId): Collection
    {
        return TaxRegistration::where('company_id', $companyId)
            ->orderBy('id', 'desc')
            ->get();
    }

    public function createRegistration(int $companyId, array $data, ?int $userId = null): TaxRegistration
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $registration = TaxRegistration::create([
                'company_id' => $companyId,
                'tax_profile_id' => $data['tax_profile_id'] ?? null,
                'registration_type' => $data['registration_type'],
                'registration_number' => $data['registration_number'],
                'issuing_authority' => $data['issuing_authority'] ?? 'National Board of Revenue (NBR)',
                'source_reference' => $data['source_reference'] ?? null,
                'issue_date' => $data['issue_date'],
                'effective_date' => $data['effective_date'],
                'expiry_date' => $data['expiry_date'] ?? null,
                'status' => $data['status'] ?? TaxRegistration::STATUS_ACTIVE,
                'notes' => $data['notes'] ?? null,
            ]);

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_REGISTRATION_CREATED',
                'auditable_type' => TaxRegistration::class,
                'auditable_id' => $registration->id,
                'new_values' => $registration->toArray(),
            ]);

            return $registration;
        });
    }

    public function deleteRegistration(int $companyId, int $registrationId, ?int $userId = null): bool
    {
        $reg = TaxRegistration::where('company_id', $companyId)->find($registrationId);
        if (!$reg) {
            throw new NotFoundHttpException("Tax registration ID {$registrationId} not found.");
        }

        AuditLog::create([
            'company_id' => $companyId,
            'user_id' => $userId,
            'event' => 'TAX_REGISTRATION_DELETED',
            'auditable_type' => TaxRegistration::class,
            'auditable_id' => $reg->id,
            'old_values' => $reg->toArray(),
        ]);

        return $reg->delete();
    }
}
