import type { EmailTemplateDefinition } from '@objectstack/spec/system';

/**
 * One notification, two languages: the `email_template` bundle a `notify`
 * node names in its `template` key.
 *
 * ## Why a bundle and not the node's `title` / `message`
 *
 * A `notify` node's inline `title` / `message` are one text for every
 * recipient — `NotifyConfigSchema` says so: "not localizable — use `template`
 * for per-locale content". The `template` path is the localizable one. The
 * delivery path resolves `(name, locale)` per recipient, after fan-out: the
 * recipient's own `sys_user.locale`, else the deployment default. The inbox
 * channel renders the member's `subject` as the bell row's title and its text
 * body as the row's body (`service-messaging` `inbox-channel.ts`). The email
 * channel sends the same member, so one notification cannot arrive in two
 * languages across the two channels.
 *
 * ## The English member is `en-US`, not this stack's `en`
 *
 * The resolver matches `(name, locale)` exactly and, for a call that names a
 * locale, retries one rung only: the literal `en-US`
 * (`EMAIL_TEMPLATE_FLOOR_LOCALE`). There is no subtag folding, so `en` would
 * be unreachable from `en-US` and from every tag nobody authored. This stack
 * declares `defaultLocale: 'en'`, so a recipient with no locale of their own
 * asks for `en`, misses, and lands on the `en-US` floor. A recipient whose
 * `sys_user.locale` is a tag with no member here (`fr-FR`, say) lands there
 * too, instead of the delivery failing for good with `TEMPLATE_NOT_FOUND`.
 * So the English member is written at the schema default and carries no
 * `locale` key. `zh-CN` is matched exactly.
 *
 * ## Holes
 *
 * `{{ name }}` holes are filled from the node's `templateData`, one CEL value
 * per key. The subject and the text body are plain-text faces, so a value is
 * rendered verbatim there. The HTML body escapes it. The text body is written
 * out rather than derived from the HTML, so the inbox body is exactly the
 * sentence below.
 */
export interface NoticeCopy {
  /** Studio label for this member. */
  readonly label: string;
  /** Bell title and email subject. */
  readonly subject: string;
  /** Bell body and email body: one paragraph of plain text with `{{ }}` holes. */
  readonly body: string;
}

export interface NoticeVariable {
  readonly name: string;
  readonly description: string;
}

/** HTML-escape the literal text of a body. The `{{ }}` holes contain no character this touches. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function noticeBundle(spec: {
  /** Dotted snake_case, `clm.` prefixed: the `template` key a notify node names. */
  readonly name: string;
  readonly description: string;
  readonly variables: readonly NoticeVariable[];
  readonly en: NoticeCopy;
  readonly zhCN: NoticeCopy;
}): EmailTemplateDefinition[] {
  const member = (copy: NoticeCopy, locale?: string): EmailTemplateDefinition => ({
    name: spec.name,
    ...(locale ? { locale } : {}),
    label: copy.label,
    description: spec.description,
    subject: copy.subject,
    bodyHtml: `<p>${escapeHtml(copy.body)}</p>`,
    bodyText: copy.body,
    variables: spec.variables.map((v) => ({ name: v.name, type: 'string', description: v.description })),
  });
  return [member(spec.en), member(spec.zhCN, 'zh-CN')];
}
