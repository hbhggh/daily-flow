-- DailyFlow 云端同步 — 在 Supabase SQL Editor 中运行此脚本
-- https://supabase.com/dashboard/project/owznwjkcovsifrbrtcon/sql/new

-- 1. 创建 user_data 表（镜像 localStorage 的 key-value 结构）
create table user_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  key text not null,
  value text,
  updated_at timestamptz default now() not null,
  unique(user_id, key)
);

-- 2. 启用行级安全 (RLS)
alter table user_data enable row level security;

-- 3. RLS 策略：用户只能访问自己的数据
create policy "Users can read own data" on user_data
  for select using (auth.uid() = user_id);

create policy "Users can insert own data" on user_data
  for insert with check (auth.uid() = user_id);

create policy "Users can update own data" on user_data
  for update using (auth.uid() = user_id);

create policy "Users can delete own data" on user_data
  for delete using (auth.uid() = user_id);

-- 4. 启用实时同步
alter publication supabase_realtime add table user_data;

-- 5. 创建索引（加速按用户查询）
create index idx_user_data_user_id on user_data(user_id);
