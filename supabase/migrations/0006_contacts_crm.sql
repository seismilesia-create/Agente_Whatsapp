-- ============================================================================
-- CRM de contactos: campos para fichar clientes + automatizaciones.
--   - Campos: apellido, email, cumpleaños, notas, etiquetas, opt-in marketing,
--     última interacción.
--   - Triggers: marcan "última interacción" y promueven Nuevo → Habitual (recurrent)
--     automáticamente al 2º turno, sin tocar el código de la app.
-- ============================================================================

alter table public.contacts add column if not exists last_name           text;
alter table public.contacts add column if not exists email               text;
alter table public.contacts add column if not exists birthday            date;
alter table public.contacts add column if not exists notes               text;
alter table public.contacts add column if not exists tags                text[] not null default '{}';
alter table public.contacts add column if not exists marketing_opt_in    boolean not null default false;
alter table public.contacts add column if not exists last_interaction_at timestamptz;

-- Al crear un turno: actualizar última interacción y promover a 'recurrent' al 2º turno no cancelado.
create or replace function public.touch_contact_on_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.contact_id is not null then
    update public.contacts c
      set last_interaction_at = now(),
          status = case
            when (select count(*) from public.appointments a
                  where a.contact_id = NEW.contact_id and a.status <> 'cancelled') >= 2
              then 'recurrent'
            else c.status
          end
    where c.id = NEW.contact_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_appt_touch_contact on public.appointments;
create trigger trg_appt_touch_contact after insert on public.appointments
  for each row execute function public.touch_contact_on_appointment();

-- Cada mensaje actualiza la última interacción del contacto de esa conversación.
create or replace function public.touch_contact_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.contacts c
    set last_interaction_at = now()
    from public.conversations cv
    where cv.id = NEW.conversation_id and c.id = cv.contact_id;
  return NEW;
end;
$$;

drop trigger if exists trg_msg_touch_contact on public.messages;
create trigger trg_msg_touch_contact after insert on public.messages
  for each row execute function public.touch_contact_on_message();
