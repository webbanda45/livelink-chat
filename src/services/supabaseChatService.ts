import { supabase } from '@/integrations/supabase/client';
import { Chat, Message, FriendRequest, UserProfile } from '@/types/chat';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============ Profile Services ============
export const syncProfileToSupabase = async (
  firebaseUid: string,
  username: string,
  nickname: string,
  avatar?: string
): Promise<void> => {
  // Check if profile already exists for this firebase_uid
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (existingProfile) {
    // Update existing profile
    const { error } = await supabase
      .from('profiles')
      .update({
        nickname,
        avatar: avatar || null,
        updated_at: new Date().toISOString(),
      })
      .eq('firebase_uid', firebaseUid);

    if (error) {
      console.error('Error updating profile in Supabase:', error);
    }
  } else {
    // Check if username is taken
    let finalUsername = username.toLowerCase();
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', finalUsername)
      .maybeSingle();

    if (existingUsername) {
      // Username taken, append random suffix
      finalUsername = `${finalUsername}_${Date.now().toString(36)}`;
    }

    // Insert new profile
    const { error } = await supabase
      .from('profiles')
      .insert({
        firebase_uid: firebaseUid,
        username: finalUsername,
        nickname,
        avatar: avatar || null,
      });

    if (error) {
      console.error('Error inserting profile to Supabase:', error);
    }
  }
};

export const getProfileByFirebaseUid = async (firebaseUid: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.firebase_uid,
    email: '',
    username: data.username,
    nickname: data.nickname,
    avatar: data.avatar || undefined,
    createdAt: new Date(data.created_at),
  };
};

// ============ User Services ============
export const searchUserByUsername = async (username: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.firebase_uid,
    email: '',
    username: data.username,
    nickname: data.nickname,
    avatar: data.avatar || undefined,
    createdAt: new Date(data.created_at),
  };
};

export const searchUsersByUsernamePrefix = async (prefix: string, currentUserId: string): Promise<UserProfile[]> => {
  if (!prefix || prefix.length < 2) return [];

  const lowercasePrefix = prefix.toLowerCase();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `${lowercasePrefix}%`)
    .neq('firebase_uid', currentUserId)
    .limit(5);

  if (error || !data) return [];

  return data.map((profile) => ({
    id: profile.firebase_uid,
    email: '',
    username: profile.username,
    nickname: profile.nickname,
    avatar: profile.avatar || undefined,
    createdAt: new Date(profile.created_at),
  }));
};

export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('firebase_uid', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.firebase_uid,
    email: '',
    username: data.username,
    nickname: data.nickname,
    avatar: data.avatar || undefined,
    createdAt: new Date(data.created_at),
  };
};

// ============ Friend Request Services ============
export const sendFriendRequest = async (senderId: string, receiverId: string): Promise<void> => {
  const sender = await getUserById(senderId);
  if (!sender) throw new Error('Sender not found');

  // Check if request already exists
  const { data: existing } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .maybeSingle();

  if (existing) throw new Error('Request already sent');

  // Check if already friends
  const { data: friendCheck } = await supabase
    .from('friends')
    .select('id')
    .eq('user_id', senderId)
    .eq('friend_id', receiverId)
    .maybeSingle();

  if (friendCheck) throw new Error('Already friends');

  const { error } = await supabase.from('friend_requests').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    status: 'pending',
  });

  if (error) throw error;
};

export const acceptFriendRequest = async (requestId: string, userId: string, friendId: string): Promise<string> => {
  // Delete the request
  await supabase.from('friend_requests').delete().eq('id', requestId);

  // Add to friends for both users
  await supabase.from('friends').insert([
    { user_id: userId, friend_id: friendId },
    { user_id: friendId, friend_id: userId },
  ]);

  // Create DM chat immediately
  return getOrCreateDMChat(userId, friendId);
};

export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  await supabase.from('friend_requests').delete().eq('id', requestId);
};

export const subscribeToPendingRequests = (
  userId: string,
  callback: (requests: FriendRequest[]) => void
): (() => void) => {
  // Initial fetch
  const fetchRequests = async () => {
    const { data } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch sender details for each request
      const requestsWithDetails = await Promise.all(
        data.map(async (req) => {
          const sender = await getUserById(req.sender_id);
          return {
            id: req.id,
            senderId: req.sender_id,
            receiverId: req.receiver_id,
            senderUsername: sender?.username || 'Unknown',
            senderNickname: sender?.nickname || 'Unknown',
            senderAvatar: sender?.avatar,
            status: req.status as 'pending' | 'accepted' | 'rejected',
            createdAt: new Date(req.created_at),
          };
        })
      );
      callback(requestsWithDetails);
    }
  };

  fetchRequests();

  // Set up realtime subscription
  const channel = supabase
    .channel('friend_requests_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `receiver_id=eq.${userId}`,
      },
      () => {
        fetchRequests();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToFriends = (
  userId: string,
  callback: (friends: Array<{ odId: string; username: string; nickname: string; avatar?: string; isOnline?: boolean }>) => void
): (() => void) => {
  const fetchFriends = async () => {
    const { data } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId);

    if (data) {
      const friendsWithDetails = await Promise.all(
        data.map(async (f) => {
          const friend = await getUserById(f.friend_id);
          const presence = await getUserPresence(f.friend_id);
          return {
            odId: f.friend_id,
            username: friend?.username || 'Unknown',
            nickname: friend?.nickname || 'Unknown',
            avatar: friend?.avatar,
            isOnline: presence,
          };
        })
      );
      callback(friendsWithDetails);
    }
  };

  fetchFriends();

  const channel = supabase
    .channel('friends_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        fetchFriends();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============ Chat Services ============
export const getOrCreateDMChat = async (userId1: string, userId2: string): Promise<string> => {
  // Check if DM already exists
  const { data: existingChats } = await supabase
    .from('chats')
    .select('*')
    .eq('type', 'dm')
    .contains('participants', [userId1]);

  const existingChat = existingChats?.find((chat) => 
    chat.participants.includes(userId2)
  );

  if (existingChat) return existingChat.id;

  // Create new DM chat
  const { data: newChat, error } = await supabase
    .from('chats')
    .insert({
      type: 'dm',
      participants: [userId1, userId2],
    })
    .select()
    .single();

  if (error) throw error;

  return newChat.id;
};

export const subscribeToChats = (
  userId: string,
  callback: (chats: Chat[]) => void
): (() => void) => {
  const fetchChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', [userId])
      .order('last_message_time', { ascending: false });

    if (data) {
      // Fetch participant details and unread counts
      const chatsWithDetails = await Promise.all(
        data.map(async (chat) => {
          const participantDetails: Record<string, { nickname: string; avatar: string | null }> = {};
          
          for (const participantId of chat.participants) {
            const profile = await getUserById(participantId);
            if (profile) {
              participantDetails[participantId] = {
                nickname: profile.nickname,
                avatar: profile.avatar || null,
              };
            }
          }

          // Get unread count
          const { data: unreadData } = await supabase
            .from('unread_counts')
            .select('count')
            .eq('chat_id', chat.id)
            .eq('user_id', userId)
            .maybeSingle();

          return {
            id: chat.id,
            type: chat.type as 'dm' | 'group',
            name: chat.name || undefined,
            participants: chat.participants,
            participantDetails,
            lastMessage: chat.last_message || undefined,
            lastMessageTime: chat.last_message_time ? new Date(chat.last_message_time) : undefined,
            createdAt: new Date(chat.created_at),
            unreadCounts: { [userId]: unreadData?.count || 0 },
          } as Chat & { unreadCounts: Record<string, number> };
        })
      );
      callback(chatsWithDetails);
    }
  };

  fetchChats();

  const channel = supabase
    .channel('chats_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chats',
      },
      () => {
        fetchChats();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============ Message Services ============
export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  content: string
): Promise<string> => {
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      sender_name: senderName,
      content,
    })
    .select()
    .single();

  if (messageError) throw messageError;

  // Update chat's last message
  await supabase
    .from('chats')
    .update({
      last_message: content,
      last_message_time: new Date().toISOString(),
    })
    .eq('id', chatId);

  // Get chat participants and increment unread counts for others
  const { data: chat } = await supabase
    .from('chats')
    .select('participants')
    .eq('id', chatId)
    .single();

  if (chat) {
    for (const participantId of chat.participants) {
      if (participantId !== senderId) {
        // Upsert unread count
        const { data: existing } = await supabase
          .from('unread_counts')
          .select('count')
          .eq('chat_id', chatId)
          .eq('user_id', participantId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('unread_counts')
            .update({ count: existing.count + 1 })
            .eq('chat_id', chatId)
            .eq('user_id', participantId);
        } else {
          await supabase
            .from('unread_counts')
            .insert({ chat_id: chatId, user_id: participantId, count: 1 });
        }
      }
    }
  }

  return message.id;
};

export const clearUnreadCount = async (chatId: string, userId: string): Promise<void> => {
  await supabase
    .from('unread_counts')
    .upsert({ chat_id: chatId, user_id: userId, count: 0 }, { onConflict: 'chat_id,user_id' });
};

export const clearChat = async (chatId: string): Promise<void> => {
  await supabase.from('messages').delete().eq('chat_id', chatId);
  await supabase
    .from('chats')
    .update({ last_message: null })
    .eq('id', chatId);
};

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      callback(
        data.map((msg) => ({
          id: msg.id,
          chatId: msg.chat_id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          status: 'sent' as const,
        }))
      );
    }
  };

  fetchMessages();

  const channel = supabase
    .channel(`messages_${chatId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      () => {
        fetchMessages();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============ Group Services ============
export const createGroup = async (
  name: string,
  adminId: string,
  memberIds: string[]
): Promise<string> => {
  const allMembers = Array.from(
    new Set([adminId, ...(memberIds || [])])
  ).filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  if (allMembers.length < 2) {
    throw new Error('Select at least 1 friend to create a group');
  }

  const { data: newChat, error } = await supabase
    .from('chats')
    .insert({
      type: 'group',
      name: name.trim(),
      participants: allMembers,
    })
    .select()
    .single();

  if (error) throw error;

  // Add group members
  await supabase.from('group_members').insert(
    allMembers.map((memberId) => ({
      chat_id: newChat.id,
      user_id: memberId,
      role: memberId === adminId ? 'admin' : 'member',
    }))
  );

  return newChat.id;
};

export const addGroupMember = async (chatId: string, userId: string): Promise<void> => {
  const { data: chat } = await supabase
    .from('chats')
    .select('participants')
    .eq('id', chatId)
    .single();

  if (!chat) throw new Error('Group not found');

  const participants = [...chat.participants, userId];

  await supabase
    .from('chats')
    .update({ participants })
    .eq('id', chatId);

  await supabase.from('group_members').insert({
    chat_id: chatId,
    user_id: userId,
    role: 'member',
  });
};

export const removeGroupMember = async (chatId: string, userId: string): Promise<void> => {
  const { data: chat } = await supabase
    .from('chats')
    .select('participants')
    .eq('id', chatId)
    .single();

  if (!chat) throw new Error('Group not found');

  const participants = chat.participants.filter((id: string) => id !== userId);

  await supabase
    .from('chats')
    .update({ participants })
    .eq('id', chatId);

  await supabase
    .from('group_members')
    .delete()
    .eq('chat_id', chatId)
    .eq('user_id', userId);
};

export const leaveGroup = async (chatId: string, userId: string): Promise<void> => {
  await removeGroupMember(chatId, userId);
};

// ============ Presence Services ============
export const setUserPresence = async (userId: string, isOnline: boolean): Promise<void> => {
  await supabase
    .from('user_presence')
    .upsert({
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'user_id' });
};

export const getUserPresence = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('user_presence')
    .select('is_online')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.is_online || false;
};

export const subscribeToUserPresence = (
  userId: string,
  callback: (isOnline: boolean) => void
): (() => void) => {
  const fetchPresence = async () => {
    const isOnline = await getUserPresence(userId);
    callback(isOnline);
  };

  fetchPresence();

  const channel = supabase
    .channel(`presence_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newData = payload.new as { is_online?: boolean };
        callback(newData?.is_online || false);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============ Typing Indicator Services ============
export const setTypingStatus = async (
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  await supabase
    .from('typing_status')
    .upsert({
      chat_id: chatId,
      user_id: userId,
      is_typing: isTyping,
    }, { onConflict: 'chat_id,user_id' });
};

export const subscribeToTypingStatus = (
  chatId: string,
  currentUserId: string,
  callback: (typingUsers: string[]) => void
): (() => void) => {
  const fetchTyping = async () => {
    const { data } = await supabase
      .from('typing_status')
      .select('user_id, is_typing')
      .eq('chat_id', chatId)
      .neq('user_id', currentUserId)
      .eq('is_typing', true);

    callback(data?.map((t) => t.user_id) || []);
  };

  fetchTyping();

  const channel = supabase
    .channel(`typing_${chatId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_status',
        filter: `chat_id=eq.${chatId}`,
      },
      () => {
        fetchTyping();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
