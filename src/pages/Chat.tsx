import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export interface ChatItem {
  id: string;
  type: 'dm' | 'group';
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  isOnline?: boolean;
  members?: string[];
}

const Chat: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock chat data
  const [chats] = useState<ChatItem[]>([
    {
      id: '1',
      type: 'dm',
      name: 'John Doe',
      lastMessage: 'Hey, how are you?',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 5),
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: '2',
      type: 'dm',
      name: 'Jane Smith',
      lastMessage: 'See you tomorrow!',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60),
      isOnline: false,
    },
    {
      id: '3',
      type: 'group',
      name: 'Dev Team',
      lastMessage: 'Meeting at 3 PM',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 30),
      unreadCount: 5,
      members: ['John', 'Jane', 'Bob'],
    },
    {
      id: '4',
      type: 'group',
      name: 'Project Alpha',
      lastMessage: 'New updates pushed',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 120),
      members: ['Alice', 'Charlie'],
    },
  ]);

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

  const handleSelectChat = (chat: ChatItem) => {
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
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <ChatSidebar
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
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
    </div>
  );
};

export default Chat;
