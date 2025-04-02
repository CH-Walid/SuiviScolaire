import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit, Trash2, BookOpen, FileCode, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Types from the API
interface Course {
  id: number;
  name: string;
  code: string;
}

interface Module {
  id: number;
  name: string;
  code: string;
  description: string | null;
  courseId: number;
}

interface ModuleElement {
  id: number;
  name: string;
  code: string;
  description: string | null;
  moduleId: number;
}

interface Teacher {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

// Schemas for form validation
const moduleSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  code: z.string().min(2, { message: "Le code doit contenir au moins 2 caractères" }),
  description: z.string().optional(),
  courseId: z.string().min(1, { message: "La filière est requise" }),
});

const moduleElementSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  code: z.string().min(2, { message: "Le code doit contenir au moins 2 caractères" }),
  description: z.string().optional(),
  moduleId: z.string().min(1, { message: "Le module est requis" }),
});

const assignTeacherSchema = z.object({
  teacherId: z.string().min(1, { message: "L'enseignant est requis" }),
  moduleElementId: z.string().min(1, { message: "L'élément de module est requis" }),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;
type ModuleElementFormValues = z.infer<typeof moduleElementSchema>;
type AssignTeacherFormValues = z.infer<typeof assignTeacherSchema>;

export default function ModulesList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModuleDialogOpen, setIsAddModuleDialogOpen] = useState(false);
  const [isEditModuleDialogOpen, setIsEditModuleDialogOpen] = useState(false);
  const [isDeleteModuleDialogOpen, setIsDeleteModuleDialogOpen] = useState(false);
  const [isAddModuleElementDialogOpen, setIsAddModuleElementDialogOpen] = useState(false);
  const [isEditModuleElementDialogOpen, setIsEditModuleElementDialogOpen] = useState(false);
  const [isDeleteModuleElementDialogOpen, setIsDeleteModuleElementDialogOpen] = useState(false);
  const [isAssignTeacherDialogOpen, setIsAssignTeacherDialogOpen] = useState(false);
  
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedModuleElement, setSelectedModuleElement] = useState<ModuleElement | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Queries
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const { data: modules, isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ['/api/modules'],
  });

  const { data: moduleElements } = useQuery<ModuleElement[]>({
    queryKey: ['/api/module-elements'],
  });

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ['/api/users'],
  });

  // Forms
  const addModuleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      courseId: "",
    },
  });

  const editModuleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      courseId: "",
    },
  });

  const addModuleElementForm = useForm<ModuleElementFormValues>({
    resolver: zodResolver(moduleElementSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      moduleId: "",
    },
  });

  const editModuleElementForm = useForm<ModuleElementFormValues>({
    resolver: zodResolver(moduleElementSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      moduleId: "",
    },
  });

  const assignTeacherForm = useForm<AssignTeacherFormValues>({
    resolver: zodResolver(assignTeacherSchema),
    defaultValues: {
      teacherId: "",
      moduleElementId: "",
    },
  });

  // Mutations
  const addModuleMutation = useMutation({
    mutationFn: async (values: ModuleFormValues) => {
      const payload = {
        ...values,
        courseId: parseInt(values.courseId, 10),
      };
      const response = await apiRequest("POST", "/api/modules", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Module ajouté",
        description: "Le module a été ajouté avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      setIsAddModuleDialogOpen(false);
      addModuleForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'ajout du module: ${error.message}`,
      });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: ModuleFormValues }) => {
      const payload = {
        ...values,
        courseId: parseInt(values.courseId, 10),
      };
      const response = await apiRequest("PUT", `/api/modules/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Module mis à jour",
        description: "Le module a été mis à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      setIsEditModuleDialogOpen(false);
      editModuleForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la mise à jour du module: ${error.message}`,
      });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/modules/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Module supprimé",
        description: "Le module a été supprimé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/module-elements'] });
      setIsDeleteModuleDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la suppression du module: ${error.message}`,
      });
    },
  });

  const addModuleElementMutation = useMutation({
    mutationFn: async (values: ModuleElementFormValues) => {
      const payload = {
        ...values,
        moduleId: parseInt(values.moduleId, 10),
      };
      const response = await apiRequest("POST", "/api/module-elements", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Élément de module ajouté",
        description: "L'élément de module a été ajouté avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/module-elements'] });
      setIsAddModuleElementDialogOpen(false);
      addModuleElementForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'ajout de l'élément de module: ${error.message}`,
      });
    },
  });

  const updateModuleElementMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: ModuleElementFormValues }) => {
      const payload = {
        ...values,
        moduleId: parseInt(values.moduleId, 10),
      };
      const response = await apiRequest("PUT", `/api/module-elements/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Élément de module mis à jour",
        description: "L'élément de module a été mis à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/module-elements'] });
      setIsEditModuleElementDialogOpen(false);
      editModuleElementForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la mise à jour de l'élément de module: ${error.message}`,
      });
    },
  });

  const deleteModuleElementMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/module-elements/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Élément de module supprimé",
        description: "L'élément de module a été supprimé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/module-elements'] });
      setIsDeleteModuleElementDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la suppression de l'élément de module: ${error.message}`,
      });
    },
  });

  const assignTeacherMutation = useMutation({
    mutationFn: async (values: AssignTeacherFormValues) => {
      const payload = {
        teacherId: parseInt(values.teacherId, 10),
        moduleElementId: parseInt(values.moduleElementId, 10),
      };
      const response = await apiRequest("POST", "/api/teacher-module-elements", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Enseignant assigné",
        description: "L'enseignant a été assigné à l'élément de module avec succès",
      });
      setIsAssignTeacherDialogOpen(false);
      assignTeacherForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'assignation de l'enseignant: ${error.message}`,
      });
    },
  });

  // Handlers
  const onAddModuleSubmit = (values: ModuleFormValues) => {
    addModuleMutation.mutate(values);
  };

  const onEditModuleSubmit = (values: ModuleFormValues) => {
    if (selectedModule) {
      updateModuleMutation.mutate({ id: selectedModule.id, values });
    }
  };

  const onAddModuleElementSubmit = (values: ModuleElementFormValues) => {
    addModuleElementMutation.mutate(values);
  };

  const onEditModuleElementSubmit = (values: ModuleElementFormValues) => {
    if (selectedModuleElement) {
      updateModuleElementMutation.mutate({ id: selectedModuleElement.id, values });
    }
  };

  const onAssignTeacherSubmit = (values: AssignTeacherFormValues) => {
    assignTeacherMutation.mutate(values);
  };

  const handleEditModuleClick = (module: Module) => {
    setSelectedModule(module);
    editModuleForm.setValue("name", module.name);
    editModuleForm.setValue("code", module.code);
    editModuleForm.setValue("description", module.description || "");
    editModuleForm.setValue("courseId", module.courseId.toString());
    setIsEditModuleDialogOpen(true);
  };

  const handleDeleteModuleClick = (module: Module) => {
    setSelectedModule(module);
    setIsDeleteModuleDialogOpen(true);
  };

  const handleEditModuleElementClick = (moduleElement: ModuleElement) => {
    setSelectedModuleElement(moduleElement);
    editModuleElementForm.setValue("name", moduleElement.name);
    editModuleElementForm.setValue("code", moduleElement.code);
    editModuleElementForm.setValue("description", moduleElement.description || "");
    editModuleElementForm.setValue("moduleId", moduleElement.moduleId.toString());
    setIsEditModuleElementDialogOpen(true);
  };

  const handleDeleteModuleElementClick = (moduleElement: ModuleElement) => {
    setSelectedModuleElement(moduleElement);
    setIsDeleteModuleElementDialogOpen(true);
  };

  const handleAssignTeacherClick = (moduleElement: ModuleElement) => {
    setSelectedModuleElement(moduleElement);
    assignTeacherForm.setValue("moduleElementId", moduleElement.id.toString());
    setIsAssignTeacherDialogOpen(true);
  };

  const handleAddModuleElementClick = (moduleId: number) => {
    addModuleElementForm.setValue("moduleId", moduleId.toString());
    setIsAddModuleElementDialogOpen(true);
  };

  const confirmDeleteModule = () => {
    if (selectedModule) {
      deleteModuleMutation.mutate(selectedModule.id);
    }
  };

  const confirmDeleteModuleElement = () => {
    if (selectedModuleElement) {
      deleteModuleElementMutation.mutate(selectedModuleElement.id);
    }
  };

  // Helper functions
  const getCourseName = (courseId: number) => {
    const course = courses?.find(c => c.id === courseId);
    return course ? course.name : "Filière inconnue";
  };

  const getModuleName = (moduleId: number) => {
    const module = modules?.find(m => m.id === moduleId);
    return module ? module.name : "Module inconnu";
  };

  const filterModuleElementsByModule = (moduleId: number) => {
    return moduleElements?.filter(me => me.moduleId === moduleId) || [];
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId) 
        : [...prev, moduleId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Modules</h2>
        <Dialog open={isAddModuleDialogOpen} onOpenChange={setIsAddModuleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un module
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un module</DialogTitle>
              <DialogDescription>
                Créez un nouveau module rattaché à une filière.
              </DialogDescription>
            </DialogHeader>
            <Form {...addModuleForm}>
              <form onSubmit={addModuleForm.handleSubmit(onAddModuleSubmit)} className="space-y-4">
                <FormField
                  control={addModuleForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du module</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: Programmation orientée objet" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addModuleForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: POO" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addModuleForm.control}
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
                <FormField
                  control={addModuleForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Description du module"
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
                    onClick={() => setIsAddModuleDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    disabled={addModuleMutation.isPending}
                  >
                    {addModuleMutation.isPending ? "Ajout en cours..." : "Ajouter"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {modulesLoading ? (
        <div className="flex justify-center py-8">
          <span className="material-icons animate-spin text-4xl text-primary-500">refresh</span>
        </div>
      ) : modules && modules.length > 0 ? (
        <div className="space-y-4">
          {modules.map((module) => (
            <Card key={module.id} className="overflow-hidden">
              <CardHeader className="bg-primary-50 p-4">
                <div className="flex justify-between items-start">
                  <div onClick={() => toggleModuleExpansion(module.id.toString())} className="cursor-pointer flex-1">
                    <CardTitle className="text-primary-800 text-lg flex items-center">
                      <span>{module.name}</span>
                      <span className="material-icons ml-2 text-primary-600">
                        {expandedModules.includes(module.id.toString()) ? "expand_less" : "expand_more"}
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold bg-primary-100 text-primary-800 px-2 py-1 rounded">
                        {module.code}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {getCourseName(module.courseId)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditModuleClick(module)}
                      className="text-primary-600 border-primary-600"
                    >
                      <span className="material-icons text-sm">edit</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteModuleClick(module)}
                      className="text-red-600 border-red-600"
                    >
                      <span className="material-icons text-sm">delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedModules.includes(module.id.toString()) && (
                <>
                  <CardContent className="p-4">
                    <CardDescription className="mb-4">
                      {module.description || "Aucune description disponible"}
                    </CardDescription>
                    
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-md">Éléments de module</h3>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAddModuleElementClick(module.id)}
                        >
                          <span className="material-icons text-sm mr-1">add</span>
                          Ajouter un élément
                        </Button>
                      </div>
                      
                      {filterModuleElementsByModule(module.id).length > 0 ? (
                        <div className="space-y-3">
                          {filterModuleElementsByModule(module.id).map((element) => (
                            <div 
                              key={element.id} 
                              className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{element.name}</h4>
                                  <span className="text-xs font-semibold bg-neutral-100 text-neutral-800 px-2 py-1 rounded mt-1 inline-block">
                                    {element.code}
                                  </span>
                                  <p className="text-sm text-neutral-500 mt-2">
                                    {element.description || "Aucune description disponible"}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleAssignTeacherClick(element)}
                                    className="text-green-600 border-green-600"
                                  >
                                    <span className="material-icons text-sm mr-1">person_add</span>
                                    Enseignant
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleEditModuleElementClick(element)}
                                    className="text-primary-600 border-primary-600"
                                  >
                                    <span className="material-icons text-sm">edit</span>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDeleteModuleElementClick(element)}
                                    className="text-red-600 border-red-600"
                                  >
                                    <span className="material-icons text-sm">delete</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-neutral-500 border border-dashed border-neutral-300 rounded-lg">
                          Aucun élément de module n'a été ajouté
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <span className="material-icons text-4xl text-neutral-400 mb-4">
              view_module
            </span>
            <h3 className="text-xl font-medium text-neutral-600 mb-2">
              Aucun module trouvé
            </h3>
            <p className="text-neutral-500 text-center max-w-md mb-4">
              Commencez par ajouter un module pour pouvoir y associer des éléments de module.
            </p>
            <Button onClick={() => setIsAddModuleDialogOpen(true)}>
              <span className="material-icons mr-2">add</span>
              Ajouter un module
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Module Dialog */}
      <Dialog open={isEditModuleDialogOpen} onOpenChange={setIsEditModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le module</DialogTitle>
            <DialogDescription>
              Modifiez les informations du module.
            </DialogDescription>
          </DialogHeader>
          <Form {...editModuleForm}>
            <form onSubmit={editModuleForm.handleSubmit(onEditModuleSubmit)} className="space-y-4">
              <FormField
                control={editModuleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du module</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editModuleForm.control}
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
                control={editModuleForm.control}
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
              <FormField
                control={editModuleForm.control}
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
                  onClick={() => setIsEditModuleDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={updateModuleMutation.isPending}
                >
                  {updateModuleMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Module Dialog */}
      <Dialog open={isDeleteModuleDialogOpen} onOpenChange={setIsDeleteModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le module "{selectedModule?.name}" ?
              Cette action est irréversible et supprimera également tous les éléments de module associés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteModuleDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteModule}
              disabled={deleteModuleMutation.isPending}
            >
              {deleteModuleMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Module Element Dialog */}
      <Dialog open={isAddModuleElementDialogOpen} onOpenChange={setIsAddModuleElementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un élément de module</DialogTitle>
            <DialogDescription>
              Créez un nouvel élément pour le module {getModuleName(selectedModule?.id || 0)}.
            </DialogDescription>
          </DialogHeader>
          <Form {...addModuleElementForm}>
            <form onSubmit={addModuleElementForm.handleSubmit(onAddModuleElementSubmit)} className="space-y-4">
              <FormField
                control={addModuleElementForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'élément</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ex: Cours magistral POO" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addModuleElementForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ex: CM-POO" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addModuleElementForm.control}
                name="moduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modules?.map((module) => (
                          <SelectItem key={module.id} value={module.id.toString()}>
                            {module.name} ({module.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addModuleElementForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Description de l'élément de module"
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
                  onClick={() => setIsAddModuleElementDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={addModuleElementMutation.isPending}
                >
                  {addModuleElementMutation.isPending ? "Ajout en cours..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Module Element Dialog */}
      <Dialog open={isEditModuleElementDialogOpen} onOpenChange={setIsEditModuleElementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'élément de module</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'élément de module.
            </DialogDescription>
          </DialogHeader>
          <Form {...editModuleElementForm}>
            <form onSubmit={editModuleElementForm.handleSubmit(onEditModuleElementSubmit)} className="space-y-4">
              <FormField
                control={editModuleElementForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'élément</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editModuleElementForm.control}
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
                control={editModuleElementForm.control}
                name="moduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modules?.map((module) => (
                          <SelectItem key={module.id} value={module.id.toString()}>
                            {module.name} ({module.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editModuleElementForm.control}
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
                  onClick={() => setIsEditModuleElementDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={updateModuleElementMutation.isPending}
                >
                  {updateModuleElementMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Module Element Dialog */}
      <Dialog open={isDeleteModuleElementDialogOpen} onOpenChange={setIsDeleteModuleElementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'élément de module "{selectedModuleElement?.name}" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteModuleElementDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteModuleElement}
              disabled={deleteModuleElementMutation.isPending}
            >
              {deleteModuleElementMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={isAssignTeacherDialogOpen} onOpenChange={setIsAssignTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un enseignant</DialogTitle>
            <DialogDescription>
              Assignez un enseignant à l'élément de module {selectedModuleElement?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...assignTeacherForm}>
            <form onSubmit={assignTeacherForm.handleSubmit(onAssignTeacherSubmit)} className="space-y-4">
              <FormField
                control={assignTeacherForm.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enseignant</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un enseignant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers?.filter(t => t.role === "teacher").map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.fullName} ({teacher.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignTeacherForm.control}
                name="moduleElementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Élément de module</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Élément de module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {moduleElements?.map((element) => (
                          <SelectItem key={element.id} value={element.id.toString()}>
                            {element.name} ({element.code})
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
                  onClick={() => setIsAssignTeacherDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={assignTeacherMutation.isPending}
                >
                  {assignTeacherMutation.isPending ? "Assignation..." : "Assigner"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
