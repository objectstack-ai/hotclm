import { defineView } from '@objectstack/spec/ui';

/**
 * `clm_party` views — 管理's 相对方 entry.
 *
 * `bank_account` and `contact_phone` are deliberately absent from every column
 * list here: DESIGN.md §04's FLS table masks them from `clm_requester` and
 * `clm_records`, and a masked column in a shared view is a column that renders
 * blank for two of the five audiences. Finance reads them on the record page,
 * where the field-level grant is the thing being applied.
 */
export const PartyViews = defineView({
  list: {
    type: 'grid',
    name: 'all_parties',
    label: 'Counterparties',
    data: { provider: 'object', object: 'clm_party' },
    columns: [
      { field: 'name', width: 260, link: true, pinned: 'left' },
      { field: 'party_kind', width: 130 },
      { field: 'country_code', width: 100 },
      { field: 'registration_no', width: 180 },
      { field: 'contact_name', width: 150 },
      { field: 'contact_email', width: 220 },
      { field: 'risk_flag', width: 110, align: 'center' },
      { field: 'screening_status', width: 140, sortable: true },
      { field: 'is_active', width: 100, align: 'center' },
    ],
    sort: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 25 },
    showRecordCount: true,
  },

});
