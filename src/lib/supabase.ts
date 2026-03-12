/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export type Profile = {
  id: string;
  full_name: string;
  role: 'driver' | 'supervisor';
  phone?: string | null;
  avatar_url?: string | null;
  is_super?: boolean;
  created_at: string;
};

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  mileage: number;
  color?: string;
  status: 'active' | 'maintenance' | 'inactive';
  current_driver?: string;
  created_at: string;
};

export type Checklist = {
  id: string;
  vehicle_id: string;
  driver_id: string;
  date: string;
  status: 'pending' | 'reviewed';
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  item_name: string;
  is_ok: boolean;
  notes?: string;
};

export type Damage = {
  id: string;
  vehicle_id: string;
  reported_by: string;
  description: string;
  photo_url?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  created_at: string;
};

export type FuelLog = {
  id: string;
  vehicle_id: string;
  driver_id: string;
  mileage: number;
  liters: number;
  value: number;
  date: string;
  photo_url?: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'checklist' | 'damage' | 'fuel' | 'system';
  read: boolean;
  created_at: string;
};

export type AppVersion = {
  id: number;
  version_number: number;
  commit_hash: string;
  commit_message: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id?: string;
  user_email?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
};

export type OilChange = {
  id: string;
  vehicle_id: string;
  current_mileage: number;
  next_change_mileage: number;
  change_date: string;
  next_change_date: string;
  created_at: string;
  is_super_data?: boolean;
};
