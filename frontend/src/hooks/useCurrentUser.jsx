import { useState, useEffect, createContext, useContext } from 'react';
import apiClient from '../api/client';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    apiClient.get('/auth/me/')
      .then(res => {
        setUser(res.data);
      })
      .catch(err => {
        setUser(null);
      })
      .finally(() => setLoading(false));
    }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}