import type { AppRole } from "@/lib/types";

export type DemoUserRecord = {
  id: string;
  name: string;
  email: string | null;
  loginId: string;
  role: AppRole;
  password: string;
  matricNumber?: string;
  currentLevel?: number;
  departmentName?: string;
};

export const demoUsers: DemoUserRecord[] = [
  {
    id: "demo-student-1",
    name: "Ariyo Oluwafemi Aquila",
    email: "aquila@example.com",
    loginId: "U/17/CE/0285",
    role: "student",
    password: "regportal-demo",
    matricNumber: "U/17/CE/0285",
    currentLevel: 500,
    departmentName: "Computer Engineering",
  },
  {
    id: "demo-adviser-1",
    name: "Dr. Adepoju Adviser",
    email: "adviser@example.com",
    loginId: "adviser.cpe",
    role: "adviser",
    password: "regportal-demo",
    currentLevel: 500,
    departmentName: "Computer Engineering",
  },
  {
    id: "demo-admin-1",
    name: "Exam Officer",
    email: "admin@example.com",
    loginId: "admin.regportal",
    role: "admin",
    password: "regportal-demo",
  },
];
