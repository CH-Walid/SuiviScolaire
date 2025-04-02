import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "departmentHead", "teacher"] }).notNull(),
  departmentId: integer("department_id"),
});

// Department model
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

// Course model (Filière)
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  departmentId: integer("department_id").notNull(),
  absenceThreshold: integer("absence_threshold").default(3), // Default threshold for absences before action is taken
});

// Module model
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  courseId: integer("course_id").notNull(),
});

// Module Element model
export const moduleElements = pgTable("module_elements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  moduleId: integer("module_id").notNull(),
});

// Teacher to Module Element relation
export const teacherModuleElements = pgTable("teacher_module_elements", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  moduleElementId: integer("module_element_id").notNull(),
});

// Student model
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  courseId: integer("course_id").notNull(),
});

// Student Group model (TD/TP)
export const studentGroups = pgTable("student_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["TD", "TP"] }).notNull(),
  courseId: integer("course_id").notNull(),
});

// Student to Group relation
export const studentGroupAssignments = pgTable("student_group_assignments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  groupId: integer("group_id").notNull(),
});

// Session model (for attendance recording)
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  type: text("type", { enum: ["course", "TD", "TP"] }).notNull(),
  moduleElementId: integer("module_element_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  groupId: integer("group_id"),
  notes: text("notes"),
});

// Absence model
export const absences = pgTable("absences", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  studentId: integer("student_id").notNull(),
  status: text("status", { enum: ["present", "absent", "justified", "unjustified"] }).notNull(),
  notes: text("notes"),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true });
export const insertModuleSchema = createInsertSchema(modules).omit({ id: true });
export const insertModuleElementSchema = createInsertSchema(moduleElements).omit({ id: true });
export const insertTeacherModuleElementSchema = createInsertSchema(teacherModuleElements).omit({ id: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export const insertStudentGroupSchema = createInsertSchema(studentGroups).omit({ id: true });
export const insertStudentGroupAssignmentSchema = createInsertSchema(studentGroupAssignments).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export const insertAbsenceSchema = createInsertSchema(absences).omit({ id: true });

// Define types for insert and select operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modules.$inferSelect;

export type InsertModuleElement = z.infer<typeof insertModuleElementSchema>;
export type ModuleElement = typeof moduleElements.$inferSelect;

export type InsertTeacherModuleElement = z.infer<typeof insertTeacherModuleElementSchema>;
export type TeacherModuleElement = typeof teacherModuleElements.$inferSelect;

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertStudentGroup = z.infer<typeof insertStudentGroupSchema>;
export type StudentGroup = typeof studentGroups.$inferSelect;

export type InsertStudentGroupAssignment = z.infer<typeof insertStudentGroupAssignmentSchema>;
export type StudentGroupAssignment = typeof studentGroupAssignments.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertAbsence = z.infer<typeof insertAbsenceSchema>;
export type Absence = typeof absences.$inferSelect;
