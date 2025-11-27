import React, { useState } from 'react';
import API from '../services/api';
import './Auth.css';

const Auth = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const requestData = { name };
      if (name.toLowerCase() === 'admin') {
        requestData.password = password;
      }

      const response = await API.post('/api/auth/login', requestData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      onLogin(user);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          'Login failed. Please check if server is running.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">🐔</div>
        <h1 className="auth-title">IBBANI</h1>
        <p className="auth-subtitle">Pure Nati Koli Management System</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Name:</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>
          
          {name.toLowerCase() === 'admin' && (
            <div className="form-group">
              <label className="form-label">Password:</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
              <span className="password-hint">Admin password: chirag</span>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="auth-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-info">
          <h3>How to Login:</h3>
          <p><strong>Regular User:</strong> Enter any name (no password required)</p>
          <p><strong>Admin:</strong> Name = "admin", Password = "chirag"</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;