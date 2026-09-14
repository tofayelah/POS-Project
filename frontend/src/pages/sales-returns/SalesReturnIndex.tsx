import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router';

export default function SalesReturnIndex() {
    const { data, isLoading } = useQuery({
        queryKey: ['sales-returns'],
        queryFn: async () => {
            const res = await axios.get('/api/v1/sales-returns');
            return res.data.data;
        }
    });

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Sales Returns & Exchanges</h1>
                <Link to="/sales-returns/create" className="bg-blue-600 text-white px-4 py-2 rounded">
                    Create Return
                </Link>
            </div>
            
            <div className="bg-white shadow rounded p-4">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th>Return Number</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Status</th>
                            <th>Type</th>
                            <th>Total Refund</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.data?.map((sr: any) => (
                            <tr key={sr.id}>
                                <td>{sr.return_number}</td>
                                <td>{sr.return_date}</td>
                                <td>{sr.customer?.name || 'Walk-in'}</td>
                                <td>{sr.status}</td>
                                <td>{sr.return_type}</td>
                                <td>{sr.refund_total}</td>
                                <td>
                                    <button className="text-blue-500">View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
