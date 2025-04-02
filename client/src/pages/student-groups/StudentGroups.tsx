import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { STUDENT_GROUP_TYPES } from "@/lib/constants";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Types
interface Course {
  id: number;
  name: string;
  code: string;
}

interface Student {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  courseId: number;
}

interface StudentGroup {
  id: number;
  name: string;
  type: string;
  courseId: number;
}

interface StudentGroupAssignment {
  id: number;
  studentId: number;
  groupId: number;
}

interface Department {
  id: number;
  name: string;
}

// Schema for student group form validation
const studentGroupSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  type: z.string().min(1, { message: "Le type est requis" }),
  courseId: z.string().min(1, { message: "La filière est requise" }),
});

// Schema for student assignment form validation
const studentAssignmentSchema = z.object({
  students: z.array(z.number()),
});

type StudentGroupFormValues = z.infer<typeof studentGroupSchema>;
type StudentAssignmentFormValues = z.infer<typeof studentAssignmentSchema>;

export default function StudentGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("TD");
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);
  const [isAssignStudentsDialogOpen, setIsAssignStudentsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Query to fetch departments (for filtering)
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  // Query to fetch courses
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  // Query to fetch student groups
  const { data: studentGroups, isLoading: groupsLoading } = useQuery<StudentGroup[]>({
    queryKey: ['/api/student-groups'],
  });

  // Query to fetch students (for assignment to groups)
  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  // Filter student groups based on selected tab (TD or TP) and selected course
  const filteredGroups = studentGroups?.filter(
    group => 
      group.type === selectedTab && 
      (selectedCourseId && selectedCourseId !== "all" 
        ? group.courseId.toString() === selectedCourseId 
        : true)
  ) || [];

  // Form for adding/editing a student group
  const groupForm = useForm<StudentGroupFormValues>({
    resolver: zodResolver(studentGroupSchema),
    defaultValues: {
      name: "",
      type: selectedTab,
      courseId: "",
    },
  });

  // Form for assigning students to a group
  const assignmentForm = useForm<StudentAssignmentFormValues>({
    resolver: zodResolver(studentAssignmentSchema),
    defaultValues: {
      students: [],
    },
  });

  // Mutation to add a new student group
  const addGroupMutation = useMutation({
    mutationFn: async (values: StudentGroupFormValues) => {
      const payload = {
        ...values,
        courseId: parseInt(values.courseId, 10),
      };
      const response = await apiRequest("POST", "/api/student-groups", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Groupe créé",
        description: "Le groupe d'étudiants a été créé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      setIsAddGroupDialogOpen(false);
      groupForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la création du groupe: ${error.message}`,
      });
    },
  });

  // Mutation to update a student group
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: StudentGroupFormValues }) => {
      const payload = {
        ...values,
        courseId: parseInt(values.courseId, 10),
      };
      const response = await apiRequest("PUT", `/api/student-groups/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Groupe mis à jour",
        description: "Le groupe d'étudiants a été mis à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      setIsEditGroupDialogOpen(false);
      groupForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la mise à jour du groupe: ${error.message}`,
      });
    },
  });

  // Mutation to delete a student group
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/student-groups/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Groupe supprimé",
        description: "Le groupe d'étudiants a été supprimé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      setIsDeleteGroupDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la suppression du groupe: ${error.message}`,
      });
    },
  });

  // Mutation to assign students to a group
  const assignStudentsMutation = useMutation({
    mutationFn: async ({ groupId, studentIds }: { groupId: number, studentIds: number[] }) => {
      // Create assignments one by one (in a real app, this would be handled in a batch operation on the server)
      const promises = studentIds.map(studentId => 
        apiRequest("POST", "/api/student-group-assignments", { 
          studentId, 
          groupId 
        })
      );
      
      await Promise.all(promises);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Étudiants assignés",
        description: "Les étudiants ont été assignés au groupe avec succès",
      });
      setIsAssignStudentsDialogOpen(false);
      assignmentForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'assignation des étudiants: ${error.message}`,
      });
    },
  });

  // Handlers
  const onAddGroupSubmit = (values: StudentGroupFormValues) => {
    addGroupMutation.mutate(values);
  };

  const onEditGroupSubmit = (values: StudentGroupFormValues) => {
    if (selectedGroup) {
      updateGroupMutation.mutate({ id: selectedGroup.id, values });
    }
  };

  const onAssignStudentsSubmit = (values: StudentAssignmentFormValues) => {
    if (selectedGroup && values.students.length > 0) {
      assignStudentsMutation.mutate({ 
        groupId: selectedGroup.id, 
        studentIds: values.students 
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner au moins un étudiant",
      });
    }
  };

  const handleEditGroupClick = (group: StudentGroup) => {
    setSelectedGroup(group);
    groupForm.setValue("name", group.name);
    groupForm.setValue("type", group.type);
    groupForm.setValue("courseId", group.courseId.toString());
    setIsEditGroupDialogOpen(true);
  };

  const handleDeleteGroupClick = (group: StudentGroup) => {
    setSelectedGroup(group);
    setIsDeleteGroupDialogOpen(true);
  };

  const handleAssignStudentsClick = (group: StudentGroup) => {
    setSelectedGroup(group);
    // Reset form values
    assignmentForm.setValue("students", []);
    setIsAssignStudentsDialogOpen(true);
  };

  const confirmDeleteGroup = () => {
    if (selectedGroup) {
      deleteGroupMutation.mutate(selectedGroup.id);
    }
  };

  // Helper functions
  const getCourseName = (courseId: number) => {
    const course = courses?.find(c => c.id === courseId);
    return course ? course.name : "Filière inconnue";
  };

  const getCourseStudents = (courseId: number) => {
    return students?.filter(student => student.courseId === courseId) || [];
  };

  const getStudentListForGroup = () => {
    if (!selectedGroup) return [];
    return getCourseStudents(selectedGroup.courseId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Groupes d'étudiants</h2>
        <Dialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <span className="material-icons mr-2">add</span>
              Créer un groupe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un groupe d'étudiants</DialogTitle>
              <DialogDescription>
                Créez un nouveau groupe de TD ou TP pour une filière.
              </DialogDescription>
            </DialogHeader>
            <Form {...groupForm}>
              <form onSubmit={groupForm.handleSubmit(onAddGroupSubmit)} className="space-y-4">
                <FormField
                  control={groupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du groupe</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: Groupe 1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={groupForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de groupe</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || selectedTab}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={STUDENT_GROUP_TYPES.TD}>Groupe TD</SelectItem>
                          <SelectItem value={STUDENT_GROUP_TYPES.TP}>Groupe TP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={groupForm.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filière</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une filière" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses?.map((course) => (
                            <SelectItem key={course.id} value={course.id.toString()}>
                              {course.name} ({course.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddGroupDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    disabled={addGroupMutation.isPending}
                  >
                    {addGroupMutation.isPending ? "Création en cours..." : "Créer"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        {/* Filter by course */}
        <div className="w-full md:w-64">
          <Select 
            value={selectedCourseId} 
            onValueChange={setSelectedCourseId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par filière" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les filières</SelectItem>
              {courses?.map((course) => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  {course.name} ({course.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="TD" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full md:w-80 grid-cols-2">
          <TabsTrigger value="TD">Groupes TD</TabsTrigger>
          <TabsTrigger value="TP">Groupes TP</TabsTrigger>
        </TabsList>
        
        <TabsContent value="TD" className="mt-4">
          {groupsLoading ? (
            <div className="flex justify-center py-8">
              <span className="material-icons animate-spin text-4xl text-primary-500">refresh</span>
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="overflow-hidden">
                  <CardHeader className="bg-primary-50 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-primary-800">{group.name}</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          <span className="text-xs font-semibold bg-primary-100 text-primary-800 px-2 py-1 rounded">
                            {group.type}
                          </span>
                          <span className="ml-2">{getCourseName(group.courseId)}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-neutral-500 mb-4">
                      Gérez les étudiants dans ce groupe.
                    </p>
                  </CardContent>
                  <CardFooter className="border-t p-4 bg-neutral-50 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignStudentsClick(group)}
                      className="text-green-600 border-green-600"
                    >
                      <span className="material-icons text-sm mr-1">person_add</span>
                      Étudiants
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditGroupClick(group)}
                      className="text-primary-600 border-primary-600"
                    >
                      <span className="material-icons text-sm mr-1">edit</span>
                      Modifier
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteGroupClick(group)}
                      className="text-red-600 border-red-600"
                    >
                      <span className="material-icons text-sm mr-1">delete</span>
                      Supprimer
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <span className="material-icons text-4xl text-neutral-400 mb-4">
                  groups
                </span>
                <h3 className="text-xl font-medium text-neutral-600 mb-2">
                  Aucun groupe TD trouvé
                </h3>
                <p className="text-neutral-500 text-center max-w-md mb-4">
                  {selectedCourseId
                    ? "Aucun groupe TD n'est disponible pour cette filière."
                    : "Commencez par créer des groupes TD pour organiser vos étudiants."}
                </p>
                <Button onClick={() => setIsAddGroupDialogOpen(true)}>
                  <span className="material-icons mr-2">add</span>
                  Créer un groupe TD
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="TP" className="mt-4">
          {groupsLoading ? (
            <div className="flex justify-center py-8">
              <span className="material-icons animate-spin text-4xl text-primary-500">refresh</span>
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="overflow-hidden">
                  <CardHeader className="bg-blue-50 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-blue-800">{group.name}</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {group.type}
                          </span>
                          <span className="ml-2">{getCourseName(group.courseId)}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-neutral-500 mb-4">
                      Gérez les étudiants dans ce groupe.
                    </p>
                  </CardContent>
                  <CardFooter className="border-t p-4 bg-neutral-50 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignStudentsClick(group)}
                      className="text-green-600 border-green-600"
                    >
                      <span className="material-icons text-sm mr-1">person_add</span>
                      Étudiants
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditGroupClick(group)}
                      className="text-blue-600 border-blue-600"
                    >
                      <span className="material-icons text-sm mr-1">edit</span>
                      Modifier
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteGroupClick(group)}
                      className="text-red-600 border-red-600"
                    >
                      <span className="material-icons text-sm mr-1">delete</span>
                      Supprimer
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <span className="material-icons text-4xl text-neutral-400 mb-4">
                  science
                </span>
                <h3 className="text-xl font-medium text-neutral-600 mb-2">
                  Aucun groupe TP trouvé
                </h3>
                <p className="text-neutral-500 text-center max-w-md mb-4">
                  {selectedCourseId
                    ? "Aucun groupe TP n'est disponible pour cette filière."
                    : "Commencez par créer des groupes TP pour organiser vos étudiants."}
                </p>
                <Button onClick={() => setIsAddGroupDialogOpen(true)}>
                  <span className="material-icons mr-2">add</span>
                  Créer un groupe TP
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le groupe</DialogTitle>
            <DialogDescription>
              Modifiez les informations du groupe d'étudiants.
            </DialogDescription>
          </DialogHeader>
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(onEditGroupSubmit)} className="space-y-4">
              <FormField
                control={groupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du groupe</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={groupForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de groupe</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={STUDENT_GROUP_TYPES.TD}>Groupe TD</SelectItem>
                        <SelectItem value={STUDENT_GROUP_TYPES.TP}>Groupe TP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={groupForm.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filière</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une filière" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses?.map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.name} ({course.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditGroupDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={updateGroupMutation.isPending}
                >
                  {updateGroupMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={isDeleteGroupDialogOpen} onOpenChange={setIsDeleteGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le groupe "{selectedGroup?.name}" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteGroupDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteGroup}
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Students Dialog */}
      <Dialog open={isAssignStudentsDialogOpen} onOpenChange={setIsAssignStudentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Assigner des étudiants au groupe</DialogTitle>
            <DialogDescription>
              Sélectionnez les étudiants à assigner au groupe "{selectedGroup?.name}".
            </DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onAssignStudentsSubmit)} className="space-y-4">
              <div className="overflow-y-auto max-h-96">
                <FormField
                  control={assignmentForm.control}
                  name="students"
                  render={() => (
                    <FormItem>
                      <div className="space-y-2">
                        {getStudentListForGroup().length > 0 ? (
                          getStudentListForGroup().map(student => (
                            <FormField
                              key={student.id}
                              control={assignmentForm.control}
                              name="students"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={student.id}
                                    className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(student.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          return checked
                                            ? field.onChange([...currentValue, student.id])
                                            : field.onChange(
                                                currentValue.filter(
                                                  (value) => value !== student.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="flex items-center space-x-2">
                                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                      </div>
                                      <div className="space-y-0.5">
                                        <div className="text-sm font-medium">
                                          {student.lastName} {student.firstName}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                          {student.studentId}
                                        </div>
                                      </div>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))
                        ) : (
                          <div className="text-center py-4 text-neutral-500">
                            Aucun étudiant disponible dans cette filière
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAssignStudentsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={assignStudentsMutation.isPending || getStudentListForGroup().length === 0}
                >
                  {assignStudentsMutation.isPending ? "Assignation..." : "Assigner"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
