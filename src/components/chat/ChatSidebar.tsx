import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatWithDetails, useFriends } from '@/hooks/useChat';
import { useFriendRequests } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Flame,
  Search,
  MessageSquare,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Plus,
  MoreVertical,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import OnlineStatusBadge from './OnlineStatusBadge';
import { getOrCreateDMChat } from '@/services/chatService';

interface ChatSidebarProps {
  chats: ChatWithDetails[];
  selectedChat: ChatWithDetails | null;
  onSelectChat: (chat: ChatWithDetails) => void;
  onAddFriend: () => void;
  onCreateGroup: () => void;
  onViewRequests: () => void;
  onOpenSettings: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  selectedChat,
  onSelectChat,
  onAddFriend,
  onCreateGroup,
  onViewRequests,
  onOpenSettings,
}) => {
  const { user, signOut } = useAuth();
  const { requests } = useFriendRequests();
  const { friends } = useFriends();
  const [searchQuery, setSearchQuery] = useState('');

  const dmChats = chats.filter((c) => c.type === 'dm');
  const groupChats = chats.filter((c) => c.type === 'group');

  // Filter friends based on search query
  const filteredFriends = friends.filter((f) =>
    f.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter chats by search
  const filteredDms = dmChats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredGroups = groupChats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOtherUserId = (chat: ChatWithDetails) => {
    if (chat.type !== 'dm' || !user) return null;
    return chat.participants.find((p) => p !== user.id) || null;
  };

  const handleFriendClick = async (friendId: string) => {
    if (!user) return;
    
    // Check if DM already exists
    const existingChat = dmChats.find((c) => c.participants.includes(friendId));
    if (existingChat) {
      onSelectChat(existingChat);
      setSearchQuery('');
      return;
    }
    
    // Create new DM and wait for it to appear in chats
    try {
      const chatId = await getOrCreateDMChat(user.id, friendId);
      setSearchQuery('');
      
      // Wait a bit for the subscription to update, then select the new chat
      setTimeout(() => {
        const newChat = chats.find((c) => c.id === chatId);
        if (newChat) {
          onSelectChat(newChat);
        }
      }, 500);
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };

  const ChatListItem = ({ chat }: { chat: ChatWithDetails }) => {
    const otherUserId = getOtherUserId(chat);
    
    return (
      <button
        onClick={() => onSelectChat(chat)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
          'hover:bg-accent/50',
          selectedChat?.id === chat.id && 'bg-accent'
        )}
      >
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={chat.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm truncate">{chat.name}</span>
            {chat.lastMessageTime && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(chat.lastMessageTime, { addSuffix: false })}
              </span>
            )}
          </div>
          {chat.lastMessage && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {chat.lastMessage}
            </p>
          )}
        </div>

        {chat.unreadCount && chat.unreadCount > 0 && (
          <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
            {chat.unreadCount}
          </span>
        )}
      </button>
    );
  };

  const FriendSearchItem = ({ friend }: { friend: typeof friends[0] }) => (
    <button
      onClick={() => handleFriendClick(friend.odId)}
      className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left hover:bg-accent/50"
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={friend.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getInitials(friend.nickname)}
          </AvatarFallback>
        </Avatar>
        <OnlineStatusBadge userId={friend.odId} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{friend.nickname}</p>
        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
      </div>
    </button>
  );

  // Show friend search results when searching
  const showFriendSearch = searchQuery.trim().length > 0 && filteredFriends.length > 0;

  return (
    <div className="h-screen flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg">fyreChat</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Friend Requests Badge */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative"
              onClick={onViewRequests}
            >
              <Bell className="h-4 w-4" />
              {requests.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {requests.length}
                </Badge>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddFriend}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Friend
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateGroup}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
      </div>

      {/* Friend Search Results */}
      {showFriendSearch && (
        <div className="p-2 border-b border-border">
          <p className="text-xs text-muted-foreground px-2 mb-2">Friends</p>
          <div className="space-y-1">
            {filteredFriends.slice(0, 3).map((friend) => (
              <FriendSearchItem key={friend.odId} friend={friend} />
            ))}
          </div>
        </div>
      )}

      {/* Chat Lists */}
      <Tabs defaultValue="chats" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger
            value="chats"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chats
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Users className="h-4 w-4 mr-2" />
            Groups
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="chats" className="m-0 p-2">
            {filteredDms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No direct messages yet</p>
                <Button variant="link" size="sm" onClick={onAddFriend} className="mt-2">
                  Add a friend to start chatting
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDms.map((chat) => (
                  <ChatListItem key={chat.id} chat={chat} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="m-0 p-2">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No groups yet</p>
                <Button variant="link" size="sm" onClick={onCreateGroup} className="mt-2">
                  Create a group
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredGroups.map((chat) => (
                  <ChatListItem key={chat.id} chat={chat} />
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* User Profile Footer */}
      <div 
        className="p-3 border-t border-border cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onOpenSettings}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user?.nickname ? getInitials(user.nickname) : 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nickname}</p>
            <p className="text-xs text-muted-foreground truncate">
              @{user?.username}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
