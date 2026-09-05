export type Role = 'user' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  yevox_id: string;
  country: string;
  city: string;
  region: string | null;
  local_area: string | null;
  role: Role;
  city_changed_at: string | null;
  avatar_url: string | null;
  total_fuel: number;
  total_drag: number;
  is_suspended: boolean;
  is_banned: boolean;
  deleted_at: string | null;
  created_at: string;
}

export type StatementStatus = 'draft' | 'live' | 'turbo' | 'archive' | 'stalled' | 'removed';
export type Scope = 'city' | 'country' | 'global';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_disabled: boolean;
}

export interface Statement {
  id: string;
  author_id: string;
  body: string;
  reasoning: string;
  category_id: string | null;
  scope: Scope;
  scope_country: string | null;
  scope_city: string | null;
  scope_region: string | null;
  scope_local_area: string | null;
  status: StatementStatus;
  agree_count: number;
  disagree_count: number;
  total_votes: number;
  comment_count: number;
  vote_velocity: number;
  turbo_at: string | null;
  archive_at: string | null;
  stalled_at: string | null;
  live_until: string | null;
  removed_at: string | null;
  removed_reason: string | null;
  created_at: string;
  // joined
  author?: Profile;
  category?: Category;
}

export interface Vote {
  id: string;
  statement_id: string;
  user_id: string;
  value: 'agree' | 'disagree';
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  statement_id: string;
  author_id: string;
  parent_id: string | null;
  depth: number;
  body: string;
  fuel_count: number;
  drag_count: number;
  is_deleted: boolean;
  is_removed: boolean;
  removed_reason: string | null;
  edited_at: string | null;
  created_at: string;
  author?: Profile;
  children?: Comment[];
}

export interface CommentRating {
  id: string;
  comment_id: string;
  user_id: string;
  rating: 'fuel' | 'drag';
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  target_type: 'statement' | 'comment' | 'user';
  target_id: string;
  reason: string;
  detail: string | null;
  status: 'open' | 'actioned' | 'dismissed';
  decision: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  reporter?: Profile | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  color: string | null;
  start_at: string;
  end_at: string | null;
  is_dismissible: boolean;
  is_active: boolean;
}

export interface FeatureFlag {
  key: string;
  is_enabled: boolean;
}

export interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  admin?: Profile;
}
