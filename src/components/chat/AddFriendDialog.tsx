import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { searchUserByUsername, sendFriendRequest } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus } from 'lucide-react';

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddFriendDialog: React.FC<AddFriendDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !user) return;

    setLoading(true);
    try {
      const foundUser = await searchUserByUsername(username.trim());
      if (!foundUser) {
        toast({ title: 'User not found', variant: 'destructive' });
        return;
      }
      if (foundUser.id === user.id) {
        toast({ title: "You can't add yourself", variant: 'destructive' });
        return;
      }
      await sendFriendRequest(user.id, foundUser.id);
      toast({ title: 'Friend request sent!' });
      setUsername('');
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: error.message || 'Failed to send request', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Add Friend
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !username.trim()}>
            {loading ? 'Searching...' : 'Send Friend Request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFriendDialog;
