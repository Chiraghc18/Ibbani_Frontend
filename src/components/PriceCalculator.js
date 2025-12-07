import React, { useState, useEffect } from 'react';
import API from '../services/api';
import './PriceCalculator.css';

const PriceCalculator = () => {
  const [profitPercent, setProfitPercent] = useState(30);
  const [intervalStart, setIntervalStart] = useState('');
  const [intervalEnd, setIntervalEnd] = useState('');
  const [sellingPrice, setSellingPrice] = useState(0);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const savedStart = localStorage.getItem('intervalStart');
    const savedEnd = localStorage.getItem('intervalEnd');
    
    if (savedStart && savedEnd) {
      setIntervalStart(savedStart);
      setIntervalEnd(savedEnd);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];
      
      setIntervalStart(defaultStart);
      setIntervalEnd(today);
      
      localStorage.setItem('intervalStart', defaultStart);
      localStorage.setItem('intervalEnd', today);
    }
    setTimeout(() => {
      calculatePrice();
    }, 100);
  }, []);

  useEffect(() => {
    if (intervalStart && intervalEnd) {
      calculatePrice();
    }
  }, [intervalStart, intervalEnd, profitPercent]);

  const saveIntervalDates = () => {
    localStorage.setItem('intervalStart', intervalStart);
    localStorage.setItem('intervalEnd', intervalEnd);
  };

  const generateDailyData = (feedData, weightData, start, end) => {
    if (!start || !end) return [];

    const startDate = new Date(start);
    const endDate = new Date(end);
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
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
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
            feedEndDate = new Date(end);
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

      dailyArray.push({
        date: currentDate,
        feedCostPerBird: parseFloat(currentFeedCostPerBird.toFixed(4)),
        weight: parseFloat(dailyWeight.toFixed(3)),
        weightGain: parseFloat(dailyWeightGain.toFixed(4)),
        hasNewWeight: hasNewWeight
      });
    }

    return dailyArray;
  };

  const calculatePrice = async () => {
    if (!intervalStart || !intervalEnd) return;
    
    setLoading(true);
    try {
      const [feedsResponse, weightsResponse, expensesResponse] = await Promise.all([
        API.get('/api/feed'),
        API.get('/api/weight'),
        API.get('/api/expenses')
      ]);

      const feeds = feedsResponse.data;
      const weights = weightsResponse.data;
      const expenses = expensesResponse.data;

      // Generate daily data first
      const dailyDataArray = generateDailyData(feeds, weights, intervalStart, intervalEnd);
      setDailyData(dailyDataArray);
      
      // Perform calculation using daily data
      const result = performCalculation(dailyDataArray, expenses, intervalStart, intervalEnd, profitPercent);
      
      setSellingPrice(result.total);
      setCalculation(result);
      setLastUpdated(new Date().toLocaleString());
      
      saveIntervalDates();
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setLoading(false);
    }
  };

  const performCalculation = (dailyDataArray, expenses, start, end, profit) => {
    // Calculate total feed cost per bird for the period
    const totalFeedCostPerBird = dailyDataArray.reduce((sum, day) => sum + day.feedCostPerBird, 0);
    
    // Calculate total weight gain for the period
    const totalWeightGain = dailyDataArray.reduce((sum, day) => sum + day.weightGain, 0);
    
    // Calculate feed cost per kg of weight gain
    let feedPerKg = 0;
    if (totalWeightGain > 0) {
      feedPerKg = totalFeedCostPerBird / totalWeightGain;
    } else {
      // If no weight gain, use overall average from all daily data
      const daysWithGain = dailyDataArray.filter(day => day.weightGain > 0);
      if (daysWithGain.length > 0) {
        const avgDailyGain = daysWithGain.reduce((sum, day) => sum + day.weightGain, 0) / daysWithGain.length;
        const avgDailyFeed = dailyDataArray.reduce((sum, day) => sum + day.feedCostPerBird, 0) / dailyDataArray.length;
        if (avgDailyGain > 0) {
          feedPerKg = avgDailyFeed / avgDailyGain;
        }
      }
    }

    let subtotal = feedPerKg;

    const breakdown = [{
      component: 'Feed Cost',
      details: `Daily calculation from ${new Date(start).toLocaleDateString()} to ${new Date(end).toLocaleDateString()}`,
      amount: feedPerKg
    }];

    expenses.forEach(expense => {
      const expenseAmount = (expense.percent / 100) * feedPerKg;
      breakdown.push({
        component: expense.name,
        details: `${expense.percent}% of feed cost`,
        amount: expenseAmount
      });
      subtotal += expenseAmount;
    });

    breakdown.push({
      component: 'Subtotal',
      details: 'Feed + All Expenses',
      amount: subtotal
    });

    const profitAmount = subtotal * (profit / 100);
    breakdown.push({
      component: 'Profit',
      details: `${profit}% of subtotal`,
      amount: profitAmount
    });

    const total = subtotal + profitAmount;

    // Create intervals for display (grouping by weight measurement periods)
    const intervals = [];
    let currentInterval = null;
    
    dailyDataArray.forEach((day, index) => {
      if (day.hasNewWeight) {
        if (currentInterval) {
          currentInterval.end = day.date;
          currentInterval.we = day.weight;
          intervals.push({...currentInterval});
        }
        currentInterval = {
          start: day.date,
          ws: day.weight,
          we: day.weight
        };
      } else if (currentInterval) {
        // Update end weight if this day has weight (interpolated)
        currentInterval.we = day.weight;
      }
      
      // If last day, close the interval
      if (index === dailyDataArray.length - 1 && currentInterval) {
        currentInterval.end = day.date;
        intervals.push({...currentInterval});
      }
    });

    return {
      total,
      breakdown,
      intervals,
      dailyData: dailyDataArray,
      summary: {
        totalFeedCost: totalFeedCostPerBird,
        totalWeightGain,
        feedPerKg,
        subtotal,
        profitAmount,
        days: dailyDataArray.length,
        daysWithGain: dailyDataArray.filter(day => day.weightGain > 0).length
      }
    };
  };

  return (
    <div className="price-calculator">
      <div className="calculator-header">
        <h2>💰 Price Calculator</h2>
        <div className="selling-price-display">
          Selling Price: <span className="price">Rs {sellingPrice.toFixed(2)}/kg</span>
        </div>
      </div>

      {lastUpdated && (
        <p className="last-updated">Last Updated: {lastUpdated}</p>
      )}

      <div className="profit-section">
        <h3 className="sub-header">Profit Settings</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Profit Percentage:</label>
            <input 
              type="number" 
              className="form-input"
              step="0.1" 
              value={profitPercent}
              onChange={(e) => setProfitPercent(parseFloat(e.target.value))}
              min="0"
              max="100"
            />
          </div>
        </div>
        <div className="profit-hint">
          Price updates automatically when you change profit percentage
        </div>
      </div>

      <div className="interval-section">
        <h3 className="sub-header">Calculation Interval</h3>
        <div className="interval-hint">
          Price updates automatically when you change dates
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Interval Start Date:</label>
            <input
              type="date"
              className="form-input"
              value={intervalStart}
              onChange={(e) => setIntervalStart(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Interval End Date:</label>
            <input
              type="date"
              className="form-input"
              value={intervalEnd}
              onChange={(e) => setIntervalEnd(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="loading-spinner-small"></div>
          Calculating price...
        </div>
      )}

      {calculation && calculation.summary && (
        <div className="card">
          <h3 className="card-header">📊 Calculation Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Total Days</div>
              <div className="summary-value">{calculation.summary.days}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Days with Weight Gain</div>
              <div className="summary-value">{calculation.summary.daysWithGain}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Total Feed Cost per Bird</div>
              <div className="summary-value">Rs {calculation.summary.totalFeedCost.toFixed(2)}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Total Weight Gain</div>
              <div className="summary-value">{calculation.summary.totalWeightGain.toFixed(3)} kg</div>
            </div>
            <div className="summary-item highlight">
              <div className="summary-label">Feed Cost per kg Gain</div>
              <div className="summary-value">Rs {calculation.summary.feedPerKg.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* {calculation && calculation.intervals && calculation.intervals.length > 0 && (
        <div className="card">
          <h3 className="card-header">📈 Weight Measurement Periods</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period Start</th>
                  <th>Period End</th>
                  <th>Weight Start (kg)</th>
                  <th>Weight End (kg)</th>
                  <th>Weight Gain (kg)</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {calculation.intervals.map((interval, index) => {
                  const startDate = new Date(interval.start);
                  const endDate = new Date(interval.end);
                  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                  
                  return (
                    <tr key={index}>
                      <td>{startDate.toLocaleDateString()}</td>
                      <td>{endDate.toLocaleDateString()}</td>
                      <td>{interval.ws.toFixed(3)}</td>
                      <td>{interval.we.toFixed(3)}</td>
                      <td className="profit-row">{(interval.we - interval.ws).toFixed(3)}</td>
                      <td>{days}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )} */}

      {/* {dailyData.length > 0 && (
        <div className="card">
          <h3 className="card-header">📅 Daily Data Preview (First 10 Days)</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Feed Cost per Bird (₹)</th>
                  <th>Weight (kg)</th>
                  <th>Daily Weight Gain (kg)</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.slice(0, 10).map((day, index) => (
                  <tr key={index}>
                    <td>{new Date(day.date).toLocaleDateString()}</td>
                    <td>₹{day.feedCostPerBird.toFixed(2)}</td>
                    <td>{day.weight.toFixed(3)}</td>
                    <td className={day.weightGain > 0 ? 'profit-row' : ''}>
                      {day.weightGain > 0 ? '+' : ''}{day.weightGain.toFixed(4)}
                      {day.hasNewWeight && ' ⚖️'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {dailyData.length > 10 && (
                <tfoot>
                  <tr>
                    <td colSpan="4" className="table-footer">
                      Showing 10 of {dailyData.length} days. Total feed cost: ₹{dailyData.reduce((sum, day) => sum + day.feedCostPerBird, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )} */}

      {calculation && (
        <div className="card">
          <h3 className="card-header">💰 Selling Price Breakdown</h3>
          <div className="table-container">
            <table className="data-table breakdown-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Details</th>
                  <th>Amount (Rs per kg)</th>
                </tr>
              </thead>
              <tbody>
                {calculation.breakdown.map((item, index) => (
                  <tr 
                    key={index} 
                    className={
                      item.component === 'Profit' ? 'profit-row' :
                      item.component === 'Subtotal' ? 'subtotal-row' :
                      item.component.includes('Selling Price') ? 'selling-price-row' : ''
                    }
                  >
                    <td><strong>{item.component}</strong></td>
                    <td>{item.details}</td>
                    <td>Rs {item.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan="2"><strong>Total Selling Price</strong></td>
                  <td><strong>Rs {calculation.total.toFixed(2)}/kg</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceCalculator;