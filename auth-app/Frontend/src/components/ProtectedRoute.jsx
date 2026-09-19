import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authApi from '../services/authApi';
import Loading from './Loading';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    let isMounted = true;

    // Safety timeout to prevent infinite loading screen if backend is slow/unreachable
    const timer = setTimeout(() => {
      if (isMounted && status === 'checking') {
        console.warn('Auth check timed out after 3.5s. Falling back to unauthenticated.');
        setStatus('unauthenticated');
      }
    }, 3500);

    async function checkAuth() {
      try {
        const response = await authApi.getMe();
        if (isMounted) {
          clearTimeout(timer);
          if (response && response.success) {
            setStatus('authenticated');
          } else {
            setStatus('unauthenticated');
          }
        }
      } catch (err) {
        if (isMounted) {
          clearTimeout(timer);
          setStatus('unauthenticated');
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (status === 'checking') {
    return <Loading message="Verifying authentication..." />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
