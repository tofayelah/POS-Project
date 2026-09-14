import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

export default function SalesReturnCreate() {
    const [saleId, setSaleId] = useState('');
    const [returnItems, setReturnItems] = useState([]);

    const handleSearch = async () => {
        if (!saleId) return;
        const res = await axios.get(`/api/v1/sales/${saleId}/returnable-items`);
        setReturnItems(res.data.data);
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Create Sales Return</h1>
            <div className="flex gap-4 mb-6">
                <input 
                    type="text" 
                    placeholder="Enter Invoice ID or Return Number" 
                    className="border p-2 rounded w-64"
                    value={saleId}
                    onChange={(e) => setSaleId(e.target.value)}
                />
                <button 
                    onClick={handleSearch}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    Search
                </button>
            </div>
            
            <div className="bg-white shadow rounded p-4">
                <h2 className="font-bold text-lg mb-4">Returnable Items</h2>
                {returnItems.length === 0 ? (
                    <p className="text-gray-500">No returnable items found.</p>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Eligible Qty</th>
                                <th>Unit Price</th>
                                <th>Return Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returnItems.map((ri: any) => (
                                <tr key={ri.item.id}>
                                    <td>{ri.item.product_name_snapshot}</td>
                                    <td>{ri.eligible_quantity}</td>
                                    <td>{ri.item.unit_price}</td>
                                    <td>
                                        <input type="number" max={ri.eligible_quantity} className="border p-1 w-20" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
