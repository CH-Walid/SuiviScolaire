import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertDepartmentSchema, 
  insertCourseSchema, 
  insertModuleSchema, 
  insertModuleElementSchema, 
  insertTeacherModuleElementSchema, 
  insertStudentSchema, 
  insertStudentGroupSchema, 
  insertStudentGroupAssignmentSchema, 
  insertSessionSchema, 
  insertAbsenceSchema 
} from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

// Session setup
const MemoryStoreSession = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Set up session middleware
  app.use(
    session({
      secret: "absence-management-system-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  // Set up Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username" });
        }
        // In a real app, you'd use a proper password hashing library like bcrypt
        if (user.password !== password) {
          return done(null, false, { message: "Invalid password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Forbidden - Admin access required" });
  };

  const isDepartmentHead = (req: Request, res: Response, next: Function) => {
    if (
      req.isAuthenticated() && 
      req.user && 
      ((req.user as any).role === "departmentHead" || (req.user as any).role === "admin")
    ) {
      return next();
    }
    res.status(403).json({ message: "Forbidden - Department Head access required" });
  };

  const isTeacher = (req: Request, res: Response, next: Function) => {
    if (
      req.isAuthenticated() && 
      req.user && 
      ((req.user as any).role === "teacher" || (req.user as any).role === "departmentHead" || (req.user as any).role === "admin")
    ) {
      return next();
    }
    res.status(403).json({ message: "Forbidden - Teacher access required" });
  };

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Internal server error" });
        }
        return res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(function(err) {
      if (err) { return res.status(500).json({ message: "Error logging out" }); }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ authenticated: false });
    }
    
    const user = req.user as any;
    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId
      }
    });
  });

  // User routes
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.listUsers();
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId
      })));
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.get("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  app.put("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userData = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        departmentId: updatedUser.departmentId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating user" });
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  // Department routes
  app.get("/api/departments", isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.listDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching departments" });
    }
  });

  app.post("/api/departments", isAdmin, async (req, res) => {
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid department data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating department" });
    }
  });

  app.get("/api/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const department = await storage.getDepartment(id);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      res.status(500).json({ message: "Error fetching department" });
    }
  });

  app.put("/api/departments/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const departmentData = insertDepartmentSchema.partial().parse(req.body);
      const updatedDepartment = await storage.updateDepartment(id, departmentData);
      if (!updatedDepartment) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(updatedDepartment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid department data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating department" });
    }
  });

  app.delete("/api/departments/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteDepartment(id);
      if (!success) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting department" });
    }
  });

  // Course routes
  app.get("/api/courses", isAuthenticated, async (req, res) => {
    try {
      const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string, 10) : undefined;
      let courses;
      
      if (departmentId) {
        courses = await storage.listCoursesByDepartment(departmentId);
      } else {
        courses = await storage.listCourses();
      }
      
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching courses" });
    }
  });

  app.post("/api/courses", isAdmin, async (req, res) => {
    try {
      const courseData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(courseData);
      res.status(201).json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid course data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating course" });
    }
  });

  app.get("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const course = await storage.getCourse(id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Error fetching course" });
    }
  });

  app.put("/api/courses/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const courseData = insertCourseSchema.partial().parse(req.body);
      const updatedCourse = await storage.updateCourse(id, courseData);
      if (!updatedCourse) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(updatedCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid course data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating course" });
    }
  });

  app.delete("/api/courses/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteCourse(id);
      if (!success) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting course" });
    }
  });

  // Module routes
  app.get("/api/modules", isAuthenticated, async (req, res) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string, 10) : undefined;
      let modules;
      
      if (courseId) {
        modules = await storage.listModulesByCourse(courseId);
      } else {
        modules = await storage.listModules();
      }
      
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Error fetching modules" });
    }
  });

  app.post("/api/modules", isAdmin, async (req, res) => {
    try {
      const moduleData = insertModuleSchema.parse(req.body);
      const module = await storage.createModule(moduleData);
      res.status(201).json(module);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid module data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating module" });
    }
  });

  app.get("/api/modules/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const module = await storage.getModule(id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: "Error fetching module" });
    }
  });

  app.put("/api/modules/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const moduleData = insertModuleSchema.partial().parse(req.body);
      const updatedModule = await storage.updateModule(id, moduleData);
      if (!updatedModule) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(updatedModule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid module data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating module" });
    }
  });

  app.delete("/api/modules/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteModule(id);
      if (!success) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json({ message: "Module deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting module" });
    }
  });

  // Module Element routes
  app.get("/api/module-elements", isAuthenticated, async (req, res) => {
    try {
      const moduleId = req.query.moduleId ? parseInt(req.query.moduleId as string, 10) : undefined;
      let moduleElements;
      
      if (moduleId) {
        moduleElements = await storage.listModuleElementsByModule(moduleId);
      } else {
        moduleElements = await storage.listModuleElements();
      }
      
      res.json(moduleElements);
    } catch (error) {
      res.status(500).json({ message: "Error fetching module elements" });
    }
  });

  app.post("/api/module-elements", isAdmin, async (req, res) => {
    try {
      const elementData = insertModuleElementSchema.parse(req.body);
      const moduleElement = await storage.createModuleElement(elementData);
      res.status(201).json(moduleElement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid module element data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating module element" });
    }
  });

  app.get("/api/module-elements/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const moduleElement = await storage.getModuleElement(id);
      if (!moduleElement) {
        return res.status(404).json({ message: "Module element not found" });
      }
      res.json(moduleElement);
    } catch (error) {
      res.status(500).json({ message: "Error fetching module element" });
    }
  });

  app.put("/api/module-elements/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const elementData = insertModuleElementSchema.partial().parse(req.body);
      const updatedElement = await storage.updateModuleElement(id, elementData);
      if (!updatedElement) {
        return res.status(404).json({ message: "Module element not found" });
      }
      res.json(updatedElement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid module element data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating module element" });
    }
  });

  app.delete("/api/module-elements/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteModuleElement(id);
      if (!success) {
        return res.status(404).json({ message: "Module element not found" });
      }
      res.json({ message: "Module element deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting module element" });
    }
  });

  // Teacher Module Element Assignment routes
  app.post("/api/teacher-module-elements", isAdmin, async (req, res) => {
    try {
      const assignmentData = insertTeacherModuleElementSchema.parse(req.body);
      const assignment = await storage.assignTeacherToModuleElement(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating assignment" });
    }
  });

  app.delete("/api/teacher-module-elements", isAdmin, async (req, res) => {
    try {
      const teacherId = parseInt(req.query.teacherId as string, 10);
      const moduleElementId = parseInt(req.query.moduleElementId as string, 10);
      
      if (isNaN(teacherId) || isNaN(moduleElementId)) {
        return res.status(400).json({ message: "Invalid teacher ID or module element ID" });
      }
      
      const success = await storage.removeTeacherFromModuleElement(teacherId, moduleElementId);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      res.json({ message: "Assignment removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting assignment" });
    }
  });

  app.get("/api/teacher-module-elements", isAuthenticated, async (req, res) => {
    try {
      const teacherId = parseInt(req.query.teacherId as string, 10);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ message: "Invalid teacher ID" });
      }
      
      const assignments = await storage.listTeacherModuleElements(teacherId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching assignments" });
    }
  });

  // Student routes
  app.get("/api/students", isAuthenticated, async (req, res) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string, 10) : undefined;
      let students;
      
      if (courseId) {
        students = await storage.listStudentsByCourse(courseId);
      } else {
        students = await storage.listStudents();
      }
      
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Error fetching students" });
    }
  });

  app.post("/api/students", isAdmin, async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating student" });
    }
  });

  app.get("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Error fetching student" });
    }
  });

  app.put("/api/students/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const studentData = insertStudentSchema.partial().parse(req.body);
      const updatedStudent = await storage.updateStudent(id, studentData);
      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(updatedStudent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating student" });
    }
  });

  app.delete("/api/students/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteStudent(id);
      if (!success) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting student" });
    }
  });

  // Student Group routes
  app.get("/api/student-groups", isAuthenticated, async (req, res) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string, 10) : undefined;
      let groups;
      
      if (courseId) {
        groups = await storage.listStudentGroupsByCourse(courseId);
      } else {
        groups = await storage.listStudentGroups();
      }
      
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Error fetching student groups" });
    }
  });

  app.post("/api/student-groups", isDepartmentHead, async (req, res) => {
    try {
      const groupData = insertStudentGroupSchema.parse(req.body);
      const group = await storage.createStudentGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating student group" });
    }
  });

  app.get("/api/student-groups/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const group = await storage.getStudentGroup(id);
      if (!group) {
        return res.status(404).json({ message: "Student group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Error fetching student group" });
    }
  });

  app.put("/api/student-groups/:id", isDepartmentHead, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const groupData = insertStudentGroupSchema.partial().parse(req.body);
      const updatedGroup = await storage.updateStudentGroup(id, groupData);
      if (!updatedGroup) {
        return res.status(404).json({ message: "Student group not found" });
      }
      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating student group" });
    }
  });

  app.delete("/api/student-groups/:id", isDepartmentHead, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteStudentGroup(id);
      if (!success) {
        return res.status(404).json({ message: "Student group not found" });
      }
      res.json({ message: "Student group deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting student group" });
    }
  });

  // Student Group Assignment routes
  app.post("/api/student-group-assignments", isDepartmentHead, async (req, res) => {
    try {
      const assignmentData = insertStudentGroupAssignmentSchema.parse(req.body);
      const assignment = await storage.assignStudentToGroup(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating assignment" });
    }
  });

  app.delete("/api/student-group-assignments", isDepartmentHead, async (req, res) => {
    try {
      const studentId = parseInt(req.query.studentId as string, 10);
      const groupId = parseInt(req.query.groupId as string, 10);
      
      if (isNaN(studentId) || isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid student ID or group ID" });
      }
      
      const success = await storage.removeStudentFromGroup(studentId, groupId);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      res.json({ message: "Assignment removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting assignment" });
    }
  });

  app.get("/api/student-groups/:groupId/students", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId, 10);
      const students = await storage.listStudentsByGroup(groupId);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Error fetching students by group" });
    }
  });

  // Session routes
  app.get("/api/sessions", isTeacher, async (req, res) => {
    try {
      const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string, 10) : undefined;
      const moduleElementId = req.query.moduleElementId ? parseInt(req.query.moduleElementId as string, 10) : undefined;
      
      let sessions;
      
      if (teacherId) {
        sessions = await storage.listSessionsByTeacher(teacherId);
      } else if (moduleElementId) {
        sessions = await storage.listSessionsByModuleElement(moduleElementId);
      } else {
        sessions = await storage.listSessions();
      }
      
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sessions" });
    }
  });

  app.post("/api/sessions", isTeacher, async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating session" });
    }
  });

  app.get("/api/sessions/:id", isTeacher, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const session = await storage.getSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Error fetching session" });
    }
  });

  app.put("/api/sessions/:id", isTeacher, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const sessionData = insertSessionSchema.partial().parse(req.body);
      const updatedSession = await storage.updateSession(id, sessionData);
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(updatedSession);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating session" });
    }
  });

  app.delete("/api/sessions/:id", isTeacher, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteSession(id);
      if (!success) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting session" });
    }
  });

  // Absence routes
  app.get("/api/absences", isAuthenticated, async (req, res) => {
    try {
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string, 10) : undefined;
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string, 10) : undefined;
      
      let absences;
      
      if (sessionId) {
        absences = await storage.listAbsencesBySession(sessionId);
      } else if (studentId) {
        absences = await storage.listAbsencesByStudent(studentId);
      } else {
        absences = await storage.listAbsences();
      }
      
      res.json(absences);
    } catch (error) {
      res.status(500).json({ message: "Error fetching absences" });
    }
  });

  app.post("/api/absences", isTeacher, async (req, res) => {
    try {
      const absenceData = insertAbsenceSchema.parse(req.body);
      const absence = await storage.createAbsence(absenceData);
      res.status(201).json(absence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid absence data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating absence" });
    }
  });

  app.post("/api/absences/batch", isTeacher, async (req, res) => {
    try {
      const absencesArray = z.array(insertAbsenceSchema).parse(req.body);
      const absences = await storage.batchCreateAbsences(absencesArray);
      res.status(201).json(absences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid absences data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating absences" });
    }
  });

  app.get("/api/absences/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const absence = await storage.getAbsence(id);
      if (!absence) {
        return res.status(404).json({ message: "Absence not found" });
      }
      res.json(absence);
    } catch (error) {
      res.status(500).json({ message: "Error fetching absence" });
    }
  });

  app.put("/api/absences/:id", isTeacher, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const absenceData = insertAbsenceSchema.partial().parse(req.body);
      const updatedAbsence = await storage.updateAbsence(id, absenceData);
      if (!updatedAbsence) {
        return res.status(404).json({ message: "Absence not found" });
      }
      res.json(updatedAbsence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid absence data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating absence" });
    }
  });

  app.delete("/api/absences/:id", isTeacher, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteAbsence(id);
      if (!success) {
        return res.status(404).json({ message: "Absence not found" });
      }
      res.json({ message: "Absence deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting absence" });
    }
  });

  // Statistics routes for dashboard
  app.get("/api/statistics", isAuthenticated, async (req, res) => {
    try {
      const studentsCount = (await storage.listStudents()).length;
      const departmentsCount = (await storage.listDepartments()).length;
      const coursesCount = (await storage.listCourses()).length;
      const teachersCount = (await storage.listUsers()).filter(user => user.role === "teacher").length;
      const modulesCount = (await storage.listModules()).length;
      const absencesCount = (await storage.listAbsences()).length;

      res.json({
        studentsCount,
        departmentsCount,
        coursesCount,
        teachersCount,
        modulesCount,
        absencesCount
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching statistics" });
    }
  });

  // Top absentees for dashboard
  app.get("/api/statistics/top-absentees", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const absences = await storage.listAbsences();
      const students = await storage.listStudents();
      
      // Count absences by student
      const absencesByStudent = new Map<number, number>();
      
      for (const absence of absences) {
        if (absence.status === "absent") {
          const count = absencesByStudent.get(absence.studentId) || 0;
          absencesByStudent.set(absence.studentId, count + 1);
        }
      }
      
      // Convert to array and sort
      const topAbsentees = Array.from(absencesByStudent.entries())
        .map(([studentId, count]) => {
          const student = students.find(s => s.id === studentId);
          return {
            studentId,
            studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
            absenceCount: count
          };
        })
        .sort((a, b) => b.absenceCount - a.absenceCount)
        .slice(0, limit);
      
      res.json(topAbsentees);
    } catch (error) {
      res.status(500).json({ message: "Error fetching top absentees" });
    }
  });

  // Recent activities for dashboard
  app.get("/api/statistics/recent-activities", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const sessions = await storage.listSessions();
      const teachers = (await storage.listUsers()).filter(user => user.role === "teacher");
      const moduleElements = await storage.listModuleElements();
      
      // Sort sessions by date (newest first)
      const recentSessions = sessions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
      
      const activities = await Promise.all(recentSessions.map(async session => {
        const teacher = teachers.find(t => t.id === session.teacherId);
        const moduleElement = moduleElements.find(m => m.id === session.moduleElementId);
        const absencesCount = (await storage.listAbsencesBySession(session.id))
          .filter(a => a.status === "absent").length;
        
        return {
          sessionId: session.id,
          date: session.date,
          teacherName: teacher ? teacher.fullName : "Unknown",
          moduleElementName: moduleElement ? moduleElement.name : "Unknown",
          type: session.type,
          absencesCount
        };
      }));
      
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Error fetching recent activities" });
    }
  });

  return httpServer;
}
