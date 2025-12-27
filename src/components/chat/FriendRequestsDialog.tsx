import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFriendRequests } from '@/hooks/useChat';
import { acceptFriendRequest, rejectFriendRequest } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, X, Bell, Loader2 } from 'lucide-react';
import { ChatWithDetails } from '@/hooks/useChat';

interface FriendRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChat?: (chat: ChatWithDetails) => void;
}

const FriendRequestsDialog: React.FC<FriendRequestsDialogProps> = ({ 
  open, 
  onOpenChange,
  onSelectChat 
}) => {
  const { user } = useAuth();
  const { requests } = useFriendRequests();
  const { toast } = useToast();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (requestId: string, senderId: string) => {
    if (!user || processingIds.has(requestId)) return;
    
    setProcessingIds(prev => new Set(prev).add(requestId));
    
    try {
      await acceptFriendRequest(requestId, user.id, senderId);
      toast({ title: 'Friend request accepted!' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Failed to accept request', variant: 'destructive' });
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    if (processingIds.has(requestId)) return;
    
    setProcessingIds(prev => new Set(prev).add(requestId));
    
    try {
      await rejectFriendRequest(requestId);
      toast({ title: 'Request rejected' });
    } catch (error) {
      toast({ title: 'Failed to reject request', variant: 'destructive' });
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Friend Requests
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending requests</p>
          ) : (
            requests.map((req) => {
              const isProcessing = processingIds.has(req.id);
              return (
                <div key={req.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/50">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{req.senderNickname[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{req.senderNickname}</p>
                    <p className="text-xs text-muted-foreground">@{req.senderUsername}</p>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleAccept(req.id, req.senderId)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleReject(req.id)}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendRequestsDialog;
