import React, { useState } from 'react';
import { ChatItem } from '@/pages/Chat';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Send,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Users,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'seen';
}

interface ChatWindowProps {
  chat: ChatItem | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Mock messages
  const [messages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'other',
      senderName: chat?.name || 'User',
      content: 'Hey! How are you doing?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: 'seen',
    },
    {
      id: '2',
      senderId: user?.id || 'me',
      senderName: user?.nickname || 'Me',
      content: "I'm good! Working on a new project. What about you?",
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      status: 'seen',
    },
    {
      id: '3',
      senderId: 'other',
      senderName: chat?.name || 'User',
      content: "That's awesome! I'd love to hear more about it.",
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
      status: 'seen',
    },
    {
      id: '4',
      senderId: user?.id || 'me',
      senderName: user?.nickname || 'Me',
      content: "It's a real-time chat application called fyreChat. Pretty cool stuff!",
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      status: 'delivered',
    },
  ]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    // In production, this would send to backend
    console.log('Sending message:', message);
    setMessage('');
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
        <div className="flex items-center gap-3">
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
            {chat.type === 'dm' && chat.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{chat.name}</h3>
            <p className="text-xs text-muted-foreground">
              {chat.type === 'dm'
                ? chat.isOnline
                  ? 'Online'
                  : 'Offline'
                : `${chat.members?.length || 0} members`}
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
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Search Messages</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                {chat.type === 'dm' ? 'Block User' : 'Leave Group'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.id || msg.senderId === 'me';
            return (
              <div
                key={msg.id}
                className={cn('flex gap-3', isMe && 'flex-row-reverse')}
              >
                {!isMe && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
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
                    <p className="text-xs font-medium mb-1 opacity-70">
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
          })}

          {isTyping && (
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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-background"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
