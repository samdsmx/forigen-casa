export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      actividad: {
        Row: {
          created_at: string | null
          cupo: number | null
          facilitador_id: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          notas: string | null
          programa_id: string
          sede_id: string
          subtipo_id: string | null
          tipo_id: string
          ubicacion: string | null
        }
        Insert: {
          created_at?: string | null
          cupo?: number | null
          facilitador_id?: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          notas?: string | null
          programa_id: string
          sede_id: string
          subtipo_id?: string | null
          tipo_id: string
          ubicacion?: string | null
        }
        Update: {
          created_at?: string | null
          cupo?: number | null
          facilitador_id?: string | null
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          notas?: string | null
          programa_id?: string
          sede_id?: string
          subtipo_id?: string | null
          tipo_id?: string
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividad_facilitador_id_fkey"
            columns: ["facilitador_id"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_subtipo_id_fkey"
            columns: ["subtipo_id"]
            isOneToOne: false
            referencedRelation: "actividad_subtipo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "actividad_tipo"
            referencedColumns: ["id"]
          },
        ]
      }
      actividad_subtipo: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          tipo_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          tipo_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          tipo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividad_subtipo_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "actividad_tipo"
            referencedColumns: ["id"]
          },
        ]
      }
      actividad_tipo: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      app_role: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      app_user: {
        Row: {
          auth_user_id: string
          created_at: string | null
          id: string
          is_active: boolean
          role: string
          sede_id: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          role: string
          sede_id?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          role?: string
          sede_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_user_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "app_role"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "app_user_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencia: {
        Row: {
          actividad_id: string
          beneficiario_id: string
          created_at: string | null
          id: string
          sede_id: string
        }
        Insert: {
          actividad_id: string
          beneficiario_id: string
          created_at?: string | null
          id?: string
          sede_id: string
        }
        Update: {
          actividad_id?: string
          beneficiario_id?: string
          created_at?: string | null
          id?: string
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiario: {
        Row: {
          condicion_migrante: string | null
          created_at: string | null
          curp: string | null
          escolaridad: string | null
          fecha_nacimiento: string
          id: string
          lengua_indigena: string | null
          nombre: string
          poblacion_indigena: string | null
          primer_apellido: string
          segundo_apellido: string | null
          sexo: string
        }
        Insert: {
          condicion_migrante?: string | null
          created_at?: string | null
          curp?: string | null
          escolaridad?: string | null
          fecha_nacimiento: string
          id?: string
          lengua_indigena?: string | null
          nombre: string
          poblacion_indigena?: string | null
          primer_apellido: string
          segundo_apellido?: string | null
          sexo: string
        }
        Update: {
          condicion_migrante?: string | null
          created_at?: string | null
          curp?: string | null
          escolaridad?: string | null
          fecha_nacimiento?: string
          id?: string
          lengua_indigena?: string | null
          nombre?: string
          poblacion_indigena?: string | null
          primer_apellido?: string
          segundo_apellido?: string | null
          sexo?: string
        }
        Relationships: []
      }
      beneficiario_sede: {
        Row: {
          beneficiario_id: string
          created_at: string | null
          sede_id: string
        }
        Insert: {
          beneficiario_id: string
          created_at?: string | null
          sede_id: string
        }
        Update: {
          beneficiario_id?: string
          created_at?: string | null
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiario_sede_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiario_sede_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
        ]
      }
      poblacion_grupo: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      programa: {
        Row: {
          created_at: string | null
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          metas_clave: string | null
          nombre: string
          objetivo: string | null
          poblacion_grupo_id: string | null
          sede_id: string
          tema_id: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          metas_clave?: string | null
          nombre: string
          objetivo?: string | null
          poblacion_grupo_id?: string | null
          sede_id: string
          tema_id?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          metas_clave?: string | null
          nombre?: string
          objetivo?: string | null
          poblacion_grupo_id?: string | null
          sede_id?: string
          tema_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programa_poblacion_grupo_id_fkey"
            columns: ["poblacion_grupo_id"]
            isOneToOne: false
            referencedRelation: "poblacion_grupo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "tema"
            referencedColumns: ["id"]
          },
        ]
      }
      sede: {
        Row: {
          created_at: string | null
          estado: string | null
          id: string
          nombre: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          id?: string
          nombre: string
          slug: string
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          id?: string
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      tema: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_or_supervisor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      list_sedes: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          nombre: string
          slug: string
        }[]
      }
      user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      user_sede_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
