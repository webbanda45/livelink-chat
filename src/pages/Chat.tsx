import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import AddFriendDialog from '@/components/chat/AddFriendDialog';
import CreateGroupDialog from '@/components/chat/CreateGroupDialog';
import FriendRequestsDialog from '@/components/chat/FriendRequestsDialog';
import UserProfileCard from '@/components/chat/UserProfileCard';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useChats, ChatWithDetails } from '@/hooks/useChat';
import { useNotifications } from '@/hooks/useNotifications';
import { clearUnreadCount } from '@/services/chatService';

const Chat: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { chats, loading: chatsLoading } = useChats();
  const { playNotificationSound, showBrowserNotification, requestPermission } = useNotifications();
  const [selectedChat, setSelectedChat] = useState<ChatWithDetails | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevChatsRef = useRef<ChatWithDetails[]>([]);
  const pendingChatIdRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Update selected chat when chats update and detect new messages
  useEffect(() => {
    if (selectedChat) {
      const updated = chats.find(c => c.id === selectedChat.id);
      if (updated) setSelectedChat(updated);
    }

    // Check for pending chat selection
    if (pendingChatIdRef.current) {
      const pendingChat = chats.find(c => c.id === pendingChatIdRef.current);
      if (pendingChat) {
        setSelectedChat({ ...pendingChat, unreadCount: 0 });
        if (user?.id) {
          clearUnreadCount(pendingChat.id, user.id).catch(console.error);
        }
        setSidebarOpen(false);
        pendingChatIdRef.current = null;
      }
    }

    // Check for new messages (unread count increased)
    if (prevChatsRef.current.length > 0 && user) {
      chats.forEach((chat) => {
        const prevChat = prevChatsRef.current.find(c => c.id === chat.id);
        const prevUnread = prevChat?.unreadCount || 0;
        const currentUnread = chat.unreadCount || 0;
        
        // If unread count increased and it's not the selected chat
        if (currentUnread > prevUnread && selectedChat?.id !== chat.id) {
          playNotificationSound();
          showBrowserNotification(
            `New message from ${chat.name}`,
            chat.lastMessage || 'You have a new message',
            chat.avatar
          );
        }
      });
    }
    
    prevChatsRef.current = chats;
  }, [chats, selectedChat?.id, user, playNotificationSound, showBrowserNotification]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleSelectChat = (chat: ChatWithDetails) => {
    setSelectedChat({ ...chat, unreadCount: 0 });
    if (user?.id) {
      clearUnreadCount(chat.id, user.id).catch(console.error);
    }
    setSidebarOpen(false);
  };

  const handleSelectChatById = (chatId: string) => {
    // Try to find immediately
    const found = chats.find(c => c.id === chatId);
    if (found) {
      setSelectedChat({ ...found, unreadCount: 0 });
      if (user?.id) {
        clearUnreadCount(found.id, user.id).catch(console.error);
      }
      setSidebarOpen(false);
    } else {
      // Set pending chat ID - will be picked up when chats update
      pendingChatIdRef.current = chatId;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-80 border-r border-border">
        <ChatSidebar
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          onSelectChatById={handleSelectChatById}
          onAddFriend={() => setAddFriendOpen(true)}
          onCreateGroup={() => setCreateGroupOpen(true)}
          onViewRequests={() => setRequestsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <ChatSidebar
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            onSelectChatById={handleSelectChatById}
            onAddFriend={() => setAddFriendOpen(true)}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onViewRequests={() => setRequestsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-2 p-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">
            {selectedChat ? selectedChat.name : 'fyreChat'}
          </span>
        </div>

        <ChatWindow chat={selectedChat} onChatLeft={() => setSelectedChat(null)} />
      </div>

      {/* Dialogs */}
      <AddFriendDialog open={addFriendOpen} onOpenChange={setAddFriendOpen} />
      <CreateGroupDialog 
        open={createGroupOpen} 
        onOpenChange={setCreateGroupOpen}
        onGroupCreated={handleSelectChatById}
      />
      <FriendRequestsDialog 
        open={requestsOpen} 
        onOpenChange={setRequestsOpen}
        onSelectChatById={handleSelectChatById}
      />
      <UserProfileCard
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        showEmail={true}
      />
    </div>
  );
};

export default Chat;
