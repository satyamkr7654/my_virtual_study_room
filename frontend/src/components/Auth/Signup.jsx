import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Field from '../common/Field';
import AuthLayout from './AuthLayout';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(username, email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <AuthLayout
      title="Create an account"
      footer={<>Already have one? <Link to="/login" className="font-semibold text-ink underline underline-offset-4">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="error-note" role="alert">{error}</p>}
        <Field
          label="Username"
          hint="3 to 30 letters and numbers. Others in your rooms see this."
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Password"
          hint="At least 6 characters."
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Signup;
