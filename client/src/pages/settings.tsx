import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Key, User, Shield } from "lucide-react";

export default function Settings() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("payment");

    // Fetch current settings
    const { data: settings, isLoading } = useQuery<Record<string, string>>({
        queryKey: ["/api/settings"],
    });

    // Mutation to save settings
    const saveMutation = useMutation({
        mutationFn: async (data: { key: string; value: string }[]) => {
            return await apiRequest("POST", "/api/settings", { settings: data });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
            toast({
                title: "Configurações salvas",
                description: "As alterações foram aplicadas com sucesso.",
            });
        },
        onError: () => {
            toast({
                title: "Erro ao salvar",
                description: "Ocorreu um erro ao salvar as configurações.",
                variant: "destructive",
            });
        },
    });

    const handleSavePayment = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const updates = [
            { key: "payment_gateway_key", value: formData.get("payment_gateway_key") as string },
            { key: "payment_gateway_secret", value: formData.get("payment_gateway_secret") as string },
            { key: "webhook_url", value: formData.get("webhook_url") as string },
        ];
        saveMutation.mutate(updates);
    };

    const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // For now, this is a mock since we don't have real auth yet
        toast({
            title: "Perfil atualizado",
            description: "Dados de acesso atualizados (Simulação).",
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Configurações</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie as integrações e preferências do sistema
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="payment" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Pagamentos
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Perfil & Acesso
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="payment">
                    <Card>
                        <CardHeader>
                            <CardTitle>Integração de Pagamento</CardTitle>
                            <CardDescription>
                                Configure as chaves de API do seu gateway de pagamento (ex: Asaas, Mercado Pago).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSavePayment} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="payment_gateway_key">Chave de API (Public Key)</Label>
                                    <Input
                                        id="payment_gateway_key"
                                        name="payment_gateway_key"
                                        defaultValue={settings?.payment_gateway_key || ""}
                                        placeholder="ex: pk_test_..."
                                        type="password"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="payment_gateway_secret">Chave Secreta (Secret Key)</Label>
                                    <Input
                                        id="payment_gateway_secret"
                                        name="payment_gateway_secret"
                                        defaultValue={settings?.payment_gateway_secret || ""}
                                        placeholder="ex: sk_test_..."
                                        type="password"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="webhook_url">URL do Webhook</Label>
                                    <Input
                                        id="webhook_url"
                                        name="webhook_url"
                                        defaultValue={settings?.webhook_url || ""}
                                        placeholder="https://seu-dominio.com/api/webhook/payment"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Configure esta URL no painel do seu gateway para receber notificações de pagamento.
                                    </p>
                                </div>
                                <div className="pt-4">
                                    <Button type="submit" disabled={saveMutation.isPending}>
                                        {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar Configurações
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Perfil de Administrador</CardTitle>
                            <CardDescription>
                                Atualize seus dados de acesso ao sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email de Acesso</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        defaultValue="admin@bpay.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="current_password">Senha Atual</Label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="new_password">Nova Senha</Label>
                                        <Input
                                            id="new_password"
                                            type="password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                                        <Input
                                            id="confirm_password"
                                            type="password"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <Button type="submit">
                                        <Save className="mr-2 h-4 w-4" />
                                        Atualizar Perfil
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
