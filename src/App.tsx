import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Login } from './lib/Login';
import { Layout } from './lib/Layout';
import { Dashboard } from './components/Dashboard';
import { VehicleList } from './components/VehicleList';
import { ChecklistForm } from './components/ChecklistForm';
import { DamageReport } from './components/DamageReport';
import { FuelLogForm } from './components/FuelLogForm';
import { FuelListSupervisor } from './components/FuelListSupervisor';
import { SavedReports } from './components/SavedReports';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDriverVehicle, setSelectedDriverVehicle] = useState<string | undefined>();

  // Ensure user always starts on the dashboard after logging in
  useEffect(() => {
    if (user && profile) {
      setActiveTab('dashboard');
      setSelectedDriverVehicle(undefined);
    }
  }, [user?.id, profile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-black">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          onNavigate={setActiveTab}
          onVehicleSelect={(id) => {
            setSelectedDriverVehicle(id);
            setActiveTab('checklist');
          }}
        />;
      case 'vehicles':
        return <VehicleList />;
      case 'checklist':
        return <ChecklistForm initialVehicleId={selectedDriverVehicle} />;
      case 'damages':
        return <DamageReport />;
      case 'fuel':
        return profile.role === 'supervisor' ? <FuelListSupervisor /> : <FuelLogForm />;
      case 'reports':
        return <SavedReports />;
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
