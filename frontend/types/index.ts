export interface User {
  _id: string;
  email: string;
  username: string;
  mssv?: string;
  avatar_url?: string;
  bio?: string;
  role: 'admin' | 'moderator' | 'member';
  school_id?: string;
  is_online?: boolean;
  last_seen?: Date;
  is_verified: boolean;
  preferences?: {
    theme: 'light' | 'dark';
    font_size: 'small' | 'medium' | 'large';
  };
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  participants: Array<{
    user_id: User;
    role: 'admin' | 'moderator' | 'member';
  }>;
  created_by: string;
  last_message?: Message;
  pinned_messages?: string[];
  created_at: Date;
  updated_at: Date;
}

// Read receipt with populated user data
export interface ReadReceipt {
  user_id: string | User;
  read_at: Date;
}

export interface Message {
  _id: string;
  conversation_id: string;
  sender_id: User;
  type: 'text' | 'file' | 'image' | 'video' | 'system';
  content?: string;
  file_info?: {
    file_id: string;
    filename: string;
    mime_type: string;
    size: number;
    url?: string;
  };
  reply_to?: Message;
  thread_id?: string;
  is_edited: boolean;
  reactions?: Array<{
    emoji: string;
    user_id: string;
  }>;
  read_by?: ReadReceipt[];
  created_at: Date;
  updated_at: Date;
}

// Role types
export type RoleType = 'admin' | 'moderator' | 'member';

// Role permission configuration
export interface RolePermissions {
  canManageMembers: boolean;
  canChangeRoles: boolean;
  canRemoveMembers: boolean;
  canEditGroupInfo: boolean;
  canPinMessages: boolean;
  canDeleteMessages: boolean;
  canInviteMembers: boolean;
}

// Role change log entry
export interface RoleChangeLog {
  _id: string;
  conversation_id: string;
  target_user_id: string;
  target_username: string;
  changed_by_user_id: string;
  changed_by_username: string;
  old_role: RoleType;
  new_role: RoleType;
  reason?: string;
  created_at: Date;
}

export interface FileAttachment {
  _id: string;
  original_name: string;
  stored_name: string;
  url: string;
  mime_type: string;
  size: number;
  uploader_id: User;
  conversation_id?: string;
  message_id?: string;
  upload_date: Date;
}

// Vote types
export interface VoteOption {
  text: string;
  voters: string[];
}

export interface VoteSettings {
  allow_multiple: boolean;
  anonymous: boolean;
}

export interface Vote {
  _id: string;
  conversation_id: string;
  created_by: User;
  question: string;
  options: VoteOption[];
  settings: VoteSettings;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ==================== OTP & Auth Types ====================

export interface OTPVerificationResponse {
  message: string;
  token: string;
  user: User;
}

export interface SendOTPResponse {
  message: string;
  email: string;
  expiresIn: number;
}

export interface ResendOTPResponse {
  message: string;
  email: string;
  expiresIn: number;
}

export interface AuthResponse {
  message?: string;
  token: string;
  user: User;
  requireVerification?: boolean;
}

export interface AuthError {
  error: string;
  requireVerification?: boolean;
  email?: string;
  remainingAttempts?: number;
  retryAfter?: number;
}

