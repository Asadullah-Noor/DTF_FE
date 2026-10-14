import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useSettings() {
  const { isAuthed } = useAuth();
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
    enabled: isAuthed,
  });
}