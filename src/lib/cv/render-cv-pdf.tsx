import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { AssembledCv } from "@/lib/cv/assemble-cv";

// @react-pdf/renderer is pure JS (no headless browser, no native binary) --
// deliberately chosen over a Playwright/page.pdf() approach, since this
// codebase has already been burned once by a native-binary dependency
// (@napi-rs/canvas) not surviving Next.js's file tracing into the deployed
// Vercel function. Real clickable links (header contacts) land in PR 5b.
const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  name: { fontSize: 18, fontWeight: 700 },
  title: { fontSize: 12, color: "#444444", marginBottom: 2 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  contactItem: { marginRight: 6 },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 2,
  },
  role: { marginBottom: 6 },
  roleHeading: { fontSize: 10, fontWeight: 700 },
  roleDates: { fontSize: 9, fontStyle: "italic", marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 1 },
  bulletMarker: { width: 10 },
  bulletText: { flex: 1 },
  skillLine: { marginBottom: 2 },
  skillCategory: { fontWeight: 700 },
  textBlock: { marginBottom: 2 },
});

function HeaderSection({ header }: { header: AssembledCv["header"] }) {
  return (
    <View>
      {header.name && <Text style={styles.name}>{header.name}</Text>}
      {header.title && <Text style={styles.title}>{header.title}</Text>}
      {header.contacts.length > 0 && (
        <View style={styles.contactRow}>
          {header.contacts.map((contact, i) => (
            <Text key={contact} style={styles.contactItem}>
              {contact}
              {i < header.contacts.length - 1 ? "  |" : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletMarker}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

function RolesSection({ roles }: { roles: AssembledCv["roles"] }) {
  if (roles.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionHeading}>Experience</Text>
      {roles.map((role) => (
        <View key={`${role.company}-${role.title}-${role.dates}`} style={styles.role}>
          <Text style={styles.roleHeading}>
            {role.title}, {role.company}
          </Text>
          <Text style={styles.roleDates}>{role.dates}</Text>
          <BulletList items={role.bullets} />
        </View>
      ))}
    </View>
  );
}

function SkillsSection({ skills }: { skills: AssembledCv["skills"] }) {
  if (skills.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionHeading}>Skills</Text>
      {skills.map((group) => (
        <Text key={group.category} style={styles.skillLine}>
          <Text style={styles.skillCategory}>{group.category}: </Text>
          {group.items.join(", ")}
        </Text>
      ))}
    </View>
  );
}

function LanguagesSection({ languages }: { languages: string[] }) {
  if (languages.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionHeading}>Languages</Text>
      <Text>{languages.join(" | ")}</Text>
    </View>
  );
}

function EducationSection({ education }: { education: AssembledCv["education"] }) {
  if (education.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionHeading}>Education</Text>
      {education.map((entry, i) => (
        <Text key={i} style={styles.textBlock}>
          {[entry.degree, entry.school, entry.dates].filter(Boolean).join(" — ")}
        </Text>
      ))}
    </View>
  );
}

function AdditionalSections({ sections }: { sections: AssembledCv["additionalSections"] }) {
  if (sections.length === 0) return null;
  return (
    <>
      {sections.map((section) => (
        <View key={section.heading}>
          <Text style={styles.sectionHeading}>{section.heading}</Text>
          <BulletList items={section.items} />
        </View>
      ))}
    </>
  );
}

function CvDocument({ cv }: { cv: AssembledCv }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <HeaderSection header={cv.header} />
        <Text style={styles.sectionHeading}>Summary</Text>
        <Text>{cv.summary}</Text>
        <RolesSection roles={cv.roles} />
        <SkillsSection skills={cv.skills} />
        <LanguagesSection languages={cv.languages} />
        <EducationSection education={cv.education} />
        <AdditionalSections sections={cv.additionalSections} />
      </Page>
    </Document>
  );
}

export function renderCvToPdf(cv: AssembledCv): Promise<Buffer> {
  return renderToBuffer(<CvDocument cv={cv} />);
}
