export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          actor: string;
          created_at: string;
          id: string;
          message: string;
          org_id: string;
        };
        Insert: {
          actor?: string;
          created_at?: string;
          id?: string;
          message: string;
          org_id: string;
        };
        Update: {
          actor?: string;
          created_at?: string;
          id?: string;
          message?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      content_library: {
        Row: {
          content_body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          org_id: string;
          reuse_count: number;
          tags: string[];
          title: string;
        };
        Insert: {
          content_body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          org_id: string;
          reuse_count?: number;
          tags?: string[];
          title: string;
        };
        Update: {
          content_body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          org_id?: string;
          reuse_count?: number;
          tags?: string[];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_library_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      org_members: {
        Row: {
          joined_at: string;
          org_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          org_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          org_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          plan_tier: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          plan_tier?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          plan_tier?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_org_id: string | null;
          current_role_preview: Database["public"]["Enums"]["app_role"] | null;
          display_name: string | null;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_org_id?: string | null;
          current_role_preview?: Database["public"]["Enums"]["app_role"] | null;
          display_name?: string | null;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_org_id?: string | null;
          current_role_preview?: Database["public"]["Enums"]["app_role"] | null;
          display_name?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_current_org_id_fkey";
            columns: ["current_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      proposal_sections: {
        Row: {
          ai_draft: string | null;
          assigned_to: string | null;
          compliance_score: number | null;
          compliance_status: Database["public"]["Enums"]["compliance_state"];
          created_at: string;
          human_edits: string | null;
          id: string;
          order_index: number;
          rfp_id: string;
          section_name: string;
          updated_at: string;
          version_number: number;
        };
        Insert: {
          ai_draft?: string | null;
          assigned_to?: string | null;
          compliance_score?: number | null;
          compliance_status?: Database["public"]["Enums"]["compliance_state"];
          created_at?: string;
          human_edits?: string | null;
          id?: string;
          order_index?: number;
          rfp_id: string;
          section_name: string;
          updated_at?: string;
          version_number?: number;
        };
        Update: {
          ai_draft?: string | null;
          assigned_to?: string | null;
          compliance_score?: number | null;
          compliance_status?: Database["public"]["Enums"]["compliance_state"];
          created_at?: string;
          human_edits?: string | null;
          id?: string;
          order_index?: number;
          rfp_id?: string;
          section_name?: string;
          updated_at?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "proposal_sections_rfp_id_fkey";
            columns: ["rfp_id"];
            isOneToOne: false;
            referencedRelation: "rfp_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      rfp_projects: {
        Row: {
          budget: number | null;
          created_at: string;
          created_by: string | null;
          due_date: string | null;
          id: string;
          issuing_agency: string | null;
          org_id: string;
          status: Database["public"]["Enums"]["rfp_status"];
          title: string;
          updated_at: string;
          win_probability: number | null;
        };
        Insert: {
          budget?: number | null;
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          issuing_agency?: string | null;
          org_id: string;
          status?: Database["public"]["Enums"]["rfp_status"];
          title: string;
          updated_at?: string;
          win_probability?: number | null;
        };
        Update: {
          budget?: number | null;
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          issuing_agency?: string | null;
          org_id?: string;
          status?: Database["public"]["Enums"]["rfp_status"];
          title?: string;
          updated_at?: string;
          win_probability?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "rfp_projects_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      rfp_requirements: {
        Row: {
          assigned_user_id: string | null;
          created_at: string;
          id: string;
          rfp_id: string;
          risk_level: Database["public"]["Enums"]["risk_level"];
          status: Database["public"]["Enums"]["req_status"];
          text_snippet: string;
        };
        Insert: {
          assigned_user_id?: string | null;
          created_at?: string;
          id?: string;
          rfp_id: string;
          risk_level?: Database["public"]["Enums"]["risk_level"];
          status?: Database["public"]["Enums"]["req_status"];
          text_snippet: string;
        };
        Update: {
          assigned_user_id?: string | null;
          created_at?: string;
          id?: string;
          rfp_id?: string;
          risk_level?: Database["public"]["Enums"]["risk_level"];
          status?: Database["public"]["Enums"]["req_status"];
          text_snippet?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rfp_requirements_rfp_id_fkey";
            columns: ["rfp_id"];
            isOneToOne: false;
            referencedRelation: "rfp_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      section_versions: {
        Row: {
          content: string;
          created_at: string;
          created_by: string | null;
          id: string;
          section_id: string;
          version_number: number;
        };
        Insert: {
          content: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          section_id: string;
          version_number: number;
        };
        Update: {
          content?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          section_id?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "section_versions_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "proposal_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          org_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_comments: {
        Row: {
          created_at: string;
          id: string;
          section_id: string;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          section_id: string;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          section_id?: string;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_comments_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "proposal_sections";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _org: string;
          _role: Database["public"]["Enums"]["app_role"];
          _uid: string;
        };
        Returns: boolean;
      };
      is_org_member: { Args: { _org: string; _uid: string }; Returns: boolean };
    };
    Enums: {
      app_role: "proposal_manager" | "sme" | "compliance_auditor";
      compliance_state: "draft" | "approved" | "rejected" | "needs_review";
      req_status: "pending" | "met" | "warning";
      rfp_status: "ingestion" | "parsing" | "drafting" | "review" | "submitted";
      risk_level: "high" | "med" | "low";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["proposal_manager", "sme", "compliance_auditor"],
      compliance_state: ["draft", "approved", "rejected", "needs_review"],
      req_status: ["pending", "met", "warning"],
      rfp_status: ["ingestion", "parsing", "drafting", "review", "submitted"],
      risk_level: ["high", "med", "low"],
    },
  },
} as const;
