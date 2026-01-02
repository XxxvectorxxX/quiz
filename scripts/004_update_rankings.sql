-- Function to update team rankings after match
create or replace function public.calculate_team_ranks()
returns void
language plpgsql
as $$
begin
  -- Update rank based on total points
  update public.team_rankings
  set rank = subquery.new_rank
  from (
    select 
      id,
      row_number() over (order by total_points desc, total_wins desc) as new_rank
    from public.team_rankings
  ) as subquery
  where team_rankings.id = subquery.id;
end;
$$;

-- Trigger to recalculate ranks after any update
create or replace function public.trigger_recalculate_ranks()
returns trigger
language plpgsql
as $$
begin
  perform public.calculate_team_ranks();
  return new;
end;
$$;

drop trigger if exists recalculate_ranks_trigger on public.team_rankings;

create trigger recalculate_ranks_trigger
after insert or update on public.team_rankings
for each statement
execute function public.trigger_recalculate_ranks();
