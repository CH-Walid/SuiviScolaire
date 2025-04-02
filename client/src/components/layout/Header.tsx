import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@/lib/constants";
import { LogOut, User } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Tableau de bord";
      case "/departments":
        return "Départements";
      case "/courses":
        return "Filières";
      case "/modules":
        return "Modules";
      case "/teachers":
        return "Enseignants";
      case "/students":
        return "Étudiants";
      case "/student-groups":
        return "Groupes d'étudiants";
      case "/absence-reports":
        return "Rapports d'absences";
      case "/my-modules":
        return "Mes modules";
      case "/record-absences":
        return "Saisir absences";
      case "/absence-history":
        return "Historique absences";
      default:
        return "Gest-Absences";
    }
  };
  
  // Get user role display name
  const getUserRoleDisplay = () => {
    if (!user) return "";
    
    switch (user.role) {
      case USER_ROLES.ADMIN:
        return "Administrateur";
      case USER_ROLES.DEPARTMENT_HEAD:
        return "Chef de département";
      case USER_ROLES.TEACHER:
        return "Enseignant";
      default:
        return user.role;
    }
  };
  
  // Get initials from user's full name
  const getInitials = () => {
    if (!user?.fullName) return "U";
    
    return user.fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase();
  };
  
  return (
    <header className="bg-background shadow-sm z-10 border-b">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">{getPageTitle()}</h2>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer border border-muted hover:border-primary transition-colors">
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium text-sm">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{getUserRoleDisplay()}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout()}
                  className="text-red-600 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
