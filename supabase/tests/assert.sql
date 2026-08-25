create or replace function assert(ok boolean, what text) returns void
language plpgsql as $$
begin
  if ok then raise notice '  ok   %', what;
  else raise exception 'FAILED: %', what;
  end if;
end $$;
