import React, { useState, useEffect } from 'react';
import API from '../services/api';
import './Manager.css';

const WeightManager = () => {
  const [weights, setWeights] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    weight: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    try {
      const response = await API.get('/api/weight');
      setWeights(response.data);
    } catch (error) {
      console.error('Error fetching weights:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingId) {
        await API.put(`/weight/${editingId}`, formData);
      } else {
        await API.post('/weight', formData);
      }
      await fetchWeights();
      resetForm();
    } catch (error) {
      console.error('Error saving weight:', error);
      alert('Error saving weight entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ date: '', weight: '' });
    setEditingId(null);
  };

  const editWeight = (weight) => {
    setFormData({
      date: weight.date.split('T')[0],
      weight: weight.weight
    });
    setEditingId(weight._id);
  };

  const deleteWeight = async (id) => {
    if (window.confirm('Are you sure you want to delete this weight entry?')) {
      try {
        await API.delete(`/weight/${id}`);
        await fetchWeights();
      } catch (error) {
        console.error('Error deleting weight:', error);
        alert('Error deleting weight entry.');
      }
    }
  };

  // Calculate statistics
  const averageWeight = weights.length > 0 
    ? weights.reduce((sum, w) => sum + w.weight, 0) / weights.length 
    : 0;

  const maxWeight = weights.length > 0 
    ? Math.max(...weights.map(w => w.weight)) 
    : 0;

  const minWeight = weights.length > 0 
    ? Math.min(...weights.map(w => w.weight)) 
    : 0;

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h2 className="manager-title">
          <span className="manager-icon">⚖️</span>
          Weight Management
        </h2>
        <div className="manager-actions">
          <div className="quick-stats">
            <div className="stat-card">
              <div className="stat-value">{weights.length}</div>
              <div className="stat-label">Total Entries</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{averageWeight.toFixed(3)} kg</div>
              <div className="stat-label">Average Weight</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{maxWeight.toFixed(3)} kg</div>
              <div className="stat-label">Max Weight</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{minWeight.toFixed(3)} kg</div>
              <div className="stat-label">Min Weight</div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="manager-form">
        <h3 className="sub-header">{editingId ? 'Edit Weight Entry' : 'Add New Weight Entry'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Weigh Date:</label>
            <input
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Average Weight (kg):</label>
            <input
              type="number"
              className="form-input"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              step="0.001"
              placeholder="Enter average weight"
              required
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '🔄 Saving...' : (editingId ? '📝 Update Weight Entry' : '➕ Add Weight Entry')}
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
              <th>Date</th>
              <th>Average Weight (kg)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {weights.map(weight => (
              <tr key={weight._id}>
                <td>{new Date(weight.date).toLocaleDateString()}</td>
                <td>{weight.weight.toFixed(3)} kg</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => editWeight(weight)}
                      className="edit-btn"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => deleteWeight(weight._id)}
                      className="delete-btn"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {weights.length === 0 && (
              <tr>
                <td colSpan="3" className="no-data">
                  <div className="no-data-icon">⚖️</div>
                  No weight entries found. Add your first weight entry above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeightManager;