<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Setting;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use InvalidArgumentException;

class AccountMappingService
{
    public const ROLE_INVENTORY_ASSET = 'inventory_asset';
    public const ROLE_INVENTORY_ADJUSTMENT = 'inventory_adjustment';
    public const ROLE_ACCOUNTS_PAYABLE = 'accounts_payable';
    public const ROLE_ACCOUNTS_RECEIVABLE = 'accounts_receivable';
    public const ROLE_CASH_BANK = 'cash_bank';
    public const ROLE_AP_CLEARING = 'ap_clearing';

    public const VALID_ROLES = [
        self::ROLE_INVENTORY_ASSET,
        self::ROLE_INVENTORY_ADJUSTMENT,
        self::ROLE_ACCOUNTS_PAYABLE,
        self::ROLE_ACCOUNTS_RECEIVABLE,
        self::ROLE_CASH_BANK,
        self::ROLE_AP_CLEARING,
    ];

    /**
     * Get the mapped Account model for a given role in a company.
     * Throws ConflictHttpException if mapping is unconfigured, not found, or inactive.
     */
    public function getAccount(int $companyId, string $role): Account
    {
        $setting = Setting::where('company_id', $companyId)
            ->where('group', 'accounting_mapping')
            ->where('key', $role)
            ->first();

        if (!$setting || empty($setting->value)) {
            throw new ConflictHttpException("Accounting mapping for role '{$role}' is not configured for company ID {$companyId}.");
        }

        $accountId = (int) $setting->value;
        $account = Account::where('company_id', $companyId)
            ->where('id', $accountId)
            ->first();

        if (!$account || !$account->is_active) {
            throw new ConflictHttpException("Mapped account ID {$accountId} for role '{$role}' is missing or inactive for company ID {$companyId}.");
        }

        return $account;
    }

    /**
     * Get the mapped Account ID for a given role in a company.
     */
    public function getAccountId(int $companyId, string $role): int
    {
        return $this->getAccount($companyId, $role)->id;
    }

    /**
     * Set explicit mapping for a company role.
     */
    public function setMapping(int $companyId, string $role, int $accountId): void
    {
        $account = Account::where('company_id', $companyId)
            ->where('id', $accountId)
            ->first();

        if (!$account) {
            throw new ConflictHttpException("Account ID {$accountId} does not exist for company ID {$companyId}.");
        }

        if (!$account->is_active) {
            throw new ConflictHttpException("Cannot map inactive account ID {$accountId} for role '{$role}'.");
        }

        Setting::updateOrCreate(
            [
                'company_id' => $companyId,
                'group' => 'accounting_mapping',
                'key' => $role,
            ],
            [
                'value' => (string) $accountId,
                'type' => 'string',
            ]
        );
    }

    /**
     * Check if a mapping is configured and points to an active account.
     */
    public function isConfigured(int $companyId, string $role): bool
    {
        try {
            $this->getAccount($companyId, $role);
            return true;
        } catch (ConflictHttpException $e) {
            return false;
        }
    }

    /**
     * Check if automated accounting posting is enabled for the company.
     */
    public function isAccountingEnabled(int $companyId): bool
    {
        $setting = Setting::where('company_id', $companyId)
            ->where('group', 'accounting')
            ->where('key', 'auto_posting_enabled')
            ->value('value');

        if ($setting === null) {
            return false;
        }

        return filter_var($setting, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Enable or disable automated accounting posting for the company.
     */
    public function setAccountingEnabled(int $companyId, bool $enabled): void
    {
        Setting::updateOrCreate(
            [
                'company_id' => $companyId,
                'group' => 'accounting',
                'key' => 'auto_posting_enabled',
            ],
            [
                'value' => $enabled ? '1' : '0',
                'type' => 'boolean',
            ]
        );
    }
}
