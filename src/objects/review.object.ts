import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * A review of a contract by one function — legal, finance, compliance or the
 * business. The legal review is the one the state machine reads: a contract
 * leaves `in_review` for `in_approval` only with a `legal` review whose
 * decision is `approved` and no open deviation (`contract.hook.ts`).
 *
 * `comments` is what the requester sees; `internal_note` is legal's own
 * working note and is withheld by field-level security (DESIGN.md §04,
 * card 04). `display_name` is a stored mirror ("<stage> · <reviewer>")
 * stamped by `mirror.hook.ts`.
 */
export const Review = ObjectSchema.create({
  name: 'clm_review',
  label: 'Review',
  pluralLabel: 'Reviews',
  icon: 'gavel',
  description: 'One function\'s review of a contract: who reviewed, at which stage, the decision and the assessed risk.',

  sharingModel: 'controlled_by_parent',
  nameField: 'display_name',
  highlightFields: ['display_name', 'stage', 'reviewer', 'decision', 'decided_at'],

  fieldGroups: [
    { key: 'review',  label: 'Review',  icon: 'gavel' },
    { key: 'outcome', label: 'Outcome', icon: 'check-circle' },
  ],

  fields: {
    display_name: Field.text({
      label: 'Review',
      group: 'review',
      readonly: true,
      searchable: true,
      maxLength: 160,
      description: 'Stored mirror "<stage> · <reviewer>", stamped by mirror.hook.ts.',
    }),
    contract: Field.masterDetail('clm_contract', {
      label: 'Contract',
      group: 'review',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      inlineTitle: 'Reviews',
    }),
    reviewer: Field.user({
      label: 'Reviewer',
      group: 'review',
      required: true,
      storage: { notNull: true },
    }),
    stage: Field.select({
      label: 'Stage',
      group: 'review',
      required: true,
      storage: { notNull: true },
      options: [
        { label: 'Legal',      value: 'legal',      color: '#8B5CF6', default: true },
        { label: 'Finance',    value: 'finance',    color: '#0B6E63' },
        { label: 'Compliance', value: 'compliance', color: '#F59E0B' },
        { label: 'Business',   value: 'business',   color: '#3B82F6' },
      ],
    }),
    started_at: Field.datetime({
      label: 'Started At',
      group: 'review',
    }),

    decision: Field.select({
      label: 'Decision',
      group: 'outcome',
      options: [
        { label: 'Pending',           value: 'pending',           color: '#94A3B8', default: true },
        { label: 'Approved',          value: 'approved',          color: '#2F7D5B' },
        { label: 'Changes Requested', value: 'changes_requested', color: '#F59E0B' },
        { label: 'Rejected',          value: 'rejected',          color: '#EF4444' },
      ],
    }),
    risk_level_assessed: Field.select({
      label: 'Assessed Risk',
      group: 'outcome',
      options: [
        { label: 'Low',    value: 'low',    color: '#94A3B8' },
        { label: 'Medium', value: 'medium', color: '#F59E0B' },
        { label: 'High',   value: 'high',   color: '#EF4444' },
      ],
    }),
    comments: Field.richtext({
      label: 'Comments',
      group: 'outcome',
      description: 'Visible to the requester.',
    }),
    // Field-level security withholds this from everyone but legal (card 04).
    internal_note: Field.richtext({
      label: 'Internal Note',
      group: 'outcome',
      description: 'Legal\'s own working note. Not shown to the requester.',
    }),
    decided_at: Field.datetime({
      label: 'Decided At',
      group: 'outcome',
    }),
  },

  enable: {
    apiEnabled: true,
    searchable: true,
  },
});
