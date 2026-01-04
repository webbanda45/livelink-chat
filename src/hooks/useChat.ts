import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToChats,
  subscribeToMessages,
  sendMessage as sendMessageService,
  getOrCreateDMChat,
  subscribeToFriends,
  subscribeToPendingRequests,
  subscribeToUserPresence,
  setTypingStatus,
  subscribeToTypingStatus,
  clearUnreadCount as clearUnreadCountService,
} from '@/services/chatService';
import { Chat, Message, FriendRequest } from '@/types/chat';

export interface ChatWithDetails extends Chat {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  unreadCount?: number;
}

export const useChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToChats(user.id, (rawChats) => {
      const processedChats: ChatWithDetails[] = rawChats.map((chat) => {
        const unreadCount = (chat as any).unreadCounts?.[user.id] || 0;
        
        if (chat.type === 'dm') {
          const otherUserId = chat.participants.find((p) => p !== user.id);
          const otherUser = otherUserId ? chat.participantDetails?.[otherUserId] : null;
          return {
            ...chat,
            name: otherUser?.nickname || 'Unknown User',
            avatar: otherUser?.avatar,
            unreadCount,
          };
        }
        return {
          ...chat,
          name: (chat as any).name || 'Group',
          unreadCount,
        };
      });
      setChats(processedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { chats, loading };
};

export const useMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  return { messages, loading };
};

export const useSendMessage = () => {
  const { user } = useAuth();

  const sendMessage = useCallback(async (chatId: string, content: string) => {
    if (!user) throw new Error('Not authenticated');
    await sendMessageService(chatId, user.id, user.nickname, content);
  }, [user]);

  return { sendMessage };
};

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Array<{ odId: string; username: string; nickname: string; avatar?: string; isOnline?: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToFriends(user.id, (friendsList) => {
      setFriends(friendsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { friends, loading };
};

export const useFriendRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToPendingRequests(user.id, (reqs) => {
      setRequests(reqs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { requests, loading };
};

export const usePresence = (userId: string | null) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }

    const unsubscribe = subscribeToUserPresence(userId, setIsOnline);
    return () => unsubscribe();
  }, [userId]);

  return isOnline;
};

export const useTypingIndicator = (chatId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!chatId || !user) {
      setTypingUsers([]);
      return;
    }

    const unsubscribe = subscribeToTypingStatus(chatId, user.id, setTypingUsers);
    return () => unsubscribe();
  }, [chatId, user]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!chatId || !user) return;
    await setTypingStatus(chatId, user.id, isTyping);
  }, [chatId, user]);

  return { typingUsers, setTyping };
};

export const useStartDMChat = () => {
  const { user } = useAuth();

  const startChat = useCallback(async (friendId: string) => {
    if (!user) throw new Error('Not authenticated');
    return getOrCreateDMChat(user.id, friendId);
  }, [user]);

  return { startChat };
};
