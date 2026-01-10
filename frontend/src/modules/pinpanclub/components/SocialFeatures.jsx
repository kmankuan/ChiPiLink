/**
 * Social Features Components
 * Follow button, comments section, reactions
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UserPlus, UserMinus, Users, MessageSquare, Send,
  Heart, ThumbsUp, Award, Flame, PartyPopper, Loader2
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Reaction types with icons
const reactionTypes = [
  { type: 'clap', icon: '👏', label: 'Aplausos' },
  { type: 'fire', icon: '🔥', label: 'Fuego' },
  { type: 'trophy', icon: '🏆', label: 'Trofeo' },
  { type: 'heart', icon: '❤️', label: 'Corazón' },
  { type: 'wow', icon: '😮', label: 'Wow' }
];

// ============== FOLLOW BUTTON ==============

export function FollowButton({ currentUserId, targetUserId, onFollowChange }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUserId && targetUserId && currentUserId !== targetUserId) {
      checkFollowStatus();
    }
  }, [currentUserId, targetUserId]);

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/social/is-following?follower_id=${currentUserId}&following_id=${targetUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.is_following);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const toggleFollow = async () => {
    if (!currentUserId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    if (currentUserId === targetUserId) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await fetch(
          `${API_URL}/api/pinpanclub/social/follow?follower_id=${currentUserId}&following_id=${targetUserId}`,
          { method: 'DELETE' }
        );
        setIsFollowing(false);
        toast.success('Dejaste de seguir');
      } else {
        await fetch(`${API_URL}/api/pinpanclub/social/follow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ follower_id: currentUserId, following_id: targetUserId })
        });
        setIsFollowing(true);
        toast.success('¡Ahora lo sigues!');
      }
      onFollowChange?.();
    } catch (error) {
      toast.error('Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  if (currentUserId === targetUserId) return null;

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      onClick={toggleFollow}
      disabled={loading}
      data-testid="follow-btn"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-1" />
          Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-1" />
          Seguir
        </>
      )}
    </Button>
  );
}

// ============== FOLLOW STATS ==============

export function FollowStats({ jugadorId }) {
  const [stats, setStats] = useState({ followers_count: 0, following_count: 0 });

  useEffect(() => {
    if (jugadorId) {
      fetchStats();
    }
  }, [jugadorId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/social/follow-stats/${jugadorId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-1">
        <Users className="h-4 w-4" />
        <strong>{stats.followers_count}</strong> seguidores
      </span>
      <span>
        <strong>{stats.following_count}</strong> siguiendo
      </span>
    </div>
  );
}

// ============== COMMENTS SECTION ==============

export function CommentsSection({ targetId, targetType = 'player', currentUserId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [targetId, targetType]);

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/social/comments/${targetType}/${targetId}`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!currentUserId) {
      toast.error('Debes iniciar sesión');
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/social/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: currentUserId,
          target_id: targetId,
          target_type: targetType,
          content: newComment
        })
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
        toast.success('Comentario publicado');
      }
    } catch (error) {
      toast.error('Error al publicar');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comentarios ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment input */}
        {currentUserId && (
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && submitComment()}
              disabled={submitting}
            />
            <Button onClick={submitComment} disabled={submitting || !newComment.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Comments list */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No hay comentarios aún. ¡Sé el primero!
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.comment_id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {comment.author_info?.nombre?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.author_info?.apodo || comment.author_info?.nombre || 'Anónimo'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(comment.created_at)}
                    </span>
                    {comment.is_edited && (
                      <span className="text-xs text-muted-foreground">(editado)</span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                  
                  {/* Comment reactions */}
                  <ReactionBar
                    targetId={comment.comment_id}
                    targetType="comment"
                    currentUserId={currentUserId}
                    initialReactions={comment.reactions || {}}
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============== REACTION BAR ==============

export function ReactionBar({ 
  targetId, 
  targetType, 
  currentUserId, 
  initialReactions = {},
  compact = false 
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [userReaction, setUserReaction] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      fetchUserReaction();
    }
  }, [currentUserId, targetId]);

  const fetchUserReaction = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/social/reactions/${targetType}/${targetId}/user/${currentUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        setUserReaction(data.reaction_type);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const addReaction = async (reactionType) => {
    if (!currentUserId) {
      toast.error('Debes iniciar sesión');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/social/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          target_id: targetId,
          target_type: targetType,
          reaction_type: reactionType
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.removed) {
          // Reaction was removed
          setReactions(prev => ({
            ...prev,
            [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
          }));
          setUserReaction(null);
        } else {
          // Reaction was added
          if (userReaction && userReaction !== reactionType) {
            // Remove old reaction count
            setReactions(prev => ({
              ...prev,
              [userReaction]: Math.max(0, (prev[userReaction] || 0) - 1)
            }));
          }
          setReactions(prev => ({
            ...prev,
            [reactionType]: (prev[reactionType] || 0) + 1
          }));
          setUserReaction(reactionType);
        }
      }
    } catch (error) {
      toast.error('Error al reaccionar');
    }
    setShowPicker(false);
  };

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  if (compact) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setShowPicker(!showPicker)}
          >
            {userReaction ? (
              <span>{reactionTypes.find(r => r.type === userReaction)?.icon}</span>
            ) : (
              <Heart className="h-3 w-3" />
            )}
          </Button>
          
          {showPicker && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border rounded-full shadow-lg p-1 flex gap-1 z-10">
              {reactionTypes.map((r) => (
                <button
                  key={r.type}
                  onClick={() => addReaction(r.type)}
                  className={`p-1 hover:bg-gray-100 rounded-full transition-transform hover:scale-125 ${
                    userReaction === r.type ? 'bg-blue-100' : ''
                  }`}
                  title={r.label}
                >
                  {r.icon}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {totalReactions > 0 && (
          <span className="text-xs text-muted-foreground">{totalReactions}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1">
        {reactionTypes.filter(r => reactions[r.type] > 0).map((r) => (
          <span
            key={r.type}
            className="text-lg cursor-pointer hover:scale-110 transition-transform"
            title={`${reactions[r.type]} ${r.label}`}
            onClick={() => addReaction(r.type)}
          >
            {r.icon}
          </span>
        ))}
      </div>
      
      {totalReactions > 0 && (
        <span className="text-sm text-muted-foreground">{totalReactions}</span>
      )}
      
      <div className="relative ml-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker(!showPicker)}
        >
          <span className="mr-1">+</span> Reaccionar
        </Button>
        
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 bg-white border rounded-full shadow-lg p-2 flex gap-2 z-10">
            {reactionTypes.map((r) => (
              <button
                key={r.type}
                onClick={() => addReaction(r.type)}
                className={`p-2 hover:bg-gray-100 rounded-full transition-transform hover:scale-125 ${
                  userReaction === r.type ? 'bg-blue-100' : ''
                }`}
                title={r.label}
              >
                <span className="text-xl">{r.icon}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default { FollowButton, FollowStats, CommentsSection, ReactionBar };
