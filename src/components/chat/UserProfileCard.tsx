import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePresence } from '@/hooks/useChat';
import { format } from 'date-fns';
import { Mail, Calendar, AtSign, User } from 'lucide-react';

interface UserProfileCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    nickname: string;
    username?: string;
    email?: string;
    avatar?: string;
    bio?: string;
    createdAt?: Date;
  } | null;
  showEmail?: boolean;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ 
  open, 
  onOpenChange, 
  user,
  showEmail = false 
}) => {
  const isOnline = usePresence(user?.id || null);

  if (!user) return null;

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Avatar with online badge */}
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {getInitials(user.nickname)}
              </AvatarFallback>
            </Avatar>
            <span 
              className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-background ${
                isOnline ? 'bg-green-500' : 'bg-muted-foreground'
              }`} 
            />
          </div>

          {/* User info */}
          <div className="text-center space-y-1">
            <h3 className="text-xl font-semibold">{user.nickname}</h3>
            {user.username && (
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <AtSign className="h-4 w-4" />
                <span className="text-sm">{user.username}</span>
              </div>
            )}
            <Badge variant={isOnline ? 'default' : 'secondary'} className="mt-2">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-sm text-muted-foreground text-center px-4 max-w-xs">
              {user.bio}
            </p>
          )}

          {/* Additional info */}
          <div className="w-full space-y-3 pt-4 border-t border-border">
            {showEmail && user.email && (
              <div className="flex items-center gap-3 px-4">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.email}</span>
              </div>
            )}
            {user.createdAt && (
              <div className="flex items-center gap-3 px-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Joined {format(user.createdAt, 'MMMM yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileCard;
