import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { RailSection } from './components/RailSection';
import { TryItOnSection } from './components/TryItOnSection';
import { EditorialSections } from './components/EditorialSections';
import { Footer } from './components/Footer';
import { BagDrawer } from './components/BagDrawer';
import { AdminDashboard } from './components/AdminDashboard';

function HaleShell() {
  const { viewMode } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#141413]">
      <Header />
      {viewMode === 'admin' ? (
        <AdminDashboard />
      ) : (
        <main className="flex-1">
          <RailSection />
          <TryItOnSection />
          <EditorialSections />
          <Footer />
        </main>
      )}
      <BagDrawer />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HaleShell />
    </StoreProvider>
  );
}
