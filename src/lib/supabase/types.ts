export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          wallet_address: string;
          ethscription_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          status: 'online' | 'offline' | 'idle' | 'dnd';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          ethscription_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          status?: 'online' | 'offline' | 'idle' | 'dnd';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          ethscription_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          status?: 'online' | 'offline' | 'idle' | 'dnd';
          created_at?: string;
          updated_at?: string;
        };
      };
      servers: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          invite_code: string;
          icon_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          invite_code?: string;
          icon_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          invite_code?: string;
          icon_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      server_members: {
        Row: {
          id: string;
          server_id: string;
          user_id: string;
          nickname: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          server_id: string;
          user_id: string;
          nickname?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          server_id?: string;
          user_id?: string;
          nickname?: string | null;
          joined_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          server_id: string;
          name: string;
          color: string | null;
          position: number;
          is_admin: boolean;
          can_manage_channels: boolean;
          can_manage_roles: boolean;
          can_manage_messages: boolean;
          can_kick_members: boolean;
          can_ban_members: boolean;
          can_invite: boolean;
          can_send_messages: boolean;
          can_attach_files: boolean;
          can_add_reactions: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          server_id: string;
          name: string;
          color?: string | null;
          position?: number;
          is_admin?: boolean;
          can_manage_channels?: boolean;
          can_manage_roles?: boolean;
          can_manage_messages?: boolean;
          can_kick_members?: boolean;
          can_ban_members?: boolean;
          can_invite?: boolean;
          can_send_messages?: boolean;
          can_attach_files?: boolean;
          can_add_reactions?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          server_id?: string;
          name?: string;
          color?: string | null;
          position?: number;
          is_admin?: boolean;
          can_manage_channels?: boolean;
          can_manage_roles?: boolean;
          can_manage_messages?: boolean;
          can_kick_members?: boolean;
          can_ban_members?: boolean;
          can_invite?: boolean;
          can_send_messages?: boolean;
          can_attach_files?: boolean;
          can_add_reactions?: boolean;
          created_at?: string;
        };
      };
      role_token_gates: {
        Row: {
          id: string;
          role_id: string;
          contract_address: string;
          chain: 'eth' | 'base' | 'appchain';
          min_balance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          contract_address: string;
          chain?: 'eth' | 'base' | 'appchain';
          min_balance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          contract_address?: string;
          chain?: 'eth' | 'base' | 'appchain';
          min_balance?: number;
          created_at?: string;
        };
      };
      member_roles: {
        Row: {
          id: string;
          member_id: string;
          role_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          role_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          role_id?: string;
          assigned_at?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          server_id: string;
          name: string;
          type: 'text' | 'category';
          position: number;
          is_private: boolean;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          server_id: string;
          name: string;
          type?: 'text' | 'category';
          position?: number;
          is_private?: boolean;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          server_id?: string;
          name?: string;
          type?: 'text' | 'category';
          position?: number;
          is_private?: boolean;
          parent_id?: string | null;
          created_at?: string;
        };
      };
      channel_permissions: {
        Row: {
          id: string;
          channel_id: string;
          role_id: string | null;
          user_id: string | null;
          allow_view: boolean | null;
          allow_send: boolean | null;
          allow_attach: boolean | null;
          allow_react: boolean | null;
          allow_manage: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          role_id?: string | null;
          user_id?: string | null;
          allow_view?: boolean | null;
          allow_send?: boolean | null;
          allow_attach?: boolean | null;
          allow_react?: boolean | null;
          allow_manage?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          role_id?: string | null;
          user_id?: string | null;
          allow_view?: boolean | null;
          allow_send?: boolean | null;
          allow_attach?: boolean | null;
          allow_react?: boolean | null;
          allow_manage?: boolean | null;
          created_at?: string;
        };
      };
      channel_token_gates: {
        Row: {
          id: string;
          channel_id: string;
          contract_address: string;
          chain: 'eth' | 'base' | 'appchain';
          min_balance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          contract_address: string;
          chain?: 'eth' | 'base' | 'appchain';
          min_balance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          contract_address?: string;
          chain?: 'eth' | 'base' | 'appchain';
          min_balance?: number;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          author_id: string;
          content: string;
          type: 'default' | 'system' | 'reply';
          reply_to_id: string | null;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          author_id: string;
          content: string;
          type?: 'default' | 'system' | 'reply';
          reply_to_id?: string | null;
          edited_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          author_id?: string;
          content?: string;
          type?: 'default' | 'system' | 'reply';
          reply_to_id?: string | null;
          edited_at?: string | null;
          created_at?: string;
        };
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          url: string;
          content_type: string;
          size: number;
          filename: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          url: string;
          content_type: string;
          size: number;
          filename: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          url?: string;
          content_type?: string;
          size?: number;
          filename?: string;
          created_at?: string;
        };
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
      };
      dm_channels: {
        Row: {
          id: string;
          is_group: boolean;
          name: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          is_group?: boolean;
          name?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          is_group?: boolean;
          name?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      dm_participants: {
        Row: {
          id: string;
          dm_channel_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          dm_channel_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          dm_channel_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      dm_messages: {
        Row: {
          id: string;
          dm_channel_id: string;
          author_id: string;
          content: string;
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          dm_channel_id: string;
          author_id: string;
          content: string;
          created_at?: string;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          dm_channel_id?: string;
          author_id?: string;
          content?: string;
          created_at?: string;
          edited_at?: string | null;
        };
      };
      platform_admins: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'super_admin';
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: 'admin' | 'super_admin';
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'admin' | 'super_admin';
          assigned_by?: string | null;
          created_at?: string;
        };
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          target_type?: string;
          target_id?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
