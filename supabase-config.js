// Supabase設定ファイル
// 必ず環境変数または安全な方法で値を管理してください。
export const SUPABASE_URL = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) || 'ここにSupabaseのURL';
export const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY) || 'ここにAnonキー';
