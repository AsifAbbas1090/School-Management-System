/**
 * Pakistan national-curriculum subject catalog, grouped by grade level.
 * Used by the timetable page's "Import standard subjects" quick-start so
 * schools don't have to hand-add every subject one by one.
 *
 * Codes are 3-letter uppercase identifiers. Where a subject is taught
 * across multiple grades we list it only under the lowest grade so the
 * import button never inserts duplicates.
 */
export const PAKISTAN_SUBJECT_CATALOG = [
  // Primary — Classes 1 to 5
  { grade: '1-5', name: 'English', code: 'ENG' },
  { grade: '1-5', name: 'Urdu', code: 'URD' },
  { grade: '1-5', name: 'Mathematics', code: 'MAT' },
  { grade: '1-5', name: 'General Science', code: 'GSC' },
  { grade: '1-5', name: 'Social Studies', code: 'SST' },
  { grade: '1-5', name: 'Islamiat', code: 'ISL' },
  { grade: '1-5', name: 'Computer Studies', code: 'COM' },
  { grade: '1-5', name: 'Arts & Crafts', code: 'ART' },

  // Middle — Classes 6 to 8
  { grade: '6-8', name: 'Physics', code: 'PHY' },
  { grade: '6-8', name: 'Chemistry', code: 'CHE' },
  { grade: '6-8', name: 'Biology', code: 'BIO' },
  { grade: '6-8', name: 'History', code: 'HIS' },
  { grade: '6-8', name: 'Geography', code: 'GEO' },
  { grade: '6-8', name: 'Sindhi', code: 'SND' },
  { grade: '6-8', name: 'Pashto', code: 'PST' },
  { grade: '6-8', name: 'Punjabi', code: 'PNJ' },
  { grade: '6-8', name: 'Balochi', code: 'BCH' },

  // Secondary — Classes 9 & 10 (Matric)
  { grade: '9-10', name: 'Pakistan Studies', code: 'PKS' },
  { grade: '9-10', name: 'Additional Mathematics', code: 'AMT' },
  { grade: '9-10', name: 'Home Economics', code: 'HMC' },
  { grade: '9-10', name: 'Physical Education', code: 'PED' },

  // Higher Secondary — Classes 11 & 12 (FSc / FA / ICS / ICom)
  { grade: '11-12', name: 'Economics', code: 'ECO' },
  { grade: '11-12', name: 'Statistics', code: 'STA' },
  { grade: '11-12', name: 'Business Mathematics', code: 'BMT' },
  { grade: '11-12', name: 'Accounting', code: 'ACC' },
  { grade: '11-12', name: 'Business Studies', code: 'BUS' },
  { grade: '11-12', name: 'Psychology', code: 'PSY' },
  { grade: '11-12', name: 'Sociology', code: 'SOC' },
  { grade: '11-12', name: 'Philosophy', code: 'PHL' },
  { grade: '11-12', name: 'Civics', code: 'CIV' },
  { grade: '11-12', name: 'Library Science', code: 'LIB' },
  { grade: '11-12', name: 'Persian', code: 'PER' },
  { grade: '11-12', name: 'Arabic', code: 'ARB' },
  { grade: '11-12', name: 'Fine Arts', code: 'FAR' },
];

export const PAKISTAN_SUBJECT_GRADE_GROUPS = [
  { id: '1-5', label: 'Primary (1–5)' },
  { id: '6-8', label: 'Middle (6–8)' },
  { id: '9-10', label: 'Matric (9–10)' },
  { id: '11-12', label: 'Intermediate (11–12)' },
];
