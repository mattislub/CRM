import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CustomerDetail from './components/CustomerDetail';
import ChargesList from './components/ChargesList';
import ReceiptsList from './components/ReceiptsList';
import ReceiptDetail from './components/ReceiptDetail';
import FundsList from './components/FundsList';
import { Customer, Charge, Receipt, DonorRequest, Yahrzeit } from './types';
import { Fund } from './types';
import { mockCustomers, mockCharges, mockReceipts, mockDonorRequests, mockYahrzeits, mockFunds } from './data/mockData';

function App() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [charges, setCharges] = useState<Charge[]>(mockCharges);
  const [receipts, setReceipts] = useState<Receipt[]>(mockReceipts);
  const [funds, setFunds] = useState<Fund[]>(mockFunds);

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הלקוח?')) {
      setCustomers(prev => prev.filter(customer => customer.id !== id));
      setCharges(prev => prev.filter(charge => charge.customerId !== id));
    }
  };

  const handleCreateCharge = (chargeData: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCharge: Charge = {
      ...chargeData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCharges(prev => [newCharge, ...prev]);
  };

  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === updatedCustomer.id ? updatedCustomer : customer
    ));
  };

  const handleAddFund = () => {
    // TODO: Implement add fund modal
    console.log('Add fund');
  };

  const handleEditFund = (fund: Fund) => {
    // TODO: Implement edit fund modal
    console.log('Edit fund:', fund);
  };

  const handleDeleteFund = (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הקרן?')) {
      setFunds(prev => prev.filter(fund => fund.id !== id));
    }
  };

  return (
    <Router>
      <Layout>
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                customers={customers} 
                charges={charges} 
                receipts={receipts}
                onSyncComplete={(newCharges) => {
                  setCharges(prev => [...prev, ...newCharges]);
                }}
              />
            } 
          />
          <Route
            path="/customers"
            element={
              <CustomerList
                customers={customers}
                onDeleteCustomer={handleDeleteCustomer}
                onUpdateCustomer={handleUpdateCustomer}
              />
            }
          />
          <Route
            path="/customer/:id"
            element={
              <CustomerDetail
                customers={customers}
                charges={charges}
                funds={funds}
                funds={funds}
                onCreateCharge={handleCreateCharge}
                onUpdateCustomer={handleUpdateCustomer}
              />
            }
          />
          <Route
            path="/charges"
            element={<ChargesList charges={charges} funds={funds} />}
          />
          <Route
            path="/receipts"
            element={<ReceiptsList receipts={receipts} />}
          />
          <Route
            path="/receipt/:id"
            element={<ReceiptDetail receipts={receipts} />}
          />
          <Route
            path="/funds"
            element={
              <FundsList
                funds={funds}
                onAddFund={handleAddFund}
                onEditFund={handleEditFund}
                onDeleteFund={handleDeleteFund}
              />
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;