import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { USER_ROLES } from "@/lib/constants";
import { 
  Home, 
  Building2, 
  BookOpen, 
  Layers, 
  Users, 
  User, 
  UserPlus,
  FileBarChart, 
  FileText, 
  CalendarClock, 
  History 
} from "lucide-react";
import { BookTextIcon } from "../ui/book-text";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location === path;
  
  const NavItem = ({ path, icon, label }: { path: string, icon: React.ReactNode, label: string }) => {
    const linkClasses = `flex items-center px-6 py-2 text-sm rounded-md ${isActive(path) ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`;
    
    return (
      <li>
        <div onClick={() => window.location.href = path} className={linkClasses + " cursor-pointer"}>
          <div className="mr-3 flex-shrink-0">{icon}</div>
          <span className="whitespace-nowrap">
            {label}
          </span>
        </div>
      </li>
    );
  };

  return (
    <aside 
      className="bg-card border-r border-border h-full flex-shrink-0 fixed md:relative z-20 w-64 overflow-x-hidden"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div className="px-6 py-4 border-b whitespace-nowrap">
          <h1 className="text-xl font-medium text-foreground flex items-center gap-2">
            <BookTextIcon className="text-blue-700 dark:text-blue-500" />
            <span className="text-blue-700 dark:text-blue-500">SuiviScolaire</span>
          </h1>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {/* Admin Menu */}
            {user.role === USER_ROLES.ADMIN && (
              <div className="mb-6">
                <h2 className="px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Administration
                </h2>
                <NavItem path="/" icon={<Home />} label="Tableau de bord" />
                <NavItem path="/departments" icon={<Building2 />} label="Départements" />
                <NavItem path="/courses" icon={<BookOpen />} label="Filières" />
                <NavItem path="/modules" icon={<Layers />} label="Modules" />
                <NavItem path="/teachers" icon={<User />} label="Enseignants" />
                <NavItem path="/students" icon={<Users />} label="Étudiants" />
              </div>
            )}

            {/* Department Head Menu */}
            {(user.role === USER_ROLES.DEPARTMENT_HEAD || user.role === USER_ROLES.ADMIN) && (
              <div className="mb-6">
                <h2 className="px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Chef de Département
                </h2>
                {user.role === USER_ROLES.DEPARTMENT_HEAD && (
                  <NavItem path="/" icon={<Home />} label="Tableau de bord" />
                )}
                <NavItem path="/student-groups" icon={<UserPlus />} label="Groupes d'étudiants" />
                <NavItem path="/absence-reports" icon={<FileBarChart />} label="Rapports d'absences" />
              </div>
            )}

            {/* Teacher Menu */}
            {(user.role === USER_ROLES.TEACHER || user.role === USER_ROLES.DEPARTMENT_HEAD || user.role === USER_ROLES.ADMIN) && (
              <div className="mb-6">
                <h2 className="px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Enseignant
                </h2>
                {user.role === USER_ROLES.TEACHER && (
                  <NavItem path="/" icon={<Home />} label="Tableau de bord" />
                )}
                <NavItem path="/my-modules" icon={<Layers />} label="Mes modules" />
                <NavItem path="/record-absences" icon={<CalendarClock />} label="Saisir absences" />
                <NavItem path="/absence-history" icon={<History />} label="Historique absences" />
              </div>
            )}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
