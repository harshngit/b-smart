import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser, setLoading } from '../store/authSlice';
import api from '../lib/api';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const token = searchParams.get('token');

    const handleCallback = async () => {
      if (token) {
        localStorage.setItem('token', token);
        
        try {
          const response = await api.get('/auth/me');
          dispatch(setUser(response.data));
          navigate('/');
        } catch (error) {
          console.error('Error fetching user details:', error);
          navigate('/login', { state: { message: 'Authentication failed' } });
        }
      } else {
        navigate('/login', { state: { message: 'No token received' } });
      }
      dispatch(setLoading(false));
    };

    handleCallback();
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Authenticating...</h2>
        <p className="text-gray-500 dark:text-gray-400">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
