import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SESSION_TYPES } from "@/lib/constants";

// Types
interface TeacherModuleElement {
  id: number;
  teacherId: number;
  moduleElementId: number;
}

interface ModuleElement {
  id: number;
  name: string;
  code: string;
  description: string | null;
  moduleId: number;
}

interface Module {
  id: number;
  name: string;
  code: string;
  description: string | null;
  courseId: number;
}

interface Course {
  id: number;
  name: string;
  code: string;
  description: string | null;
  departmentId: number;
}

interface Session {
  id: number;
  date: string;
  type: string;
  moduleElementId: number;
  teacherId: number;
  groupId: number | null;
  notes: string | null;
}

interface Student {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  courseId: number;
}

export default function TeacherModules() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // Queries for fetching data
  const { data: teacherModuleElements, isLoading: assignmentsLoading } = useQuery<TeacherModuleElement[]>({
    queryKey: ['/api/teacher-module-elements', { teacherId: user?.id }],
    enabled: !!user,
  });

  const { data: moduleElements } = useQuery<ModuleElement[]>({
    queryKey: ['/api/module-elements'],
  });

  const { data: modules } = useQuery<Module[]>({
    queryKey: ['/api/modules'],
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ['/api/sessions', { teacherId: user?.id }],
    enabled: !!user,
  });

  // Filter module elements assigned to the current teacher
  const teacherModuleElementIds = teacherModuleElements?.map(tme => tme.moduleElementId) || [];
  const teacherModuleElementsData = moduleElements?.filter(
    me => teacherModuleElementIds.includes(me.id)
  ) || [];

  // Filter based on search term
  const filteredModuleElements = teacherModuleElementsData.filter(
    me => 
      me.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      me.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getModuleName(me.moduleId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCourseName(getModuleCourseId(me.moduleId)).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter based on selected tab
  const tabFilteredModuleElements = selectedTab === "all" 
    ? filteredModuleElements 
    : filteredModuleElements.filter(me => {
        const sessionTypes = sessions
          ?.filter(s => s.moduleElementId === me.id)
          .map(s => s.type);
        return sessionTypes?.includes(selectedTab);
      });

  // Helper functions to get related data
  const getModuleName = (moduleId: number) => {
    const module = modules?.find(m => m.id === moduleId);
    return module ? module.name : "Module inconnu";
  };

  const getModuleCourseId = (moduleId: number) => {
    const module = modules?.find(m => m.id === moduleId);
    return module ? module.courseId : 0;
  };

  const getCourseName = (courseId: number) => {
    const course = courses?.find(c => c.id === courseId);
    return course ? course.name : "Filière inconnue";
  };

  // Count sessions by module element and type
  const getSessionCount = (moduleElementId: number, type?: string) => {
    return sessions?.filter(
      s => s.moduleElementId === moduleElementId && (type ? s.type === type : true)
    ).length || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mes modules</h2>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="w-full md:w-64">
          <Input
            placeholder="Rechercher un module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value={SESSION_TYPES.COURSE}>Cours</TabsTrigger>
            <TabsTrigger value={SESSION_TYPES.TD}>TD</TabsTrigger>
            <TabsTrigger value={SESSION_TYPES.TP}>TP</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {assignmentsLoading ? (
        <div className="flex justify-center py-8">
          <span className="material-icons animate-spin text-4xl text-primary-500">refresh</span>
        </div>
      ) : tabFilteredModuleElements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tabFilteredModuleElements.map((moduleElement) => {
            const totalSessions = getSessionCount(moduleElement.id);
            const moduleName = getModuleName(moduleElement.moduleId);
            const courseId = getModuleCourseId(moduleElement.moduleId);
            const courseName = getCourseName(courseId);
            
            return (
              <Card key={moduleElement.id} className="overflow-hidden">
                <CardHeader className="bg-primary-50 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-primary-800">{moduleElement.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <span className="text-xs font-semibold bg-primary-100 text-primary-800 px-2 py-1 rounded">
                          {moduleElement.code}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-neutral-500">Module:</p>
                      <p className="font-medium">{moduleName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Filière:</p>
                      <p className="font-medium">{courseName}</p>
                    </div>
                    {moduleElement.description && (
                      <div>
                        <p className="text-sm text-neutral-500">Description:</p>
                        <p className="text-sm">{moduleElement.description}</p>
                      </div>
                    )}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="bg-blue-50 rounded-md p-3 text-center">
                        <p className="text-sm text-blue-800">Cours</p>
                        <p className="font-bold text-blue-800">{getSessionCount(moduleElement.id, SESSION_TYPES.COURSE)}</p>
                      </div>
                      <div className="bg-green-50 rounded-md p-3 text-center">
                        <p className="text-sm text-green-800">TD</p>
                        <p className="font-bold text-green-800">{getSessionCount(moduleElement.id, SESSION_TYPES.TD)}</p>
                      </div>
                      <div className="bg-amber-50 rounded-md p-3 text-center">
                        <p className="text-sm text-amber-800">TP</p>
                        <p className="font-bold text-amber-800">{getSessionCount(moduleElement.id, SESSION_TYPES.TP)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-4 bg-neutral-50">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.href = "/record-absences"}
                  >
                    <span className="material-icons mr-2">edit_calendar</span>
                    Saisir des absences
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <span className="material-icons text-4xl text-neutral-400 mb-4">
              assignment
            </span>
            <h3 className="text-xl font-medium text-neutral-600 mb-2">
              {searchTerm || selectedTab !== "all" 
                ? "Aucun module trouvé" 
                : "Vous n'êtes assigné à aucun module"}
            </h3>
            <p className="text-neutral-500 text-center max-w-md mb-4">
              {searchTerm || selectedTab !== "all"
                ? "Aucun module ne correspond à votre recherche ou au filtre sélectionné."
                : "Contactez l'administrateur pour être assigné à des modules."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
