import { useMemo, useState, useEffect } from "react";
import { Patient } from "@/hooks/usePatients";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client"; // Import Supabase
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
    AreaChart,
    Area,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminStatsProps {
    patients: Patient[];
    onClose: () => void;
}

interface Assignment {
    id: string;
    patient_name: string;
    department: string;
    assigned_at: string;
}

export default function AdminStats({ patients, onClose }: AdminStatsProps) {
    const { t } = useTranslation();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [totalPatientCount, setTotalPatientCount] = useState(0);

    useEffect(() => {
        const fetchAssignments = async () => {
            // @ts-ignore
            const { data, error } = await supabase
                .from('patient_assignments')
                .select('*');

            if (!error && data) {
                setAssignments(data as unknown as Assignment[]);
            }
        };

        const fetchTotalCount = async () => {
            const { count, error } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true });
            
            if (!error && count !== null) {
                setTotalPatientCount(count);
            }
        };

        fetchAssignments();
        fetchTotalCount();

        // Optional: Subscribe to realtime, but simple fetch is fine for now
        const channel = supabase
            .channel('public:patient_assignments')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patient_assignments' }, (payload) => {
                setAssignments(prev => [...prev, payload.new as Assignment]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, []);

    // 1. Process Data
    const {
        deptStats,
        riskStats,
        arrivalStats,
        vitalsStats,
        ageStats,
        clinicalStats, // New
        kpi
    } = useMemo(() => {
        // AI-GEN: Define all departments to ensure they appear in the chart even if count is 0
        const ALL_DEPARTMENTS = [
            "Cardiology", "Neurology", "Gastroenterology", "Pulmonology",
            "Orthopedics", "Emergency_Trauma", "General_Medicine", "Dermatology",
            "ENT", "Urology_Nephrology", "Psychiatry", "Toxicology", "Gynaecology"
        ];

        // Initialize map with 0s for all departments
        // Added 'names' array to store patient details
        const deptMap: Record<string, { total: number; high: number; medium: number; low: number; names: string[] }> = {};
        ALL_DEPARTMENTS.forEach(dept => {
            deptMap[dept] = { total: 0, high: 0, medium: 0, low: 0, names: [] };
        });

        const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
        const vitalsAccumulator = {
            HIGH: { hr: 0, bp: 0, o2: 0, count: 0 },
            MEDIUM: { hr: 0, bp: 0, o2: 0, count: 0 },
            LOW: { hr: 0, bp: 0, o2: 0, count: 0 },
        };
        const ageBuckets = { "0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0 };

        // Sort patients by time for arrival trend
        const sortedPatients = [...patients].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Arrival Trend
        const arrivalTrend = sortedPatients.map((_, i) => ({
            time: i + 1,
            count: i + 1, // Cumulative
        }));

        // --- Use ASSIGNMENTS for Department Volume ---
        console.log("Processing assignments:", assignments.length);
        assignments.forEach(a => {
            let dept = a.department || "General_Medicine";
            // Normalize dept name: Replace spaces with underscores and match case-insensitive
            let normalizedDept = dept.replace(/ /g, "_");

            // Find matching key in existing map (case-insensitive)
            const matchKey = Object.keys(deptMap).find(k => k.toLowerCase() === normalizedDept.toLowerCase());

            if (matchKey) {
                dept = matchKey;
            } else {
                // Fallback to General Medicine if not found
                dept = "General_Medicine";
            }

            if (deptMap[dept]) {
                deptMap[dept].total++;
                deptMap[dept].names.push(a.patient_name);
            }

            // Note: Assignments table doesn't have risk info easily joined here without more complex query.
            // For the "High/Medium/Low" stack in the bar chart, we might lose accuracy if we only look at assignments
            // unless we join with `patients` prop by name or ID.
            // Let's try to match with `patients` prop to get risk.
            // Assignments has patient_id, use that for reliable matching
            const patient = patients.find(p => p.id === (a as any).patient_id);

            // Fallback to name match if ID match fails (though ID should exist)
            const pNameMatch = !patient ? patients.find(p => p.name === a.patient_name) : null;
            const finalPatient = patient || pNameMatch;

            const risk = finalPatient?.risk_label || "LOW";
            if (risk === "HIGH") deptMap[dept].high++;
            else if (risk === "MEDIUM") deptMap[dept].medium++;
            else deptMap[dept].low++;
        });

        // --- Use PATIENTS for other stats (Risk, Vitals, Age) ---
        patients.forEach((p) => {
            // Risk Distribution
            const risk = p.risk_label || "LOW";
            if (risk === "HIGH") riskCounts.HIGH++;
            else if (risk === "MEDIUM") riskCounts.MEDIUM++;
            else riskCounts.LOW++;

            // Vitals Stats
            if (risk in vitalsAccumulator) {
                const acc = vitalsAccumulator[risk as keyof typeof vitalsAccumulator];
                acc.hr += p.heart_rate || 0;
                acc.bp += p.systolic_bp || 0;
                acc.o2 += p.o2_saturation || 0;
                acc.count++;
            }

            // Age Stats
            const age = p.age;
            if (age <= 18) ageBuckets["0-18"]++;
            else if (age <= 35) ageBuckets["19-35"]++;
            else if (age <= 50) ageBuckets["36-50"]++;
            else if (age <= 65) ageBuckets["51-65"]++;
            else ageBuckets["65+"]++;
        });

        // Format Dept Data
        // Map keys to nicer display names if needed
        const formatDeptName = (name: string) => t(`departments.${name}`);

        const deptData = ALL_DEPARTMENTS.map(name => ({
            name: formatDeptName(name), // Display name
            ...deptMap[name]
        }));

        // Format Risk Data for Pie
        const riskData = [
            { name: t('admin.high_risk'), value: riskCounts.HIGH, color: "#ef4444" },
            { name: t('admin.medium_risk'), value: riskCounts.MEDIUM, color: "#f59e0b" },
            { name: t('admin.low_risk'), value: riskCounts.LOW, color: "#22c55e" },
        ].filter(d => d.value > 0);

        // Format Vitals Data
        const vitalsData = Object.entries(vitalsAccumulator).map(([risk, data]) => ({
            name: risk === 'HIGH' ? t('admin.high_risk') : risk === 'MEDIUM' ? t('admin.medium_risk') : t('admin.low_risk'),
            "Heart Rate": data.count ? Math.round(data.hr / data.count) : 0,
            "Systolic BP": data.count ? Math.round(data.bp / data.count) : 0,
            "O2 Saturation": data.count ? Math.round(data.o2 / data.count) : 0,
        })).reverse(); // LOW to HIGH usually better left-to-right or vice versa

        // Format Age Data
        const ageData = Object.entries(ageBuckets).map(([name, count]) => ({ name, count }));

        // Calculate Average Clinical Metrics (Radar Data)
        const totalPs = patients.length || 1;
        const avgPain = patients.reduce((sum, p) => sum + (p.pain_score || 0), 0) / totalPs;
        const avgGCS = patients.reduce((sum, p) => sum + (p.gcs_score || 0), 0) / totalPs;
        // Normalize Resp Rate (typical 12-20) to 0-10 scale for radar? Or just show raw.
        // Let's scale fit to ~10 range for visual consistency. Pain 0-10, GCS 3-15.
        // GCS: (val / 15) * 10
        // Resp: (val / 20) * 10


        const clinicalData = [
            { subject: t('admin.clinical_metrics.pain'), A: parseFloat(avgPain.toFixed(1)), fullMark: 10 },
            { subject: t('admin.clinical_metrics.gcs'), A: parseFloat(((avgGCS / 15) * 10).toFixed(1)), fullMark: 10 },
            { subject: t('admin.clinical_metrics.risk'), A: parseFloat(((patients.reduce((sum, p) => sum + (p.risk_score || 0), 0) / totalPs) * 10).toFixed(1)), fullMark: 10 },
            { subject: t('admin.clinical_metrics.acuity'), A: parseFloat(((riskCounts.HIGH / totalPs) * 10).toFixed(1)), fullMark: 10 }, // Relative high risk density
        ];

        return {
            deptStats: deptData,
            riskStats: riskData,
            arrivalStats: arrivalTrend,
            vitalsStats: vitalsData,
            ageStats: ageData,
            clinicalStats: clinicalData,
            kpi: {
                total: totalPatientCount || patients.length,
                high: riskCounts.HIGH,
                avgWait: "12m", // Mock
                departments: Object.keys(deptMap).filter(k => deptMap[k].total > 0).length // Active departments
            }
        };
    }, [patients, assignments, totalPatientCount]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Extract names if available
            // payload[0] payload is the bar data. The data object is in payload[0].payload
            const data = payload[0].payload;
            const names = data.names || [];

            return (
                <div className="bg-card/95 border border-border p-2 rounded-lg shadow-xl backdrop-blur-sm text-xs max-w-[200px]">
                    <p className="font-bold mb-1 text-foreground">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2" style={{ color: entry.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}: {entry.value}</span>
                        </div>
                    ))}

                    {/* Show Patient Names */}
                    {names.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">{t('admin.assigned_patients')}</p>
                            <ul className="list-disc pl-3 text-foreground/80">
                                {names.slice(0, 5).map((name: string, i: number) => (
                                    <li key={i}>{name}</li>
                                ))}
                                {names.length > 5 && <li>+ {names.length - 5} {t('admin.more')}</li>}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-7xl h-[90vh] flex flex-col bg-card border border-[#D4AF37]/50 rounded-xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/30 bg-card/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">{t('admin.title')}</h2>
                            <p className="text-muted-foreground text-sm">{t('admin.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-primary/20">

                    {/* KPI Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { title: t('admin.total_patients'), value: kpi.total, color: "text-primary" },
                            { title: t('admin.critical_cases'), value: kpi.high, color: "text-red-500" },
                            { title: t('admin.active_depts'), value: kpi.departments, color: "text-blue-500" },
                            { title: t('admin.avg_wait'), value: kpi.avgWait, color: "text-emerald-500" },
                        ].map((stat, i) => (
                            <Card key={i} className="bg-card/50 border-white/5">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                                    <div className={`text-4xl font-bold mt-2 ${stat.color}`}>{stat.value}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Charts Row 1: Volume & Trends */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Department Volume */}
                        <Card className="col-span-1 lg:col-span-2 border-white/5 bg-card/30">
                            <CardHeader>
                                <CardTitle>{t('admin.vol_by_dept')}</CardTitle>
                                <CardDescription>{t('admin.vol_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[600px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={deptStats}
                                        margin={{ top: 10, right: 30, left: 0, bottom: 40 }} // Added bottom margin for labels
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                        <Legend verticalAlign="top" />
                                        <Bar dataKey="low" name={t('admin.low_risk')} stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="medium" name={t('admin.medium_risk')} stackId="a" fill="#f59e0b" />
                                        <Bar dataKey="high" name={t('admin.high_risk')} stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Risk Distribution Pie */}
                        <div className="col-span-1 flex flex-col gap-6">
                            <Card className="border-white/5 bg-card/30 flex-1">
                                <CardHeader>
                                    <CardTitle>{t('admin.acuity_split')}</CardTitle>
                                    <CardDescription>{t('admin.risk_breakdown')}</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={riskStats}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {riskStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                        <div className="text-center">
                                            <span className="text-3xl font-bold text-foreground">{kpi.total}</span>
                                            <p className="text-xs text-muted-foreground uppercase">{t('admin.patients')}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Clinical Metrics Radar */}
                            <Card className="border-white/5 bg-card/30 flex-1">
                                <CardHeader>
                                    <CardTitle>{t('admin.clinical_avg_title')}</CardTitle>
                                    <CardDescription>{t('admin.clinical_avg_desc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={clinicalStats}>
                                            <PolarGrid stroke="#ffffff20" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#888888', fontSize: 10 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                            <Radar
                                                name="Population Avg"
                                                dataKey="A"
                                                stroke="#8884d8"
                                                fill="#8884d8"
                                                fillOpacity={0.6}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8884d8', strokeWidth: 2 }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Charts Row 2: Vitals & Demographics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[350px]">

                        {/* Average Vitals by Risk */}
                        <Card className="border-white/5 bg-card/30">
                            <CardHeader>
                                <CardTitle>{t('admin.vitals_analysis')}</CardTitle>
                                <CardDescription>{t('admin.vitals_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={vitalsStats} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                                        <XAxis type="number" stroke="#888888" fontSize={12} />
                                        <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} width={60} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                        <Legend />
                                        <Bar dataKey="Heart Rate" name={t('triage.hr')} fill="#8884d8" radius={[0, 4, 4, 0]} barSize={10} />
                                        <Bar dataKey="Systolic BP" name={t('triage.bp_sys')} fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={10} />
                                        <Bar dataKey="O2 Saturation" name={t('triage.spo2')} fill="#ffc658" radius={[0, 4, 4, 0]} barSize={10} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Demographics */}
                        <Card className="border-white/5 bg-card/30">
                            <CardHeader>
                                <CardTitle>{t('admin.demographics')}</CardTitle>
                                <CardDescription>{t('admin.age_dist')}</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={ageStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                                        <YAxis stroke="#888888" fontSize={12} />
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}