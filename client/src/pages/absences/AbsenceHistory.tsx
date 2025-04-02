import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ABSENCE_STATUSES, getStatusOption } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Check, X, AlertTriangle, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Types
interface Session {
  id: number;
  date: string;
  type: string;
  moduleElementId: number;
  teacherId: number;
  groupId: number | null;
  notes: string | null;
}

interface Absence {
  id: number;
  sessionId: number;
  studentId: number;
  status: string;
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

interface ModuleElement {
  id: number;
  name: string;
  code: string;
  moduleId: number;
}

// Colors for chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AbsenceHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedModuleElement, setSelectedModuleElement] = useState<string>("");
  
  // State for absence modification
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [absenceNote, setAbsenceNote] = useState("");
  const [absenceStatus, setAbsenceStatus] = useState("");

  // Mutation for updating absences
  const updateAbsenceMutation = useMutation({
    mutationFn: (updatedAbsence: Partial<Absence> & { id: number }) => 
      apiRequest(`/api/absences/${updatedAbsence.id}`, 'PATCH', updatedAbsence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/absences'] });
      setIsEditDialogOpen(false);
      setSelectedAbsence(null);
      toast({
        title: "Absence mise à jour",
        description: "Le statut de l'absence a été mis à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour l'absence: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting absences
  const deleteAbsenceMutation = useMutation({
    mutationFn: (absenceId: number) => 
      apiRequest(`/api/absences/${absenceId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/absences'] });
      setIsDeleteDialogOpen(false);
      setSelectedAbsence(null);
      toast({
        title: "Absence supprimée",
        description: "L'absence a été supprimée avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Impossible de supprimer l'absence: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Function to open the edit dialog
  const handleEditAbsence = (absence: Absence) => {
    setSelectedAbsence(absence);
    setAbsenceStatus(absence.status);
    setAbsenceNote(absence.notes || "");
    setIsEditDialogOpen(true);
  };

  // Function to open the delete confirmation dialog
  const handleDeleteAbsence = (absence: Absence) => {
    setSelectedAbsence(absence);
    setIsDeleteDialogOpen(true);
  };

  // Queries for fetching data
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['/api/sessions', { teacherId: user?.id }],
    enabled: !!user,
  });

  const { data: absences, isLoading: absencesLoading } = useQuery<Absence[]>({
    queryKey: ['/api/absences'],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  const { data: moduleElements } = useQuery<ModuleElement[]>({
    queryKey: ['/api/module-elements'],
  });

  // Get module element name
  const getModuleElementName = (id: number) => {
    const element = moduleElements?.find(me => me.id === id);
    return element ? element.name : "Module inconnu";
  };

  // Get student name
  const getStudentName = (id: number) => {
    const student = students?.find(s => s.id === id);
    return student ? `${student.lastName} ${student.firstName}` : "Étudiant inconnu";
  };

  // Filter sessions based on date and module element
  const filteredSessions = sessions?.filter(session => {
    if (selectedDate && format(new Date(session.date), "yyyy-MM-dd") !== format(selectedDate, "yyyy-MM-dd")) {
      return false;
    }
    if (selectedModuleElement && selectedModuleElement !== "all" && 
        session.moduleElementId.toString() !== selectedModuleElement) {
      return false;
    }
    return true;
  }) || [];

  // Map for grouping absences by session
  const absencesBySession = new Map<number, Absence[]>();
  absences?.forEach(absence => {
    if (!absencesBySession.has(absence.sessionId)) {
      absencesBySession.set(absence.sessionId, []);
    }
    absencesBySession.get(absence.sessionId)?.push(absence);
  });

  // Get absences for a specific session
  const getSessionAbsences = (sessionId: number) => {
    return absencesBySession.get(sessionId) || [];
  };

  // Prepare data for absence status chart
  const absenceStatusData = absences ? Object.values(ABSENCE_STATUSES).map(status => {
    const count = absences.filter(absence => absence.status === status).length;
    return { 
      name: status === ABSENCE_STATUSES.PRESENT ? "Présent" : 
            status === ABSENCE_STATUSES.ABSENT ? "Absent" : 
            status === ABSENCE_STATUSES.JUSTIFIED ? "Absence Justifiée" : "Absence Non-Justifiée", 
      value: count 
    };
  }) : [];

  // Prepare data for absences by module chart
  const absencesByModuleData = moduleElements ? moduleElements.map(moduleElement => {
    const sessionIds = sessions?.filter(s => s.moduleElementId === moduleElement.id).map(s => s.id) || [];
    const absenceCount = absences?.filter(a => 
      sessionIds.includes(a.sessionId) && a.status === ABSENCE_STATUSES.ABSENT
    ).length || 0;
    
    return {
      name: moduleElement.code,
      absences: absenceCount
    };
  }) : [];

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Historique des absences</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="w-full md:w-64">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: fr }) : "Filtrer par date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full md:w-64">
            <Select 
              value={selectedModuleElement} 
              onValueChange={setSelectedModuleElement}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modules</SelectItem>
                {moduleElements?.map((element) => (
                  <SelectItem key={element.id} value={element.id.toString()}>
                    {element.name} ({element.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDate && (
            <Button 
              variant="ghost" 
              className="md:ml-2" 
              onClick={() => setSelectedDate(undefined)}
            >
              <X className="mr-1 h-4 w-4" />
              Effacer les filtres
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Absence Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des statuts</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={absenceStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {absenceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Module Absences Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Absences par module</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={absencesByModuleData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="absences" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions et absences</CardTitle>
            <CardDescription>
              Historique des séances et des absences enregistrées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsLoading || absencesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredSessions.length > 0 ? (
              <div className="space-y-6">
                {filteredSessions.map(session => (
                  <div key={session.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-primary-50 p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {getModuleElementName(session.moduleElementId)}
                          </h3>
                          <div className="flex items-center text-sm text-neutral-500 mt-1">
                            <Calendar className="mr-1 h-4 w-4" />
                            {format(new Date(session.date), "d MMMM yyyy", { locale: fr })}
                            <span className="mx-2">|</span>
                            {session.type === "course" ? "Cours" : session.type === "TD" ? "TD" : "TP"}
                          </div>
                        </div>
                        <div className="mt-3 sm:mt-0">
                          <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-800 text-sm font-medium">
                            {getSessionAbsences(session.id).filter(a => a.status === ABSENCE_STATUSES.ABSENT).length} absence(s)
                          </span>
                        </div>
                      </div>
                      {session.notes && (
                        <div className="mt-3 text-sm bg-white p-3 rounded-md border">
                          <p className="font-medium mb-1">Notes:</p>
                          <p>{session.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Étudiant
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Statut
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Notes
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-200">
                          {getSessionAbsences(session.id).map(absence => {
                            const statusOption = getStatusOption(absence.status);
                            return (
                              <tr key={absence.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-neutral-900">
                                    {getStudentName(absence.studentId)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusOption.colorClass}`}>
                                    {statusOption.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                                  {absence.notes || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Ouvrir le menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        onClick={() => handleEditAbsence(absence)}
                                        className="cursor-pointer"
                                      >
                                        Modifier le statut
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteAbsence(absence)}
                                        className="cursor-pointer text-red-600"
                                      >
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            );
                          })}
                          {getSessionAbsences(session.id).length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-4 text-center text-sm text-neutral-500">
                                Aucune donnée d'absence disponible pour cette séance
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <span className="flex justify-center text-4xl mb-4">
                  <Calendar className="h-12 w-12" />
                </span>
                <h3 className="text-lg font-medium mb-2">Aucune séance trouvée</h3>
                <p className="max-w-md mx-auto">
                  {selectedDate || selectedModuleElement 
                    ? "Aucune séance ne correspond aux filtres sélectionnés."
                    : "Vous n'avez pas encore enregistré de séances."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Absence Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le statut de l'absence</DialogTitle>
            <DialogDescription>
              Vous pouvez justifier ou modifier le statut de l'absence.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedAbsence && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Étudiant</h3>
                  <p>{getStudentName(selectedAbsence.studentId)}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Statut</h3>
                  <Select 
                    value={absenceStatus} 
                    onValueChange={setAbsenceStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ABSENCE_STATUSES.PRESENT}>Présent</SelectItem>
                      <SelectItem value={ABSENCE_STATUSES.ABSENT}>Absent</SelectItem>
                      <SelectItem value={ABSENCE_STATUSES.JUSTIFIED}>Absence Justifiée</SelectItem>
                      <SelectItem value={ABSENCE_STATUSES.UNJUSTIFIED}>Absence Non-Justifiée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Notes</h3>
                  <Textarea 
                    placeholder="Notes concernant cette absence..." 
                    value={absenceNote} 
                    onChange={(e) => setAbsenceNote(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={() => {
                if (selectedAbsence) {
                  updateAbsenceMutation.mutate({
                    id: selectedAbsence.id,
                    status: absenceStatus,
                    notes: absenceNote
                  });
                }
              }}
              disabled={updateAbsenceMutation.isPending}
            >
              {updateAbsenceMutation.isPending && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
              )}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Absence Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette absence ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedAbsence && (
              <div className="flex items-center p-4 border rounded-md bg-red-50 border-red-200 text-red-700">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                <p>L'absence de <strong>{getStudentName(selectedAbsence.studentId)}</strong> sera définitivement supprimée.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedAbsence) {
                  deleteAbsenceMutation.mutate(selectedAbsence.id);
                }
              }}
              disabled={deleteAbsenceMutation.isPending}
            >
              {deleteAbsenceMutation.isPending && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}