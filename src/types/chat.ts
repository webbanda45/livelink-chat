export interface UserProfile {
  id: string;
  email: string;
  username: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  createdAt: Date;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderNickname: string;
  senderAvatar?: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface Friend {
  odId: string;
  username: string;
  nickname: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'seen';
}

export interface Chat {
  id: string;
  type: 'dm' | 'group';
  participants: string[];
  participantDetails?: Record<string, { nickname: string; avatar?: string }>;
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageSenderId?: string;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  icon?: string;
  adminId: string;
  members: string[];
  memberDetails?: Record<string, { nickname: string; avatar?: string }>;
  createdAt: Date;
}

export interface TypingStatus {
  odId: string;
  chatId: string;
  isTyping: boolean;
  timestamp: number;
}
