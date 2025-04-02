import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";



// Department type from the API
interface Department {
  id: number;
  name: string;
  description: string | null;
}

// Schema for department form validation
const departmentSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  description: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

export default function DepartmentsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Query to fetch departments
  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  // Form for adding a new department
  const addForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Form for editing a department
  const editForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Mutation to add a new department
  const addDepartmentMutation = useMutation({
    mutationFn: async (values: DepartmentFormValues) => {
      const response = await apiRequest("POST", "/api/departments", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Département ajouté",
        description: "Le département a été ajouté avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'ajout du département: ${error.message}`,
      });
    },
  });

  // Mutation to update a department
  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: DepartmentFormValues }) => {
      const response = await apiRequest("PUT", `/api/departments/${id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Département mis à jour",
        description: "Le département a été mis à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la mise à jour du département: ${error.message}`,
      });
    },
  });

  // Mutation to delete a department
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/departments/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Département supprimé",
        description: "Le département a été supprimé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la suppression du département: ${error.message}`,
      });
    },
  });

  // Handler for adding a department
  const onAddSubmit = (values: DepartmentFormValues) => {
    addDepartmentMutation.mutate(values);
  };

  // Handler for editing a department
  const onEditSubmit = (values: DepartmentFormValues) => {
    if (selectedDepartment) {
      updateDepartmentMutation.mutate({ id: selectedDepartment.id, values });
    }
  };

  // Handler for opening the edit dialog
  const handleEditClick = (department: Department) => {
    setSelectedDepartment(department);
    editForm.setValue("name", department.name);
    editForm.setValue("description", department.description || "");
    setIsEditDialogOpen(true);
  };

  // Handler for opening the delete dialog
  const handleDeleteClick = (department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  // Handler for confirming department deletion
  const confirmDelete = () => {
    if (selectedDepartment) {
      deleteDepartmentMutation.mutate(selectedDepartment.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Départements</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un département
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un département</DialogTitle>
              <DialogDescription>
                Créez un nouveau département dans l'établissement.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du département</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: Département d'Informatique" />
                      </FormControl>
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
                          placeholder="Description du département"
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
                    disabled={addDepartmentMutation.isPending}
                  >
                    {addDepartmentMutation.isPending ? "Ajout en cours..." : "Ajouter"}
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
      ) : !departments || departments.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <Building2 className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">
              Aucun département trouvé
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Commencez par ajouter un département à l'établissement pour organiser
              vos filières, modules et enseignants.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un département
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
              key: "description",
              header: "Description",
              cell: (row) => row.description || "Aucune description"
            }
          ]}
          data={departments}
          isLoading={false}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          addButtonLabel="Ajouter un département"
        />
      )}

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le département</DialogTitle>
            <DialogDescription>
              Modifiez les informations du département.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du département</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                  disabled={updateDepartmentMutation.isPending}
                >
                  {updateDepartmentMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Department Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le département "{selectedDepartment?.name}" ?
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
              disabled={deleteDepartmentMutation.isPending}
            >
              {deleteDepartmentMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
