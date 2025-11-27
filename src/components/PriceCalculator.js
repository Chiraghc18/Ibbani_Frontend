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

      const result = performCalculation(feeds, weights, expenses, intervalStart, intervalEnd, profitPercent);
      
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

  const performCalculation = (feeds, weights, expenses, start, end, profit) => {
    const dateDiffDays = (a, b) => {
      const startDate = new Date(a);
      const endDate = new Date(b);
      if (endDate < startDate) return 0;
      return Math.floor((endDate - startDate) / 86400000) + 1;
    };

    const intervalWeights = weights.filter(w => {
      const weightDate = new Date(w.date);
      return weightDate >= new Date(start) && weightDate <= new Date(end);
    });

    let totalFeedCost = 0;
    let totalWeightGain = 0;

    const arr = [];
    for (let i = 0; i < intervalWeights.length - 1; i++) {
      arr.push({
        start: intervalWeights[i].date,
        end: intervalWeights[i + 1].date,
        ws: intervalWeights[i].weight,
        we: intervalWeights[i + 1].weight
      });
    }

    if (intervalWeights.length > 0) {
      const last = intervalWeights[intervalWeights.length - 1];
      if (new Date(last.date) < new Date(end)) {
        let estimatedGain = 0;
        if (intervalWeights.length >= 2) {
          const prev = intervalWeights[intervalWeights.length - 2];
          const dailyGain = (last.weight - prev.weight) / dateDiffDays(prev.date, last.date);
          const days = dateDiffDays(last.date, end);
          estimatedGain = dailyGain * days;
        }
        arr.push({
          start: last.date,
          end: end,
          ws: last.weight,
          we: last.weight + estimatedGain
        });
      }
    }

    arr.forEach(int => {
      let feedCost = 0;
      const intStart = new Date(int.start);
      const intEnd = new Date(int.end);

      feeds.forEach((f, j) => {
        const fStart = new Date(f.start);
        const fEnd = (j < feeds.length - 1) ? new Date(feeds[j + 1].start) : new Date(end);

        const startOverlap = new Date(Math.max(fStart, intStart));
        const endOverlap = new Date(Math.min(fEnd, intEnd));

        const overlapDays = dateDiffDays(startOverlap, endOverlap);
        if (overlapDays === 0) return;

        const totalFeedDays = dateDiffDays(fStart, fEnd);
        feedCost += (f.cost / f.birds) * (overlapDays / totalFeedDays);
      });

      const gain = int.we - int.ws;
      totalWeightGain += gain;
      totalFeedCost += feedCost;
    });

    const feedPerKg = totalWeightGain > 0 ? totalFeedCost / totalWeightGain : 0;
    let subtotal = feedPerKg;

    const breakdown = [{
      component: 'Feed Cost',
      details: `From ${new Date(start).toLocaleDateString()} to ${new Date(end).toLocaleDateString()}`,
      amount: feedPerKg
    }];

    expenses.forEach(expense => {
      const expenseAmount = (expense.percent / 100) * feedPerKg;
      breakdown.push({
        component: expense.name,
        details: `${expense.percent}%`,
        amount: expenseAmount
      });
      subtotal += expenseAmount;
    });

    breakdown.push({
      component: 'Subtotal',
      details: 'Feed + Expenses',
      amount: subtotal
    });

    const profitAmount = subtotal * (profit / 100);
    breakdown.push({
      component: 'Profit',
      details: `${profit}%`,
      amount: profitAmount
    });

    const total = subtotal + profitAmount;

    return {
      total,
      breakdown,
      intervals: arr,
      summary: {
        totalFeedCost,
        totalWeightGain,
        feedPerKg,
        subtotal,
        profitAmount
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

      {calculation && calculation.intervals && calculation.intervals.length > 0 && (
        <div className="card">
          <h3 className="card-header">📈 Interval-wise Breakdown</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Interval Start</th>
                  <th>Interval End</th>
                  <th>Weight Start (kg)</th>
                  <th>Weight End (kg)</th>
                  <th>Weight Gain (kg)</th>
                </tr>
              </thead>
              <tbody>
                {calculation.intervals.map((interval, index) => (
                  <tr key={index}>
                    <td>{new Date(interval.start).toLocaleDateString()}</td>
                    <td>{new Date(interval.end).toLocaleDateString()}</td>
                    <td>{interval.ws.toFixed(3)}</td>
                    <td>{interval.we.toFixed(3)}</td>
                    <td className="profit-row">{(interval.we - interval.ws).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
