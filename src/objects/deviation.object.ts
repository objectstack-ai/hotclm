import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * A departure from the clause playbook on one contract (DESIGN.md §02,
 * Ironclad's Playbook): which clause, the wording actually on the table, the
 * position it amounts to (our standard, our fallback, or something custom)
 * and legal's decision on it.
 *
 * Deviations gate two things: a contract cannot enter approval with an
 * `open` deviation, and an accepted deviation from a clause that
 * `requires_legal_head` pulls the head of legal into the ladder (F6).
 * `status` is a one-way state machine (`open` → `accepted` / `rejected` /
 * `withdrawn`, enforced in `contract.hook.ts`). `display_name` is a stored
 * mirror ("<clause> · <status>") stamped by `mirror.hook.ts`.
 */
export const Deviation = ObjectSchema.create({
  name: 'clm_deviation',
  label: 'Deviation',
  pluralLabel: 'Deviations',
  icon: 'git-branch',
  description: 'A departure from a playbook clause on a contract, and legal\'s decision on it.',

  sharingModel: 'controlled_by_parent',
  nameField: 'display_name',
  highlightFields: ['display_name', 'clause', 'requested_position', 'status', 'decided_at'],

  fieldGroups: [
    { key: 'deviation', label: 'Deviation', icon: 'git-branch' },
    { key: 'decision',  label: 'Decision',  icon: 'gavel' },
  ],

  fields: {
    display_name: Field.text({
      label: 'Deviation',
      group: 'deviation',
      readonly: true,
      searchable: true,
      maxLength: 200,
      description: 'Stored mirror "<clause title> · <status>", stamped by mirror.hook.ts.',
    }),
    contract: Field.masterDetail('clm_contract', {
      label: 'Contract',
      group: 'deviation',
      required: true,
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      inlineTitle: 'Deviations',
    }),
    clause: Field.lookup('clm_clause', {
      label: 'Clause',
      group: 'deviation',
      required: true,
      lookupFilters: [{ field: 'is_active', operator: 'eq', value: true }],
    }),
    deviation_text: Field.textarea({
      label: 'Proposed Wording',
      group: 'deviation',
      required: true,
      description: 'The wording on the table, as it departs from the standard text.',
    }),
    requested_position: Field.select({
      label: 'Requested Position',
      group: 'deviation',
      description: 'Which playbook position the proposed wording amounts to.',
      options: [
        { label: 'Standard', value: 'standard', color: '#2F7D5B' },
        { label: 'Fallback', value: 'fallback', color: '#F59E0B' },
        { label: 'Custom',   value: 'custom',   color: '#EF4444' },
      ],
    }),
    justification: Field.textarea({
      label: 'Justification',
      group: 'deviation',
      description: 'Why the business wants to accept it.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'decision',
      required: true,
      description: 'open → accepted / rejected / withdrawn; the decided states are terminal (contract.hook.ts).',
      options: [
        { label: 'Open',      value: 'open',      color: '#F59E0B', default: true },
        { label: 'Accepted',  value: 'accepted',  color: '#2F7D5B' },
        { label: 'Rejected',  value: 'rejected',  color: '#EF4444' },
        { label: 'Withdrawn', value: 'withdrawn', color: '#94A3B8' },
      ],
    }),
    decided_by: Field.user({
      label: 'Decided By',
      group: 'decision',
      description: 'Stamped with the acting user when the deviation is decided, unless set explicitly.',
    }),
    decided_at: Field.datetime({
      label: 'Decided At',
      group: 'decision',
      description: 'Stamped when the deviation is decided, unless set explicitly.',
    }),
  },

  enable: {
    apiEnabled: true,
    searchable: true,
  },
});
