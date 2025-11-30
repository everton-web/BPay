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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Eye, Search, Filter, RefreshCw, Clock } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ChargeDetailsDialog } from "@/components/charge-details-dialog";
import type { Charge, ChargeStatus } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Charges() {
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [statusFilter, setStatusFilter] = useState<ChargeStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  });
  const { toast } = useToast();

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: charges, isLoading } = useQuery<Charge[]>({
    queryKey: ["/api/charges", statusFilter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (debouncedSearch) {
        params.append("studentName", debouncedSearch);
      }
      const url = `/api/charges${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch charges");
      return response.json();
    },
  });

  const { data: generationLogs } = useQuery<any[]>({
    queryKey: ["/api/generation-logs"],
    enabled: showLogsDialog,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/charges/export");
      return await response.json();
    },
    onSuccess: (data) => {
      // Create CSV and download
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cobrancas-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Relatório exportado!",
        description: "O arquivo CSV foi baixado com sucesso.",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { targetMonth: string }) => {
      const res = await apiRequest("POST", "/api/charges/generate-recurring", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cobranças geradas com sucesso!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/charges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/generation-logs"] });
      setShowGenerateDialog(false);
    },
    onError: () => {
      toast({
        title: "Erro ao gerar cobranças",
        description: "Ocorreu um erro ao tentar gerar as cobranças.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value));
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
  };

  // Filtering is now done on the backend via query params
  const filteredCharges = charges;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cobranças</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as cobranças PIX dos estudantes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowLogsDialog(true)}
            variant="outline"
            data-testid="button-view-logs"
          >
            <Clock className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          <Button
            onClick={() => setShowGenerateDialog(true)}
            variant="default"
            data-testid="button-generate-charges"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar Cobranças
          </Button>
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            variant="outline"
            data-testid="button-export-charges"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do estudante ou sede..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-charges"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ChargeStatus | "all")}
              >
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Em Aberto</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cobranças</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCharges && filteredCharges.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudante</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCharges.map((charge) => (
                    <TableRow key={charge.id} data-testid={`row-charge-${charge.id}`}>
                      <TableCell className="font-medium">
                        {charge.studentName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {charge.campusName}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(charge.amount)}
                      </TableCell>
                      <TableCell>{formatDate(charge.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={charge.status as ChargeStatus} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCharge(charge)}
                          data-testid={`button-view-charge-${charge.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma cobrança encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Tente ajustar os filtros de busca."
                  : "As cobranças aparecerão aqui quando forem geradas."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charge Details Dialog */}
      {selectedCharge && (
        <ChargeDetailsDialog
          charge={selectedCharge}
          open={!!selectedCharge}
          onOpenChange={(open) => !open && setSelectedCharge(null)}
        />
      )}

      {/* Generate Charges Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent data-testid="dialog-generate-charges">
          <DialogHeader>
            <DialogTitle>Gerar Cobranças Recorrentes</DialogTitle>
            <DialogDescription>
              Gere cobranças mensais automaticamente para todos os estudantes ativos. O sistema verificará quais estudantes ainda não têm cobranças para o mês selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="target-month" className="text-sm font-medium">
                Mês de referência
              </label>
              <Input
                id="target-month"
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                data-testid="input-target-month"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(false)}
                data-testid="button-cancel-generate"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => generateMutation.mutate({ targetMonth })}
                disabled={generateMutation.isPending}
                data-testid="button-confirm-generate"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                {generateMutation.isPending ? "Gerando..." : "Gerar Cobranças"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generation Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-generation-logs">
          <DialogHeader>
            <DialogTitle>Histórico de Gerações</DialogTitle>
            <DialogDescription>
              Visualize o histórico de gerações de cobranças automáticas e manuais
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {generationLogs && generationLogs.length > 0 ? (
              generationLogs.map((log) => {
                const details = log.details ? JSON.parse(log.details) : {};
                return (
                  <Card key={log.id} data-testid={`log-entry-${log.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{log.chargesCreated} cobranças geradas</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              {log.triggerType === "manual" ? "Manual" : "Automático"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Mês: {log.targetMonth} • Executado por: {log.executedBy}
                          </p>
                          {details.totalActiveStudents && (
                            <p className="text-xs text-muted-foreground">
                              {details.totalActiveStudents} estudantes ativos • {details.alreadyHadCharges} já tinham cobrança
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.executedAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum histórico de geração ainda</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
