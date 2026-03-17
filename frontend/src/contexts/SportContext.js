import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

const SportContext = createContext();

export const useSport = () => {
  const context = useContext(SportContext);
  if (!context) {
    throw new Error('useSport must be used within a SportProvider');
  }
  return context;
};

export const SportProvider = ({ children }) => {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPlayers(),
        fetchMatches(),
        fetchLeagues(),
        fetchTournaments(),
        fetchLiveSessions(),
        fetchSettings()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load sport data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await api.get('/api/sport/players');
      setPlayers(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching players:', error);
      return [];
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await api.get('/api/sport/matches');
      setMatches(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  };

  const fetchLeagues = async () => {
    try {
      const response = await api.get('/api/sport/leagues');
      setLeagues(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching leagues:', error);
      return [];
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await api.get('/api/sport/tournaments');
      setTournaments(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const response = await api.get('/api/sport/live');
      setLiveSessions(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching live sessions:', error);
      return [];
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/sport/settings/tv');
      setSettings(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return {};
    }
  };

  const createPlayer = async (playerData) => {
    try {
      const response = await api.post('/api/sport/players', playerData);
      await fetchPlayers(); // Refresh players list
      toast.success('Player created successfully');
      return response.data;
    } catch (error) {
      console.error('Error creating player:', error);
      toast.error('Failed to create player');
      throw error;
    }
  };

  const createMatch = async (matchData) => {
    try {
      const response = await api.post('/api/sport/matches', matchData);
      await fetchMatches(); // Refresh matches list
      await fetchPlayers(); // Refresh players (ELO changes)
      toast.success('Match recorded successfully');
      return response.data;
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Failed to record match');
      throw error;
    }
  };

  const createLiveSession = async (sessionData) => {
    try {
      const response = await api.post('/api/sport/live', sessionData);
      await fetchLiveSessions(); // Refresh live sessions
      toast.success('Live session started');
      return response.data;
    } catch (error) {
      console.error('Error creating live session:', error);
      toast.error('Failed to start live session');
      throw error;
    }
  };

  const value = {
    // Data
    players,
    matches,
    leagues,
    tournaments,
    liveSessions,
    settings,
    loading,
    
    // Actions
    fetchPlayers,
    fetchMatches,
    fetchLeagues,
    fetchTournaments,
    fetchLiveSessions,
    fetchSettings,
    createPlayer,
    createMatch,
    createLiveSession,
    refreshData: fetchInitialData
  };

  return <SportContext.Provider value={value}>{children}</SportContext.Provider>;
};