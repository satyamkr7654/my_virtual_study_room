import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import authApi from '../../api/auth.api';
import PrivateRoute from '../common/PrivateRoute';
import Login from './Login';
import Signup from './Signup';

const session = { token: 'header.payload.sig', user: { id: '1', username: 'meera' } };
const failure = (status, error) => Object.assign(new Error(), { response: { status, data: { error } } });

const renderAt = (path) => render(
  <AuthProvider>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PrivateRoute><p>Dashboard page</p></PrivateRoute>} />
      </Routes>
    </MemoryRouter>
  </AuthProvider>
);

describe('Login', () => {
  const submit = async () => {
    await userEvent.type(screen.getByLabelText('Email'), 'm@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
  };

  it('saves the session and opens the dashboard', async () => {
    const login = vi.spyOn(authApi, 'login').mockResolvedValue(session);
    renderAt('/login');
    await submit();

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('m@example.com', 'secret12');
    expect(localStorage.getItem('token')).toBe(session.token);
  });

  it('shows why login failed and stays on the page', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(failure(401, 'Invalid credentials'));
    renderAt('/login');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('Signup', () => {
  const submit = async (password, confirm) => {
    await userEvent.type(screen.getByLabelText('Username'), 'meera');
    await userEvent.type(screen.getByLabelText('Email'), 'm@example.com');
    await userEvent.type(screen.getByLabelText('Password'), password);
    await userEvent.type(screen.getByLabelText('Confirm password'), confirm);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  };

  it('creates an account', async () => {
    const register = vi.spyOn(authApi, 'register').mockResolvedValue(session);
    renderAt('/signup');
    await submit('secret12', 'secret12');

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith('meera', 'm@example.com', 'secret12');
  });

  it.each([
    ['secret12', 'different', 'Passwords do not match'],
    ['abc', 'abc', 'Password must be at least 6 characters'],
  ])('checks the password before asking the server', async (password, confirm, message) => {
    const register = vi.spyOn(authApi, 'register');
    renderAt('/signup');
    await submit(password, confirm);

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(register).not.toHaveBeenCalled();
  });
});

describe('Session', () => {
  const token = (exp) => `x.${btoa(JSON.stringify({ exp }))}.x`;
  const inAnHour = () => Math.floor(Date.now() / 1000) + 3600;

  it('is restored after a refresh', async () => {
    localStorage.setItem('token', token(inAnHour()));
    localStorage.setItem('user', JSON.stringify(session.user));
    renderAt('/dashboard');
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it.each([
    ['expired', () => token(1), '{"id":"1"}'],
    ['corrupt user', () => token(inAnHour()), '{oops'],
    ['literal undefined', () => 'undefined', 'undefined'],
  ])('sends you to login when it is unusable: %s', async (_name, makeToken, user) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('token', makeToken());
    localStorage.setItem('user', user);
    renderAt('/dashboard');
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
