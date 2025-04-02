import { useEffect, useState } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/use-theme";
import LoginForm from "@/components/auth/LoginForm";
import Dashboard from "@/pages/dashboard/Dashboard";
import DepartmentsList from "@/pages/departments/DepartmentsList";
import CoursesList from "@/pages/courses/CoursesList";
import ModulesList from "@/pages/modules/ModulesList";
import TeachersList from "@/pages/teachers/TeachersList";
import StudentsList from "@/pages/students/StudentsList";
import StudentGroups from "@/pages/student-groups/StudentGroups";
import RecordAbsences from "@/pages/absences/RecordAbsences";
import AbsenceHistory from "@/pages/absences/AbsenceHistory";
import AbsenceReports from "@/pages/absences/AbsenceReports";
import TeacherModules from "@/pages/modules/TeacherModules";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode, requiredRoles?: string[] }) {
  const { user, isLoading, initialized } = useAuth();
  const [previouslyAuthenticated, setPreviouslyAuthenticated] = useState(() => {
    // Initialize from localStorage to avoid flash
    return !!localStorage.getItem('SuiviScolaire_user');
  });
  
  // When user becomes authenticated, set the flag
  useEffect(() => {
    if (user && !isLoading) {
      setPreviouslyAuthenticated(true);
    }
  }, [user, isLoading]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    // If we were previously authenticated or have cached user data, 
    // continue showing the page content to prevent flashing login screen
    if (previouslyAuthenticated) {
      return <>{children}</>;
    }
    
    // Otherwise show loading indicator for first-time authentication
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }
  
  // Not authenticated, show login
  if (!user) {
    return <LoginForm />;
  }
  
  // Check role permissions
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <div className="flex items-center justify-center h-screen">Accès non autorisé</div>;
  }
  
  // All checks passed, render children
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  // Keep the sidebar always open
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <LoginForm />
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Admin Routes */}
      <Route path="/departments">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AppLayout>
            <DepartmentsList />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/courses">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AppLayout>
            <CoursesList />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/modules">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AppLayout>
            <ModulesList />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/teachers">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AppLayout>
            <TeachersList />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/students">
        <ProtectedRoute requiredRoles={["admin"]}>
          <AppLayout>
            <StudentsList />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Department Head Routes */}
      <Route path="/student-groups">
        <ProtectedRoute requiredRoles={["admin", "departmentHead"]}>
          <AppLayout>
            <StudentGroups />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/absence-reports">
        <ProtectedRoute requiredRoles={["admin", "departmentHead"]}>
          <AppLayout>
            <AbsenceReports />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Teacher Routes */}
      <Route path="/my-modules">
        <ProtectedRoute requiredRoles={["admin", "departmentHead", "teacher"]}>
          <AppLayout>
            <TeacherModules />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/record-absences">
        <ProtectedRoute requiredRoles={["admin", "departmentHead", "teacher"]}>
          <AppLayout>
            <RecordAbsences />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/absence-history">
        <ProtectedRoute requiredRoles={["admin", "departmentHead", "teacher"]}>
          <AppLayout>
            <AbsenceHistory />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Fallback to 404 */}
      <Route>
        <ProtectedRoute>
          <AppLayout>
            <NotFound />
          </AppLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router />
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
