import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Login } from './lib/Login';
import { Layout } from './lib/Layout';
import { Dashboard } from './components/Dashboard';
import { VehicleList } from './components/VehicleList';
import { ChecklistForm } from './components/ChecklistForm';
import { DamageReport } from './components/DamageReport';
import { FuelLogForm } from './components/FuelLogForm';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'vehicles':
        return <VehicleList />;
      case 'checklist':
        return <ChecklistForm />;
      case 'damages':
        return <DamageReport />;
      case 'fuel':
        return <FuelLogForm />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
