import React, { useState, useEffect } from 'react';
import API from '../services/api';
import './Manager.css';

const ExpenseManager = () => {
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    percent: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await API.get('api/expenses');
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingId) {
        await API.put(`/expenses/${editingId}`, formData);
      } else {
        await API.post('/expenses', formData);
      }
      await fetchExpenses();
      resetForm();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', percent: '' });
    setEditingId(null);
  };

  const editExpense = (expense) => {
    setFormData({
      name: expense.name,
      percent: expense.percent
    });
    setEditingId(expense._id);
  };

  const deleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await API.delete(`/expenses/${id}`);
        await fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense.');
      }
    }
  };

  // Calculate total percentage
  const totalPercentage = expenses.reduce((sum, expense) => sum + expense.percent, 0);

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h2 className="manager-title">
          <span className="manager-icon">💰</span>
          Expense Management
        </h2>
        <div className="manager-actions">
          <div className="quick-stats">
            <div className="stat-card">
              <div className="stat-value">{expenses.length}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalPercentage.toFixed(1)}%</div>
              <div className="stat-label">Total Percentage</div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="manager-form">
        <h3 className="sub-header">{editingId ? 'Edit Expense' : 'Add New Expense'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Expense Name:</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter expense name"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Percentage (%):</label>
            <input
              type="number"
              className="form-input"
              value={formData.percent}
              onChange={(e) => setFormData({ ...formData, percent: e.target.value })}
              step="0.1"
              placeholder="Enter percentage"
              required
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '🔄 Saving...' : (editingId ? '📝 Update Expense' : '➕ Add Expense')}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="cancel-btn">
              ❌ Cancel
            </button>
          )}
        </div>
      </form>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Percentage (%)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr key={expense._id}>
                <td>{expense.name}</td>
                <td>{expense.percent}%</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => editExpense(expense)}
                      className="edit-btn"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => deleteExpense(expense._id)}
                      className="delete-btn"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan="3" className="no-data">
                  <div className="no-data-icon">💰</div>
                  No expenses found. Add your first expense above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseManager;