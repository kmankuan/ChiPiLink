/**
 * MatchComments - Sistema de comentarios con moderación para partidos
 * Incluye alerta de reglas comunitarias y sistema de amonestaciones
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare, Send, AlertTriangle, Shield, ThumbsUp,
  Flag, Loader2, User, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Reglas de la comunidad
const COMMUNITY_RULES = [
  "Respeta a todos los miembros de la comunidad",
  "No uses lenguaje obsceno o inapropiado",
  "No transmitas malos valores o pensamientos negativos",
  "No publiques comentarios que provoquen consecuencias negativas",
  "Mantén un ambiente deportivo y positivo"
];

// Reaction types
const reactionTypes = [
  { type: 'clap', icon: '👏', label: 'Aplausos' },
  { type: 'fire', icon: '🔥', label: 'Fuego' },
  { type: 'trophy', icon: '🏆', label: 'Trofeo' },
  { type: 'heart', icon: '❤️', label: 'Corazón' },
  { type: 'wow', icon: '😮', label: 'Wow' }
];

export default function MatchComments({ matchId, currentUserId }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  const [userWarnings, setUserWarnings] = useState(0);
  
  useEffect(() => {
    fetchComments();
    if (currentUserId) {
      checkUserWarnings();
    }
  }, [matchId, currentUserId]);
  
  const fetchComments = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/social/comments/match/${matchId}`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const checkUserWarnings = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/social/user/${currentUserId}/warnings`
      );
      if (response.ok) {
        const data = await response.json();
        setUserWarnings(data.warnings || 0);
      }
    } catch (error) {
      // Silently fail, assume no warnings
      setUserWarnings(0);
    }
  };
  
  const handleCommentFocus = () => {
    if (!hasAcceptedRules) {
      setShowRules(true);
    }
  };
  
  const acceptRules = () => {
    setHasAcceptedRules(true);
    setShowRules(false);
  };
  
  const submitComment = async () => {
    if (!currentUserId) {
      toast.error('Debes iniciar sesión para comentar');
      return;
    }
    
    if (!newComment.trim()) {
      toast.error('El comentario no puede estar vacío');
      return;
    }
    
    if (!hasAcceptedRules) {
      setShowRules(true);
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/social/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: currentUserId,
          target_id: matchId,
          target_type: 'match',
          content: newComment,
          requires_moderation: userWarnings > 0
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewComment('');
        
        if (data.requires_moderation) {
          toast.info('Tu comentario será revisado antes de publicarse', {
            description: 'Debido a amonestaciones previas, tus comentarios requieren moderación.'
          });
        } else {
          toast.success('Comentario publicado');
        }
        
        fetchComments();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al publicar');
      }
    } catch (error) {
      toast.error('Error al publicar el comentario');
    } finally {
      setSubmitting(false);
    }
  };
  
  const addReaction = async (commentId, reactionType) => {
    if (!currentUserId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    
    try {
      await fetch(`${API_URL}/api/pinpanclub/social/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          target_id: commentId,
          target_type: 'comment',
          reaction_type: reactionType
        })
      });
      fetchComments();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };
  
  const reportComment = async (commentId) => {
    if (!currentUserId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    
    try {
      await fetch(`${API_URL}/api/pinpanclub/social/comments/${commentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_id: currentUserId,
          reason: 'inappropriate'
        })
      });
      toast.success('Comentario reportado', {
        description: 'Gracias por ayudar a mantener una comunidad positiva'
      });
    } catch (error) {
      toast.error('Error al reportar');
    }
  };
  
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };
  
  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Comentarios del Partido
            <Badge variant="secondary" className="ml-auto">
              {comments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          {/* Community Rules Alert - Always visible when typing */}
          {currentUserId && (
            <Alert className="bg-amber-50 border-amber-200">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Reglas de la comunidad:</strong> Comenta con respeto. No se permiten faltas de respeto, 
                lenguaje obsceno, malos valores o comentarios que provoquen consecuencias negativas. 
                {userWarnings > 0 && (
                  <span className="block mt-1 text-red-600 font-medium">
                    ⚠️ Tienes {userWarnings} amonestación(es). Tus comentarios serán moderados.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Comment Input */}
          {currentUserId && (
            <div className="space-y-2">
              <Textarea
                placeholder="Escribe un comentario sobre el partido..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onFocus={handleCommentFocus}
                className="min-h-[80px] resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-400"
                disabled={submitting}
                data-testid="match-comment-input"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/500 caracteres
                </span>
                <Button 
                  onClick={submitComment} 
                  disabled={submitting || !newComment.trim() || newComment.length > 500}
                  className="bg-blue-500 hover:bg-blue-600"
                  data-testid="submit-comment-btn"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publicar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Comments List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-muted-foreground">No hay comentarios aún</p>
              <p className="text-sm text-muted-foreground mt-1">
                ¡Sé el primero en comentar!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment, idx) => (
                <div 
                  key={comment.comment_id}
                  className={`relative p-4 rounded-lg transition-all duration-300 animate-fade-in ${
                    comment.requires_moderation && !comment.is_approved
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Moderation badge */}
                  {comment.requires_moderation && !comment.is_approved && (
                    <Badge 
                      variant="outline" 
                      className="absolute top-2 right-2 text-yellow-600 border-yellow-400"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      En revisión
                    </Badge>
                  )}
                  
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {comment.author_info?.nombre?.[0] || <User className="h-5 w-5" />}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {comment.author_info?.apodo || comment.author_info?.nombre || 'Anónimo'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {formatTime(comment.created_at)}
                        </span>
                        {comment.is_edited && (
                          <span className="text-xs text-muted-foreground">(editado)</span>
                        )}
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-700 break-words">
                        {comment.content}
                      </p>
                      
                      {/* Reactions and Actions */}
                      <div className="flex items-center gap-3 mt-3">
                        {/* Reaction pills */}
                        <div className="flex items-center gap-1">
                          {reactionTypes.slice(0, 3).map((r) => (
                            <button
                              key={r.type}
                              onClick={() => addReaction(comment.comment_id, r.type)}
                              className={`p-1.5 rounded-full hover:bg-gray-200 transition-all hover:scale-110 ${
                                comment.user_reaction === r.type ? 'bg-blue-100' : ''
                              }`}
                              title={r.label}
                            >
                              <span className="text-sm">{r.icon}</span>
                            </button>
                          ))}
                        </div>
                        
                        {/* Reaction count */}
                        {Object.values(comment.reactions || {}).reduce((a, b) => a + b, 0) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {Object.values(comment.reactions).reduce((a, b) => a + b, 0)}
                          </span>
                        )}
                        
                        {/* Report button */}
                        {currentUserId && currentUserId !== comment.author_id && (
                          <button
                            onClick={() => reportComment(comment.comment_id)}
                            className="ml-auto p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Reportar comentario"
                          >
                            <Flag className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Reglas de la Comunidad
            </DialogTitle>
            <DialogDescription>
              Para mantener un ambiente positivo, por favor lee y acepta nuestras reglas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                Si infringes estas reglas, recibirás una amonestación. Después de una amonestación, 
                tus comentarios serán revisados antes de publicarse.
              </AlertDescription>
            </Alert>
            
            <ul className="space-y-2">
              {COMMUNITY_RULES.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-red-700">
                No publicar comentarios que provoquen o traigan consecuencias negativas para la comunidad.
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowRules(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={acceptRules}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              Acepto las Reglas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </>
  );
}
