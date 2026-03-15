/**
 * Ably Provider — Wraps app with Ably + Chat client
 * Uses token auth via our backend (never exposes API key)
 */
import React, { createContext, useContext, useMemo } from 'react';
import * as Ably from 'ably';
import { ChatClient } from '@ably/chat';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const AblyChatContext = createContext(null);

export function AblyChatProvider({ children, clientId = 'anonymous' }) {
  const chatClient = useMemo(() => {
    try {
      const realtimeClient = new Ably.Realtime({
        authUrl: `${API}/api/ably/auth?clientId=${encodeURIComponent(clientId)}`,
        authMethod: 'GET',
      });
      return new ChatClient(realtimeClient);
    } catch (e) {
      console.error('Ably init error:', e);
      return null;
    }
  }, [clientId]);

  return (
    <AblyChatContext.Provider value={chatClient}>
      {children}
    </AblyChatContext.Provider>
  );
}

export function useAblyChat() {
  return useContext(AblyChatContext);
}

/**
 * Hook: Subscribe to an Ably channel for real-time updates
 * Simpler than chat — just pub/sub for scores, effects, etc.
 */
export function useAblyChannel(channelName, callback) {
  const chatClient = useContext(AblyChatContext);
  
  React.useEffect(() => {
    if (!chatClient || !channelName) return;
    
    const realtime = chatClient.realtime;
    const channel = realtime.channels.get(channelName);
    
    const onMessage = (msg) => {
      if (callback) callback(msg.name, msg.data);
    };
    
    channel.subscribe(onMessage);
    
    return () => {
      channel.unsubscribe(onMessage);
    };
  }, [chatClient, channelName, callback]);
}

/**
 * Hook: Publish to an Ably channel
 */
export function useAblyPublish(channelName) {
  const chatClient = useContext(AblyChatContext);
  
  const publish = React.useCallback(async (event, data) => {
    if (!chatClient || !channelName) return;
    try {
      const channel = chatClient.realtime.channels.get(channelName);
      await channel.publish(event, data);
    } catch (e) {
      console.error('Ably publish error:', e);
    }
  }, [chatClient, channelName]);
  
  return publish;
}

/**
 * Hook: Presence (who's watching)
 */
export function useAblyPresence(channelName) {
  const chatClient = useContext(AblyChatContext);
  const [members, setMembers] = React.useState([]);
  
  React.useEffect(() => {
    if (!chatClient || !channelName) return;
    
    const channel = chatClient.realtime.channels.get(channelName);
    
    const updateMembers = async () => {
      try {
        const present = await channel.presence.get();
        setMembers(present.map(m => ({ clientId: m.clientId, data: m.data })));
      } catch {}
    };
    
    channel.presence.enter({ joined: new Date().toISOString() });
    channel.presence.subscribe(updateMembers);
    updateMembers();
    
    return () => {
      channel.presence.leave();
      channel.presence.unsubscribe();
    };
  }, [chatClient, channelName]);
  
  return members;
}
