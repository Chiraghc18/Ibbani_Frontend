import React, { useState, useEffect } from 'react';
import API from '../services/api';
import './DailyDataView.css';

const DailyDataView = () => {
  const [feeds, setFeeds] = useState([]);
  const [weights, setWeights] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [dailyEfficiency, setDailyEfficiency] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRange, setAutoRange] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feedsResponse, weightsResponse] = await Promise.all([
        API.get('/api/feed'),
        API.get('/api/weight')
      ]);

      setFeeds(feedsResponse.data);
      setWeights(weightsResponse.data);
      
      // Set default date range based on feeds
      setDefaultDateRange(feedsResponse.data);
      
      const generatedData = generateDailyData(feedsResponse.data, weightsResponse.data);
      setDailyData(generatedData);
      
      // Calculate daily efficiency
      const efficiencyData = calculateDailyFeedEfficiency(generatedData);
      setDailyEfficiency(efficiencyData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultDateRange = (feedData) => {
    if (!feedData || feedData.length === 0) {
      // If no feed data, use last 30 days
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];
      
      setStartDate(defaultStart);
      setEndDate(today);
      return;
    }
    
    // Sort feeds by date to find the earliest start date
    const sortedFeeds = [...feedData].sort((a, b) => 
      new Date(a.start) - new Date(b.start)
    );
    
    // Find the earliest feed start date
    const earliestFeedDate = new Date(sortedFeeds[0].start);
    
    // Set today as end date
    const today = new Date().toISOString().split('T')[0];
    
    // Set start date to earliest feed date
    const startDateStr = earliestFeedDate.toISOString().split('T')[0];
    
    setStartDate(startDateStr);
    setEndDate(today);
  };

  const generateDailyData = (feedData, weightData) => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dailyArray = [];
    
    // Sort data
    const sortedFeeds = [...feedData].sort((a, b) => 
      new Date(a.start) - new Date(b.start)
    );
    const sortedWeights = [...weightData].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Create feed cost per day per bird mapping
    let currentFeedCostPerBird = 0;
    let feedIndex = 0;
    
    // Create a map of dates to weights for easy lookup
    const weightMap = {};
    sortedWeights.forEach(weight => {
      const dateKey = new Date(weight.date).toISOString().split('T')[0];
      weightMap[dateKey] = weight.weight;
    });

    // Function to find the weight gain for a specific interval
    const findWeightGainForDate = (date) => {
      const dateObj = new Date(date);
      
      // Find which weight interval this date falls into
      for (let i = 0; i < sortedWeights.length - 1; i++) {
        const weight1Date = new Date(sortedWeights[i].date);
        const weight2Date = new Date(sortedWeights[i + 1].date);
        
        if (dateObj >= weight1Date && dateObj <= weight2Date) {
          const weight1 = sortedWeights[i].weight;
          const weight2 = sortedWeights[i + 1].weight;
          const totalDays = Math.ceil((weight2Date - weight1Date) / (1000 * 60 * 60 * 24));
          
          if (totalDays > 0) {
            return (weight2 - weight1) / totalDays;
          }
          return 0;
        }
      }
      
      // If date is before first measurement
      if (sortedWeights.length > 0) {
        const firstWeightDate = new Date(sortedWeights[0].date);
        if (dateObj < firstWeightDate) {
          // Check if there's any weight measurement after this date
          const nextWeight = sortedWeights.find(w => new Date(w.date) > dateObj);
          if (nextWeight) {
            const weight2Date = new Date(nextWeight.date);
            const weight1 = sortedWeights[0].weight;
            const weight2 = nextWeight.weight;
            const totalDays = Math.ceil((weight2Date - firstWeightDate) / (1000 * 60 * 60 * 24));
            
            if (totalDays > 0) {
              return (weight2 - weight1) / totalDays;
            }
          }
        }
      }
      
      // If date is after last measurement
      if (sortedWeights.length > 1) {
        const lastWeightDate = new Date(sortedWeights[sortedWeights.length - 1].date);
        if (dateObj > lastWeightDate) {
          const weight1 = sortedWeights[sortedWeights.length - 2].weight;
          const weight2 = sortedWeights[sortedWeights.length - 1].weight;
          const daysBetween = Math.ceil((lastWeightDate - new Date(sortedWeights[sortedWeights.length - 2].date)) / (1000 * 60 * 60 * 24));
          
          if (daysBetween > 0) {
            return (weight2 - weight1) / daysBetween;
          }
        }
      }
      
      return 0;
    };

    // Function to get interpolated weight for a date
    const getInterpolatedWeight = (date) => {
      const dateObj = new Date(date);
      
      // If exact weight exists
      if (weightMap[date]) {
        return weightMap[date];
      }
      
      // Find which interval this date falls into
      for (let i = 0; i < sortedWeights.length - 1; i++) {
        const weight1Date = new Date(sortedWeights[i].date);
        const weight2Date = new Date(sortedWeights[i + 1].date);
        
        if (dateObj >= weight1Date && dateObj <= weight2Date) {
          const weight1 = sortedWeights[i].weight;
          const weight2 = sortedWeights[i + 1].weight;
          const totalDays = Math.ceil((weight2Date - weight1Date) / (1000 * 60 * 60 * 24));
          const daysFromStart = Math.ceil((dateObj - weight1Date) / (1000 * 60 * 60 * 24));
          
          if (totalDays > 0) {
            return weight1 + ((weight2 - weight1) * daysFromStart) / totalDays;
          }
          return weight1;
        }
      }
      
      // If date is before first measurement
      if (sortedWeights.length > 0) {
        const firstWeightDate = new Date(sortedWeights[0].date);
        if (dateObj < firstWeightDate) {
          return sortedWeights[0].weight;
        }
      }
      
      // If date is after last measurement
      if (sortedWeights.length > 0) {
        const lastWeightDate = new Date(sortedWeights[sortedWeights.length - 1].date);
        if (dateObj > lastWeightDate) {
          return sortedWeights[sortedWeights.length - 1].weight;
        }
      }
      
      return 0;
    };

    // Generate data for each day
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d).toISOString().split('T')[0];
      const dateObj = new Date(currentDate);

      // Update feed cost if we've reached a new feed period
      if (feedIndex < sortedFeeds.length) {
        const feedStart = new Date(sortedFeeds[feedIndex].start);
        
        if (dateObj >= feedStart) {
          // Calculate daily feed cost per bird
          let feedEndDate;
          if (feedIndex < sortedFeeds.length - 1) {
            feedEndDate = new Date(sortedFeeds[feedIndex + 1].start);
            feedEndDate.setDate(feedEndDate.getDate() - 1);
          } else {
            feedEndDate = new Date(endDate);
          }
          
          const feedDays = Math.ceil((feedEndDate - feedStart) / (1000 * 60 * 60 * 24)) + 1;
          currentFeedCostPerBird = sortedFeeds[feedIndex].cost / sortedFeeds[feedIndex].birds / feedDays;
          
          // Move to next feed if this feed period ends
          if (dateObj >= feedEndDate) {
            feedIndex++;
          }
        }
      }

      // Get weight and weight gain for this day
      const dailyWeight = getInterpolatedWeight(currentDate);
      let dailyWeightGain = findWeightGainForDate(currentDate);
      const hasNewWeight = !!weightMap[currentDate];
      
      // For days without specific weight measurements, check if they're in a range
      if (!hasNewWeight && dailyWeightGain === 0) {
        // Check if this day falls between weight measurements
        for (let i = 0; i < sortedWeights.length - 1; i++) {
          const weight1Date = new Date(sortedWeights[i].date);
          const weight2Date = new Date(sortedWeights[i + 1].date);
          
          if (dateObj > weight1Date && dateObj < weight2Date) {
            const weight1 = sortedWeights[i].weight;
            const weight2 = sortedWeights[i + 1].weight;
            const totalDays = Math.ceil((weight2Date - weight1Date) / (1000 * 60 * 60 * 24));
            
            if (totalDays > 0) {
              dailyWeightGain = (weight2 - weight1) / totalDays;
            }
            break;
          }
        }
      }

      // Check if this date has a new feed entry (exact match)
      const hasNewFeed = sortedFeeds.some(feed => {
        const feedStartDate = new Date(feed.start).toISOString().split('T')[0];
        return feedStartDate === currentDate;
      });

      dailyArray.push({
        date: currentDate,
        feedCostPerBird: parseFloat(currentFeedCostPerBird.toFixed(4)),
        weight: parseFloat(dailyWeight.toFixed(3)),
        weightGain: parseFloat(dailyWeightGain.toFixed(4)),
        hasNewFeed: hasNewFeed,
        hasNewWeight: hasNewWeight
      });
    }

    return dailyArray;
  };

  // Calculate daily feed efficiency (feed cost per kg gain for each day)
  const calculateDailyFeedEfficiency = (data = dailyData) => {
    const efficiencyArray = [];
    
    data.forEach(day => {
      if (day.weightGain > 0 && day.feedCostPerBird > 0) {
        // Feed cost per kg gain for this day
        const feedCostPerKgGain = day.feedCostPerBird / day.weightGain;
        
        efficiencyArray.push({
          date: day.date,
          feedCostPerBird: day.feedCostPerBird,
          weightGain: day.weightGain,
          feedCostPerKgGain: feedCostPerKgGain,
          hasNewWeight: day.hasNewWeight
        });
      }
    });
    
    return efficiencyArray;
  };

  const getTotalFeedCost = () => {
    return dailyData.reduce((sum, day) => sum + day.feedCostPerBird, 0);
  };

  const getTotalWeightGain = () => {
    // Sum of daily weight gains (more accurate than final - initial)
    return dailyData.reduce((sum, day) => sum + day.weightGain, 0);
  };

  const getAverageDailyGain = () => {
    if (dailyData.length === 0) return 0;
    
    const daysWithGain = dailyData.filter(day => day.weightGain > 0);
    if (daysWithGain.length === 0) return 0;
    
    const totalGain = daysWithGain.reduce((sum, day) => sum + day.weightGain, 0);
    return totalGain / daysWithGain.length;
  };

  // Calculate feed cost per kg gain using daily data
  const getFeedCostPerKgGain = () => {
    if (dailyEfficiency.length === 0) return 0;
    
    // Simple average of daily efficiencies
    const totalEfficiency = dailyEfficiency.reduce((sum, day) => sum + day.feedCostPerKgGain, 0);
    return totalEfficiency / dailyEfficiency.length;
  };

  // Alternative method - weighted by gain
  const getWeightedFeedCostPerKgGain = () => {
    if (dailyEfficiency.length === 0) return 0;
    
    let totalWeightedCost = 0;
    let totalGainForWeighted = 0;
    
    dailyEfficiency.forEach(day => {
      // Weight the feed cost by the amount of gain
      totalWeightedCost += day.feedCostPerBird;
      totalGainForWeighted += day.weightGain;
    });
    
    if (totalGainForWeighted === 0) return 0;
    
    return totalWeightedCost / totalGainForWeighted;
  };

  // Get best and worst efficiency days
  const getEfficiencyStats = () => {
    if (dailyEfficiency.length === 0) {
      return { best: null, worst: null, average: 0 };
    }
    
    const sorted = [...dailyEfficiency].sort((a, b) => a.feedCostPerKgGain - b.feedCostPerKgGain);
    
    return {
      best: sorted[0], // Lowest cost per kg gain is best
      worst: sorted[sorted.length - 1], // Highest cost per kg gain is worst
      average: getFeedCostPerKgGain()
    };
  };

  const efficiencyStats = getEfficiencyStats();

  // Function to get actual gains from weight measurements only
  const getActualGainsFromMeasurements = () => {
    const sortedWeights = [...weights].sort((a, b) => new Date(a.date) - new Date(b.date));
    const gains = [];
    
    for (let i = 1; i < sortedWeights.length; i++) {
      const current = sortedWeights[i];
      const previous = sortedWeights[i - 1];
      
      const currentDate = new Date(current.date);
      const previousDate = new Date(previous.date);
      const daysBetween = Math.ceil((currentDate - previousDate) / (1000 * 60 * 60 * 24));
      
      if (daysBetween > 0) {
        const gain = (current.weight - previous.weight) / daysBetween;
        gains.push({
          from: previousDate.toLocaleDateString(),
          to: currentDate.toLocaleDateString(),
          days: daysBetween,
          totalGain: (current.weight - previous.weight).toFixed(3),
          dailyGain: gain.toFixed(4)
        });
      }
    }
    
    return gains;
  };

  const actualGains = getActualGainsFromMeasurements();

  const handleAutoRangeToggle = () => {
    setAutoRange(!autoRange);
    if (!autoRange) {
      // When turning auto range back on, reset to default
      fetchData();
    }
  };

  const handleSetToFullRange = () => {
    if (feeds.length > 0) {
      const sortedFeeds = [...feeds].sort((a, b) => new Date(a.start) - new Date(b.start));
      const earliestFeedDate = new Date(sortedFeeds[0].start);
      const today = new Date().toISOString().split('T')[0];
      const startDateStr = earliestFeedDate.toISOString().split('T')[0];
      
      setStartDate(startDateStr);
      setEndDate(today);
      setAutoRange(true);
    }
  };

  // Get earliest feed date for display
  const getEarliestFeedDate = () => {
    if (feeds.length === 0) return 'No feed data';
    const sortedFeeds = [...feeds].sort((a, b) => new Date(a.start) - new Date(b.start));
    return new Date(sortedFeeds[0].start).toLocaleDateString();
  };

  return (
    <div className="daily-data-view">
      <div className="daily-header">
        <h2>📊 Daily Feed Cost & Weight Gain Analysis</h2>
        <p className="subtitle">
          {autoRange ? 'Automatic range: First feed date to today' : 'Custom date range selected'}
        </p>
      </div>

      <div className="date-controls">
        <div className="range-controls">
          <div className="auto-range-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={autoRange}
                onChange={handleAutoRangeToggle}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">Auto Range</span>
            </label>
            <button 
              onClick={handleSetToFullRange}
              className="full-range-btn"
              title="Set to full available range"
            >
              🔄 Set Full Range
            </button>
          </div>
          
          <div className="range-info">
            <span className="range-info-item">
              <strong>Earliest Feed:</strong> {getEarliestFeedDate()}
            </span>
            <span className="range-info-item">
              <strong>Current Range:</strong> {startDate} to {endDate}
            </span>
          </div>
        </div>

        <div className="date-inputs">
          <div className="form-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setAutoRange(false);
              }}
              className="date-input"
              disabled={autoRange}
            />
          </div>
          <div className="form-group">
            <label>End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setAutoRange(false);
              }}
              className="date-input"
              disabled={autoRange}
            />
          </div>
          <button 
            onClick={fetchData}
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">📅</div>
          <div className="summary-content">
            <div className="summary-value">{dailyData.length}</div>
            <div className="summary-label">Total Days</div>
            <div className="summary-subtext">
              {startDate} to {endDate}
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">🍽️</div>
          <div className="summary-content">
            <div className="summary-value">₹{getTotalFeedCost().toFixed(2)}</div>
            <div className="summary-label">Total Feed Cost per Bird</div>
            <div className="summary-subtext">
              {feeds.length} feed periods
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <div className="summary-value">{getAverageDailyGain().toFixed(4)} kg</div>
            <div className="summary-label">Avg Daily Gain</div>
            <div className="summary-subtext">
              {dailyEfficiency.length} days with gain
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">💹</div>
          <div className="summary-content">
            <div className="summary-value">₹{getFeedCostPerKgGain().toFixed(2)}</div>
            <div className="summary-label">Avg Feed Cost per kg</div>
            <div className="summary-subtext">
              Daily average efficiency
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">⚖️</div>
          <div className="summary-content">
            <div className="summary-value">₹{getWeightedFeedCostPerKgGain().toFixed(2)}</div>
            <div className="summary-label">Weighted Feed Cost/kg</div>
            <div className="summary-subtext">
              Gain-weighted calculation
            </div>
          </div>
        </div>
      </div>

      {/* Feed Efficiency Analysis Section */}
      {dailyEfficiency.length > 0 && (
        <div className="card efficiency-analysis">
          <h3 className="card-header">💰 Daily Feed Efficiency Analysis</h3>
          <div className="efficiency-stats">
            <div className="efficiency-stat best-stat">
              <div className="stat-label">Best Efficiency Day</div>
              <div className="stat-value">
                {efficiencyStats.best ? 
                  `₹${efficiencyStats.best.feedCostPerKgGain.toFixed(2)}/kg` 
                  : 'N/A'}
              </div>
              <div className="stat-details">
                {efficiencyStats.best && 
                  `${new Date(efficiencyStats.best.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
              </div>
              <div className="stat-details">
                {efficiencyStats.best && 
                  `Gain: ${efficiencyStats.best.weightGain.toFixed(3)}kg, Feed: ₹${efficiencyStats.best.feedCostPerBird.toFixed(2)}`}
              </div>
            </div>
            
            <div className="efficiency-stat average-stat">
              <div className="stat-label">Average Efficiency</div>
              <div className="stat-value">₹{efficiencyStats.average.toFixed(2)}/kg</div>
              <div className="stat-details">
                {dailyEfficiency.length} days with positive gain
              </div>
              <div className="stat-details">
                Total Gain: {getTotalWeightGain().toFixed(3)}kg
              </div>
            </div>
            
            <div className="efficiency-stat worst-stat">
              <div className="stat-label">Worst Efficiency Day</div>
              <div className="stat-value">
                {efficiencyStats.worst ? 
                  `₹${efficiencyStats.worst.feedCostPerKgGain.toFixed(2)}/kg` 
                  : 'N/A'}
              </div>
              <div className="stat-details">
                {efficiencyStats.worst && 
                  `${new Date(efficiencyStats.worst.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
              </div>
              <div className="stat-details">
                {efficiencyStats.worst && 
                  `Gain: ${efficiencyStats.worst.weightGain.toFixed(3)}kg, Feed: ₹${efficiencyStats.worst.feedCostPerBird.toFixed(2)}`}
              </div>
            </div>
          </div>
          
          <div className="table-header">
            <h4>Recent Daily Feed Efficiency (Last 10 Days)</h4>
            <div className="efficiency-legend">
              <div className="legend-item">
                <span className="legend-dot good-eff"></span>
                Good (&lt; Average)
              </div>
              <div className="legend-item">
                <span className="legend-dot average-eff"></span>
                Average
              </div>
              <div className="legend-item">
                <span className="legend-dot poor-eff"></span>
                Poor (&gt; 120% Avg)
              </div>
            </div>
          </div>
          
          <div className="table-container">
            <table className="data-table efficiency-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Daily Feed Cost (₹/bird)</th>
                  <th>Daily Weight Gain (kg)</th>
                  <th>Feed Cost per kg Gain (₹/kg)</th>
                  <th>Efficiency Rating</th>
                </tr>
              </thead>
              <tbody>
                {dailyEfficiency.slice(-10).reverse().map((day, index) => {
                  const isGood = day.feedCostPerKgGain < efficiencyStats.average;
                  const isPoor = day.feedCostPerKgGain > efficiencyStats.average * 1.2;
                  const efficiencyRating = isGood ? 'Good' : isPoor ? 'Poor' : 'Average';
                  
                  return (
                    <tr key={index}>
                      <td>{new Date(day.date).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short' 
                      })}</td>
                      <td>₹{day.feedCostPerBird.toFixed(2)}</td>
                      <td>{day.weightGain.toFixed(4)} kg</td>
                      <td className={
                        efficiencyRating === 'Good' ? 'good-efficiency' :
                        efficiencyRating === 'Poor' ? 'poor-efficiency' : 'average-efficiency'
                      }>
                        ₹{day.feedCostPerKgGain.toFixed(2)}/kg
                      </td>
                      <td>
                        <span className={`efficiency-badge ${
                          efficiencyRating === 'Good' ? 'badge-good' :
                          efficiencyRating === 'Poor' ? 'badge-poor' : 'badge-average'
                        }`}>
                          {efficiencyRating}
                          {day.hasNewWeight && ' ⚖️'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actualGains.length > 0 && (
        <div className="card">
          <h3 className="card-header">📋 Weight Measurement Intervals</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Days</th>
                  <th>Total Weight Gain (kg)</th>
                  <th>Daily Weight Gain (kg/day)</th>
                </tr>
              </thead>
              <tbody>
                {actualGains.map((gain, index) => (
                  <tr key={index}>
                    <td>{gain.from}</td>
                    <td>{gain.to}</td>
                    <td>{gain.days}</td>
                    <td>+{gain.totalGain} kg</td>
                    <td className="positive-gain">+{gain.dailyGain} kg/day</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading daily data...</p>
        </div>
      ) : (
        <div className="daily-table-container">
          <div className="table-header">
            <h3>Complete Daily Data Table ({dailyData.length} Days)</h3>
            <div className="legend">
              <div className="legend-item">
                <span className="legend-dot new-data"></span>
                New measurement
              </div>
              <div className="legend-item">
                <span className="legend-dot positive-gain"></span>
                Positive weight gain
              </div>
              <div className="legend-item">
                <span className="legend-dot no-gain"></span>
                No weight gain
              </div>
            </div>
          </div>
          
          <div className="table-scroll-container">
            <table className="daily-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Feed Cost per Bird (₹)</th>
                  <th>Weight (kg)</th>
                  <th>Daily Weight Gain (kg)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((day, index) => {
                  const hasPositiveGain = day.weightGain > 0;
                  const hasZeroGain = day.weightGain === 0;
                  const isCarriedGain = !day.hasNewWeight && day.weightGain !== 0;
                  
                  return (
                    <tr 
                      key={day.date}
                      className={
                        day.hasNewFeed || day.hasNewWeight ? 'new-data-row' :
                        isCarriedGain ? 'carried-gain-row' :
                        hasZeroGain ? 'no-gain-row' : 'default-row'
                      }
                    >
                      <td className="date-cell">
                        {new Date(day.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="day-cell">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </td>
                      <td className="feed-cell">
                        <div className="value-with-indicator">
                          ₹{day.feedCostPerBird.toFixed(4)}
                          {!day.hasNewFeed && day.feedCostPerBird > 0 && (
                            <span className="carry-indicator" title="Carried feed cost">↷</span>
                          )}
                        </div>
                      </td>
                      <td className="weight-cell">
                        <div className="value-with-indicator">
                          {day.weight.toFixed(3)} kg
                          {!day.hasNewWeight && day.weight > 0 && (
                            <span className="carry-indicator" title="Estimated weight">↷</span>
                          )}
                        </div>
                      </td>
                      <td className={`gain-cell ${hasPositiveGain ? 'positive' : hasZeroGain ? 'zero' : 'negative'}`}>
                        <div className="gain-display">
                          <span className="gain-value">
                            {day.weightGain >= 0 ? '+' : ''}{day.weightGain.toFixed(4)} kg
                          </span>
                          {isCarriedGain && (
                            <span className="carry-indicator" title="Carried forward gain">↷</span>
                          )}
                          {day.hasNewWeight && hasPositiveGain && !isCarriedGain && (
                            <span className="gain-trend" title="New measurement">📊</span>
                          )}
                        </div>
                      </td>
                      <td className="status-cell">
                        <span className={`status-badge ${
                          day.hasNewFeed && day.hasNewWeight ? 'status-both' :
                          day.hasNewFeed ? 'status-feed' :
                          day.hasNewWeight ? 'status-weight' : 
                          isCarriedGain ? 'status-carry-gain' : 'status-carry'
                        }`}>
                          {day.hasNewFeed && day.hasNewWeight ? '📊 New Both' :
                           day.hasNewFeed ? '🍽️ New Feed' :
                           day.hasNewWeight ? '⚖️ New Weight' : 
                           isCarriedGain ? '↷ Carried Gain' : '↷ Carried'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                
                {dailyData.length === 0 && (
                  <tr>
                    <td colSpan="6" className="no-data">
                      <div className="no-data-icon">📊</div>
                      <div className="no-data-text">
                        No daily data available. Add feed data first.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="explanation-card">
        <h4>📝 How Auto Range Works:</h4>
        <ul className="explanation-list">
          <li><strong>Automatic Range:</strong> When enabled, uses earliest feed date to current day</li>
          <li><strong>Earliest Feed Date:</strong> Automatically detected from your feed entries</li>
          <li><strong>Custom Range:</strong> Disable auto range to select specific dates</li>
          <li><strong>Full Range Button:</strong> One-click to reset to earliest feed date to today</li>
          <li><strong>Data Updates:</strong> When you add new feed data, the range automatically updates</li>
        </ul>
      </div>
    </div>
  );
};

export default DailyDataView;