import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ABSENCE_STATUSES, SESSION_TYPES, ABSENCE_STATUS_OPTIONS, getStatusOption } from "@/lib/constants";
import AbsenceRecordModal from "@/components/modals/AbsenceRecordModal";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Types
interface ModuleElement {
  id: number;
  name: string;
  code: string;
  moduleId: number;
}

interface StudentGroup {
  id: number;
  name: string;
  type: string;
  courseId: number;
}

interface Student {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  courseId: number;
}

interface TeacherModuleElement {
  id: number;
  teacherId: number;
  moduleElementId: number;
}

export default function RecordAbsences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  // Queries for fetching data
  const { data: teacherModuleElements } = useQuery<TeacherModuleElement[]>({
    queryKey: ['/api/teacher-module-elements', { teacherId: user?.id }],
    enabled: !!user,
  });

  const { data: moduleElements } = useQuery<ModuleElement[]>({
    queryKey: ['/api/module-elements'],
  });
  
  const { data: studentGroups } = useQuery<StudentGroup[]>({
    queryKey: ['/api/student-groups'],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  // Filter module elements that are assigned to the current teacher
  const teacherModuleElementIds = teacherModuleElements?.map(tme => tme.moduleElementId) || [];
  const filteredModuleElements = moduleElements?.filter(
    me => teacherModuleElementIds.includes(me.id)
  ) || [];

  // Function to open the absence recording modal
  const openAbsenceModal = () => {
    setIsAbsenceModalOpen(true);
  };

  // Function to handle absence recording form submission
  const handleAbsenceRecording = async (sessionData: any, absencesData: any[]) => {
    try {
      // Create a new session
      const sessionResponse = await apiRequest("POST", "/api/sessions", sessionData);
      const session = await sessionResponse.json();
      
      // Create absences for the session
      const absencesPayload = absencesData.map(absence => ({
        ...absence,
        sessionId: session.id
      }));
      
      await apiRequest("POST", "/api/absences/batch", absencesPayload);
      
      // Success toast and close modal
      toast({
        title: "Absences enregistrées",
        description: "Les absences ont été enregistrées avec succès",
      });
      
      setIsAbsenceModalOpen(false);
      
      // Refetch any relevant data
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/absences'] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement des absences",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Saisir des absences</h2>
        <Button onClick={openAbsenceModal}>
          <span className="material-icons mr-2">add</span>
          Nouvelle saisie d'absences
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Pour enregistrer les absences des étudiants, cliquez sur le bouton "Nouvelle saisie d'absences" 
                et suivez ces étapes :
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-4">
                <li>Sélectionnez l'élément de module pour lequel vous souhaitez enregistrer des absences.</li>
                <li>Choisissez le type de séance (cours, TD, TP).</li>
                <li>Sélectionnez la date de la séance.</li>
                <li>Si nécessaire, filtrez les étudiants par groupe.</li>
                <li>Pour chaque étudiant, indiquez son statut (présent, absent, justifié, retard).</li>
                <li>Ajoutez des notes si nécessaire.</li>
                <li>Enregistrez les absences.</li>
              </ol>
              <p className="text-neutral-500 italic">
                Note: Vous ne pouvez enregistrer des absences que pour les modules auxquels vous êtes assigné.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vos modules</CardTitle>
            <CardDescription>
              Liste des modules auxquels vous êtes assigné
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredModuleElements.length > 0 ? (
              <div className="space-y-3">
                {filteredModuleElements.map(moduleElement => (
                  <div key={moduleElement.id} className="p-3 border rounded-md hover:bg-neutral-50">
                    <p className="font-medium">{moduleElement.name}</p>
                    <p className="text-sm text-neutral-500">{moduleElement.code}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-500">
                Vous n'êtes assigné à aucun module
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Vos séances récentes</CardTitle>
          <CardDescription>
            Cliquez sur une séance pour voir les absences associées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-neutral-500">
            <span className="material-icons text-4xl mb-4">history</span>
            <h3 className="text-lg font-medium mb-2">Aucune séance récente</h3>
            <p className="max-w-md mx-auto">
              Les séances pour lesquelles vous avez enregistré des absences apparaîtront ici.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Absence Recording Modal */}
      <AbsenceRecordModal
        isOpen={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        teacherId={user?.id || 0}
        moduleElements={filteredModuleElements}
        studentGroups={studentGroups || []}
        students={students || []}
        onSubmit={handleAbsenceRecording}
      />
    </div>
  );
}
