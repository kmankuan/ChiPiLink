/**
 * LanguageSelector - Language switcher with backend sync for logged-in users
 * Persists language preference to user profile when authenticated
 */
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { languages } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { useEffect, useRef } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LanguageSelector({ variant = 'ghost', showLabel = false }) {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const hasLoadedFromBackend = useRef(false);
  const isChangingLanguage = useRef(false);
  
  const token = localStorage.getItem('auth_token');
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  // Sync language from backend ONLY on initial login (once)
  useEffect(() => {
    const syncLanguageFromBackend = async () => {
      // Skip if already loaded or currently changing language
      if (hasLoadedFromBackend.current || isChangingLanguage.current) return;
      if (!isAuthenticated || !token) return;
      
      try {
        const res = await fetch(`${API_URL}/api/users/profile/language`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.language && data.language !== i18n.language) {
            i18n.changeLanguage(data.language);
          }
          hasLoadedFromBackend.current = true;
        }
      } catch (error) {
        console.error('Error syncing language preference:', error);
      }
    };

    syncLanguageFromBackend();
  }, [isAuthenticated, token]); // Remove i18n from dependencies

  // Save language to backend when changed
  const changeLanguage = async (langCode) => {
    // Mark that we're changing language to prevent sync from reverting
    isChangingLanguage.current = true;
    
    // Change locally first for immediate feedback
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    
    // If logged in, sync to backend
    if (isAuthenticated && token) {
      try {
        await fetch(`${API_URL}/api/users/profile/language`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language: langCode })
        });
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isChangingLanguage.current = false;
    }, 500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={showLabel ? "default" : "icon"} 
          className="gap-2"
          data-testid="language-selector"
        >
          <span className="text-lg">{currentLang.flag}</span>
          {showLabel && <span>{currentLang.name}</span>}
          {!showLabel && <Globe className="h-4 w-4 sr-only" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`gap-2 cursor-pointer ${i18n.language === lang.code ? 'bg-accent' : ''}`}
            data-testid={`lang-${lang.code}`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
            {i18n.language === lang.code && (
              <Check className="h-4 w-4 ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
