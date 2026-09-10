/**
 * Rajiv Gandhi University (Rono Hills, Doimukh) — departments and the
 * programmes each offers. Single source of truth for every department /
 * programme picker in the app (signup, admin resident registration).
 */
export const RGU_DEPARTMENTS: Record<string, string[]> = {
  "Agricultural Sciences": ["B.Sc.", "M.Sc.", "Ph.D."],
  Anthropology: ["B.A.", "M.A.", "Ph.D."],
  Botany: ["B.Sc.", "M.Sc.", "Ph.D."],
  Chemistry: ["B.Sc.", "M.Sc.", "Ph.D."],
  Commerce: ["B.Com", "M.Com", "Ph.D."],
  "Computer Science & Engineering": ["B.Tech", "M.Tech", "BCA", "MCA", "Ph.D."],
  Economics: ["B.A.", "M.A.", "Ph.D."],
  Education: ["B.Ed.", "M.Ed.", "M.A.", "Ph.D."],
  "Electronics & Communication": ["B.Tech", "M.Tech", "Ph.D."],
  English: ["B.A.", "M.A.", "Ph.D."],
  "Fine Arts & Music": ["B.A.", "M.A.", "Ph.D."],
  Geography: ["B.A.", "M.A.", "M.Sc.", "Ph.D."],
  Geology: ["B.Sc.", "M.Sc.", "Ph.D."],
  Hindi: ["B.A.", "M.A.", "Ph.D."],
  History: ["B.A.", "M.A.", "Ph.D."],
  Law: ["LL.B.", "LL.M.", "Ph.D."],
  "Library & Information Science": ["B.Lib.I.Sc.", "M.Lib.I.Sc.", "Ph.D."],
  Management: ["BBA", "MBA", "Ph.D."],
  "Mass Communication": ["B.A.", "M.A.", "Ph.D."],
  Mathematics: ["B.Sc.", "M.Sc.", "Ph.D."],
  Philosophy: ["B.A.", "M.A.", "Ph.D."],
  "Physical Education": ["B.P.Ed.", "M.P.Ed.", "PGDYTE", "Ph.D."],
  Physics: ["B.Sc.", "M.Sc.", "Ph.D."],
  "Political Science": ["B.A.", "M.A.", "Ph.D."],
  Psychology: ["B.A.", "M.A.", "M.Sc.", "Ph.D."],
  "Social Work": ["BSW", "MSW", "Ph.D."],
  Sociology: ["B.A.", "M.A.", "Ph.D."],
  "Sports Biomechanics": ["M.Sc.", "Ph.D."],
  "Sports Physiology": ["M.Sc.", "Ph.D."],
  "Sports Psychology": ["M.Sc.", "Ph.D."],
  "Strength Training & Conditioning": ["M.Sc.", "Ph.D."],
  Statistics: ["B.Sc.", "M.Sc.", "Ph.D."],
  Zoology: ["B.Sc.", "M.Sc.", "Ph.D."],
}

export const RGU_DEPARTMENT_NAMES = Object.keys(RGU_DEPARTMENTS)

export function programsFor(department: string | undefined): string[] {
  if (!department) return []
  return RGU_DEPARTMENTS[department] ?? []
}
