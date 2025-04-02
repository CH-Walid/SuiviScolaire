import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Department and Course types from the API
interface Department {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
  description: string | null;
  departmentId: number;
}

// Schema for course form validation
const courseSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  code: z.string().min(2, { message: "Le code doit contenir au moins 2 caractères" }),
  description: z.string().optional(),
  departmentId: z.string().min(1, { message: "Le département est requis" }),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export default function CoursesList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Query to fetch departments
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  // Query to fetch courses
  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  // Form for adding a new course
  const addForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      departmentId: "",
    },
  });

  // Form for editing a course
  const editForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      departmentId: "",
    },
  });

  // Mutation to add a new course
  const addCourseMutation = useMutation({
    mutationFn: async (values: CourseFormValues) => {
      const payload = {
        ...values,
        departmentId: parseInt(values.departmentId, 10),
      };
      const response = await apiRequest("POST", "/api/courses", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Filière ajoutée",
        description: "La filière a été ajoutée avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'ajout de la filière: ${error.message}`,
      });
    },
  });

  // Mutation to update a course
  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: CourseFormValues }) => {
      const payload = {
        ...values,
        departmentId: parseInt(values.departmentId, 10),
      };
      const response = await apiRequest("PUT", `/api/courses/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Filière mise à jour",
        description: "La filière a été mise à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la mise à jour de la filière: ${error.message}`,
      });
    },
  });

  // Mutation to delete a course
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/courses/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Filière supprimée",
        description: "La filière a été supprimée avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la suppression de la filière: ${error.message}`,
      });
    },
  });

  // Handler for adding a course
  const onAddSubmit = (values: CourseFormValues) => {
    addCourseMutation.mutate(values);
  };

  // Handler for editing a course
  const onEditSubmit = (values: CourseFormValues) => {
    if (selectedCourse) {
      updateCourseMutation.mutate({ id: selectedCourse.id, values });
    }
  };

  // Handler for opening the edit dialog
  const handleEditClick = (course: Course) => {
    setSelectedCourse(course);
    editForm.setValue("name", course.name);
    editForm.setValue("code", course.code);
    editForm.setValue("description", course.description || "");
    editForm.setValue("departmentId", course.departmentId.toString());
    setIsEditDialogOpen(true);
  };

  // Handler for opening the delete dialog
  const handleDeleteClick = (course: Course) => {
    setSelectedCourse(course);
    setIsDeleteDialogOpen(true);
  };

  // Handler for confirming course deletion
  const confirmDelete = () => {
    if (selectedCourse) {
      deleteCourseMutation.mutate(selectedCourse.id);
    }
  };

  // Find department name by ID
  const getDepartmentName = (departmentId: number) => {
    const department = departments?.find(d => d.id === departmentId);
    return department ? department.name : "Département inconnu";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Filières</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une filière
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une filière</DialogTitle>
              <DialogDescription>
                Créez une nouvelle filière rattachée à un département.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la filière</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: Génie Informatique" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: GI" />
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
                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Description de la filière"
                          rows={3}
                        />
                      </FormControl>
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
                    disabled={addCourseMutation.isPending}
                  >
                    {addCourseMutation.isPending ? "Ajout en cours..." : "Ajouter"}
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
      ) : !courses || courses.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">
              Aucune filière trouvée
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Commencez par ajouter une filière pour pouvoir y associer des modules et des étudiants.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une filière
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "Nom",
            },
            {
              key: "code",
              header: "Code",
              cell: (row) => (
                <span className="text-xs font-semibold bg-primary-100/30 text-primary-700 px-2 py-1 rounded">
                  {row.code}
                </span>
              )
            },
            {
              key: "departmentId",
              header: "Département",
              cell: (row) => getDepartmentName(row.departmentId)
            },
            {
              key: "description",
              header: "Description",
              cell: (row) => row.description || "Aucune description"
            }
          ]}
          data={courses}
          isLoading={false}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la filière</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la filière.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la filière</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      value={field.value.toString()}
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
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
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
                  disabled={updateCourseMutation.isPending}
                >
                  {updateCourseMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Course Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la filière "{selectedCourse?.name}" ?
              Cette action est irréversible et supprimera également tous les modules associés.
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
              disabled={deleteCourseMutation.isPending}
            >
              {deleteCourseMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
