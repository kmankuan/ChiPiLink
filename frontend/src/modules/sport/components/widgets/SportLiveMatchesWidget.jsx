import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function SportLiveMatchesWidget({ config }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [live, setLive] = useState([]);
  
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const title = typeof config?.title === 'object' ? (config.title[currentLang] || config.title.en || 'Live Now') : (config?.title || 'Live Now');

  useEffect(() => {
    fetch(`${API}/api/sport/live`)
      .then(r => r.ok ? r.json() : [])
      .then(setLive)
      .catch(() => {});
  }, []);

  if (live.length === 0 && config?.hide_when_empty) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardContent className="p-3">
        <h3 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-2">
          <Radio className="h-4 w-4 animate-pulse" /> {title}
        </h3>
        
        {live.length === 0 ? (
          <p className="text-xs text-red-600/70 text-center py-2">No live matches</p>
        ) : (
          <div className="space-y-2">
            {live.map(s => (
              <div key={s.session_id} 
                   className="flex items-center justify-between p-2 rounded-lg bg-white border border-red-100 cursor-pointer hover:bg-red-50 transition-colors shadow-sm" 
                   onClick={() => navigate(`/sport/live/${s.session_id}`)}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{s.player_a?.nickname}</span>
                  <span className="text-xs text-red-500 font-mono bg-red-50 px-1.5 py-0.5 rounded">{s.score?.a}-{s.score?.b}</span>
                  <span className="font-bold text-sm">{s.player_b?.nickname}</span>
                </div>
                <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px] animate-pulse shadow-sm">LIVE</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
