import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardMetrics } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

type ViewMode = "daily" | "monthly";
type CampusFilter = string;

type MonthlyReceipt = {
  month: string;
  total: number;
  count: number;
};

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [campusFilter, setCampusFilter] = useState<CampusFilter>("all");

  const { data: campuses } = useQuery<any[]>({
    queryKey: ["/api/campuses"],
  });

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics", campusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (campusFilter !== "all") {
        params.set("campusName", campusFilter);
      }
      const res = await fetch(`/api/dashboard/metrics?${params}`);
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
  });

  const { data: monthlyReceipts, isLoading: isLoadingMonthly } = useQuery<MonthlyReceipt[]>({
    queryKey: ["/api/dashboard/monthly-receipts", campusFilter],
    enabled: viewMode === "monthly",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (campusFilter !== "all") {
        params.set("campusName", campusFilter);
      }
      const res = await fetch(`/api/dashboard/monthly-receipts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch monthly receipts");
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  };

  const pieData = metrics
    ? [
      { name: "Pagos", value: metrics.defaultRate.paid, color: "hsl(142 76% 36%)" },
      { name: "Atrasados", value: metrics.defaultRate.overdue, color: "hsl(0 84% 42%)" },
      { name: "Em Aberto", value: metrics.defaultRate.pending, color: "hsl(45 93% 47%)" },
    ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das cobranças e pagamentos
          </p>
        </div>
        <Select
          value={campusFilter}
          onValueChange={(value) => setCampusFilter(value as CampusFilter)}
        >
          <SelectTrigger className="w-[240px]" data-testid="select-campus-filter">
            <SelectValue placeholder="Selecione a sede" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-campus-all">Geral (Todas)</SelectItem>
            {campuses?.map((campus) => (
              <SelectItem key={campus.id} value={campus.name}>
                {campus.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Faturado"
          value={metrics ? formatCurrency(metrics.totalBilled) : "R$ 0,00"}
          subtitle="No mês atual"
          icon={DollarSign}
          iconClassName="text-primary"
          isLoading={isLoading}
          testId="metric-billed"
        />
        <MetricCard
          title="Total Recebido"
          value={metrics ? formatCurrency(metrics.totalReceived) : "R$ 0,00"}
          subtitle="Pagamentos confirmados"
          icon={TrendingUp}
          iconClassName="text-success"
          isLoading={isLoading}
          testId="metric-received"
        />
        <MetricCard
          title="Em Aberto"
          value={metrics ? formatCurrency(metrics.totalPending) : "R$ 0,00"}
          subtitle="Aguardando pagamento"
          icon={Clock}
          iconClassName="text-warning"
          isLoading={isLoading}
          testId="metric-pending"
        />
        <MetricCard
          title="Atrasados"
          value={metrics ? formatCurrency(metrics.totalOverdue) : "R$ 0,00"}
          subtitle="Vencidos e não pagos"
          icon={AlertTriangle}
          iconClassName="text-danger"
          isLoading={isLoading}
          testId="metric-overdue"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Line Chart - Recebimentos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {viewMode === "daily" ? "Recebimentos Diários" : "Recebimentos Mensais"}
              </CardTitle>
              <Tabs
                value={viewMode}
                onValueChange={(value) => setViewMode(value as ViewMode)}
                data-testid="toggle-view-mode"
              >
                <TabsList>
                  <TabsTrigger value="daily" data-testid="tab-daily">
                    Diário
                  </TabsTrigger>
                  <TabsTrigger value="monthly" data-testid="tab-monthly">
                    Mensal
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {(isLoading || (viewMode === "monthly" && isLoadingMonthly)) ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={
                    viewMode === "daily"
                      ? metrics?.dailyReceipts || []
                      : monthlyReceipts || []
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey={viewMode === "daily" ? "date" : "month"}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={viewMode === "monthly" ? formatMonthLabel : undefined}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                    labelFormatter={
                      viewMode === "monthly"
                        ? (label: string) => formatMonthLabel(label)
                        : undefined
                    }
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={viewMode === "daily" ? "amount" : "total"}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Taxa de Inadimplência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Status das Cobranças
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}`, "Cobranças"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pagamentos Hoje</p>
              <p className="text-2xl font-semibold" data-testid="text-payments-today">
                {metrics?.paymentsToday || 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Taxa de Recebimento</p>
              <p className="text-2xl font-semibold text-success">
                {metrics
                  ? `${Math.round((metrics.totalReceived / metrics.totalBilled) * 100)}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
