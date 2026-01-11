import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import OneSignal from 'react-onesignal';

const OneSignalContext = createContext(null);

const ONESIGNAL_APP_ID = process.env.REACT_APP_ONESIGNAL_APP_ID;

export function OneSignalProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [permission, setPermission] = useState('default');
  const [error, setError] = useState(null);

  useEffect(() => {
    const initOneSignal = async () => {
      if (!ONESIGNAL_APP_ID) {
        console.warn('OneSignal App ID not configured');
        return;
      }

      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false, // We'll use our own UI
          },
        });

        setIsInitialized(true);

        // Check current permission and subscription status
        const permissionState = await OneSignal.Notifications.permission;
        setPermission(permissionState ? 'granted' : 'default');

        const isOptedIn = OneSignal.User.PushSubscription.optedIn;
        setIsSubscribed(isOptedIn);

        if (isOptedIn) {
          const subId = OneSignal.User.PushSubscription.id;
          setSubscriptionId(subId);
        }

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', (event) => {
          setIsSubscribed(event.current.optedIn);
          setSubscriptionId(event.current.id);
        });

        // Listen for permission changes
        OneSignal.Notifications.addEventListener('permissionChange', (granted) => {
          setPermission(granted ? 'granted' : 'denied');
        });

        console.log('OneSignal initialized successfully');
      } catch (err) {
        console.error('OneSignal initialization error:', err);
        setError(err.message);
      }
    };

    initOneSignal();
  }, []);

  const subscribe = useCallback(async () => {
    if (!isInitialized) {
      setError('OneSignal not initialized');
      return false;
    }

    try {
      setError(null);
      await OneSignal.Notifications.requestPermission();
      
      // Wait a moment for subscription to be created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isOptedIn = OneSignal.User.PushSubscription.optedIn;
      setIsSubscribed(isOptedIn);
      
      if (isOptedIn) {
        const subId = OneSignal.User.PushSubscription.id;
        setSubscriptionId(subId);
      }
      
      return isOptedIn;
    } catch (err) {
      console.error('Error subscribing:', err);
      setError(err.message);
      return false;
    }
  }, [isInitialized]);

  const unsubscribe = useCallback(async () => {
    if (!isInitialized) return false;

    try {
      setError(null);
      OneSignal.User.PushSubscription.optOut();
      setIsSubscribed(false);
      setSubscriptionId(null);
      return true;
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError(err.message);
      return false;
    }
  }, [isInitialized]);

  const setExternalUserId = useCallback(async (userId) => {
    if (!isInitialized) return;

    try {
      await OneSignal.login(userId);
      console.log('External user ID set:', userId);
    } catch (err) {
      console.error('Error setting external user ID:', err);
    }
  }, [isInitialized]);

  const addTags = useCallback(async (tags) => {
    if (!isInitialized) return;

    try {
      OneSignal.User.addTags(tags);
      console.log('Tags added:', tags);
    } catch (err) {
      console.error('Error adding tags:', err);
    }
  }, [isInitialized]);

  const logout = useCallback(async () => {
    if (!isInitialized) return;

    try {
      await OneSignal.logout();
      console.log('OneSignal user logged out');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  }, [isInitialized]);

  const value = {
    isInitialized,
    isSubscribed,
    subscriptionId,
    permission,
    error,
    subscribe,
    unsubscribe,
    setExternalUserId,
    addTags,
    logout,
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
}

export function useOneSignal() {
  const context = useContext(OneSignalContext);
  if (!context) {
    throw new Error('useOneSignal must be used within OneSignalProvider');
  }
  return context;
}
