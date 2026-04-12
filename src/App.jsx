import { useState } from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { ShopProvider } from './context/ShopContext';
import { LoginModal } from './components/LoginModal';
import { Navbar } from './components/layout/Navbar';
import { HomeView } from './views/HomeView';
import { HypeView } from './views/HypeView';
import { ProfileView } from './views/ProfileView';
import { ScannerView } from './views/ScannerView';
import { CommunityView } from './views/CommunityView';
import { RatingView } from './views/RatingView';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [reviewedProduct, setReviewedProduct] = useState(null);

  const handleReviewSubmitted = (product) => {
    setReviewedProduct(product);
    setActiveTab('home');
  };

  const renderView = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView onTabChange={setActiveTab} initialDetailProduct={reviewedProduct} onInitialDetailConsumed={() => setReviewedProduct(null)} />;
      case 'hype':
        return <HypeView />;
      case 'scanner':
        return <ScannerView onTabChange={setActiveTab} />;
      case 'community':
        return <CommunityView onTabChange={setActiveTab} />;
      case 'profile':
        return <ProfileView />;
      case 'rate':
        return <RatingView onTabChange={setActiveTab} onReviewSubmitted={handleReviewSubmitted} />;
      default:
        return <HomeView onTabChange={setActiveTab} initialDetailProduct={reviewedProduct} onInitialDetailConsumed={() => setReviewedProduct(null)} />;
    }
  };

  return (
    <AuthProvider>
      <ShopProvider>
        <div className="min-h-screen bg-slate-50 pb-24">
          {renderView()}
        </div>
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        <LoginModal />
      </ShopProvider>
    </AuthProvider>
  );
}

export default App;
