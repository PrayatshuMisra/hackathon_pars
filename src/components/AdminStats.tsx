import { useMemo } from "react";
import { Patient } from "@/hooks/usePatients";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminStatsProps {
    patients: Patient[];
    onClose: () => void;
}

export default function AdminStats({ patients, onClose }: AdminStatsProps) {
    // 1. Process Data
    const stats = useMemo(() => {
        const deptMap: Record<string, { total: number; high: number; medium: number; low: number }> = {};

        patients.forEach((p) => {
            // Fallback to "General Medicine" if department is missing or null
            // In a real app, this would be persisted. For now, we rely on what's available or default.
            const dept = p.department || "General Medicine";

            if (!deptMap[dept]) {
                deptMap[dept] = { total: 0, high: 0, medium: 0, low: 0 };
            }

            deptMap[dept].total++;
            if (p.risk_label === "HIGH") deptMap[dept].high++;
            else if (p.risk_label === "MEDIUM") deptMap[dept].medium++;
            else deptMap[dept].low++;
        });

        return Object.entries(deptMap).map(([name, data]) => ({
            name,
            ...data,
        }));
    }, [patients]);

    const totalPatients = patients.length;
    const highRiskCount = patients.filter(p => p.risk_label === "HIGH").length;

    // Colors for charts
    const COLORS = {
        high: "#ef4444", // red-500
        medium: "#f59e0b", // amber-500
        low: "#22c55e", // green-500
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-6xl h-[90vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Hospital Command Center</h2>
                        <p className="text-muted-foreground text-sm">Real-time department capacity and risk analysis</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-muted transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Top Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients In Queue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{totalPatients}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Critical Cases (High Risk)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-red-500">{highRiskCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active Departments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{stats.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Dept Volume Chart */}
                        <Card className="col-span-1">
                            <CardHeader>
                                <CardTitle>Patient Volume by Department</CardTitle>
                                <CardDescription>Total patients currently waiting</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--foreground)' }}
                                        />
                                        <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Risk Distribution Chart */}
                        <Card className="col-span-1">
                            <CardHeader>
                                <CardTitle>Risk Distribution per Department</CardTitle>
                                <CardDescription>Acuity breakdown</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                                        <YAxis />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                borderColor: '#e2e8f0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                            labelStyle={{ color: '#000000', fontWeight: '600' }}
                                            itemStyle={{ color: '#000000' }}
                                        />
                                        <Bar dataKey="low" stackId="a" fill={COLORS.low} name="Low Risk" />
                                        <Bar dataKey="medium" stackId="a" fill={COLORS.medium} name="Medium Risk" />
                                        <Bar dataKey="high" stackId="a" fill={COLORS.high} name="High Risk" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}