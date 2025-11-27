import React, { useState, useEffect } from 'react';
import API from '../services/api';
import './Manager.css';

const FeedManager = () => {
  const [feeds, setFeeds] = useState([]);
  const [formData, setFormData] = useState({
    start: '',
    cost: '',
    birds: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const response = await API.get('/api/feed');
      setFeeds(response.data);
    } catch (error) {
      console.error('Error fetching feeds:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingId) {
        await API.put(`/api/feed/${editingId}`, formData);
      } else {
        await API.post('/api/feed', formData);
      }
      await fetchFeeds();
      resetForm();
    } catch (error) {
      console.error('Error saving feed:', error);
      alert('Error saving feed entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ start: '', cost: '', birds: '' });
    setEditingId(null);
  };

  const editFeed = (feed) => {
    setFormData({
      start: feed.start.split('T')[0],
      cost: feed.cost,
      birds: feed.birds
    });
    setEditingId(feed._id);
  };

  const deleteFeed = async (id) => {
    if (window.confirm('Are you sure you want to delete this feed entry?')) {
      try {
        await API.delete(`/feed/${id}`);
        await fetchFeeds();
      } catch (error) {
        console.error('Error deleting feed:', error);
        alert('Error deleting feed entry.');
      }
    }
  };

  // Calculate total feed cost
  const totalFeedCost = feeds.reduce((sum, feed) => sum + feed.cost, 0);
  const totalBirdsFed = feeds.reduce((sum, feed) => sum + feed.birds, 0);

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h2 className="manager-title">
          <span className="manager-icon">🍽️</span>
          Feed Management
        </h2>
        <div className="manager-actions">
          <div className="quick-stats">
            <div className="stat-card">
              <div className="stat-value">{feeds.length}</div>
              <div className="stat-label">Total Entries</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">Rs {totalFeedCost.toFixed(2)}</div>
              <div className="stat-label">Total Feed Cost</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalBirdsFed}</div>
              <div className="stat-label">Total Birds Fed</div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="manager-form">
        <h3 className="sub-header">{editingId ? 'Edit Feed Entry' : 'Add New Feed Entry'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Feed Start Date:</label>
            <input
              type="date"
              className="form-input"
              value={formData.start}
              onChange={(e) => setFormData({ ...formData, start: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Feed Cost (Rs):</label>
            <input
              type="number"
              className="form-input"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              step="0.01"
              placeholder="Enter cost"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">No of Birds Fed:</label>
            <input
              type="number"
              className="form-input"
              value={formData.birds}
              onChange={(e) => setFormData({ ...formData, birds: e.target.value })}
              placeholder="Enter number of birds"
              required
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '🔄 Saving...' : (editingId ? '📝 Update Feed Entry' : '➕ Add Feed Entry')}
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
              <th>Cost (Rs)</th>
              <th>No of Birds</th>
              <th>Cost per Bird</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map(feed => (
              <tr key={feed._id}>
                <td>{new Date(feed.start).toLocaleDateString()}</td>
                <td>Rs {feed.cost.toFixed(2)}</td>
                <td>{feed.birds}</td>
                <td>Rs {(feed.cost / feed.birds).toFixed(2)}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => editFeed(feed)}
                      className="edit-btn"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => deleteFeed(feed._id)}
                      className="delete-btn"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {feeds.length === 0 && (
              <tr>
                <td colSpan="5" className="no-data">
                  <div className="no-data-icon">🍽️</div>
                  No feed entries found. Add your first feed entry above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeedManager;