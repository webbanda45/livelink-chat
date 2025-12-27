import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import AddFriendDialog from '@/components/chat/AddFriendDialog';
import CreateGroupDialog from '@/components/chat/CreateGroupDialog';
import FriendRequestsDialog from '@/components/chat/FriendRequestsDialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useChats, ChatWithDetails } from '@/hooks/useChat';

const Chat: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { chats, loading: chatsLoading } = useChats();
  const [selectedChat, setSelectedChat] = useState<ChatWithDetails | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  // Update selected chat when chats update
  useEffect(() => {
    if (selectedChat) {
      const updated = chats.find(c => c.id === selectedChat.id);
      if (updated) setSelectedChat(updated);
    }
  }, [chats, selectedChat?.id]);

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
    setSelectedChat(chat);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-80 border-r border-border">
        <ChatSidebar
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          onAddFriend={() => setAddFriendOpen(true)}
          onCreateGroup={() => setCreateGroupOpen(true)}
          onViewRequests={() => setRequestsOpen(true)}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <ChatSidebar
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            onAddFriend={() => setAddFriendOpen(true)}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onViewRequests={() => setRequestsOpen(true)}
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

        <ChatWindow chat={selectedChat} />
      </div>

      {/* Dialogs */}
      <AddFriendDialog open={addFriendOpen} onOpenChange={setAddFriendOpen} />
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
      <FriendRequestsDialog open={requestsOpen} onOpenChange={setRequestsOpen} />
    </div>
  );
};

export default Chat;
