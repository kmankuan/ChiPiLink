import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const InlineTranslationContext = createContext();

export function InlineTranslationProvider({ children }) {
  const { isAdmin, api } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [editingKey, setEditingKey] = useState(null);

  const toggleEditMode = () => {
    if (isAdmin) {
      setEditMode(!editMode);
    }
  };

  const startEditing = (key) => {
    if (editMode && isAdmin) {
      setEditingKey(key);
    }
  };

  const saveTranslation = async (key, lang, value) => {
    try {
      await api.post('/translations/admin/update', null, {
        params: { key, lang, value }
      });
      setEditingKey(null);
      return true;
    } catch (error) {
      console.error('Error saving translation:', error);
      return false;
    }
  };

  const cancelEditing = () => {
    setEditingKey(null);
  };

  return (
    <InlineTranslationContext.Provider value={{
      editMode,
      toggleEditMode,
      editingKey,
      startEditing,
      saveTranslation,
      cancelEditing,
      isAdmin
    }}>
      {children}
    </InlineTranslationContext.Provider>
  );
}

export function useInlineTranslation() {
  const context = useContext(InlineTranslationContext);
  if (!context) {
    throw new Error('useInlineTranslation must be used within InlineTranslationProvider');
  }
  return context;
}
