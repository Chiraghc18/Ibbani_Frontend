import React, { useState, useEffect, useRef } from 'react';
import FeedManager from './FeedManager';
import WeightManager from './WeightManager';
import ExpenseManager from './ExpenseManager';
import PriceCalculator from './PriceCalculator';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('calculator');
  const [showScrollIndicators, setShowScrollIndicators] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsRef = useRef(null);
  const tabsContainerRef = useRef(null);

  const tabs = [
    { id: 'calculator', label: 'Price Calculator', icon: '💰' },
    { id: 'feed', label: 'Feed Management', icon: '🍽️' },
    { id: 'weight', label: 'Weight Management', icon: '⚖️' },
    { id: 'expenses', label: 'Expenses', icon: '📊' }
  ];

  useEffect(() => {
    const checkScroll = () => {
      if (tabsRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        setShowScrollIndicators(scrollWidth > clientWidth);
      }
    };

    const handleResize = () => {
      checkScroll();
    };

    // Initial check
    setTimeout(checkScroll, 100);

    // Add event listeners
    window.addEventListener('resize', handleResize);
    if (tabsRef.current) {
      tabsRef.current.addEventListener('scroll', checkScroll);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (tabsRef.current) {
        tabsRef.current.removeEventListener('scroll', checkScroll);
      }
    };
  }, []);

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = tabsRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      tabsRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const updateScrollState = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      
      // Update container classes for CSS styling
      const container = tabsContainerRef.current;
      if (container) {
        container.classList.toggle('scroll-start', scrollLeft <= 0);
        container.classList.toggle('scroll-end', scrollLeft >= scrollWidth - clientWidth - 1);
      }
    }
  };

  useEffect(() => {
    updateScrollState();
  }, [activeTab]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🐔 IBBANI - Pure Nati Koli</h1>
          <div className="user-info">
            <span>Welcome, <strong>{user.name}</strong> {user.isAdmin && '(Admin)'}</span>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>
        
        <div 
          className={`tabs-container ${showScrollIndicators ? 'mobile-visible' : ''}`}
          ref={tabsContainerRef}
        >
          {/* Left Scroll Indicator */}
          {showScrollIndicators && canScrollLeft && (
            <button 
              className="tabs-scroll-indicator left mobile-visible"
              onClick={() => scrollTabs('left')}
              aria-label="Scroll left"
            >
              ←
            </button>
          )}

          {/* Right Scroll Indicator */}
          {showScrollIndicators && canScrollRight && (
            <button 
              className="tabs-scroll-indicator right mobile-visible"
              onClick={() => scrollTabs('right')}
              aria-label="Scroll right"
            >
              →
            </button>
          )}

          <nav 
            className="tabs" 
            ref={tabsRef}
            onScroll={updateScrollState}
          >
            {tabs.map(tab => (
              <button 
                key={tab.id}
                className={activeTab === tab.id ? 'tab active' : 'tab'}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="dashboard-content">
        {activeTab === 'calculator' && <PriceCalculator />}
        {activeTab === 'feed' && <FeedManager />}
        {activeTab === 'weight' && <WeightManager />}
        {activeTab === 'expenses' && <ExpenseManager />}
      </main>
    </div>
  );
};

export default Dashboard;