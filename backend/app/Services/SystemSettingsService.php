<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SystemSettingsService
{
    /**
     * Definition of the 20 logical setting groups and their metadata.
     */
    public const GROUPS = [
        'general' => [
            'name' => 'General Settings',
            'bn_name' => 'সাধারণ সেটিংস',
            'description' => 'Organization identity, regional formats, language, and core currency configuration.',
            'permission' => 'settings.general',
        ],
        'company' => [
            'name' => 'Company & Organization',
            'bn_name' => 'কোম্পানি ও সংস্থা',
            'description' => 'Multi-branch defaults, warehouse hierarchy, and inter-branch operational rules.',
            'permission' => 'settings.company',
        ],
        'security' => [
            'name' => 'Users & Security',
            'bn_name' => 'ব্যবহারকারী ও নিরাপত্তা',
            'description' => 'Password policy, session timeout, brute-force lockout, and Sanctum tokens.',
            'permission' => 'settings.security',
        ],
        'pos' => [
            'name' => 'Point of Sale (POS)',
            'bn_name' => 'পয়েন্ট অব সেল (পিওএস)',
            'description' => 'Receipt formatting (58mm/80mm/A4), discount limits, and cashier override controls.',
            'permission' => 'settings.pos',
        ],
        'sales' => [
            'name' => 'Sales & Invoicing',
            'bn_name' => 'বিক্রয় ও ইনভয়েসিং',
            'description' => 'Default credit limits, payment terms, return windows, and rounding policies.',
            'permission' => 'settings.sales',
        ],
        'purchase' => [
            'name' => 'Procurement & Purchase',
            'bn_name' => 'ক্রয় ও সংগ্রহ',
            'description' => 'PO approval thresholds, three-way matching, and supplier payment rules.',
            'permission' => 'settings.purchase',
        ],
        'inventory' => [
            'name' => 'Inventory & Warehousing',
            'bn_name' => 'ইনভেন্টরি ও গুদাম',
            'description' => 'Valuation methods (Moving Average/FIFO), batch/expiry alerts, and negative stock flags.',
            'permission' => 'settings.inventory',
        ],
        'accounting' => [
            'name' => 'Accounting & GL',
            'bn_name' => 'অ্যাকাউন্টিং ও সাধারণ খতিয়ান',
            'description' => 'Chart of Accounts integration, auto-posting rules, AR/AP/COGS mappings.',
            'permission' => 'settings.accounting',
        ],
        'vat' => [
            'name' => 'Bangladesh VAT & Tax',
            'bn_name' => 'বাংলাদেশ ভ্যাট ও কর',
            'description' => 'BIN registration, standard 15% VAT rate, Mushak 6.3 parameters, and tax rounding.',
            'permission' => 'settings.vat',
        ],
        'payments' => [
            'name' => 'Payment & Tenders',
            'bn_name' => 'পেমেন্ট ও মাধ্যম',
            'description' => 'Cash, Card, bKash, Nagad, Bank Transfer, and tender fee configurations.',
            'permission' => 'settings.payments',
        ],
        'crm' => [
            'name' => 'Customers & CRM',
            'bn_name' => 'গ্রাহক ও সিআরএম',
            'description' => 'Loyalty program ratios, point redemptions, store credit policies, and CRM follow-ups.',
            'permission' => 'settings.crm',
        ],
        'hr' => [
            'name' => 'HR & Payroll',
            'bn_name' => 'এইচআর ও পেরোল',
            'description' => 'Working days, standard hours, overtime multipliers, and automated GL postings.',
            'permission' => 'settings.hr',
        ],
        'ecommerce' => [
            'name' => 'E-Commerce & Omnichannel',
            'bn_name' => 'ই-কমার্স ও ওমনিচ্যানেল',
            'description' => 'Default online warehouse, stock reservation window, COD, and standard shipping fees.',
            'permission' => 'settings.ecommerce',
        ],
        'notifications' => [
            'name' => 'Notifications & Alerts',
            'bn_name' => 'বিজ্ঞপ্তি ও অ্যালার্ট',
            'description' => 'SMS gateway credentials, alert emails, and low-stock/expiry trigger configurations.',
            'permission' => 'settings.notifications',
        ],
        'numbering' => [
            'name' => 'Document Numbering',
            'bn_name' => 'ডকুমেন্ট নম্বর বিন্যাস',
            'description' => 'Concurrency-safe prefix and sequence formatting across all ERP transactions.',
            'permission' => 'settings.numbering',
        ],
        'bi' => [
            'name' => 'BI & Executive Reporting',
            'bn_name' => 'বিআই ও এক্সিকিউটিভ রিপোর্টিং',
            'description' => 'Default executive dashboard, KPI targets, and analytical export preferences.',
            'permission' => 'settings.bi',
        ],
        'maintenance' => [
            'name' => 'Backup & Maintenance',
            'bn_name' => 'ব্যাকআপ ও রক্ষণাবেক্ষণ',
            'description' => 'Backup schedule, retention policies, system health, and maintenance toggles.',
            'permission' => 'settings.maintenance',
        ],
        'localization' => [
            'name' => 'Localization & Format',
            'bn_name' => 'স্থানীয়করণ ও বিন্যাস',
            'description' => 'Primary/fallback languages, Bengali numeral support, and calendar systems.',
            'permission' => 'settings.localization',
        ],
        'audit' => [
            'name' => 'Audit & Compliance',
            'bn_name' => 'অডিট ও সম্মতি',
            'description' => 'Audit log retention, mandatory void reasons, and financial audit flags.',
            'permission' => 'settings.audit',
        ],
        'system' => [
            'name' => 'System Information',
            'bn_name' => 'সিস্টেম তথ্য',
            'description' => 'Runtime engine metadata, framework versions, database specifications, and status.',
            'permission' => 'settings.view',
        ],
    ];

    /**
     * Default configuration dictionary across all 20 groups with types, defaults, and sensitive flags.
     */
    public const DEFAULTS = [
        'general' => [
            'company_name' => ['type' => 'string', 'default' => 'RetailCore Bangladesh', 'description' => 'Public trading name'],
            'legal_name' => ['type' => 'string', 'default' => 'RetailCore Bangladesh Ltd.', 'description' => 'Registered corporate legal name'],
            'business_type' => ['type' => 'string', 'default' => 'Retail & Wholesale', 'description' => 'Type of business operation'],
            'contact_phone' => ['type' => 'string', 'default' => '+880 1700-000000', 'description' => 'Primary customer hotline'],
            'contact_email' => ['type' => 'string', 'default' => 'info@retailcore.com.bd', 'description' => 'Corporate email address'],
            'website' => ['type' => 'string', 'default' => 'https://retailcore.com.bd', 'description' => 'Company website'],
            'address' => ['type' => 'string', 'default' => 'Dhaka, Bangladesh', 'description' => 'Registered head office address'],
            'logo_url' => ['type' => 'string', 'default' => '', 'description' => 'Brand logo URL'],
            'default_language' => ['type' => 'string', 'default' => 'en', 'description' => 'Default UI language (en/bn)'],
            'default_currency' => ['type' => 'string', 'default' => 'BDT', 'description' => 'Base currency code'],
            'currency_symbol' => ['type' => 'string', 'default' => '৳', 'description' => 'Display currency symbol'],
            'currency_position' => ['type' => 'string', 'default' => 'prefix', 'description' => 'Prefix or suffix for currency symbol'],
            'timezone' => ['type' => 'string', 'default' => 'Asia/Dhaka', 'description' => 'Standard timezone'],
            'date_format' => ['type' => 'string', 'default' => 'YYYY-MM-DD', 'description' => 'Standard date format'],
            'time_format' => ['type' => 'string', 'default' => '24h', 'description' => 'Standard time display format'],
            'decimal_precision' => ['type' => 'integer', 'default' => 2, 'description' => 'Financial decimal precision'],
            'quantity_precision' => ['type' => 'integer', 'default' => 2, 'description' => 'Inventory quantity precision'],
            'default_country' => ['type' => 'string', 'default' => 'Bangladesh', 'description' => 'Primary country'],
            'default_city' => ['type' => 'string', 'default' => 'Dhaka', 'description' => 'Primary city'],
        ],
        'company' => [
            'default_branch_id' => ['type' => 'integer', 'default' => null, 'description' => 'Default operational branch'],
            'default_warehouse_id' => ['type' => 'integer', 'default' => null, 'description' => 'Default fulfillment warehouse'],
            'default_pos_branch_id' => ['type' => 'integer', 'default' => null, 'description' => 'Default POS checkout branch'],
            'default_inventory_warehouse_id' => ['type' => 'integer', 'default' => null, 'description' => 'Default warehouse for stock counting'],
            'allow_multi_branch_cross_sales' => ['type' => 'boolean', 'default' => false, 'description' => 'Allow selling inventory from other branches'],
            'allow_inter_warehouse_transfers' => ['type' => 'boolean', 'default' => true, 'description' => 'Enable warehouse-to-warehouse stock movements'],
            'require_transfer_approval' => ['type' => 'boolean', 'default' => true, 'description' => 'Require manager approval for inter-branch transfer'],
        ],
        'security' => [
            'session_timeout_minutes' => ['type' => 'integer', 'default' => 60, 'description' => 'Inactivity timeout before logout in minutes'],
            'max_login_attempts' => ['type' => 'integer', 'default' => 5, 'description' => 'Maximum failed logins before IP lockout'],
            'lockout_duration_minutes' => ['type' => 'integer', 'default' => 15, 'description' => 'Duration of brute-force lockout in minutes'],
            'password_min_length' => ['type' => 'integer', 'default' => 8, 'description' => 'Minimum password length required'],
            'password_require_uppercase' => ['type' => 'boolean', 'default' => true, 'description' => 'Require uppercase character in passwords'],
            'password_require_number' => ['type' => 'boolean', 'default' => true, 'description' => 'Require number in passwords'],
            'password_require_special_char' => ['type' => 'boolean', 'default' => true, 'description' => 'Require special character in passwords'],
            'password_expiry_days' => ['type' => 'integer', 'default' => 90, 'description' => 'Days until forced password reset (0 to disable)'],
            'token_expiration_minutes' => ['type' => 'integer', 'default' => 1440, 'description' => 'Sanctum API personal access token TTL in minutes'],
            'audit_login_events' => ['type' => 'boolean', 'default' => true, 'description' => 'Record all sign-in and sign-out events in AuditLog'],
            'require_sensitive_action_approval' => ['type' => 'boolean', 'default' => true, 'description' => 'Require supervisor pin/approval on void and override'],
        ],
        'pos' => [
            'receipt_size' => ['type' => 'string', 'default' => '80mm', 'description' => 'Default thermal receipt format (58mm, 80mm, A4)'],
            'receipt_language' => ['type' => 'string', 'default' => 'en', 'description' => 'Thermal receipt language (en/bn)'],
            'show_logo_on_receipt' => ['type' => 'boolean', 'default' => true, 'description' => 'Print company logo on thermal receipt'],
            'show_customer_info_on_receipt' => ['type' => 'boolean', 'default' => true, 'description' => 'Include customer name and phone on receipt'],
            'show_cashier_on_receipt' => ['type' => 'boolean', 'default' => true, 'description' => 'Print operator name on receipt'],
            'show_branch_on_receipt' => ['type' => 'boolean', 'default' => true, 'description' => 'Print branch name and address on receipt'],
            'show_barcode_on_receipt' => ['type' => 'boolean', 'default' => true, 'description' => 'Print barcode / QR code on receipt'],
            'show_vat_on_receipt' => ['type' => 'boolean', 'default' => true, 'description' => 'Print breakdown of Bangladesh VAT on receipt'],
            'show_discount_on_receipt' => ['type' => 'boolean', 'default' => true, 'description' => 'Display total discount savings on receipt'],
            'receipt_header_text' => ['type' => 'string', 'default' => 'Welcome to RetailCore', 'description' => 'Header message on thermal receipts'],
            'receipt_footer_text' => ['type' => 'string', 'default' => 'Thank you for shopping with us! Please come again.', 'description' => 'Footer greetings on receipts'],
            'allow_price_override' => ['type' => 'boolean', 'default' => false, 'description' => 'Allow cashiers to modify selling price at POS'],
            'allow_discount_override' => ['type' => 'boolean', 'default' => true, 'description' => 'Allow custom line-item or transaction discounts'],
            'max_discount_percentage' => ['type' => 'decimal', 'default' => 15.00, 'description' => 'Maximum allowed discount percentage at POS'],
            'require_manager_approval_discount' => ['type' => 'boolean', 'default' => true, 'description' => 'Require manager approval if discount exceeds threshold'],
            'require_manager_approval_price_override' => ['type' => 'boolean', 'default' => true, 'description' => 'Require manager approval to modify selling price'],
            'allow_negative_stock_sale' => ['type' => 'boolean', 'default' => false, 'description' => 'Allow completing sales when inventory is zero/negative'],
            'require_customer_for_credit_sale' => ['type' => 'boolean', 'default' => true, 'description' => 'Enforce customer selection for credit/due sales'],
            'allow_return_without_invoice' => ['type' => 'boolean', 'default' => false, 'description' => 'Permit returns without original sales invoice reference'],
        ],
        'sales' => [
            'default_customer_id' => ['type' => 'integer', 'default' => null, 'description' => 'Default walk-in customer profile'],
            'default_payment_terms_days' => ['type' => 'integer', 'default' => 0, 'description' => 'Standard credit terms in days'],
            'credit_sales_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Enable credit/due sales across sales channels'],
            'enforce_credit_limit' => ['type' => 'boolean', 'default' => true, 'description' => 'Block checkout if customer credit limit is exceeded'],
            'default_credit_limit' => ['type' => 'decimal', 'default' => 10000.00, 'description' => 'Default credit limit for new customer profiles in BDT'],
            'rounding_mode' => ['type' => 'string', 'default' => 'nearest', 'description' => 'Sales invoice total rounding mode (nearest, round_up, round_down, none)'],
            'allow_partial_payment' => ['type' => 'boolean', 'default' => true, 'description' => 'Accept partial payments against sales invoices'],
            'sales_return_window_days' => ['type' => 'integer', 'default' => 7, 'description' => 'Allowed window in days for customer returns'],
        ],
        'purchase' => [
            'default_supplier_payment_terms_days' => ['type' => 'integer', 'default' => 30, 'description' => 'Standard supplier credit period in days'],
            'po_approval_threshold' => ['type' => 'decimal', 'default' => 50000.00, 'description' => 'PO amount requiring director/manager approval in BDT'],
            'require_gr_approval' => ['type' => 'boolean', 'default' => true, 'description' => 'Require warehouse manager approval on Goods Receipts'],
            'require_purchase_invoice_approval' => ['type' => 'boolean', 'default' => true, 'description' => 'Require accounts approval before posting purchase bill'],
            'three_way_matching_required' => ['type' => 'boolean', 'default' => true, 'description' => 'Enforce PO-GRN-Invoice three-way verification before payment'],
            'price_variance_threshold_percent' => ['type' => 'decimal', 'default' => 5.00, 'description' => 'Tolerable price variance percentage between PO and invoice'],
            'purchase_return_policy_days' => ['type' => 'integer', 'default' => 14, 'description' => 'Allowed window in days for purchase debit notes/returns'],
        ],
        'inventory' => [
            'valuation_method' => ['type' => 'string', 'default' => 'moving_average', 'description' => 'Inventory financial valuation strategy (moving_average/fifo)'],
            'allow_negative_stock' => ['type' => 'boolean', 'default' => false, 'description' => 'Allow inventory balance to fall below zero'],
            'low_stock_threshold_default' => ['type' => 'integer', 'default' => 10, 'description' => 'System default low-stock threshold trigger'],
            'reorder_threshold_default' => ['type' => 'integer', 'default' => 20, 'description' => 'Default automated replenishment reorder point'],
            'batch_tracking_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Enable lot/batch tracking on inbound stock'],
            'expiry_tracking_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Track manufacturing and expiration dates'],
            'expiry_warning_days' => ['type' => 'integer', 'default' => 30, 'description' => 'Alert window in days before product batch expiration'],
            'require_stock_adjustment_approval' => ['type' => 'boolean', 'default' => true, 'description' => 'Require managerial approval for stock adjustments'],
            'require_stock_transfer_approval' => ['type' => 'boolean', 'default' => true, 'description' => 'Require receiving warehouse acknowledgment on transfers'],
            'require_stock_count_approval' => ['type' => 'boolean', 'default' => true, 'description' => 'Require supervisor approval before posting physical stock counts'],
        ],
        'accounting' => [
            'auto_posting_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Automatically generate GL journal entries on sales and purchases'],
            'default_cash_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'Default GL account for cash on hand'],
            'default_bank_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'Default GL account for primary bank balance'],
            'ar_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'Accounts Receivable trade control account'],
            'ap_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'Accounts Payable trade control account'],
            'sales_revenue_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'General sales revenue GL account'],
            'cogs_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'Cost of Goods Sold expense GL account'],
            'inventory_asset_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'Merchandise inventory asset GL account'],
            'vat_payable_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'Output VAT payable liability account'],
            'discount_account_id' => ['type' => 'integer', 'default' => null, 'description' => 'Sales discounts granted expense account'],
            'lock_posted_transactions' => ['type' => 'boolean', 'default' => true, 'description' => 'Strictly forbid deleting or modifying posted financial vouchers'],
        ],
        'vat' => [
            'bin_number' => ['type' => 'string', 'default' => '000000000-0000', 'description' => 'Business Identification Number (BIN / NBR VAT Reg)'],
            'vat_registered' => ['type' => 'boolean', 'default' => true, 'description' => 'Entity is registered under Bangladesh VAT Act 2012'],
            'default_tax_rate' => ['type' => 'decimal', 'default' => 15.00, 'description' => 'Standard Bangladesh statutory VAT percentage (15%)'],
            'tax_pricing_mode' => ['type' => 'string', 'default' => 'exclusive', 'description' => 'Prices quoted inclusive or exclusive of VAT'],
            'mushak_6_3_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Issue official NBR Mushak 6.3 tax challan on invoices'],
            'tax_rounding_rule' => ['type' => 'string', 'default' => 'nearest', 'description' => 'Calculation rounding rule for statutory tax lines'],
            'tax_period_frequency' => ['type' => 'string', 'default' => 'monthly', 'description' => 'NBR tax return filing frequency (monthly/quarterly)'],
        ],
        'payments' => [
            'enable_cash' => ['type' => 'boolean', 'default' => true, 'description' => 'Accept physical Cash payments (BDT)'],
            'enable_card' => ['type' => 'boolean', 'default' => true, 'description' => 'Accept Visa/MasterCard POS terminal transactions'],
            'enable_bkash' => ['type' => 'boolean', 'default' => true, 'description' => 'Accept bKash merchant MFS payments'],
            'enable_nagad' => ['type' => 'boolean', 'default' => true, 'description' => 'Accept Nagad merchant MFS payments'],
            'enable_bank_transfer' => ['type' => 'boolean', 'default' => true, 'description' => 'Accept BEFTN/NPSB/RTGS bank transfers'],
            'enable_store_credit' => ['type' => 'boolean', 'default' => true, 'description' => 'Allow settlement via customer store credit ledger'],
            'default_payment_method' => ['type' => 'string', 'default' => 'cash', 'description' => 'Default selected checkout payment method'],
            'bkash_charge_percent' => ['type' => 'decimal', 'default' => 0.00, 'description' => 'Customer surcharge percentage on bKash (0% recommended)'],
            'nagad_charge_percent' => ['type' => 'decimal', 'default' => 0.00, 'description' => 'Customer surcharge percentage on Nagad (0% recommended)'],
            'card_charge_percent' => ['type' => 'decimal', 'default' => 0.00, 'description' => 'POS credit/debit card fee pass-through percentage'],
            'require_payment_approval' => ['type' => 'boolean', 'default' => false, 'description' => 'Require finance verification for manual bank vouchers'],
        ],
        'crm' => [
            'loyalty_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Enable customer loyalty rewards points accumulation'],
            'loyalty_points_per_100_bdt' => ['type' => 'integer', 'default' => 1, 'description' => 'Points earned per ৳100 spent on qualifying purchases'],
            'loyalty_redemption_point_value_bdt' => ['type' => 'decimal', 'default' => 1.00, 'description' => 'Monetary value in ৳ per 1 loyalty point redeemed'],
            'min_loyalty_points_to_redeem' => ['type' => 'integer', 'default' => 100, 'description' => 'Minimum points balance required to trigger redemption'],
            'store_credit_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Enable store credit issuance on returns and overpayments'],
            'default_credit_limit' => ['type' => 'decimal', 'default' => 10000.00, 'description' => 'Starting credit limit assigned to retail accounts in BDT'],
            'customer_statement_auto_email' => ['type' => 'boolean', 'default' => false, 'description' => 'Automatically email monthly statement of accounts'],
            'follow_up_due_days' => ['type' => 'integer', 'default' => 3, 'description' => 'Days before customer CRM task follow-up alert'],
        ],
        'hr' => [
            'payroll_frequency' => ['type' => 'string', 'default' => 'monthly', 'description' => 'Standard wage settlement cycle (monthly/bi-weekly/weekly)'],
            'standard_working_hours_per_day' => ['type' => 'decimal', 'default' => 8.00, 'description' => 'Bangladesh Labor Act standard daily hours (8 hours)'],
            'standard_working_days_per_month' => ['type' => 'integer', 'default' => 26, 'description' => 'Monthly statutory working day baseline'],
            'overtime_rate_multiplier' => ['type' => 'decimal', 'default' => 1.50, 'description' => 'Overtime pay multiplier relative to basic hourly rate'],
            'late_grace_period_minutes' => ['type' => 'integer', 'default' => 15, 'description' => 'Attendance check-in grace period in minutes'],
            'require_payroll_approval' => ['type' => 'boolean', 'default' => true, 'description' => 'Require HR Director sign-off before payroll disbursement'],
            'auto_post_payroll_to_gl' => ['type' => 'boolean', 'default' => true, 'description' => 'Post salary expense journal entries upon payroll approval'],
        ],
        'ecommerce' => [
            'ecommerce_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Activate omnichannel web storefront and online catalog'],
            'default_online_warehouse_id' => ['type' => 'integer', 'default' => null, 'description' => 'Primary fulfillment warehouse for web orders'],
            'inventory_reservation_minutes' => ['type' => 'integer', 'default' => 30, 'description' => 'Minutes cart stock is reserved during checkout'],
            'cod_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Enable Cash on Delivery (COD) for Bangladesh courier delivery'],
            'online_payment_enabled' => ['type' => 'boolean', 'default' => true, 'description' => 'Accept instant online gateway payments (SSLCOMMERZ/Shurjopay)'],
            'free_shipping_threshold' => ['type' => 'decimal', 'default' => 1000.00, 'description' => 'Minimum order cart value in BDT for free shipping'],
            'standard_delivery_fee' => ['type' => 'decimal', 'default' => 60.00, 'description' => 'Inside Dhaka flat shipping fee in BDT'],
            'order_cancellation_allowed_minutes' => ['type' => 'integer', 'default' => 60, 'description' => 'Allowed window in minutes for customer self-cancellation'],
        ],
        'notifications' => [
            'enable_low_stock_alert' => ['type' => 'boolean', 'default' => true, 'description' => 'Dispatch notifications when products hit reorder points'],
            'enable_expiry_alert' => ['type' => 'boolean', 'default' => true, 'description' => 'Send batch expiration warnings ahead of alert window'],
            'enable_payment_due_alert' => ['type' => 'boolean', 'default' => true, 'description' => 'Notify finance team of maturing customer/supplier invoices'],
            'enable_security_alert' => ['type' => 'boolean', 'default' => true, 'description' => 'Broadcast alerts on failed logins or permission alterations'],
            'notification_channels' => ['type' => 'json', 'default' => ['in_app', 'email'], 'description' => 'Active delivery channels (in_app, email, sms)'],
            'alert_email' => ['type' => 'string', 'default' => 'alerts@retailcore.com.bd', 'description' => 'Dedicated address for system alert mail delivery'],
            'sms_sender_id' => ['type' => 'string', 'default' => 'RETAILCORE', 'description' => 'Registered Bangladesh BTRC mask sender ID for transactional SMS'],
            'sms_gateway_api_key' => ['type' => 'string', 'default' => '', 'sensitive' => true, 'description' => 'API token for SMS gateway provider (masked)'],
        ],
        'numbering' => [
            'pos_sale_prefix' => ['type' => 'string', 'default' => 'POS-', 'description' => 'Prefix for in-store POS receipts'],
            'pos_sale_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum zero-padded digits for POS receipts'],
            'pos_sale_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for POS receipts'],
            'sales_invoice_prefix' => ['type' => 'string', 'default' => 'INV-', 'description' => 'Prefix for wholesale/B2B sales invoices'],
            'sales_invoice_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for sales invoices'],
            'sales_invoice_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for sales invoices'],
            'sales_return_prefix' => ['type' => 'string', 'default' => 'SR-', 'description' => 'Prefix for sales credit notes / returns'],
            'sales_return_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for sales returns'],
            'sales_return_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for sales returns'],
            'purchase_order_prefix' => ['type' => 'string', 'default' => 'PO-', 'description' => 'Prefix for purchase orders'],
            'purchase_order_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for purchase orders'],
            'purchase_order_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for purchase orders'],
            'goods_receipt_prefix' => ['type' => 'string', 'default' => 'GRN-', 'description' => 'Prefix for Goods Received Notes'],
            'goods_receipt_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for goods receipts'],
            'goods_receipt_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for goods receipts'],
            'purchase_invoice_prefix' => ['type' => 'string', 'default' => 'PINV-', 'description' => 'Prefix for supplier bills / purchase invoices'],
            'purchase_invoice_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for purchase invoices'],
            'purchase_invoice_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for purchase invoices'],
            'purchase_return_prefix' => ['type' => 'string', 'default' => 'PR-', 'description' => 'Prefix for purchase returns / debit notes'],
            'purchase_return_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for purchase returns'],
            'purchase_return_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for purchase returns'],
            'payment_prefix' => ['type' => 'string', 'default' => 'PAY-', 'description' => 'Prefix for outgoing supplier payments'],
            'payment_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for payments'],
            'payment_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for payments'],
            'receipt_prefix' => ['type' => 'string', 'default' => 'REC-', 'description' => 'Prefix for incoming customer collection receipts'],
            'receipt_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for receipts'],
            'receipt_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for receipts'],
            'stock_transfer_prefix' => ['type' => 'string', 'default' => 'STR-', 'description' => 'Prefix for inter-warehouse transfers'],
            'stock_transfer_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for stock transfers'],
            'stock_transfer_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for stock transfers'],
            'stock_adjustment_prefix' => ['type' => 'string', 'default' => 'ADJ-', 'description' => 'Prefix for physical inventory adjustments'],
            'stock_adjustment_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for stock adjustments'],
            'stock_adjustment_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for stock adjustments'],
            'journal_prefix' => ['type' => 'string', 'default' => 'JV-', 'description' => 'Prefix for General Ledger Journal Vouchers'],
            'journal_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for journal vouchers'],
            'journal_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for journal vouchers'],
            'customer_prefix' => ['type' => 'string', 'default' => 'CUST-', 'description' => 'Prefix for customer account codes'],
            'customer_digits' => ['type' => 'integer', 'default' => 5, 'description' => 'Minimum digits for customer codes'],
            'customer_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for customer codes'],
            'supplier_prefix' => ['type' => 'string', 'default' => 'SUP-', 'description' => 'Prefix for supplier ledger accounts'],
            'supplier_digits' => ['type' => 'integer', 'default' => 5, 'description' => 'Minimum digits for supplier accounts'],
            'supplier_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for supplier accounts'],
            'employee_prefix' => ['type' => 'string', 'default' => 'EMP-', 'description' => 'Prefix for human resource employee ID cards'],
            'employee_digits' => ['type' => 'integer', 'default' => 5, 'description' => 'Minimum digits for employee IDs'],
            'employee_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for employee IDs'],
            'quotation_prefix' => ['type' => 'string', 'default' => 'QTN-', 'description' => 'Prefix for sales quotations and proformas'],
            'quotation_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for quotations'],
            'quotation_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for quotations'],
            'ecommerce_order_prefix' => ['type' => 'string', 'default' => 'ORD-', 'description' => 'Prefix for online web orders'],
            'ecommerce_order_digits' => ['type' => 'integer', 'default' => 6, 'description' => 'Minimum digits for online orders'],
            'ecommerce_order_sequence' => ['type' => 'integer', 'default' => 1, 'description' => 'Next sequential counter for online orders'],
        ],
        'bi' => [
            'default_dashboard' => ['type' => 'string', 'default' => 'executive', 'description' => 'Default landing BI dashboard (executive, sales, finance, inventory)'],
            'default_date_range' => ['type' => 'string', 'default' => 'this_month', 'description' => 'Standard analytics date preset (today, this_week, this_month, this_year)'],
            'daily_sales_target' => ['type' => 'decimal', 'default' => 50000.00, 'description' => 'Daily retail revenue target in BDT'],
            'monthly_revenue_target' => ['type' => 'decimal', 'default' => 1500000.00, 'description' => 'Monthly revenue benchmark in BDT'],
            'gross_margin_target_percent' => ['type' => 'decimal', 'default' => 25.00, 'description' => 'Corporate target gross profit margin percentage'],
            'allow_raw_data_export' => ['type' => 'boolean', 'default' => true, 'description' => 'Enable Excel / CSV analytical dataset export for analysts'],
            'enable_kpi_alerts' => ['type' => 'boolean', 'default' => true, 'description' => 'Trigger real-time threshold notifications on underperforming metrics'],
        ],
        'maintenance' => [
            'backup_frequency' => ['type' => 'string', 'default' => 'daily', 'description' => 'Automated snapshot schedule (hourly, daily, weekly)'],
            'backup_storage_disk' => ['type' => 'string', 'default' => 'local', 'description' => 'Target archive storage disk (local, s3, gcs)'],
            'retention_days' => ['type' => 'integer', 'default' => 30, 'description' => 'Number of days database dumps are retained before purge'],
            'maintenance_mode' => ['type' => 'boolean', 'default' => false, 'description' => 'Activate 503 maintenance mode for planned offline updates'],
            'cache_driver' => ['type' => 'string', 'default' => 'redis', 'description' => 'Active application performance cache driver'],
            'queue_driver' => ['type' => 'string', 'default' => 'database', 'description' => 'Active asynchronous background job worker queue'],
        ],
        'localization' => [
            'primary_language' => ['type' => 'string', 'default' => 'en', 'description' => 'Primary application interface language (en/bn)'],
            'fallback_language' => ['type' => 'string', 'default' => 'en', 'description' => 'Fallback language when key translation is absent'],
            'bengali_digits_enabled' => ['type' => 'boolean', 'default' => false, 'description' => 'Format financial quantities and sums in Bengali numerals (১, ২, ৩)'],
            'currency_code' => ['type' => 'string', 'default' => 'BDT', 'description' => 'Official ISO currency code'],
            'currency_symbol' => ['type' => 'string', 'default' => '৳', 'description' => 'Official currency display glyph'],
            'calendar_system' => ['type' => 'string', 'default' => 'gregorian', 'description' => 'Base calendar system (gregorian)'],
        ],
        'audit' => [
            'audit_retention_days' => ['type' => 'integer', 'default' => 365, 'description' => 'Retention window in days before archiving AuditLog records'],
            'log_financial_changes' => ['type' => 'boolean', 'default' => true, 'description' => 'Record immutable audit trail on all journal and ledger events'],
            'log_inventory_changes' => ['type' => 'boolean', 'default' => true, 'description' => 'Record immutable audit trail on stock counts and adjustments'],
            'log_user_permission_changes' => ['type' => 'boolean', 'default' => true, 'description' => 'Record security events on role and permission modifications'],
            'log_security_events' => ['type' => 'boolean', 'default' => true, 'description' => 'Record failed login attempts and token operations in audit log'],
            'require_reason_for_void' => ['type' => 'boolean', 'default' => true, 'description' => 'Enforce mandatory textual justification when voiding any voucher'],
        ],
        'system' => [
            'system_name' => ['type' => 'string', 'default' => 'RetailCore POS/ERP', 'description' => 'System product name'],
            'system_version' => ['type' => 'string', 'default' => '2.4.0-enterprise', 'description' => 'Current deployed software release version'],
            'api_version' => ['type' => 'string', 'default' => 'v1', 'description' => 'REST API protocol version'],
            'database_type' => ['type' => 'string', 'default' => 'PostgreSQL 16', 'description' => 'Relational database engine'],
            'framework_version' => ['type' => 'string', 'default' => 'Laravel 12.x / React 19', 'description' => 'Underlying application stack engines'],
            'deployment_environment' => ['type' => 'string', 'default' => 'production', 'description' => 'Active server execution environment'],
        ],
    ];

    /**
     * Get metadata of all 20 logical setting groups.
     */
    public function getGroups(): array
    {
        return self::GROUPS;
    }

    /**
     * Get default dictionary, optionally filtered by group.
     */
    public function getDefaults(?string $group = null): array
    {
        if ($group) {
            return self::DEFAULTS[$group] ?? [];
        }
        return self::DEFAULTS;
    }

    /**
     * Get merged settings for a company and group with typed casting and redaction.
     */
    public function getGroupSettings(int $companyId, string $group, ?int $branchId = null, bool $maskSecrets = true): array
    {
        $cacheKey = "company_{$companyId}_settings_{$group}" . ($branchId ? "_b{$branchId}" : '');

        return Cache::remember($cacheKey, 3600, function () use ($companyId, $group, $branchId, $maskSecrets) {
            $defaults = self::DEFAULTS[$group] ?? [];

            $query = Setting::forCompany($companyId)->inGroup($group);
            if ($branchId !== null) {
                $query->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)->orWhereNull('branch_id');
                });
            } else {
                $query->whereNull('branch_id');
            }

            $savedSettings = $query->get()->keyBy('key');

            $result = [];
            foreach ($defaults as $key => $meta) {
                $type = $meta['type'];
                $val = $meta['default'];

                if ($savedSettings->has($key)) {
                    $record = $savedSettings->get($key);
                    $val = Setting::castValue($record->value, $record->type ?: $type);
                }

                // Check for sensitive masking
                if ($maskSecrets && !empty($meta['sensitive']) && !empty($val)) {
                    $val = '••••••••';
                }

                $result[$key] = [
                    'value' => $val,
                    'type' => $type,
                    'description' => $meta['description'] ?? '',
                    'is_system' => !empty($meta['is_system']),
                    'sensitive' => !empty($meta['sensitive']),
                ];
            }

            // Include any additional keys stored in DB that might not be in defaults
            foreach ($savedSettings as $savedKey => $record) {
                if (!isset($result[$savedKey])) {
                    $result[$savedKey] = [
                        'value' => Setting::castValue($record->value, $record->type),
                        'type' => $record->type,
                        'description' => $record->description ?? '',
                        'is_system' => (bool)$record->is_system,
                        'sensitive' => $this->isSensitiveKey($savedKey),
                    ];
                }
            }

            return $result;
        });
    }

    /**
     * Get all settings grouped by group name for a company.
     */
    public function getAllSettings(int $companyId, ?int $branchId = null, bool $maskSecrets = true): array
    {
        $all = [];
        foreach (array_keys(self::GROUPS) as $group) {
            $all[$group] = $this->getGroupSettings($companyId, $group, $branchId, $maskSecrets);
        }
        return $all;
    }

    /**
     * Authoritative direct typed getter for domain services.
     */
    public function get(int $companyId, string $group, string $key, mixed $default = null, ?int $branchId = null): mixed
    {
        $cacheKey = "company_{$companyId}_settings_{$group}" . ($branchId ? "_b{$branchId}" : '');
        $groupSettings = Cache::remember($cacheKey, 3600, function () use ($companyId, $group, $branchId) {
            return $this->getGroupSettings($companyId, $group, $branchId, false);
        });

        if (isset($groupSettings[$key])) {
            return $groupSettings[$key]['value'] ?? $default;
        }

        return self::DEFAULTS[$group][$key]['default'] ?? $default;
    }

    /**
     * Set a single setting value, logging audit and invalidating cache.
     */
    public function set(int $companyId, string $group, string $key, mixed $value, ?int $userId = null, ?int $branchId = null): Setting
    {
        $defaults = self::DEFAULTS[$group][$key] ?? ['type' => 'string'];
        $type = $defaults['type'] ?? 'string';

        $existing = Setting::forCompany($companyId)
            ->inGroup($group)
            ->where('key', $key)
            ->where('branch_id', $branchId)
            ->first();

        $oldValue = $existing ? $existing->value : ($defaults['default'] ?? null);
        $serializedValue = Setting::serializeValue($value, $type);

        $setting = Setting::updateOrCreate(
            [
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'group' => $group,
                'key' => $key,
            ],
            [
                'value' => $serializedValue,
                'type' => $type,
                'description' => $defaults['description'] ?? null,
                'updated_by' => $userId,
                'created_by' => $existing ? $existing->created_by : $userId,
            ]
        );

        $this->logSettingAudit($companyId, $userId, $group, $key, $oldValue, $serializedValue, $branchId);
        $this->clearCache($companyId, $group, $branchId);

        return $setting;
    }

    /**
     * Update an entire group of settings in a single transaction with validation and auditing.
     */
    public function updateGroupSettings(int $companyId, string $group, array $values, ?int $userId = null, ?int $branchId = null): array
    {
        if (!isset(self::GROUPS[$group])) {
            throw new \InvalidArgumentException("Invalid settings group: {$group}");
        }

        $this->validateGroupValues($group, $values);

        $defaults = self::DEFAULTS[$group] ?? [];

        DB::transaction(function () use ($companyId, $group, $values, $defaults, $userId, $branchId) {
            foreach ($values as $key => $value) {
                // Ignore masked password/secret placeholders (e.g. '••••••••') so we don't overwrite secrets with bullet characters
                if ($this->isSensitiveKey($key) && ($value === '••••••••' || $value === '[REDACTED]')) {
                    continue;
                }

                $meta = $defaults[$key] ?? ['type' => 'string'];
                $type = $meta['type'] ?? 'string';

                $existing = Setting::forCompany($companyId)
                    ->inGroup($group)
                    ->where('key', $key)
                    ->where('branch_id', $branchId)
                    ->first();

                $oldValue = $existing ? $existing->value : ($meta['default'] ?? null);
                $serializedValue = Setting::serializeValue($value, $type);

                // Only update if changed
                if (!$existing || $existing->value !== $serializedValue) {
                    Setting::updateOrCreate(
                        [
                            'company_id' => $companyId,
                            'branch_id' => $branchId,
                            'group' => $group,
                            'key' => $key,
                        ],
                        [
                            'value' => $serializedValue,
                            'type' => $type,
                            'description' => $meta['description'] ?? null,
                            'updated_by' => $userId,
                            'created_by' => $existing ? $existing->created_by : $userId,
                        ]
                    );

                    $this->logSettingAudit($companyId, $userId, $group, $key, $oldValue, $serializedValue, $branchId);
                }
            }
        });

        $this->clearCache($companyId, $group, $branchId);

        return $this->getGroupSettings($companyId, $group, $branchId, true);
    }

    /**
     * Concurrency-safe atomic document number generator using row-level locking.
     */
    public function getNextDocumentNumber(int $companyId, string $type, ?int $branchId = null): string
    {
        return DB::transaction(function () use ($companyId, $type, $branchId) {
            $prefixKey = "{$type}_prefix";
            $digitsKey = "{$type}_digits";
            $seqKey = "{$type}_sequence";

            $prefixDefault = self::DEFAULTS['numbering'][$prefixKey]['default'] ?? strtoupper(substr($type, 0, 3)) . '-';
            $digitsDefault = self::DEFAULTS['numbering'][$digitsKey]['default'] ?? 6;
            $seqDefault = self::DEFAULTS['numbering'][$seqKey]['default'] ?? 1;

            $prefixSetting = Setting::forCompany($companyId)
                ->inGroup('numbering')
                ->where('key', $prefixKey)
                ->where('branch_id', $branchId)
                ->first();
            $prefix = $prefixSetting ? $prefixSetting->value : $prefixDefault;

            $digitsSetting = Setting::forCompany($companyId)
                ->inGroup('numbering')
                ->where('key', $digitsKey)
                ->where('branch_id', $branchId)
                ->first();
            $digits = $digitsSetting ? (int)$digitsSetting->value : (int)$digitsDefault;

            // Lock sequence record for update to prevent race conditions
            $seqRecord = Setting::forCompany($companyId)
                ->inGroup('numbering')
                ->where('key', $seqKey)
                ->where('branch_id', $branchId)
                ->lockForUpdate()
                ->first();

            if (!$seqRecord) {
                $currentSequence = (int)$seqDefault;
                Setting::create([
                    'company_id' => $companyId,
                    'branch_id' => $branchId,
                    'group' => 'numbering',
                    'key' => $seqKey,
                    'value' => (string)($currentSequence + 1),
                    'type' => 'integer',
                    'description' => "Next sequence for {$type}",
                ]);
            } else {
                $currentSequence = (int)$seqRecord->value;
                $seqRecord->update([
                    'value' => (string)($currentSequence + 1),
                ]);
            }

            $paddedSeq = str_pad((string)$currentSequence, $digits, '0', STR_PAD_LEFT);

            $this->clearCache($companyId, 'numbering', $branchId);

            return "{$prefix}{$paddedSeq}";
        });
    }

    /**
     * Read-only preview of next document number without incrementing.
     */
    public function previewDocumentNumber(int $companyId, string $type, ?int $branchId = null): string
    {
        $prefixKey = "{$type}_prefix";
        $digitsKey = "{$type}_digits";
        $seqKey = "{$type}_sequence";

        $prefix = (string)($this->get($companyId, 'numbering', $prefixKey, self::DEFAULTS['numbering'][$prefixKey]['default'] ?? 'DOC-', $branchId));
        $digits = (int)($this->get($companyId, 'numbering', $digitsKey, self::DEFAULTS['numbering'][$digitsKey]['default'] ?? 6, $branchId));

        $seqRecord = Setting::forCompany($companyId)
            ->inGroup('numbering')
            ->where('key', $seqKey)
            ->where('branch_id', $branchId)
            ->first();

        $seq = $seqRecord ? (int)$seqRecord->value : (int)(self::DEFAULTS['numbering'][$seqKey]['default'] ?? 1);

        $paddedSeq = str_pad((string)$seq, $digits, '0', STR_PAD_LEFT);

        return "{$prefix}{$paddedSeq}";
    }

    /**
     * System metadata report.
     */
    public function getSystemInfo(): array
    {
        return [
            'system_name' => 'RetailCore POS/ERP',
            'system_version' => '2.4.0-enterprise',
            'api_version' => 'v1',
            'laravel_version' => app()->version(),
            'php_version' => PHP_VERSION,
            'database' => config('database.default', 'pgsql'),
            'cache_driver' => config('cache.default', 'redis'),
            'queue_driver' => config('queue.default', 'database'),
            'server_time' => now()->toIso8601String(),
            'timezone' => config('app.timezone', 'UTC'),
            'environment' => app()->environment(),
        ];
    }

    /**
     * Clear company-scoped cached settings.
     */
    public function clearCache(int $companyId, ?string $group = null, ?int $branchId = null): void
    {
        if ($group) {
            $key = "company_{$companyId}_settings_{$group}" . ($branchId ? "_b{$branchId}" : '');
            Cache::forget($key);
        } else {
            foreach (array_keys(self::GROUPS) as $grp) {
                Cache::forget("company_{$companyId}_settings_{$grp}");
                if ($branchId) {
                    Cache::forget("company_{$companyId}_settings_{$grp}_b{$branchId}");
                }
            }
        }
    }

    /**
     * Validate payload values for a specific group.
     */
    protected function validateGroupValues(string $group, array $values): void
    {
        $rules = match ($group) {
            'general' => [
                'company_name' => 'nullable|string|max:255',
                'legal_name' => 'nullable|string|max:255',
                'contact_email' => 'nullable|email|max:255',
                'website' => 'nullable|url|max:255',
                'decimal_precision' => 'nullable|integer|min:0|max:4',
                'quantity_precision' => 'nullable|integer|min:0|max:4',
                'default_language' => 'nullable|in:en,bn',
            ],
            'security' => [
                'session_timeout_minutes' => 'nullable|integer|min:5|max:1440',
                'max_login_attempts' => 'nullable|integer|min:1|max:20',
                'lockout_duration_minutes' => 'nullable|integer|min:1|max:1440',
                'password_min_length' => 'nullable|integer|min:6|max:64',
                'token_expiration_minutes' => 'nullable|integer|min:15|max:43200',
            ],
            'pos' => [
                'receipt_size' => 'nullable|in:58mm,80mm,A4',
                'max_discount_percentage' => 'nullable|numeric|min:0|max:100',
            ],
            'sales' => [
                'default_credit_limit' => 'nullable|numeric|min:0',
                'rounding_mode' => 'nullable|in:nearest,round_up,round_down,none',
                'sales_return_window_days' => 'nullable|integer|min:0|max:365',
            ],
            'purchase' => [
                'po_approval_threshold' => 'nullable|numeric|min:0',
                'price_variance_threshold_percent' => 'nullable|numeric|min:0|max:100',
                'purchase_return_policy_days' => 'nullable|integer|min:0|max:365',
            ],
            'inventory' => [
                'valuation_method' => 'nullable|in:moving_average,fifo',
                'low_stock_threshold_default' => 'nullable|integer|min:0',
                'reorder_threshold_default' => 'nullable|integer|min:0',
                'expiry_warning_days' => 'nullable|integer|min:0|max:365',
            ],
            'vat' => [
                'default_tax_rate' => 'nullable|numeric|min:0|max:100',
                'tax_pricing_mode' => 'nullable|in:exclusive,inclusive',
                'tax_rounding_rule' => 'nullable|in:nearest,half_up',
                'tax_period_frequency' => 'nullable|in:monthly,quarterly,annual',
            ],
            'crm' => [
                'loyalty_points_per_100_bdt' => 'nullable|integer|min:0',
                'loyalty_redemption_point_value_bdt' => 'nullable|numeric|min:0',
                'min_loyalty_points_to_redeem' => 'nullable|integer|min:0',
                'default_credit_limit' => 'nullable|numeric|min:0',
            ],
            'hr' => [
                'payroll_frequency' => 'nullable|in:monthly,bi-weekly,weekly',
                'standard_working_hours_per_day' => 'nullable|numeric|min:1|max:24',
                'standard_working_days_per_month' => 'nullable|integer|min:1|max:31',
                'overtime_rate_multiplier' => 'nullable|numeric|min:1|max:5',
                'late_grace_period_minutes' => 'nullable|integer|min:0|max:120',
            ],
            'ecommerce' => [
                'inventory_reservation_minutes' => 'nullable|integer|min:1|max:1440',
                'free_shipping_threshold' => 'nullable|numeric|min:0',
                'standard_delivery_fee' => 'nullable|numeric|min:0',
                'order_cancellation_allowed_minutes' => 'nullable|integer|min:0|max:1440',
            ],
            'numbering' => [
                '*_prefix' => 'nullable|string|max:15',
                '*_digits' => 'nullable|integer|min:2|max:12',
                '*_sequence' => 'nullable|integer|min:1',
            ],
            default => [],
        };

        if (!empty($rules)) {
            $validator = Validator::make($values, $rules);
            if ($validator->fails()) {
                throw new ValidationException($validator);
            }
        }
    }

    /**
     * Check if a setting key holds confidential secrets that must never be exposed or logged.
     */
    protected function isSensitiveKey(string $key): bool
    {
        $needles = ['secret', 'password', 'api_key', 'token', 'private_key', 'webhook_secret'];
        foreach ($needles as $needle) {
            if (str_contains(strtolower($key), $needle)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Safely log setting modifications to AuditLog with secrets redacted.
     */
    protected function logSettingAudit(
        int $companyId,
        ?int $userId,
        string $group,
        string $key,
        ?string $oldValue,
        ?string $newValue,
        ?int $branchId = null
    ): void {
        $isSensitive = $this->isSensitiveKey($key);

        $safeOld = $isSensitive && !empty($oldValue) ? '[REDACTED]' : $oldValue;
        $safeNew = $isSensitive && !empty($newValue) ? '[REDACTED]' : $newValue;

        AuditLog::log(
            $companyId,
            $userId,
            'SETTINGS_UPDATED',
            null,
            Setting::class,
            "Updated setting {$group}.{$key}",
            ['group' => $group, 'key' => $key, 'value' => $safeOld, 'branch_id' => $branchId],
            ['group' => $group, 'key' => $key, 'value' => $safeNew, 'branch_id' => $branchId]
        );
    }
}
