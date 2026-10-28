export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN';
export type DoubtStatus = 'OPEN' | 'RESOLVED' | 'BOUNTIED';

export interface Database {
  public: {
    Tables: {
      universities: {
        Row: {
          id: string;
          name: string;
          allowed_domains: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          allowed_domains?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          allowed_domains?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          university_id: string;
          name: string;
          email: string;
          role: UserRole;
          reputation: number;
          badges: string[];
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          university_id: string;
          name: string;
          email: string;
          role?: UserRole;
          reputation?: number;
          badges?: string[];
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          university_id?: string;
          name?: string;
          email?: string;
          role?: UserRole;
          reputation?: number;
          badges?: string[];
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          }
        ];
      };
      communities: {
        Row: {
          id: string;
          university_id: string;
          name: string;
          description: string | null;
          is_private: boolean;
          join_code: string | null;
          created_by: string | null;
          moderators: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          name: string;
          description?: string | null;
          is_private?: boolean;
          join_code?: string | null;
          created_by?: string | null;
          moderators?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          university_id?: string;
          name?: string;
          description?: string | null;
          is_private?: boolean;
          join_code?: string | null;
          created_by?: string | null;
          moderators?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communities_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      doubts: {
        Row: {
          id: string;
          university_id: string;
          community_id: string;
          author_id: string;
          title: string;
          body: string;
          status: DoubtStatus;
          bounty_amount: number;
          upvoted_by: string[];
          downvoted_by: string[];
          net_score: number;
          resolved_answer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          community_id: string;
          author_id: string;
          title: string;
          body: string;
          status?: DoubtStatus;
          bounty_amount?: number;
          upvoted_by?: string[];
          downvoted_by?: string[];
          net_score?: number;
          resolved_answer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          university_id?: string;
          community_id?: string;
          author_id?: string;
          title?: string;
          body?: string;
          status?: DoubtStatus;
          bounty_amount?: number;
          upvoted_by?: string[];
          downvoted_by?: string[];
          net_score?: number;
          resolved_answer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doubts_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doubts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doubts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_doubts_resolved_answer";
            columns: ["resolved_answer_id"];
            isOneToOne: false;
            referencedRelation: "answers";
            referencedColumns: ["id"];
          }
        ];
      };
      answers: {
        Row: {
          id: string;
          university_id: string;
          doubt_id: string;
          author_id: string;
          body: string;
          is_accepted: boolean;
          is_instructor_endorsed: boolean;
          upvoted_by: string[];
          downvoted_by: string[];
          net_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          doubt_id: string;
          author_id: string;
          body: string;
          is_accepted?: boolean;
          is_instructor_endorsed?: boolean;
          upvoted_by?: string[];
          downvoted_by?: string[];
          net_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          university_id?: string;
          doubt_id?: string;
          author_id?: string;
          body?: string;
          is_accepted?: boolean;
          is_instructor_endorsed?: boolean;
          upvoted_by?: string[];
          downvoted_by?: string[];
          net_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answers_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_doubt_id_fkey";
            columns: ["doubt_id"];
            isOneToOne: false;
            referencedRelation: "doubts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_auth_university_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      search_similar_doubts: {
        Args: {
          search_query: string;
          similarity_threshold?: number;
          match_limit?: number;
        };
        Returns: {
          id: string;
          university_id: string;
          community_id: string;
          author_id: string;
          title: string;
          body: string;
          status: DoubtStatus;
          bounty_amount: number;
          net_score: number;
          created_at: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      doubt_status: DoubtStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience helper aliases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
