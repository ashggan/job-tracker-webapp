export type ContactLink = { href: string; text: string };

const EMAIL_PATTERN = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
// A bare domain/URL contact entry -- "ashgan.tech", "linkedin.com/in/x",
// "github.com/x", or a full "https://..." link -- vs. plain text like a
// location, which never has a dot-separated, space-free segment like this.
const URL_LIKE_PATTERN = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/;

// Classifies one header contact entry into a real link target when it's an
// email or URL/domain; anything else (a phone number, a location) isn't a
// link. Shared between the DOCX and PDF renderers so both produce the same
// clickable links from the same contact list, rather than maintaining two
// copies of this classification that could drift apart.
export function classifyContactLink(contact: string): ContactLink | null {
  const trimmed = contact.trim();
  if (EMAIL_PATTERN.test(trimmed)) {
    return { href: `mailto:${trimmed}`, text: trimmed };
  }
  if (URL_LIKE_PATTERN.test(trimmed)) {
    const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return { href, text: trimmed };
  }
  return null;
}
