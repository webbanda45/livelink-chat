import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { searchUsersByUsernamePrefix, sendFriendRequest } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { UserProfile } from '@/types/chat';

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddFriendDialog: React.FC<AddFriendDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Debounced search for suggestions
  useEffect(() => {
    if (!username.trim() || username.length < 2 || !user) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchUsersByUsernamePrefix(username.trim(), user.id);
        setSuggestions(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, user]);

  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!user) return;
    
    setLoading(true);
    try {
      await sendFriendRequest(user.id, targetUser.id);
      toast({ title: `Friend request sent to ${targetUser.nickname}!` });
      setUsername('');
      setSuggestions([]);
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message || 'Failed to send request', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Add Friend
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search by username</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Suggestions list */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Suggestions</Label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {suggestions.map((suggestedUser) => (
                  <div
                    key={suggestedUser.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={suggestedUser.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(suggestedUser.nickname)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{suggestedUser.nickname}</p>
                      <p className="text-xs text-muted-foreground truncate">@{suggestedUser.username}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(suggestedUser)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {username.length >= 2 && suggestions.length === 0 && !searchLoading && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No users found matching "{username}"
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFriendDialog;
