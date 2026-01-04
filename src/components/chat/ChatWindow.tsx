import React, { useState, useEffect, useRef } from 'react';
import { ChatWithDetails, useMessages, useSendMessage, useTypingIndicator, usePresence } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Send,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Users,
  Flame,
  Trash2,
  VolumeX,
  Search,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import OnlineStatusBadge from './OnlineStatusBadge';
import UserProfileCard from './UserProfileCard';
import { getUserById, clearChat, clearUnreadCount, leaveGroup } from '@/services/chatService';
import { UserProfile } from '@/types/chat';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ChatWindowProps {
  chat: ChatWithDetails | null;
  onChatLeft?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onChatLeft }) => {
  const { user } = useAuth();
  const { messages, loading } = useMessages(chat?.id || null);
  const { sendMessage } = useSendMessage();
  const { typingUsers, setTyping } = useTypingIndicator(chat?.id || null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [clearChatOpen, setClearChatOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [leaveGroupOpen, setLeaveGroupOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Get the other user's ID for DM chats
  const otherUserId = chat?.type === 'dm' && user
    ? chat.participants.find((p) => p !== user.id) || null
    : null;
  
  const isOtherUserOnline = usePresence(otherUserId);

  // Clear unread count when viewing a chat
  useEffect(() => {
    if (chat?.id && user?.id) {
      // Clear immediately when chat is selected
      clearUnreadCount(chat.id, user.id).catch(console.error);
    }
  }, [chat?.id, user?.id]);

  // Also clear when new messages come in while chat is open
  useEffect(() => {
    if (chat?.id && user?.id && messages.length > 0) {
      clearUnreadCount(chat.id, user.id).catch(console.error);
    }
  }, [chat?.id, user?.id, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleClearChat = async () => {
    if (!chat) return;
    
    setIsClearing(true);
    try {
      await clearChat(chat.id);
      toast({
        title: 'Chat cleared',
        description: 'All messages have been deleted.',
      });
    } catch (error) {
      console.error('Failed to clear chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear chat.',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
      setClearChatOpen(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!chat || !user) return;
    
    setIsLeaving(true);
    try {
      await leaveGroup(chat.id, user.id);
      toast({
        title: 'Left group',
        description: `You have left "${chat.name}".`,
      });
      onChatLeft?.();
    } catch (error) {
      console.error('Failed to leave group:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave group.',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(false);
      setLeaveGroupOpen(false);
    }
  };

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    // Set typing status
    setTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !chat || isSending) return;
    
    setIsSending(true);
    setTyping(false);
    
    try {
      await sendMessage(chat.id, messageInput.trim());
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleViewProfile = async (userId: string) => {
    try {
      const userProfile = await getUserById(userId);
      if (userProfile) {
        setProfileUser(userProfile);
        setProfileOpen(true);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
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

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 p-8">
        <div className="p-6 rounded-full bg-primary/10 mb-6">
          <Flame className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">fyreChat</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Select a conversation to start chatting or add friends to begin new conversations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background/50">
      {/* Chat Header */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => otherUserId && handleViewProfile(otherUserId)}
        >
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chat.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {chat.type === 'group' ? (
                  <Users className="h-4 w-4" />
                ) : (
                  getInitials(chat.name)
                )}
              </AvatarFallback>
            </Avatar>
            {chat.type === 'dm' && otherUserId && (
              <OnlineStatusBadge userId={otherUserId} size="sm" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{chat.name}</h3>
            <p className="text-xs text-muted-foreground">
              {chat.type === 'dm'
                ? isOtherUserOnline
                  ? 'Online'
                  : 'Offline'
                : `${chat.participants?.length || 0} members`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {chat.type === 'dm' && otherUserId && (
                <DropdownMenuItem onClick={() => handleViewProfile(otherUserId)}>
                  View Profile
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Search className="mr-2 h-4 w-4" />
                Search Messages
              </DropdownMenuItem>
              <DropdownMenuItem>
                <VolumeX className="mr-2 h-4 w-4" />
                Mute Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setClearChatOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Chat
              </DropdownMenuItem>
              {chat.type === 'group' ? (
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setLeaveGroupOpen(true)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Leave Group
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="text-destructive">
                  <UserX className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn('flex gap-3', isMe && 'flex-row-reverse')}
                >
                  {!isMe && (
                    <Avatar 
                      className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleViewProfile(msg.senderId)}
                    >
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-2',
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-accent rounded-bl-md'
                    )}
                  >
                    {chat.type === 'group' && !isMe && (
                      <p 
                        className="text-xs font-medium mb-1 opacity-70 cursor-pointer hover:underline"
                        onClick={() => handleViewProfile(msg.senderId)}
                      >
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <div
                      className={cn(
                        'flex items-center gap-1 mt-1',
                        isMe ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span className="text-[10px] opacity-60">
                        {format(msg.timestamp, 'HH:mm')}
                      </span>
                      {isMe && (
                        <span className="text-[10px] opacity-60">
                          {msg.status === 'seen' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {typingUsers.length > 0 && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(chat.name)}
                </AvatarFallback>
              </Avatar>
              <div className="bg-accent rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card/50">
        <form onSubmit={handleSend} className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button type="button" variant="ghost" size="icon">
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={handleInputChange}
            className="flex-1 bg-background"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageInput.trim() || isSending}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Profile Card */}
      <UserProfileCard
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={profileUser}
        showEmail={false}
      />

      {/* Clear Chat Confirmation */}
      <AlertDialog open={clearChatOpen} onOpenChange={setClearChatOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all messages in this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearChat}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? 'Clearing...' : 'Clear Chat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={leaveGroupOpen} onOpenChange={setLeaveGroupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{chat?.name}"? You will no longer receive messages from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeaveGroup}
              disabled={isLeaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeaving ? 'Leaving...' : 'Leave Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatWindow;
