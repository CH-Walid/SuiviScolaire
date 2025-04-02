export const USER_ROLES = {
  ADMIN: "admin",
  DEPARTMENT_HEAD: "departmentHead",
  TEACHER: "teacher",
} as const;

export const SESSION_TYPES = {
  COURSE: "course",
  TD: "TD",
  TP: "TP",
} as const;

export const ABSENCE_STATUSES = {
  PRESENT: "present",
  ABSENT: "absent",
  JUSTIFIED: "justified",
  UNJUSTIFIED: "unjustified",
} as const;

export const STUDENT_GROUP_TYPES = {
  TD: "TD",
  TP: "TP",
} as const;

export interface StatusOption {
  value: string;
  label: string;
  colorClass: string;
}

export const ABSENCE_STATUS_OPTIONS: StatusOption[] = [
  { value: ABSENCE_STATUSES.PRESENT, label: "Présent", colorClass: "text-green-700 bg-green-100" },
  { value: ABSENCE_STATUSES.ABSENT, label: "Absent", colorClass: "text-red-700 bg-red-100" },
  { value: ABSENCE_STATUSES.JUSTIFIED, label: "Absence Justifiée", colorClass: "text-blue-700 bg-blue-100" },
  { value: ABSENCE_STATUSES.UNJUSTIFIED, label: "Absence Non-Justifiée", colorClass: "text-yellow-700 bg-yellow-100" },
];

export const getStatusOption = (value: string): StatusOption => {
  return ABSENCE_STATUS_OPTIONS.find(option => option.value === value) || 
    { value, label: value, colorClass: "text-gray-700 bg-gray-100" };
};
