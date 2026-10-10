import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * One instalment of a contract's payment schedule (DESIGN.md §03, the signed
 * domain): when it is planned, what it is planned to be, what condition
 * releases it, and what actually arrived. The schedule is the CLM's side of
 * the money — the invoice and the ledger entry stay in finance; what is
 * modelled here is the CONTRACTUAL promise and whether it was kept.
 *
 * `status` is a state machine enforced in `contract.hook.ts`
 * (`planned → due`, `due → partial / paid / overdue`, `overdue → partial /
 * paid`), and `overdue` has exactly one writer — the daily payment job of
 * card 09 — so a write to it from a person is refused on both write paths.
 *
 * `display_name` is a STORED mirror "#<seq> · <planned_date>" stamped by
 * `mirror.hook.ts`. It is ASCII on purpose: a stored mirror is written once,
 * in the source language, and cannot be re-rendered per reader — a localized
 * instalment label ("第<seq>期") is a `zh-CN` translation-bundle concern
 * (card 11), not a stored value (AGENTS.md 命名: English is the source
 * language, global by default).
 *
 * `(contract, seq)` is a unique index rather than a validation (AGENTS.md
 * 命名), the same shape `clm_contract_version` uses for `(contract,
 * version_no)`: the sequence number is what the mirror, the reminder and the
 * finance hand-off all address an instalment by, so two rows sharing one is a
 * duplicate, not a preference.
 */
export const PaymentPlan = ObjectSchema.create({
  name: 'clm_payment_plan',
  label: 'Payment Plan',
  pluralLabel: 'Payment Plan',
  icon: 'banknote',
  description: 'One instalment of a contract payment schedule: what is planned, what releases it, and what was actually paid.',

  // Access derives from the contract (ADR-0055).
  sharingModel: 'controlled_by_parent',
  nameField: 'display_name',
  highlightFields: ['display_name', 'planned_date', 'planned_amount', 'status', 'actual_amount'],

  fieldGroups: [
    { key: 'schedule', label: 'Schedule', icon: 'calendar-clock' },
    { key: 'actual',   label: 'Actual',   icon: 'banknote' },
  ],

  fields: {
    display_name: Field.text({
      label: 'Instalment',
      group: 'schedule',
      readonly: true,
      searchable: true,
      maxLength: 80,
      description: 'Filled in automatically as "#instalment number · planned date".',
    }),
    contract: Field.masterDetail('clm_contract', {
      label: 'Contract',
      group: 'schedule',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      inlineTitle: 'Payment Plan',
    }),
    seq: Field.number({
      label: 'Instalment No.',
      group: 'schedule',
      required: true,
      storage: { notNull: true },
      scale: 0,
      min: 1,
      max: 999,
      description: 'Position in the schedule, starting at 1. Unique within the contract.',
    }),
    planned_date: Field.date({
      label: 'Planned Date',
      group: 'schedule',
      required: true,
      storage: { notNull: true },
      description: 'The date the daily check measures arrears against.',
    }),
    planned_amount: Field.currency({
      label: 'Planned Amount',
      group: 'schedule',
      required: true,
      storage: { notNull: true },
      min: 0,
      // Denominated in clm_contract.currency_code.
      description: 'In the contract currency; the instalment amounts are not separately denominated.',
    }),
    condition: Field.textarea({
      label: 'Condition',
      group: 'schedule',
      description: 'What releases the instalment — acceptance, milestone sign-off, delivery. Empty means it falls due on the date alone.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'actual',
      required: true,
      storage: { notNull: true },
      // The full table, including the partial edges (decision #10, 2A), is the
      // state machine in contract.hook.ts.
      description: 'Planned moves to Due; Due to Partial, Paid or Overdue; Partial to Paid or Overdue; Overdue to Partial or Paid. Paid is final. Only the daily check sets Overdue.',
      options: [
        { label: 'Planned', value: 'planned', color: '#94A3B8', default: true },
        { label: 'Due',     value: 'due',     color: '#F59E0B' },
        { label: 'Partial', value: 'partial', color: '#3B82F6' },
        { label: 'Paid',    value: 'paid',    color: '#2F7D5B' },
        { label: 'Overdue', value: 'overdue', color: '#EF4444' },
      ],
    }),
    actual_date: Field.date({
      label: 'Actual Date',
      group: 'actual',
      description: 'Stamped when the instalment is marked partial or paid, unless set explicitly.',
    }),
    actual_amount: Field.currency({
      label: 'Actual Amount',
      group: 'actual',
      min: 0,
      description: 'What actually arrived, in the contract currency. Below the planned amount on a partial instalment.',
    }),
    invoice_no: Field.text({
      label: 'Invoice Number',
      group: 'actual',
      searchable: true,
      maxLength: 60,
      description: 'The finance-side reference this instalment was billed under; the invoice itself is not modelled here.',
    }),
    notes: Field.textarea({
      label: 'Notes',
      group: 'actual',
    }),
  },

  indexes: [
    { fields: ['contract', 'seq'], unique: 'organization' },
  ],

  enable: {
    apiEnabled: true,
    searchable: true,
  },
});
