-- Phase 1.4 follow-up - Reserved words are refused anywhere in an alias
--
-- Decided by Ayora on 13 Nov 2026. Before this, words like "support", "cbn"
-- and "official" were refused only when they were the whole alias, so
-- cbn.official or support.team were accepted and could be used to pose as
-- Cyber X staff or an authority.
--
-- Now an alias is refused if ANY of its parts (the pieces between dots and
-- underscores) is a reserved word. The trade-off is accepted: a harmless
-- alias such as ada.bank is refused too.
--
-- A reserved word inside a longer word is still fine, so names such as
-- bankole, xavier and teamwork keep working.

create or replace function public.is_valid_alias(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate is not null
    and candidate ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$'
    and candidate !~ '[._]{2}'
    and candidate ~ '[a-z]'
    and candidate !~ 'cyber[._]?x'
    and not (regexp_split_to_array(candidate, '[._]') && array[
      'admin', 'administrator', 'bank', 'cbn', 'compliance', 'cyber', 'fraud',
      'help', 'helpdesk', 'info', 'moderator', 'official', 'payments', 'root',
      'security', 'staff', 'support', 'system', 'team', 'verified', 'x'
    ])
$$;
