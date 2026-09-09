// Read the rows, not the loader summary (objectstack#17177): open the driver's
// own SQLite file read-only and count.
import Database from 'better-sqlite3';
const db = new Database('/home/user/hotclm-issue-39/.objectstack/data/objectstack.db', { readonly: true, fileMustExist: true });
const q = (sql) => db.prepare(sql).all();
const out = {};
out.obligation_status = q("select status, count(*) n from clm_obligation group by status order by status");
out.payment_status = q("select status, count(*) n from clm_payment_plan group by status order by status");
out.contract_status = q("select status, count(*) n from clm_contract group by status order by status");
out.today = q("select date('now') d")[0].d;
out.obl_due_windows = q(`select
   sum(case when date(due_date)=date('now','+7 day') and status in ('pending','in_progress') then 1 else 0 end) t7,
   sum(case when date(due_date)=date('now') and status in ('pending','in_progress') then 1 else 0 end) t0,
   sum(case when date(due_date)<date('now') and status in ('pending','in_progress') then 1 else 0 end) arrears
   from clm_obligation`);
out.pay_windows = q(`select
   sum(case when date(planned_date)<=date('now') and status='planned' then 1 else 0 end) becomes_due,
   sum(case when date(planned_date)<date('now') and status in ('due','partial') then 1 else 0 end) arrears
   from clm_payment_plan`);
out.contract_windows = q(`select
   sum(case when status='in_review' and review_started_at is not null and datetime(review_started_at) < datetime('now','-30 day') and datetime(review_started_at) >= datetime('now','-60 day') then 1 else 0 end) sla30,
   sum(case when status='in_review' and review_started_at is not null and datetime(review_started_at) < datetime('now','-60 day') then 1 else 0 end) sla60,
   sum(case when current_turn='counterparty' and turn_since is not null and datetime(turn_since) < datetime('now','-7 day') and status in ('submitted','in_review','in_approval','approved','signing') then 1 else 0 end) stalled,
   sum(case when status='active' and coalesce(is_expiring,0)!=1 and end_date is not null and date(end_date) <= date('now','+365 day') then 1 else 0 end) renewal_candidates,
   sum(case when status='active' and coalesce(auto_renew,0)!=1 and end_date is not null and date(end_date) < date('now') then 1 else 0 end) expire,
   sum(case when status='active' and auto_renew=1 and end_date is not null and date(end_date) < date('now') then 1 else 0 end) autorenew,
   sum(case when is_expiring=1 then 1 else 0 end) is_expiring_true,
   sum(case when is_backfilled=1 then 1 else 0 end) backfilled
   from clm_contract`);
try { out.inbox = q("select count(*) n from sys_inbox_message")[0].n; } catch (e) { out.inbox = `ERR ${e.message}`; }
try { out.notifications = q("select topic, count(*) n from sys_notification group by topic order by topic"); } catch (e) { out.notifications = `ERR ${e.message}`; }
out.obligation_kinds = q("select kind, count(*) n from clm_obligation group by kind order by kind");
console.log(JSON.stringify(out, null, 1));
