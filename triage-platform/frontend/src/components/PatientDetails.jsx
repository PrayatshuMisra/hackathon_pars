import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Activity, Heart, Thermometer, Wind, AlertTriangle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

function PatientDetails({ patientId, onBack }) {
    const [patient, setPatient] = useState(null);
    const [vitals, setVitals] = useState({
        heartRate: '',
        systolicBp: '',
        diastolicBp: '',
        spo2: '',
        temperature: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, [patientId]);

    const fetchDetails = async () => {
        try {
            const res = await axios.get(`${API_URL}/patients/${patientId}`);
            setPatient(res.data);
        } catch (error) {
            console.error('Error fetching details:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/patients/${patientId}/vitals`, vitals);
            setVitals({
                heartRate: '',
                systolicBp: '',
                diastolicBp: '',
                spo2: '',
                temperature: ''
            });
            fetchDetails(); // Refresh to show new risk and history
        } catch (error) {
            alert('Error submitting vitals');
        } finally {
            setSubmitting(false);
        }
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
            case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-green-100 text-green-800 border-green-200';
        }
    };

    if (!patient) return <div className="p-8 text-center text-gray-500">Loading patient details...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 mb-4 transition">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Queue
                </button>

                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {patient.patientId}
                            <span className={`text-sm px-3 py-1 rounded-full border ${getRiskColor(patient.currentRiskLevel)}`}>
                                {patient.currentRiskLevel}
                            </span>
                        </h2>
                        <p className="text-gray-500 mt-1">Age: {patient.age} • Gender: {patient.gender}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Risk Score</div>
                        <div className="text-3xl font-mono font-bold text-gray-900">{patient.currentRiskScore?.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vitals Form */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" /> New Assessment
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Heart Rate</label>
                                <div className="relative">
                                    <Heart className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="BPM"
                                        className="pl-9 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                        value={vitals.heartRate}
                                        onChange={e => setVitals({ ...vitals, heartRate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">SpO2 (%)</label>
                                <div className="relative">
                                    <Wind className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="%"
                                        className="pl-9 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                        value={vitals.spo2}
                                        onChange={e => setVitals({ ...vitals, spo2: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Systolic BP</label>
                                <input
                                    type="number"
                                    placeholder="mmHg"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    value={vitals.systolicBp}
                                    onChange={e => setVitals({ ...vitals, systolicBp: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Diastolic BP</label>
                                <input
                                    type="number"
                                    placeholder="mmHg"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    value={vitals.diastolicBp}
                                    onChange={e => setVitals({ ...vitals, diastolicBp: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Temperature (°C)</label>
                            <div className="relative">
                                <Thermometer className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="°C"
                                    className="pl-9 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    value={vitals.temperature}
                                    onChange={e => setVitals({ ...vitals, temperature: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition duration-200 mt-2"
                        >
                            {submitting ? 'Analyzing...' : 'Submit Assessment'}
                        </button>
                    </form>
                </div>

                {/* History Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Assessment History</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Risk Level</th>
                                    <th className="px-4 py-3">HR</th>
                                    <th className="px-4 py-3">BP</th>
                                    <th className="px-4 py-3">SpO2</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {patient.Vitals && patient.Vitals.map((v, i) => {
                                    // Assuming RiskAssessments align with Vitals by time, logic is loosely coupled here for MVP display
                                    // Ideally backend should return "Assessments" array that includes vitals snapshots. 
                                    // But our current Get Patient endpoint returns top 5 vitals and top 1 risk.
                                    // We might need to iterate Vitals and show them. The Risk Assessment is stored separately.
                                    // For MVP, we'll just show Vitals history.
                                    return (
                                        <tr key={v.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 text-gray-500">
                                                {new Date(v.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                {/* We don't have historical risk linked to each vital row easily without complex query. 
                             For MVP, show "-" or latest if time matches. */}
                                                -
                                            </td>
                                            <td className="px-4 py-3 font-medium">{v.heartRate}</td>
                                            <td className="px-4 py-3">{v.systolicBp}/{v.diastolicBp}</td>
                                            <td className="px-4 py-3">{v.spo2}%</td>
                                        </tr>
                                    )
                                })}
                                {(!patient.Vitals || patient.Vitals.length === 0) && (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                                            No vitals recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PatientDetails;
