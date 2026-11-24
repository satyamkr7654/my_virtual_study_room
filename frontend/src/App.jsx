import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { ErrorBoundary, BrowserWarning, NetworkIndicator } from './components/common';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import NotFound from './components/common/NotFound';
import LoadingSpinner from './components/common/LoadingSpinner';

// Video, sockets and notes are only downloaded when a room is opened
const StudyRoom = lazy(() => import('./components/Room/StudyRoom'));

function App() {
  return (
    <ErrorBoundary>
      <FeedbackProvider>
      <AuthProvider>
        {/* Browser compatibility warning */}
        <BrowserWarning />

        {/* Network status indicator */}
        <NetworkIndicator />

        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/room/:id"
              element={
                <PrivateRoute>
                  <Suspense fallback={<LoadingSpinner text="Opening the room" />}>
                    <StudyRoom />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
      </FeedbackProvider>
    </ErrorBoundary>
  );
}

export default App;
