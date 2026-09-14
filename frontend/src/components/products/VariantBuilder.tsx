import { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, AlertTriangle, Layers } from 'lucide-react';
import { Attribute, AttributeValue } from '../../types/product';
import { getAttributes } from '../../api/products';

export interface VariantRowItem {
  id?: number;
  sku: string;
  variant_name: string;
  cost_price: number;
  selling_price: number;
  wholesale_price: number;
  mrp: number;
  barcode: string;
  attribute_value_ids: number[];
  attribute_summary?: string;
  status: 'active' | 'inactive';
}

interface VariantBuilderProps {
  productCodePrefix: string;
  baseCostPrice: number;
  baseSellingPrice: number;
  baseWholesalePrice: number;
  baseMrp: number;
  initialVariants?: VariantRowItem[];
  onChange: (variants: VariantRowItem[]) => void;
}

export function VariantBuilder({
  productCodePrefix,
  baseCostPrice,
  baseSellingPrice,
  baseWholesalePrice,
  baseMrp,
  initialVariants = [],
  onChange,
}: VariantBuilderProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<number[]>([]);
  const [selectedValuesMap, setSelectedValuesMap] = useState<Record<number, number[]>>({});
  const [variants, setVariants] = useState<VariantRowItem[]>(initialVariants);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    loadAttributes();
  }, []);

  useEffect(() => {
    if (initialVariants && initialVariants.length > 0 && variants.length === 0) {
      setVariants(initialVariants);
    }
  }, [initialVariants]);

  const loadAttributes = async () => {
    try {
      const res = await getAttributes();
      setAttributes(res.data || []);
    } catch (err) {
      console.error('Failed to load attributes', err);
    }
  };

  const handleToggleAttribute = (attrId: number) => {
    if (selectedAttributeIds.includes(attrId)) {
      setSelectedAttributeIds(selectedAttributeIds.filter((id) => id !== attrId));
      const newMap = { ...selectedValuesMap };
      delete newMap[attrId];
      setSelectedValuesMap(newMap);
    } else {
      setSelectedAttributeIds([...selectedAttributeIds, attrId]);
      setSelectedValuesMap({ ...selectedValuesMap, [attrId]: [] });
    }
  };

  const handleToggleValue = (attrId: number, valId: number) => {
    const current = selectedValuesMap[attrId] || [];
    const updated = current.includes(valId)
      ? current.filter((id) => id !== valId)
      : [...current, valId];
    setSelectedValuesMap({ ...selectedValuesMap, [attrId]: updated });
  };

  // Cartesian product generator
  const handleGenerateMatrix = () => {
    const activeAttrs = attributes.filter(
      (a) => selectedAttributeIds.includes(a.id) && (selectedValuesMap[a.id]?.length || 0) > 0
    );

    if (activeAttrs.length === 0) {
      alert('Please select at least one attribute and choose one or more values.');
      return;
    }

    const valueArrays: AttributeValue[][] = activeAttrs.map((attr) => {
      const selectedValIds = selectedValuesMap[attr.id] || [];
      return (attr.values || []).filter((val) => selectedValIds.includes(val.id));
    });

    const cartesian = (arrays: AttributeValue[][]): AttributeValue[][] => {
      return arrays.reduce<AttributeValue[][]>(
        (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
        [[]]
      );
    };

    const combinations = cartesian(valueArrays);
    const prefix = productCodePrefix ? productCodePrefix.trim().toUpperCase() : 'SKU';

    const newRows: VariantRowItem[] = combinations.map((combo, idx) => {
      const nameParts = combo.map((v) => v.value);
      const codeParts = combo.map((v) => (v.code || v.value).toUpperCase().replace(/[^A-Z0-9]/g, ''));
      const sku = `${prefix}-${codeParts.join('-')}`;
      const attrIds = combo.map((v) => v.id);

      return {
        sku,
        variant_name: nameParts.join(' / '),
        cost_price: baseCostPrice || 0,
        selling_price: baseSellingPrice || 0,
        wholesale_price: baseWholesalePrice || baseSellingPrice || 0,
        mrp: baseMrp || baseSellingPrice || 0,
        barcode: '',
        attribute_value_ids: attrIds,
        attribute_summary: nameParts.join(' / '),
        status: 'active',
      };
    });

    setVariants(newRows);
    onChange(newRows);
    checkDuplicates(newRows);
  };

  const handleUpdateRow = (index: number, field: keyof VariantRowItem, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
    onChange(updated);
    checkDuplicates(updated);
  };

  const handleRemoveRow = (index: number) => {
    const updated = variants.filter((_, idx) => idx !== index);
    setVariants(updated);
    onChange(updated);
    checkDuplicates(updated);
  };

  const handleAddManualRow = () => {
    const prefix = productCodePrefix ? productCodePrefix.trim().toUpperCase() : 'SKU';
    const newRow: VariantRowItem = {
      sku: `${prefix}-VAR-${variants.length + 1}`,
      variant_name: `Custom Variant ${variants.length + 1}`,
      cost_price: baseCostPrice || 0,
      selling_price: baseSellingPrice || 0,
      wholesale_price: baseWholesalePrice || baseSellingPrice || 0,
      mrp: baseMrp || baseSellingPrice || 0,
      barcode: '',
      attribute_value_ids: [],
      status: 'active',
    };
    const updated = [...variants, newRow];
    setVariants(updated);
    onChange(updated);
    checkDuplicates(updated);
  };

  const checkDuplicates = (rows: VariantRowItem[]) => {
    const skus = new Set<string>();
    let hasDupSku = false;

    for (const r of rows) {
      const cleanSku = r.sku.trim().toLowerCase();
      if (cleanSku && skus.has(cleanSku)) {
        hasDupSku = true;
        break;
      }
      if (cleanSku) skus.add(cleanSku);
    }

    if (hasDupSku) {
      setDuplicateWarning('Warning: You have duplicate SKUs in the matrix.');
    } else {
      setDuplicateWarning(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Attribute Selection Section */}
      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Step 1: Select Attributes & Values
            </span>
          </div>
          <span className="text-xs text-slate-500">Choose attributes to generate SKU variations</span>
        </div>

        {/* Attribute Pills */}
        <div className="flex flex-wrap gap-2">
          {attributes.map((attr) => {
            const isSelected = selectedAttributeIds.includes(attr.id);
            return (
              <button
                key={attr.id}
                type="button"
                onClick={() => handleToggleAttribute(attr.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400'
                }`}
              >
                {attr.name}
              </button>
            );
          })}
        </div>

        {/* Value Checkboxes for Selected Attributes */}
        {selectedAttributeIds.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            {selectedAttributeIds.map((attrId) => {
              const attr = attributes.find((a) => a.id === attrId);
              if (!attr) return null;
              const selectedValues = selectedValuesMap[attrId] || [];

              return (
                <div key={attr.id} className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 mb-2">{attr.name} Values:</div>
                  <div className="flex flex-wrap gap-2">
                    {(attr.values || []).map((val) => {
                      const isValSelected = selectedValues.includes(val.id);
                      return (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() => handleToggleValue(attr.id, val.id)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            isValSelected
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleGenerateMatrix}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Variant Matrix</span>
              </button>
              <button
                type="button"
                onClick={handleAddManualRow}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Single Row</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Warning */}
      {duplicateWarning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{duplicateWarning}</span>
        </div>
      )}

      {/* Matrix Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Step 2: Variant Matrix ({variants.length} SKUs)
            </span>
          </div>
          {variants.length > 0 && (
            <button
              type="button"
              onClick={handleAddManualRow}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add custom SKU
            </button>
          )}
        </div>

        {variants.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs">
            No variants created yet. Select attributes above or click 'Add Single Row' to begin.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">SKU *</th>
                  <th className="py-2.5 px-3 font-semibold">Variant Name *</th>
                  <th className="py-2.5 px-2 font-semibold w-24">Cost</th>
                  <th className="py-2.5 px-2 font-semibold w-24">Selling *</th>
                  <th className="py-2.5 px-2 font-semibold w-24">Wholesale</th>
                  <th className="py-2.5 px-2 font-semibold w-24">MRP</th>
                  <th className="py-2.5 px-3 font-semibold w-36">Barcode</th>
                  <th className="py-2.5 px-2 font-semibold text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {variants.map((v, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2">
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleUpdateRow(idx, 'sku', e.target.value)}
                        placeholder="SKU Code"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={v.variant_name}
                        onChange={(e) => handleUpdateRow(idx, 'variant_name', e.target.value)}
                        placeholder="Variant description"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.cost_price}
                        onChange={(e) => handleUpdateRow(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.selling_price}
                        onChange={(e) => handleUpdateRow(idx, 'selling_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded text-right font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.wholesale_price}
                        onChange={(e) => handleUpdateRow(idx, 'wholesale_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.mrp}
                        onChange={(e) => handleUpdateRow(idx, 'mrp', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={v.barcode}
                        onChange={(e) => handleUpdateRow(idx, 'barcode', e.target.value)}
                        placeholder="Barcode (Optional)"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Remove SKU"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
