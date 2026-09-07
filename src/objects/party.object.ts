import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * A counterparty — the other side of a contract. Deliberately not
 * `crm_account`: a landlord, a supplier, a contractor or an individual is
 * not a customer, and HotCLM must stand alone (DESIGN.md §13 Q4). When
 * HotCRM is installed alongside, `crm_account` links the two records.
 *
 * Party master data only: qualification, scoring and onboarding are an SRM's
 * job, not this object's (DESIGN.md §01 范围外).
 */
export const Party = ObjectSchema.create({
  name: 'clm_party',
  label: 'Counterparty',
  pluralLabel: 'Counterparties',
  icon: 'building-2',
  description: 'The other party to a contract — company, individual or public body — with registration, contact and banking details.',

  sharingModel: 'public_read',
  nameField: 'name',
  highlightFields: ['name', 'party_kind', 'registration_no', 'risk_flag'],

  fieldGroups: [
    { key: 'identity', label: 'Identity',  icon: 'building-2' },
    { key: 'contact',  label: 'Contact',   icon: 'phone' },
    { key: 'banking',  label: 'Banking',   icon: 'landmark', defaultExpanded: false },
    { key: 'risk',     label: 'Risk',      icon: 'shield-alert' },
  ],

  fields: {
    name: Field.text({
      label: 'Name',
      group: 'identity',
      required: true,
      searchable: true,
      maxLength: 200,
    }),
    party_kind: Field.select({
      label: 'Kind',
      group: 'identity',
      required: true,
      options: [
        { label: 'Company',     value: 'company', default: true },
        { label: 'Individual',  value: 'individual' },
        { label: 'Government',  value: 'government' },
        { label: 'Other',       value: 'other' },
      ],
    }),
    registration_no: Field.text({
      label: 'Registration No.',
      group: 'identity',
      searchable: true,
      maxLength: 40,
      description: 'Unified registration or tax identifier. Unique per organization when present.',
    }),
    legal_representative: Field.text({
      label: 'Legal Representative',
      group: 'identity',
      maxLength: 80,
    }),
    address: Field.textarea({
      label: 'Address',
      group: 'identity',
    }),

    contact_name: Field.text({
      label: 'Contact Name',
      group: 'contact',
      maxLength: 80,
    }),
    // Field-level security withholds this from requesters (DESIGN.md §04).
    contact_phone: Field.phone({
      label: 'Contact Phone',
      group: 'contact',
    }),
    contact_email: Field.email({
      label: 'Contact Email',
      group: 'contact',
    }),

    bank_name: Field.text({
      label: 'Bank',
      group: 'banking',
      maxLength: 120,
    }),
    // Field-level security withholds this from everyone but legal and finance.
    bank_account: Field.text({
      label: 'Bank Account',
      group: 'banking',
      maxLength: 40,
    }),

    risk_flag: Field.select({
      label: 'Risk Flag',
      group: 'risk',
      required: true,
      options: [
        { label: 'None',    value: 'none',    color: '#94A3B8', default: true },
        { label: 'Watch',   value: 'watch',   color: '#F59E0B' },
        { label: 'Blocked', value: 'blocked', color: '#EF4444' },
      ],
      description: 'Blocked parties cannot be chosen on a new contract (intake guard, F1).',
    }),
    risk_note: Field.textarea({
      label: 'Risk Note',
      group: 'risk',
    }),
    verified_at: Field.datetime({
      label: 'Verified At',
      group: 'risk',
      description: 'Stamped by the registry verification connector when one is configured (DESIGN.md §08).',
    }),
    is_active: Field.boolean({
      label: 'Active',
      group: 'risk',
      defaultValue: true,
    }),
  },

  indexes: [
    { fields: ['registration_no'], unique: 'organization' },
  ],

  enable: {
    apiEnabled: true,
    searchable: true,
    files: true,
  },
});
