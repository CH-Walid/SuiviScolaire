import {
  User, InsertUser, Department, InsertDepartment, Course, InsertCourse, 
  Module, InsertModule, ModuleElement, InsertModuleElement, 
  TeacherModuleElement, InsertTeacherModuleElement, Student, InsertStudent,
  StudentGroup, InsertStudentGroup, StudentGroupAssignment, InsertStudentGroupAssignment,
  Session, InsertSession, Absence, InsertAbsence
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(): Promise<User[]>;
  
  // Department operations
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;
  listDepartments(): Promise<Department[]>;
  
  // Course operations
  getCourse(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: number): Promise<boolean>;
  listCourses(): Promise<Course[]>;
  listCoursesByDepartment(departmentId: number): Promise<Course[]>;
  
  // Module operations
  getModule(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<boolean>;
  listModules(): Promise<Module[]>;
  listModulesByCourse(courseId: number): Promise<Module[]>;
  
  // Module Element operations
  getModuleElement(id: number): Promise<ModuleElement | undefined>;
  createModuleElement(moduleElement: InsertModuleElement): Promise<ModuleElement>;
  updateModuleElement(id: number, moduleElement: Partial<InsertModuleElement>): Promise<ModuleElement | undefined>;
  deleteModuleElement(id: number): Promise<boolean>;
  listModuleElements(): Promise<ModuleElement[]>;
  listModuleElementsByModule(moduleId: number): Promise<ModuleElement[]>;
  
  // Teacher Module Element operations
  assignTeacherToModuleElement(assignment: InsertTeacherModuleElement): Promise<TeacherModuleElement>;
  removeTeacherFromModuleElement(teacherId: number, moduleElementId: number): Promise<boolean>;
  listTeacherModuleElements(teacherId: number): Promise<TeacherModuleElement[]>;
  
  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  listStudents(): Promise<Student[]>;
  listStudentsByCourse(courseId: number): Promise<Student[]>;
  
  // Student Group operations
  getStudentGroup(id: number): Promise<StudentGroup | undefined>;
  createStudentGroup(group: InsertStudentGroup): Promise<StudentGroup>;
  updateStudentGroup(id: number, group: Partial<InsertStudentGroup>): Promise<StudentGroup | undefined>;
  deleteStudentGroup(id: number): Promise<boolean>;
  listStudentGroups(): Promise<StudentGroup[]>;
  listStudentGroupsByCourse(courseId: number): Promise<StudentGroup[]>;
  
  // Student Group Assignment operations
  assignStudentToGroup(assignment: InsertStudentGroupAssignment): Promise<StudentGroupAssignment>;
  removeStudentFromGroup(studentId: number, groupId: number): Promise<boolean>;
  listStudentGroupAssignments(groupId: number): Promise<StudentGroupAssignment[]>;
  listStudentsByGroup(groupId: number): Promise<Student[]>;
  
  // Session operations
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;
  listSessions(): Promise<Session[]>;
  listSessionsByTeacher(teacherId: number): Promise<Session[]>;
  listSessionsByModuleElement(moduleElementId: number): Promise<Session[]>;
  
  // Absence operations
  getAbsence(id: number): Promise<Absence | undefined>;
  createAbsence(absence: InsertAbsence): Promise<Absence>;
  updateAbsence(id: number, absence: Partial<InsertAbsence>): Promise<Absence | undefined>;
  deleteAbsence(id: number): Promise<boolean>;
  listAbsences(): Promise<Absence[]>;
  listAbsencesBySession(sessionId: number): Promise<Absence[]>;
  listAbsencesByStudent(studentId: number): Promise<Absence[]>;
  batchCreateAbsences(absences: InsertAbsence[]): Promise<Absence[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private departments: Map<number, Department>;
  private courses: Map<number, Course>;
  private modules: Map<number, Module>;
  private moduleElements: Map<number, ModuleElement>;
  private teacherModuleElements: Map<number, TeacherModuleElement>;
  private students: Map<number, Student>;
  private studentGroups: Map<number, StudentGroup>;
  private studentGroupAssignments: Map<number, StudentGroupAssignment>;
  private sessions: Map<number, Session>;
  private absences: Map<number, Absence>;

  private nextIds: {
    users: number;
    departments: number;
    courses: number;
    modules: number;
    moduleElements: number;
    teacherModuleElements: number;
    students: number;
    studentGroups: number;
    studentGroupAssignments: number;
    sessions: number;
    absences: number;
  };

  constructor() {
    this.users = new Map();
    this.departments = new Map();
    this.courses = new Map();
    this.modules = new Map();
    this.moduleElements = new Map();
    this.teacherModuleElements = new Map();
    this.students = new Map();
    this.studentGroups = new Map();
    this.studentGroupAssignments = new Map();
    this.sessions = new Map();
    this.absences = new Map();

    this.nextIds = {
      users: 1,
      departments: 1,
      courses: 1,
      modules: 1,
      moduleElements: 1,
      teacherModuleElements: 1,
      students: 1,
      studentGroups: 1,
      studentGroupAssignments: 1,
      sessions: 1,
      absences: 1,
    };

    // Initialize with admin user
    this.createUser({
      username: "admin",
      password: "admin",
      fullName: "Administrator",
      email: "admin@example.com",
      role: "admin",
    });
    
    // Initialize with teacher user
    this.createUser({
      username: "teacher",
      password: "teacher",
      fullName: "Teacher",
      email: "teacher@example.com",
      role: "teacher",
    });
    
    // Initialize with department head user
    this.createUser({
      username: "head_d",
      password: "head_d",
      fullName: "Department Head",
      email: "head_d@example.com",
      role: "departmentHead",
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.nextIds.users++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser: User = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Department operations
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const id = this.nextIds.departments++;
    const newDepartment: Department = { ...department, id };
    this.departments.set(id, newDepartment);
    return newDepartment;
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const existingDepartment = this.departments.get(id);
    if (!existingDepartment) return undefined;

    const updatedDepartment: Department = { ...existingDepartment, ...department };
    this.departments.set(id, updatedDepartment);
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    return this.departments.delete(id);
  }

  async listDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  // Course operations
  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const id = this.nextIds.courses++;
    const newCourse: Course = { ...course, id };
    this.courses.set(id, newCourse);
    return newCourse;
  }

  async updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course | undefined> {
    const existingCourse = this.courses.get(id);
    if (!existingCourse) return undefined;

    const updatedCourse: Course = { ...existingCourse, ...course };
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }

  async deleteCourse(id: number): Promise<boolean> {
    return this.courses.delete(id);
  }

  async listCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async listCoursesByDepartment(departmentId: number): Promise<Course[]> {
    return Array.from(this.courses.values()).filter(course => course.departmentId === departmentId);
  }

  // Module operations
  async getModule(id: number): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async createModule(module: InsertModule): Promise<Module> {
    const id = this.nextIds.modules++;
    const newModule: Module = { ...module, id };
    this.modules.set(id, newModule);
    return newModule;
  }

  async updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined> {
    const existingModule = this.modules.get(id);
    if (!existingModule) return undefined;

    const updatedModule: Module = { ...existingModule, ...module };
    this.modules.set(id, updatedModule);
    return updatedModule;
  }

  async deleteModule(id: number): Promise<boolean> {
    return this.modules.delete(id);
  }

  async listModules(): Promise<Module[]> {
    return Array.from(this.modules.values());
  }

  async listModulesByCourse(courseId: number): Promise<Module[]> {
    return Array.from(this.modules.values()).filter(module => module.courseId === courseId);
  }

  // Module Element operations
  async getModuleElement(id: number): Promise<ModuleElement | undefined> {
    return this.moduleElements.get(id);
  }

  async createModuleElement(moduleElement: InsertModuleElement): Promise<ModuleElement> {
    const id = this.nextIds.moduleElements++;
    const newModuleElement: ModuleElement = { ...moduleElement, id };
    this.moduleElements.set(id, newModuleElement);
    return newModuleElement;
  }

  async updateModuleElement(id: number, moduleElement: Partial<InsertModuleElement>): Promise<ModuleElement | undefined> {
    const existingModuleElement = this.moduleElements.get(id);
    if (!existingModuleElement) return undefined;

    const updatedModuleElement: ModuleElement = { ...existingModuleElement, ...moduleElement };
    this.moduleElements.set(id, updatedModuleElement);
    return updatedModuleElement;
  }

  async deleteModuleElement(id: number): Promise<boolean> {
    return this.moduleElements.delete(id);
  }

  async listModuleElements(): Promise<ModuleElement[]> {
    return Array.from(this.moduleElements.values());
  }

  async listModuleElementsByModule(moduleId: number): Promise<ModuleElement[]> {
    return Array.from(this.moduleElements.values()).filter(element => element.moduleId === moduleId);
  }

  // Teacher Module Element operations
  async assignTeacherToModuleElement(assignment: InsertTeacherModuleElement): Promise<TeacherModuleElement> {
    const id = this.nextIds.teacherModuleElements++;
    const newAssignment: TeacherModuleElement = { ...assignment, id };
    this.teacherModuleElements.set(id, newAssignment);
    return newAssignment;
  }

  async removeTeacherFromModuleElement(teacherId: number, moduleElementId: number): Promise<boolean> {
    const assignment = Array.from(this.teacherModuleElements.values()).find(
      a => a.teacherId === teacherId && a.moduleElementId === moduleElementId
    );
    
    if (!assignment) return false;
    return this.teacherModuleElements.delete(assignment.id);
  }

  async listTeacherModuleElements(teacherId: number): Promise<TeacherModuleElement[]> {
    return Array.from(this.teacherModuleElements.values()).filter(
      assignment => assignment.teacherId === teacherId
    );
  }

  // Student operations
  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.nextIds.students++;
    const newStudent: Student = { ...student, id };
    this.students.set(id, newStudent);
    return newStudent;
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined> {
    const existingStudent = this.students.get(id);
    if (!existingStudent) return undefined;

    const updatedStudent: Student = { ...existingStudent, ...student };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    return this.students.delete(id);
  }

  async listStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async listStudentsByCourse(courseId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(student => student.courseId === courseId);
  }

  // Student Group operations
  async getStudentGroup(id: number): Promise<StudentGroup | undefined> {
    return this.studentGroups.get(id);
  }

  async createStudentGroup(group: InsertStudentGroup): Promise<StudentGroup> {
    const id = this.nextIds.studentGroups++;
    const newGroup: StudentGroup = { ...group, id };
    this.studentGroups.set(id, newGroup);
    return newGroup;
  }

  async updateStudentGroup(id: number, group: Partial<InsertStudentGroup>): Promise<StudentGroup | undefined> {
    const existingGroup = this.studentGroups.get(id);
    if (!existingGroup) return undefined;

    const updatedGroup: StudentGroup = { ...existingGroup, ...group };
    this.studentGroups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteStudentGroup(id: number): Promise<boolean> {
    return this.studentGroups.delete(id);
  }

  async listStudentGroups(): Promise<StudentGroup[]> {
    return Array.from(this.studentGroups.values());
  }

  async listStudentGroupsByCourse(courseId: number): Promise<StudentGroup[]> {
    return Array.from(this.studentGroups.values()).filter(group => group.courseId === courseId);
  }

  // Student Group Assignment operations
  async assignStudentToGroup(assignment: InsertStudentGroupAssignment): Promise<StudentGroupAssignment> {
    const id = this.nextIds.studentGroupAssignments++;
    const newAssignment: StudentGroupAssignment = { ...assignment, id };
    this.studentGroupAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async removeStudentFromGroup(studentId: number, groupId: number): Promise<boolean> {
    const assignment = Array.from(this.studentGroupAssignments.values()).find(
      a => a.studentId === studentId && a.groupId === groupId
    );
    
    if (!assignment) return false;
    return this.studentGroupAssignments.delete(assignment.id);
  }

  async listStudentGroupAssignments(groupId: number): Promise<StudentGroupAssignment[]> {
    return Array.from(this.studentGroupAssignments.values()).filter(
      assignment => assignment.groupId === groupId
    );
  }

  async listStudentsByGroup(groupId: number): Promise<Student[]> {
    const assignments = await this.listStudentGroupAssignments(groupId);
    const studentIds = assignments.map(assignment => assignment.studentId);
    return Array.from(this.students.values()).filter(student => 
      studentIds.includes(student.id)
    );
  }

  // Session operations
  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const id = this.nextIds.sessions++;
    const newSession: Session = { ...session, id };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined> {
    const existingSession = this.sessions.get(id);
    if (!existingSession) return undefined;

    const updatedSession: Session = { ...existingSession, ...session };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async listSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async listSessionsByTeacher(teacherId: number): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => session.teacherId === teacherId);
  }

  async listSessionsByModuleElement(moduleElementId: number): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => session.moduleElementId === moduleElementId);
  }

  // Absence operations
  async getAbsence(id: number): Promise<Absence | undefined> {
    return this.absences.get(id);
  }

  async createAbsence(absence: InsertAbsence): Promise<Absence> {
    const id = this.nextIds.absences++;
    const newAbsence: Absence = { ...absence, id };
    this.absences.set(id, newAbsence);
    return newAbsence;
  }

  async updateAbsence(id: number, absence: Partial<InsertAbsence>): Promise<Absence | undefined> {
    const existingAbsence = this.absences.get(id);
    if (!existingAbsence) return undefined;

    const updatedAbsence: Absence = { ...existingAbsence, ...absence };
    this.absences.set(id, updatedAbsence);
    return updatedAbsence;
  }

  async deleteAbsence(id: number): Promise<boolean> {
    return this.absences.delete(id);
  }

  async listAbsences(): Promise<Absence[]> {
    return Array.from(this.absences.values());
  }

  async listAbsencesBySession(sessionId: number): Promise<Absence[]> {
    return Array.from(this.absences.values()).filter(absence => absence.sessionId === sessionId);
  }

  async listAbsencesByStudent(studentId: number): Promise<Absence[]> {
    return Array.from(this.absences.values()).filter(absence => absence.studentId === studentId);
  }

  async batchCreateAbsences(absences: InsertAbsence[]): Promise<Absence[]> {
    const createdAbsences: Absence[] = [];
    for (const absence of absences) {
      const createdAbsence = await this.createAbsence(absence);
      createdAbsences.push(createdAbsence);
    }
    return createdAbsences;
  }
}

export const storage = new MemStorage();
