import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Loader2 } from 'lucide-react';
import { useFriends } from '@/hooks/useChat';
import { createGroup } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: (chatId: string) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ 
  open, 
  onOpenChange,
  onGroupCreated 
}) => {
  const { user } = useAuth();
  const { friends, loading: friendsLoading } = useFriends();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || selectedFriends.length === 0) return;

    const cleanedMemberIds = Array.from(
      new Set(selectedFriends.filter((id) => typeof id === 'string' && id.trim().length > 0))
    ).filter((id) => id !== user.id);

    if (cleanedMemberIds.length === 0) {
      toast({ title: 'Select at least 1 friend', variant: 'destructive' });
      return;
    }
    
    setCreating(true);
    try {
      const chatId = await createGroup(groupName.trim(), user.id, cleanedMemberIds);
      toast({ title: 'Group created successfully!' });
      onOpenChange(false);
      setGroupName('');
      setSelectedFriends([]);
      onGroupCreated?.(chatId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create group:', error);
      toast({ title: 'Failed to create group', description: message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setGroupName('');
    setSelectedFriends([]);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Create Group
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Friends ({selectedFriends.length} selected)</Label>
            {friendsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : friends.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">
                Add friends first to create a group chat with them.
              </p>
            ) : (
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.odId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                      onClick={() => handleToggleFriend(friend.odId)}
                    >
                      <Checkbox
                        checked={selectedFriends.includes(friend.odId)}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => handleToggleFriend(friend.odId)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(friend.nickname)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{friend.nickname}</p>
                        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup} 
              className="flex-1"
              disabled={creating || !groupName.trim() || selectedFriends.length === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
