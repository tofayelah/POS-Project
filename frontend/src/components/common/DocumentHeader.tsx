import React from 'react';
import { Building2, Globe, Mail, Phone, FileCheck } from 'lucide-react';
import { Company } from '../../types/organization';
import { useCompany } from '../../contexts/CompanyContext';

interface DocumentHeaderProps {
  title?: string;
  subtitle?: string;
  docNumber?: string;
  docDate?: string;
  className?: string;
  overrideCompany?: Company | null;
}

export function DocumentHeader({
  title,
  subtitle,
  docNumber,
  docDate,
  className = '',
  overrideCompany,
}: DocumentHeaderProps) {
  const { company: contextCompany } = useCompany();
  const company = overrideCompany || contextCompany;

  const companyName = company?.name || 'RetailCore ERP';
  const legalName = company?.legal_name && company.legal_name !== company.name ? company.legal_name : null;
  const address = company?.address || null;
  const phone = company?.phone || null;
  const email = company?.email || null;
  const website = company?.website || null;
  const vatNumber = company?.vat_registration || company?.tax_number || null;

  return (
    <div className={`border-b border-slate-200 pb-5 mb-6 ${className}`} id="document-company-header">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Company Identity */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {company?.logo_path ? (
              <img src={company.logo_path} alt={companyName} className="h-10 w-auto object-contain rounded" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
                {companyName.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none" id="doc-header-company-name">
                {companyName}
              </h2>
              {legalName && (
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  {legalName}
                </div>
              )}
            </div>
          </div>

          {address && (
            <p className="text-xs text-slate-600 max-w-md whitespace-pre-line leading-relaxed mt-2" id="doc-header-address">
              {address}
            </p>
          )}

          {/* Contact Details & VAT Registration */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
            {phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{phone}</span>
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" />
                <span>{email}</span>
              </span>
            )}
            {website && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                <span>{website.replace(/^https?:\/\//, '')}</span>
              </span>
            )}
            {vatNumber && (
              <span className="flex items-center gap-1 font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" id="doc-header-vat">
                <FileCheck className="w-3 h-3 text-indigo-600" />
                <span>VAT/BIN: {vatNumber}</span>
              </span>
            )}
          </div>
        </div>

        {/* Document Meta (if provided) */}
        {(title || docNumber || docDate) && (
          <div className="text-left md:text-right shrink-0">
            {title && (
              <div className="text-lg font-black text-slate-900 uppercase tracking-wider">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-xs text-slate-500 font-medium">
                {subtitle}
              </div>
            )}
            {docNumber && (
              <div className="text-sm font-bold font-mono text-indigo-600 mt-1">
                #{docNumber}
              </div>
            )}
            {docDate && (
              <div className="text-xs text-slate-500 mt-0.5">
                Date: <span className="font-medium text-slate-700">{docDate}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
