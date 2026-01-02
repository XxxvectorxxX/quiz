-- Function to calculate age category from birth date
create or replace function public.calculate_age_category(birth_date date)
returns text
language plpgsql
as $$
declare
  age integer;
begin
  age := extract(year from age(birth_date));
  
  if age < 13 then
    return 'criancas';
  elsif age >= 13 and age < 18 then
    return 'adolescentes';
  elsif age >= 18 and age < 30 then
    return 'jovens';
  else
    return 'adultos';
  end if;
end;
$$;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_category text;
begin
  -- Calculate age category
  calculated_category := public.calculate_age_category(
    (new.raw_user_meta_data->>'birth_date')::date
  );
  
  -- Insert profile
  insert into public.profiles (id, email, full_name, birth_date, age_category)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    (new.raw_user_meta_data->>'birth_date')::date,
    calculated_category
  )
  on conflict (id) do nothing;
  
  -- Initialize user progress
  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  
  return new;
end;
$$;

-- Create trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Function to update team rankings
create or replace function public.update_team_ranking(
  p_team_id uuid,
  p_points integer,
  p_won boolean
)
returns void
language plpgsql
as $$
begin
  insert into public.team_rankings (team_id, total_points, total_wins, total_matches)
  values (p_team_id, p_points, case when p_won then 1 else 0 end, 1)
  on conflict (team_id) do update set
    total_points = team_rankings.total_points + p_points,
    total_wins = team_rankings.total_wins + case when p_won then 1 else 0 end,
    total_matches = team_rankings.total_matches + 1,
    updated_at = now();
end;
$$;

-- Function to log admin actions
create or replace function public.log_admin_action(
  p_admin_id uuid,
  p_action_type text,
  p_description text,
  p_target_user_id uuid default null,
  p_target_team_id uuid default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.admin_logs (
    admin_id,
    action_type,
    description,
    target_user_id,
    target_team_id,
    metadata
  )
  values (
    p_admin_id,
    p_action_type,
    p_description,
    p_target_user_id,
    p_target_team_id,
    p_metadata
  );
end;
$$;
