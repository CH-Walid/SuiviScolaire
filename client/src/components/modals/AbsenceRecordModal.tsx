import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ABSENCE_STATUSES, SESSION_TYPES } from "@/lib/constants";

interface Student {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  courseId: number;
  status?: string;
}

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

interface AbsenceRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: number;
  moduleElements: ModuleElement[];
  studentGroups: StudentGroup[];
  students: Student[];
  onSubmit: (sessionData: any, absencesData: any[]) => Promise<void>;
}

const formSchema = z.object({
  moduleElementId: z.string().min(1, { message: "Le module est requis" }),
  type: z.string().min(1, { message: "Le type de séance est requis" }),
  date: z.string().min(1, { message: "La date est requise" }),
  groupId: z.string().optional(),
  notes: z.string().optional(),
});

export default function AbsenceRecordModal({
  isOpen,
  onClose,
  teacherId,
  moduleElements,
  studentGroups,
  students,
  onSubmit,
}: AbsenceRecordModalProps) {
  const [studentsWithStatus, setStudentsWithStatus] = useState<Student[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      moduleElementId: "",
      type: SESSION_TYPES.COURSE,
      date: new Date().toISOString().slice(0, 10),
      groupId: "",
      notes: "",
    },
  });

  // Reset students status when modal opens or students change
  useEffect(() => {
    if (isOpen && students) {
      const initialStudents = students.map(student => ({
        ...student,
        status: ABSENCE_STATUSES.PRESENT,
      }));
      setStudentsWithStatus(initialStudents);
    }
  }, [isOpen, students]);

  // Filter students when group changes
  useEffect(() => {
    if (!selectedGroupId || selectedGroupId === "all") {
      // If no group is selected, show all students
      if (students) {
        const initialStudents = students.map(student => ({
          ...student,
          status: ABSENCE_STATUSES.PRESENT,
        }));
        setStudentsWithStatus(initialStudents);
      }
    } else {
      // Only show students in the selected group
      // In a real app, we would fetch students by group
      // For now, we'll just simulate it
      if (students) {
        const groupId = parseInt(selectedGroupId, 10);
        // This is a placeholder. In a real implementation, we would fetch students by group ID
        const filteredStudents = students.filter((_, index) => index % 2 === 0).map(student => ({
          ...student,
          status: ABSENCE_STATUSES.PRESENT,
        }));
        setStudentsWithStatus(filteredStudents);
      }
    }
  }, [selectedGroupId, students]);

  // Handle form group change
  const handleGroupChange = (value: string) => {
    form.setValue("groupId", value);
    setSelectedGroupId(value);
  };

  // Update student status
  const handleStatusChange = (studentId: number, status: string) => {
    setStudentsWithStatus(prev =>
      prev.map(student =>
        student.id === studentId ? { ...student, status } : student
      )
    );
  };

  // Set all students to present
  const markAllPresent = () => {
    setStudentsWithStatus(prev =>
      prev.map(student => ({ ...student, status: ABSENCE_STATUSES.PRESENT }))
    );
  };

  // Set all students to absent
  const markAllAbsent = () => {
    setStudentsWithStatus(prev =>
      prev.map(student => ({ ...student, status: ABSENCE_STATUSES.ABSENT }))
    );
  };

  // Create session and absences mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/sessions", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Now create absences for the session
      createAbsencesMutation.mutate({
        sessionId: data.id,
        students: studentsWithStatus,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la création de la séance: ${error.message}`,
      });
    },
  });

  const createAbsencesMutation = useMutation({
    mutationFn: async (data: { sessionId: number; students: Student[] }) => {
      const absences = data.students.map(student => ({
        sessionId: data.sessionId,
        studentId: student.id,
        status: student.status || ABSENCE_STATUSES.PRESENT,
        notes: ""
      }));
      
      const response = await apiRequest("POST", "/api/absences/batch", absences);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Les absences ont été enregistrées avec succès",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      
      // Close modal and reset form
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'enregistrement des absences: ${error.message}`,
      });
    },
  });

  const onFormSubmit = (values: z.infer<typeof formSchema>) => {
    const sessionData = {
      moduleElementId: parseInt(values.moduleElementId, 10),
      type: values.type,
      date: new Date(values.date).toISOString(),
      teacherId,
      groupId: values.groupId ? parseInt(values.groupId, 10) : undefined,
      notes: values.notes,
    };
    
    createSessionMutation.mutate(sessionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Enregistrement des absences</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="moduleElementId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un module" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {moduleElements.map((moduleElement) => (
                            <SelectItem 
                              key={moduleElement.id} 
                              value={moduleElement.id.toString()}
                            >
                              {moduleElement.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de séance</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={SESSION_TYPES.COURSE}>Cours magistral</SelectItem>
                          <SelectItem value={SESSION_TYPES.TD}>TD</SelectItem>
                          <SelectItem value={SESSION_TYPES.TP}>TP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Groupe</FormLabel>
                    <Select 
                      onValueChange={handleGroupChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un groupe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Tous les étudiants</SelectItem>
                        {studentGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name} ({group.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Student List */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Liste des étudiants</h4>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="text-primary-500 border-primary-500"
                      onClick={markAllPresent}
                    >
                      Tout marquer présent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-500 border-red-500"
                      onClick={markAllAbsent}
                    >
                      Tout marquer absent
                    </Button>
                  </div>
                </div>
                
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Nom</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Prénom</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {studentsWithStatus.map((student) => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                            {student.studentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                            {student.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                            {student.firstName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Select
                              value={student.status}
                              onValueChange={(value) => handleStatusChange(student.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ABSENCE_STATUSES.PRESENT}>Présent</SelectItem>
                                <SelectItem value={ABSENCE_STATUSES.ABSENT}>Absent</SelectItem>
                                <SelectItem value={ABSENCE_STATUSES.JUSTIFIED}>Absence Justifiée</SelectItem>
                                <SelectItem value={ABSENCE_STATUSES.UNJUSTIFIED}>Absence Non-Justifiée</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                      
                      {studentsWithStatus.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-neutral-500">
                            Aucun étudiant trouvé
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ajouter des notes sur cette séance..." 
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t border-neutral-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createSessionMutation.isPending || createAbsencesMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={form.handleSubmit(onFormSubmit)}
            disabled={createSessionMutation.isPending || createAbsencesMutation.isPending}
          >
            {createSessionMutation.isPending || createAbsencesMutation.isPending
              ? "Enregistrement..."
              : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
