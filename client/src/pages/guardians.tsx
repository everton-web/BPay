import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserCheck, Mail, Phone, FileText, Users, Trash2, Link as LinkIcon, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertGuardianSchema,
  insertStudentGuardianSchema,
  type InsertGuardian,
  type Guardian,
  type Student,
  type InsertStudentGuardian,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Guardians() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const { toast } = useToast();

  const { data: guardians, isLoading: isLoadingGuardians } = useQuery<Guardian[]>({
    queryKey: ["/api/guardians"],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: linkedStudents } = useQuery<Array<Student & { relationship: string; relationshipId: string }>>({
    queryKey: ["/api/guardians", selectedGuardianId, "students"],
    enabled: !!selectedGuardianId && isLinkDialogOpen,
    queryFn: async () => {
      if (!selectedGuardianId) return [];
      const response = await fetch(`/api/guardians/${selectedGuardianId}/students`);
      if (!response.ok) throw new Error("Failed to fetch linked students");
      return response.json();
    },
  });

  const form = useForm<InsertGuardian>({
    resolver: zodResolver(insertGuardianSchema),
    defaultValues: {
      name: "",
      cpf: "",
      email: "",
      phone: "",
    },
  });

  const linkForm = useForm<InsertStudentGuardian>({
    resolver: zodResolver(insertStudentGuardianSchema),
    defaultValues: {
      studentId: "",
      guardianId: "",
      relationship: "",
    },
  });

  useEffect(() => {
    if (selectedGuardianId) {
      linkForm.setValue("guardianId", selectedGuardianId);
    }
  }, [selectedGuardianId, linkForm]);

  useEffect(() => {
    if (editingGuardian) {
      form.setValue("name", editingGuardian.name);
      form.setValue("cpf", editingGuardian.cpf);
      form.setValue("email", editingGuardian.email);
      form.setValue("phone", editingGuardian.phone);
    } else {
      form.reset();
    }
  }, [editingGuardian, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertGuardian) => {
      return await apiRequest("POST", "/api/guardians", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "/api/guardians"
      });
      toast({
        title: "Responsável cadastrado!",
        description: "O responsável foi cadastrado com sucesso.",
      });
      setIsCreateDialogOpen(false);
      setEditingGuardian(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar",
        description: error?.message || "Ocorreu um erro ao cadastrar o responsável.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertGuardian) => {
      if (!editingGuardian) throw new Error("No guardian selected for update");
      return await apiRequest("PATCH", `/api/guardians/${editingGuardian.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "/api/guardians"
      });
      toast({
        title: "Responsável atualizado!",
        description: "O responsável foi atualizado com sucesso.",
      });
      setIsCreateDialogOpen(false);
      setEditingGuardian(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error?.message || "Ocorreu um erro ao atualizar o responsável.",
        variant: "destructive",
      });
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (data: InsertStudentGuardian) => {
      return await apiRequest("POST", "/api/student-guardians", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          (query.queryKey[0] === "/api/guardians" || query.queryKey[0] === "/api/students")
      });
      toast({
        title: "Vínculo criado!",
        description: "O estudante foi vinculado ao responsável.",
      });
      linkForm.reset();
      setIsLinkDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao vincular",
        description: error?.message || "Este vínculo já existe.",
        variant: "destructive",
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (relationshipId: string) => {
      return await apiRequest("DELETE", `/api/student-guardians/${relationshipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          (query.queryKey[0] === "/api/guardians" || query.queryKey[0] === "/api/students")
      });
      toast({
        title: "Vínculo removido!",
        description: "O vínculo foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao desvincular",
        description: "Ocorreu um erro ao remover o vínculo.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/guardians/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "/api/guardians"
      });
      toast({
        title: "Responsável excluído!",
        description: "O responsável foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o responsável.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertGuardian) => {
    if (editingGuardian) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (guardian: Guardian) => {
    setEditingGuardian(guardian);
    setIsCreateDialogOpen(true);
  };

  const onLinkSubmit = (data: InsertStudentGuardian) => {
    linkMutation.mutate({
      ...data,
      guardianId: selectedGuardianId!,
    });
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Responsáveis</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os responsáveis pelos estudantes
          </p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingGuardian(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-guardian">
              <Plus className="h-4 w-4 mr-2" />
              Novo Responsável
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGuardian ? "Editar Responsável" : "Cadastrar Responsável"}
              </DialogTitle>
              <DialogDescription>
                {editingGuardian
                  ? "Atualize os dados do responsável pelo estudante"
                  : "Preencha os dados do responsável pelo estudante"
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Digite o nome completo"
                            className="pl-9"
                            data-testid="input-guardian-name"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="000.000.000-00"
                            className="pl-9"
                            data-testid="input-guardian-cpf"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            className="pl-9"
                            data-testid="input-guardian-email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="(00) 00000-0000"
                            className="pl-9"
                            data-testid="input-guardian-phone"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-guardian"
                  >
                    {editingGuardian
                      ? (updateMutation.isPending ? "Salvando..." : "Salvar Alterações")
                      : (createMutation.isPending ? "Cadastrando..." : "Cadastrar")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Responsáveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingGuardians ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : guardians && guardians.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                    <TableHead className="text-right">Estudantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guardians.map((guardian) => (
                    <TableRow key={guardian.id} data-testid={`row-guardian-${guardian.id}`}>
                      <TableCell className="font-medium" data-testid={`text-guardian-name-${guardian.id}`}>
                        {guardian.name}
                      </TableCell>
                      <TableCell data-testid={`text-guardian-cpf-${guardian.id}`}>
                        {formatCPF(guardian.cpf)}
                      </TableCell>
                      <TableCell data-testid={`text-guardian-email-${guardian.id}`}>
                        {guardian.email}
                      </TableCell>
                      <TableCell data-testid={`text-guardian-phone-${guardian.id}`}>
                        {formatPhone(guardian.phone)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(guardian)}
                            data-testid={`button-edit-guardian-${guardian.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja excluir este responsável?")) {
                                deleteMutation.mutate(guardian.id);
                              }
                            }}
                            data-testid={`button-delete-guardian-${guardian.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedGuardianId(guardian.id);
                            setIsLinkDialogOpen(true);
                          }}
                          data-testid={`button-link-students-${guardian.id}`}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Estudantes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum responsável cadastrado</p>
              <p className="text-sm mt-1">
                Clique em "Novo Responsável" para começar
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Students Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Estudantes Vinculados</DialogTitle>
            <DialogDescription>
              Adicione ou remova estudantes vinculados a este responsável
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Form to add new student */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vincular Novo Estudante</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...linkForm}>
                  <form onSubmit={linkForm.handleSubmit(onLinkSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={linkForm.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estudante</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-student">
                                  <SelectValue placeholder="Selecione o estudante" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {students?.map((student) => (
                                  <SelectItem key={student.id} value={student.id}>
                                    {student.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={linkForm.control}
                        name="relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grau de Parentesco</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-relationship">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pai">Pai</SelectItem>
                                <SelectItem value="mãe">Mãe</SelectItem>
                                <SelectItem value="responsável legal">Responsável Legal</SelectItem>
                                <SelectItem value="avô">Avô</SelectItem>
                                <SelectItem value="avó">Avó</SelectItem>
                                <SelectItem value="tio">Tio</SelectItem>
                                <SelectItem value="tia">Tia</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={linkMutation.isPending}
                      data-testid="button-submit-link"
                    >
                      {linkMutation.isPending ? "Vinculando..." : "Vincular Estudante"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* List of linked students */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estudantes Vinculados</CardTitle>
              </CardHeader>
              <CardContent>
                {linkedStudents && linkedStudents.length > 0 ? (
                  <div className="space-y-2">
                    {linkedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                        data-testid={`linked-student-${student.id}`}
                      >
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.campusName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{student.relationship}</Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Desvincular ${student.name}?`)) {
                                unlinkMutation.mutate(student.relationshipId);
                              }
                            }}
                            data-testid={`button-unlink-${student.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum estudante vinculado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
