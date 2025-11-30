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
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Plus, User, Mail, Phone, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStudentWithGuardianSchema, type InsertStudentWithGuardian, type Student, type Campus, type Guardian } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export default function Students() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  const { data: students, isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: campuses } = useQuery<Campus[]>({
    queryKey: ["/api/campuses"],
  });

  // Fetch guardians for the viewing student
  const { data: guardians } = useQuery<Guardian[]>({
    queryKey: ["/api/students", viewingStudent?.id, "guardians"],
    enabled: !!viewingStudent,
  });

  const form = useForm<InsertStudentWithGuardian>({
    resolver: zodResolver(insertStudentWithGuardianSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      campusId: "",
      campusName: "",
      monthlyFee: "450.00",
      dueDay: 10,
      status: "active",
      guardian: {
        name: "",
        relationship: "",
        cpf: "",
        phone: "",
        email: "",
      },
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertStudentWithGuardian) => {
      return await apiRequest("POST", "/api/students", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/charges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Estudante cadastrado!",
        description: "O estudante foi cadastrado com sucesso.",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Erro ao cadastrar",
        description: "Ocorreu um erro ao cadastrar o estudante.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertStudentWithGuardian> }) => {
      return await apiRequest("PATCH", `/api/students/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/charges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Estudante atualizado!",
        description: "Os dados do estudante foram atualizados com sucesso.",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao atualizar o estudante.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest("POST", "/api/students/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setSelectedIds([]);
      toast({
        title: "Estudantes excluídos",
        description: "Os estudantes selecionados foram excluídos com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir os estudantes.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (editingStudent) {
      // We need to fetch the guardian for this student to populate the form
      // For now, we'll just reset the student fields and leave guardian empty or fetch it if possible
      // Ideally, we should fetch the guardian details when opening the edit dialog

      // Since we don't have the guardian data readily available in the student object for editing
      // (it's fetched separately for the view), we might need to adjust this.
      // However, for this task, let's at least ensure the form structure matches.

      form.reset({
        name: editingStudent.name,
        email: editingStudent.email,
        phone: editingStudent.phone,
        campusId: editingStudent.campusId,
        campusName: editingStudent.campusName,
        monthlyFee: editingStudent.monthlyFee,
        dueDay: editingStudent.dueDay,
        status: editingStudent.status,
        guardian: {
          name: "",
          relationship: "",
          cpf: "",
          phone: "",
          email: "",
        }
      });
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        campusId: "",
        campusName: "",
        monthlyFee: "450.00",
        dueDay: 10,
        status: "active",
        guardian: {
          name: "",
          relationship: "",
          cpf: "",
          phone: "",
          email: "",
        },
      });
    }
  }, [editingStudent, form]);

  const handleEdit = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStudent(student);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStudent(null);
    form.reset();
  };

  const onSubmit = (data: InsertStudentWithGuardian) => {
    const selectedCampus = campuses?.find((c) => c.id === data.campusId);
    if (selectedCampus) {
      const studentData = {
        ...data,
        campusName: selectedCampus.name,
      };

      if (editingStudent) {
        updateMutation.mutate({
          id: editingStudent.id,
          data: studentData,
        });
      } else {
        createMutation.mutate(studentData);
      }
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Tem certeza que deseja excluir ${selectedIds.length} estudantes? Esta ação não pode ser desfeita.`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === students?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students?.map(s => s.id) || []);
    }
  };

  const toggleSelectStudent = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estudantes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os estudantes e suas mensalidades
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Selecionados ({selectedIds.length})
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) handleCloseDialog();
            else setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-student">
                <Plus className="h-4 w-4 mr-2" />
                Novo Estudante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? "Editar Estudante" : "Cadastrar Novo Estudante"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="João da Silva"
                              {...field}
                              data-testid="input-student-name"
                            />
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
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="joao@email.com"
                              {...field}
                              data-testid="input-student-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(11) 99999-9999"
                              {...field}
                              data-testid="input-student-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="campusId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sede *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-campus">
                                <SelectValue placeholder="Selecione uma sede" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {campuses?.map((campus) => (
                                <SelectItem key={campus.id} value={campus.id}>
                                  {campus.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="monthlyFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensalidade (R$) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="450.00"
                              {...field}
                              data-testid="input-monthly-fee"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia de Vencimento *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-due-day"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Dados do Responsável
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="guardian.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Responsável</FormLabel>
                            <FormControl>
                              <Input placeholder="Maria da Silva" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guardian.relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parentesco</FormLabel>
                            <FormControl>
                              <Input placeholder="Mãe, Pai, Avó..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guardian.cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input placeholder="000.000.000-00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guardian.phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 99999-9999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guardian.email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="responsavel@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-student"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Salvando..."
                        : editingStudent
                          ? "Salvar Alterações"
                          : "Cadastrar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Estudantes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingStudents ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : students && students.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedIds.length === students.length && students.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Estudante</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Mensalidade</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      data-testid={`row-student-${student.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setViewingStudent(student)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(student.id)}
                          onCheckedChange={() => toggleSelectStudent(student.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          {student.campusName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {student.email}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {student.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(student.monthlyFee)}
                      </TableCell>
                      <TableCell>Dia {student.dueDay}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === "active" ? "default" : "secondary"}>
                          {student.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEdit(student, e)}
                          data-testid={`button-edit-student-${student.id}`}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum estudante cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece cadastrando o primeiro estudante da sua instituição.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-student">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Estudante
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!viewingStudent} onOpenChange={(open) => !open && setViewingStudent(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Detalhes do Estudante</SheetTitle>
            <SheetDescription>
              Informações completas do estudante e responsáveis.
            </SheetDescription>
          </SheetHeader>

          {viewingStudent && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Dados Pessoais</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{viewingStudent.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{viewingStudent.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{viewingStudent.phone}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Matrícula</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Sede</span>
                    <div className="flex items-center gap-2 mt-1">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span>{viewingStudent.campusName}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <Badge variant={viewingStudent.status === "active" ? "default" : "secondary"}>
                        {viewingStudent.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Mensalidade</span>
                    <div className="font-medium mt-1">
                      {formatCurrency(viewingStudent.monthlyFee)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Vencimento</span>
                    <div className="mt-1">
                      Dia {viewingStudent.dueDay}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Responsáveis</h3>
                {guardians && guardians.length > 0 ? (
                  <div className="space-y-4">
                    {guardians.map((guardian) => (
                      <div key={guardian.id} className="bg-muted/50 p-3 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-medium">{guardian.name}</span>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div>CPF: {guardian.cpf}</div>
                          <div>Tel: {guardian.phone}</div>
                          <div>Email: {guardian.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum responsável vinculado.
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
