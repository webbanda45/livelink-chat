import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  limit,
  increment,
} from 'firebase/firestore';
import { ref, onValue, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { db, rtdb } from '@/lib/firebase';
import { Chat, Message, Group, FriendRequest, UserProfile } from '@/types/chat';

// ============ User Services ============
export const searchUserByUsername = async (username: string): Promise<UserProfile | null> => {
  const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  if (!usernameDoc.exists()) return null;
  
  const userId = usernameDoc.data().odId;
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return null;
  
  const userData = userDoc.data();
  return {
    id: userId,
    email: userData.email,
    username: userData.username,
    nickname: userData.nickname,
    avatar: userData.avatar,
    bio: userData.bio,
    createdAt: userData.createdAt?.toDate() || new Date(),
  };
};

export const searchUsersByUsernamePrefix = async (prefix: string, currentUserId: string): Promise<UserProfile[]> => {
  if (!prefix || prefix.length < 2) return [];
  
  const lowercasePrefix = prefix.toLowerCase();
  const endPrefix = lowercasePrefix.slice(0, -1) + String.fromCharCode(lowercasePrefix.charCodeAt(lowercasePrefix.length - 1) + 1);
  
  const q = query(
    collection(db, 'users'),
    where('username', '>=', lowercasePrefix),
    where('username', '<', endPrefix),
    limit(5)
  );
  
  const snapshot = await getDocs(q);
  const users: UserProfile[] = [];
  
  snapshot.docs.forEach((doc) => {
    if (doc.id !== currentUserId) {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email,
        username: userData.username,
        nickname: userData.nickname,
        avatar: userData.avatar,
        bio: userData.bio,
        createdAt: userData.createdAt?.toDate() || new Date(),
      });
    }
  });
  
  return users;
};

export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return null;
  
  const userData = userDoc.data();
  return {
    id: userId,
    email: userData.email,
    username: userData.username,
    nickname: userData.nickname,
    avatar: userData.avatar,
    bio: userData.bio,
    createdAt: userData.createdAt?.toDate() || new Date(),
  };
};

// ============ Friend Request Services ============
export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  const sender = await getUserById(senderId);
  if (!sender) throw new Error('Sender not found');

  // Check if request already exists
  const existingQuery = query(
    collection(db, 'friendRequests'),
    where('senderId', '==', senderId),
    where('receiverId', '==', receiverId)
  );
  const existing = await getDocs(existingQuery);
  if (!existing.empty) throw new Error('Request already sent');

  // Check if already friends
  const friendsQuery = query(
    collection(db, 'friends', senderId, 'list'),
    where('odId', '==', receiverId)
  );
  const friendCheck = await getDocs(friendsQuery);
  if (!friendCheck.empty) throw new Error('Already friends');

  return addDoc(collection(db, 'friendRequests'), {
    senderId,
    senderUsername: sender.username,
    senderNickname: sender.nickname,
    senderAvatar: sender.avatar || null,
    receiverId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

export const acceptFriendRequest = async (requestId: string, userId: string, friendId: string) => {
  const requestRef = doc(db, 'friendRequests', requestId);
  
  // Delete the request instead of updating to accepted
  await deleteDoc(requestRef);

  const [user, friend] = await Promise.all([
    getUserById(userId),
    getUserById(friendId),
  ]);

  if (!user || !friend) throw new Error('User not found');

  // Add to friends collection for both users
  await Promise.all([
    addDoc(collection(db, 'friends', userId, 'list'), {
      odId: friendId,
      username: friend.username,
      nickname: friend.nickname,
      avatar: friend.avatar || null,
      addedAt: serverTimestamp(),
    }),
    addDoc(collection(db, 'friends', friendId, 'list'), {
      odId: userId,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar || null,
      addedAt: serverTimestamp(),
    }),
  ]);
  
  // Create DM chat immediately
  return getOrCreateDMChat(userId, friendId);
};

export const rejectFriendRequest = async (requestId: string) => {
  const requestRef = doc(db, 'friendRequests', requestId);
  await deleteDoc(requestRef);
};

export const subscribeToPendingRequests = (
  userId: string,
  callback: (requests: FriendRequest[]) => void
) => {
  const q = query(
    collection(db, 'friendRequests'),
    where('receiverId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const requests: FriendRequest[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as FriendRequest[];
    callback(requests);
  });
};

export const subscribeToFriends = (
  userId: string,
  callback: (friends: Array<{ odId: string; username: string; nickname: string; avatar?: string; isOnline?: boolean }>) => void
) => {
  const friendsRef = collection(db, 'friends', userId, 'list');
  
  return onSnapshot(friendsRef, async (snapshot) => {
    const friends = snapshot.docs.map((doc) => ({
      odId: doc.data().odId,
      username: doc.data().username,
      nickname: doc.data().nickname,
      avatar: doc.data().avatar,
    }));
    callback(friends);
  });
};

// ============ Chat Services ============
export const getOrCreateDMChat = async (userId1: string, userId2: string): Promise<string> => {
  // Check if DM already exists
  const q = query(
    collection(db, 'chats'),
    where('type', '==', 'dm'),
    where('participants', 'array-contains', userId1)
  );
  
  const snapshot = await getDocs(q);
  const existingChat = snapshot.docs.find((doc) => 
    doc.data().participants.includes(userId2)
  );
  
  if (existingChat) return existingChat.id;

  // Create new DM chat
  const [user1, user2] = await Promise.all([
    getUserById(userId1),
    getUserById(userId2),
  ]);

  const chatRef = await addDoc(collection(db, 'chats'), {
    type: 'dm',
    participants: [userId1, userId2],
    participantDetails: {
      [userId1]: { nickname: user1?.nickname || 'Unknown', avatar: user1?.avatar || null },
      [userId2]: { nickname: user2?.nickname || 'Unknown', avatar: user2?.avatar || null },
    },
    createdAt: serverTimestamp(),
    lastMessageTime: serverTimestamp(),
  });

  return chatRef.id;
};

export const subscribeToChats = (
  userId: string,
  callback: (chats: Chat[]) => void
) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const chats: Chat[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      lastMessageTime: doc.data().lastMessageTime?.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Chat[];
    callback(chats);
  });
};

// ============ Message Services ============
export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  content: string
) => {
  const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId,
    senderName,
    content,
    timestamp: serverTimestamp(),
    status: 'sent',
  });

  // Update chat's last message + increment unread counts (atomically) for other participants
  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);

  if (chatDoc.exists()) {
    const chatData = chatDoc.data();
    const participants: string[] = chatData.participants || [];

    const updates: Record<string, any> = {
      lastMessage: content,
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: senderId,
    };

    participants.forEach((participantId) => {
      if (participantId !== senderId) {
        updates[`unreadCounts.${participantId}`] = increment(1);
      }
    });

    await updateDoc(chatRef, updates);
  }

  return messageRef.id;
};

export const clearUnreadCount = async (chatId: string, userId: string) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, { [`unreadCounts.${userId}`]: 0 });
};

export const clearChat = async (chatId: string) => {
  // Delete all messages in the chat
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const snapshot = await getDocs(messagesRef);
  
  const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  // Update chat to clear last message
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: null,
    lastMessageSenderId: null,
  });
};

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      chatId,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as Message[];
    callback(messages);
  });
};

export const markMessageAsSeen = async (chatId: string, messageId: string) => {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    status: 'seen',
  });
};

// ============ Group Services ============
export const createGroup = async (
  name: string,
  adminId: string,
  memberIds: string[]
) => {
  const allMembers = [adminId, ...memberIds.filter((id) => id !== adminId)];
  
  const memberDetails: Record<string, { nickname: string; avatar: string | null }> = {};
  for (const memberId of allMembers) {
    const user = await getUserById(memberId);
    if (user) {
      memberDetails[memberId] = { nickname: user.nickname, avatar: user.avatar || null };
    }
  }

  const chatRef = await addDoc(collection(db, 'chats'), {
    type: 'group',
    name,
    adminId,
    participants: allMembers,
    participantDetails: memberDetails,
    createdAt: serverTimestamp(),
    lastMessageTime: serverTimestamp(),
  });

  return chatRef.id;
};

export const addGroupMember = async (chatId: string, userId: string) => {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);
  
  if (!chatDoc.exists()) throw new Error('Group not found');
  
  const chatData = chatDoc.data();
  const participants = [...chatData.participants, userId];
  const participantDetails = {
    ...chatData.participantDetails,
    [userId]: { nickname: user.nickname, avatar: user.avatar || null },
  };

  await updateDoc(chatRef, { participants, participantDetails });
};

export const removeGroupMember = async (chatId: string, userId: string) => {
  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);
  
  if (!chatDoc.exists()) throw new Error('Group not found');
  
  const chatData = chatDoc.data();
  const participants = chatData.participants.filter((id: string) => id !== userId);
  const participantDetails = { ...chatData.participantDetails };
  delete participantDetails[userId];

  await updateDoc(chatRef, { participants, participantDetails });
};

// ============ Presence Services ============
export const subscribeToUserPresence = (
  userId: string,
  callback: (isOnline: boolean) => void
) => {
  const statusRef = ref(rtdb, `/status/${userId}`);
  
  return onValue(statusRef, (snapshot) => {
    const status = snapshot.val();
    callback(status?.state === 'online');
  });
};

// ============ Typing Indicator Services ============
export const setTypingStatus = async (
  chatId: string,
  odId: string,
  isTyping: boolean
) => {
  const typingRef = ref(rtdb, `/typing/${chatId}/${odId}`);
  await set(typingRef, {
    isTyping,
    timestamp: rtdbServerTimestamp(),
  });
};

export const subscribeToTypingStatus = (
  chatId: string,
  currentUserId: string,
  callback: (typingUsers: string[]) => void
) => {
  const typingRef = ref(rtdb, `/typing/${chatId}`);
  
  return onValue(typingRef, (snapshot) => {
    const typingData = snapshot.val() || {};
    const typingUsers = Object.entries(typingData)
      .filter(([odId, data]: [string, any]) => 
        odId !== currentUserId && data.isTyping
      )
      .map(([odId]) => odId);
    callback(typingUsers);
  });
};
