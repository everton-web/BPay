import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
                            Configure as chaves de API do seu gateway de pagamento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {settings?.mercado_pago_status === 'active' ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-800">
                                    <Shield className="h-5 w-5" />
                                    <div>
                                        <p className="font-medium">Integração com Mercado Pago Ativa</p>
                                        <p className="text-sm opacity-90">O sistema está pronto para processar pagamentos via Pix.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 text-yellow-800">
                                    <Shield className="h-5 w-5" />
                                    <div>
                                        <p className="font-medium">Mercado Pago não configurado</p>
                                        <p className="text-sm opacity-90">Entre em contato com o suporte técnico para ativar.</p>
                                    </div>
                                </div>
                            )}

                            {settings?.resend_status === 'active' ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-800">
                                    <Mail className="h-5 w-5" />
                                    <div>
                                        <p className="font-medium">Integração com Resend Ativa</p>
                                        <p className="text-sm opacity-90">O sistema enviará notificações por e-mail.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 text-yellow-800">
                                    <Mail className="h-5 w-5" />
                                    <div>
                                        <p className="font-medium">E-mail não configurado</p>
                                        <p className="text-sm opacity-90">Notificações serão apenas simuladas no console.</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSavePayment} className="space-y-4 opacity-50 pointer-events-none">
                                <div className="space-y-2">
                                    <Label htmlFor="payment_gateway_key">Chave de API (Public Key)</Label>
                                    <Input
                                        id="payment_gateway_key"
                                        name="payment_gateway_key"
                                        defaultValue={settings?.payment_gateway_key || "Configurado pelo Admin"}
                                        placeholder="ex: pk_test_..."
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="payment_gateway_secret">Chave Secreta (Secret Key)</Label>
                                    <Input
                                        id="payment_gateway_secret"
                                        name="payment_gateway_secret"
                                        defaultValue={settings?.payment_gateway_secret || "••••••••••••••••"}
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
                                </div>
                                <div className="pt-4">
                                    <Button type="submit" disabled>
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar Configurações
                                    </Button>
                                </div>
                            </form>
                            <p className="text-xs text-muted-foreground text-center">
                                Nota: As credenciais são gerenciadas pelo administrador do sistema por segurança.
                            </p>
                        </div>
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
