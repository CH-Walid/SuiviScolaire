import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { USER_ROLES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Edit, Trash2, Mail, User, Building } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Types from the API
interface Department {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  departmentId?: number;
}

// Schema for teacher form validation
const teacherSchema = z.object({
  username: z.string().min(3, { message: "Le nom d'utilisateur doit contenir au moins 3 caractères" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  fullName: z.string().min(3, { message: "Le nom complet doit contenir au moins 3 caractères" }),
  email: z.string().email({ message: "Adresse email invalide" }),
  departmentId: z.string().min(1, { message: "Le département est requis" }),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

export default function TeachersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);

  // Query to fetch departments
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  // Query to fetch users (teachers)
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Filter only teachers
  const teachers = users?.filter(user => user.role === USER_ROLES.TEACHER) || [];

  // Form for adding a new teacher
  const addForm = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      departmentId: "",
    },
  });

  // Form for editing a teacher
  const editForm = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema.omit({ password: true })),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      departmentId: "",
    },
  });

  // Mutation to add a new teacher
  const addTeacherMutation = useMutation({
    mutationFn: async (values: TeacherFormValues) => {
      const payload = {
        ...values,
        role: USER_ROLES.TEACHER,
        departmentId: parseInt(values.departmentId, 10),
      };
      const response = await apiRequest("POST", "/api/users", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Enseignant ajouté",
        description: "L'enseignant a été ajouté avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'ajout de l'enseignant: ${error.message}`,
      });
    },
  });

  // Mutation to update a teacher
  const updateTeacherMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: Partial<TeacherFormValues> }) => {
      const payload = {
        ...values,
        role: USER_ROLES.TEACHER,
        departmentId: values.departmentId ? parseInt(values.departmentId, 10) : undefined,
      };
      const response = await apiRequest("PUT", `/api/users/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Enseignant mis à jour",
        description: "L'enseignant a été mis à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la mise à jour de l'enseignant: ${error.message}`,
      });
    },
  });

  // Mutation to delete a teacher
  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Enseignant supprimé",
        description: "L'enseignant a été supprimé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la suppression de l'enseignant: ${error.message}`,
      });
    },
  });

  // Handler for adding a teacher
  const onAddSubmit = (values: TeacherFormValues) => {
    addTeacherMutation.mutate(values);
  };

  // Handler for editing a teacher
  const onEditSubmit = (values: Partial<TeacherFormValues>) => {
    if (selectedTeacher) {
      updateTeacherMutation.mutate({ id: selectedTeacher.id, values });
    }
  };

  // Handler for opening the edit dialog
  const handleEditClick = (teacher: User) => {
    setSelectedTeacher(teacher);
    editForm.setValue("username", teacher.username);
    editForm.setValue("fullName", teacher.fullName);
    editForm.setValue("email", teacher.email);
    editForm.setValue("departmentId", teacher.departmentId ? teacher.departmentId.toString() : "");
    setIsEditDialogOpen(true);
  };

  // Handler for opening the delete dialog
  const handleDeleteClick = (teacher: User) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  // Handler for confirming teacher deletion
  const confirmDelete = () => {
    if (selectedTeacher) {
      deleteTeacherMutation.mutate(selectedTeacher.id);
    }
  };

  // Find department name by ID
  const getDepartmentName = (departmentId: number | undefined) => {
    if (!departmentId) return "Non assigné";
    const department = departments?.find(d => d.id === departmentId);
    return department ? department.name : "Département inconnu";
  };

  // Generate initials from full name
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Enseignants</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un enseignant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un enseignant</DialogTitle>
              <DialogDescription>
                Créez un nouveau compte d'enseignant et assignez-le à un département.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: Mohammed El Amrani" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: mohammed.elamrani@example.com" type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom d'utilisateur</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: mohammed.elamrani" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="••••••••" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Département</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un département" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map((department) => (
                            <SelectItem key={department.id} value={department.id.toString()}>
                              {department.name}
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
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    disabled={addTeacherMutation.isPending}
                  >
                    {addTeacherMutation.isPending ? "Ajout en cours..." : "Ajouter"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-8 space-y-4">
          <div className="flex justify-end mb-4">
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : !teachers || teachers.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <User className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">
              Aucun enseignant trouvé
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Commencez par ajouter des enseignants pour pouvoir les affecter à des modules.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un enseignant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={[
            {
              key: "fullName",
              header: "Nom complet",
              cell: (row) => (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                    {getInitials(row.fullName)}
                  </div>
                  <span>{row.fullName}</span>
                </div>
              )
            },
            {
              key: "email",
              header: "Email",
              cell: (row) => (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{row.email}</span>
                </div>
              )
            },
            {
              key: "username",
              header: "Nom d'utilisateur",
            },
            {
              key: "departmentId",
              header: "Département",
              cell: (row) => (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{getDepartmentName(row.departmentId)}</span>
                </div>
              )
            }
          ]}
          data={teachers}
          isLoading={false}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'enseignant</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'enseignant.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d'utilisateur</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe (laisser vide pour ne pas changer)</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Département</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un département" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments?.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
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
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={updateTeacherMutation.isPending}
                >
                  {updateTeacherMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Teacher Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'enseignant "{selectedTeacher?.fullName}" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTeacherMutation.isPending}
            >
              {deleteTeacherMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
