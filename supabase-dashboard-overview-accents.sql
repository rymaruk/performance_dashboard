-- Кольори кілець «Загальний прогрес» на дашборді, по одному набору на користувача (public.users.id = auth.uid).
-- Значення: JSON з ключами goals, tasks, kpi — рядки з набору AccentColor у застосунку (rose, orange, amber, …).
--
-- Виконайте в Supabase SQL Editor після того, як існує таблиця public.users.

alter table public.users
  add column if not exists dashboard_overview_accents jsonb default null;

comment on column public.users.dashboard_overview_accents is
  'Персональні кольори RadialBar «Загальний прогрес»: {"goals":"sky","tasks":"orange","kpi":"violet"}. id = auth.users.id.';

-- За потреби можна додати GIN індекс для складних запитів по JSON; для UI він зазвичай не потрібен.
