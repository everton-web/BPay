import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { StatusBadge } from "./status-badge";
import type { Charge, ChargeStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChargeDetailsDialogProps {
  charge: Charge;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChargeDetailsDialog({
  charge,
  open,
  onOpenChange,
}: ChargeDetailsDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const simulatePaymentMutation = useMutation({
    mutationFn: async (chargeId: string) => {
      return await apiRequest("POST", `/api/webhook/payment`, { chargeId });
    },
    onSuccess: () => {
      // Invalidate all charges queries regardless of filters
      queryClient.invalidateQueries({
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/charges"
      });
      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/dashboard/metrics"
      });
      toast({
        title: "Pagamento confirmado!",
        description: "O pagamento foi processado com sucesso.",
      });
      onOpenChange(false);
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência.",
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value));
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
    }).format(new Date(date));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Cobrança</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Estudante</p>
              <p className="text-lg font-semibold" data-testid="text-charge-student">
                {charge.studentName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sede</p>
              <p className="text-lg font-semibold">{charge.campusName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(charge.amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vencimento</p>
              <p className="text-lg font-semibold">{formatDate(charge.dueDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={charge.status as ChargeStatus} />
              </div>
            </div>
            {charge.paidAt && (
              <div>
                <p className="text-sm text-muted-foreground">Pago em</p>
                <p className="text-lg font-semibold text-success">
                  {formatDate(charge.paidAt)}
                </p>
              </div>
            )}
          </div>

          {/* PIX Payment Options */}
          {charge.status !== "paid" && charge.status !== "cancelled" && (
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="qrcode" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="qrcode">QR Code</TabsTrigger>
                    <TabsTrigger value="copypaste">Copia e Cola</TabsTrigger>
                    <TabsTrigger value="link">Link</TabsTrigger>
                  </TabsList>

                  <TabsContent value="qrcode" className="space-y-4">
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="bg-white p-4 rounded-lg">
                        <QRCodeSVG
                          value={charge.pixCopyPaste}
                          size={200}
                          level="M"
                          data-testid="qrcode-pix"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Escaneie este QR Code com o aplicativo do seu banco
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="copypaste" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Código PIX Copia e Cola
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                          {charge.pixCopyPaste}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(charge.pixCopyPaste, "copypaste")
                          }
                          data-testid="button-copy-pix"
                        >
                          {copiedField === "copypaste" ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Copie este código e cole na área PIX do seu banco
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="link" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Link de Pagamento
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-muted rounded-md text-sm break-all">
                          {charge.pixPaymentLink}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(charge.pixPaymentLink, "link")
                          }
                          data-testid="button-copy-link"
                        >
                          {copiedField === "link" ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(charge.pixPaymentLink, "_blank")}
                        data-testid="button-open-link"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir Link de Pagamento
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Simulate Payment (for demo purposes) */}
          {charge.status === "pending" || charge.status === "overdue" ? (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Área de Testes</p>
                  <p className="text-xs text-muted-foreground">
                    Esta é uma demonstração. Clique no botão abaixo para simular
                    a confirmação de pagamento via webhook.
                  </p>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => simulatePaymentMutation.mutate(charge.id)}
                    disabled={simulatePaymentMutation.isPending}
                    data-testid="button-simulate-payment"
                  >
                    {simulatePaymentMutation.isPending
                      ? "Processando..."
                      : "Simular Pagamento (Demo)"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
