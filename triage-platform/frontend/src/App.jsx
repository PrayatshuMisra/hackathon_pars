import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, UserPlus, Heart, Users, RefreshCw } from 'lucide-react';
import PatientDetails from './components/PatientDetails';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null); // Track selected patient
  const [newPatient, setNewPatient] = useState({ patientId: '', age: '', gender: 'Male' });
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API_URL}/patients?limit=50`);
      setPatients(res.data.patients || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(fetchPatients, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  const handleAdmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/patients`, newPatient);
      setNewPatient({ patientId: '', age: '', gender: 'Male' });
      fetchPatients();
    } catch (error) {
      alert('Error admitting patient');
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

  const stats = {
    total: patients.length,
    critical: patients.filter(p => p.currentRiskLevel === 'CRITICAL').length,
    high: patients.filter(p => p.currentRiskLevel === 'HIGH').length
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">AI Triage Platform</h1>
        </div>
        {!selectedPatient && (
          <div className="flex gap-4 text-sm font-medium">
            <div className="flex items-center gap-1 text-gray-600">
              <Users className="w-4 h-4" /> Total: {stats.total}
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="w-4 h-4" /> Critical: {stats.critical}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {selectedPatient ? (
          <PatientDetails
            patientId={selectedPatient}
            onBack={() => {
              setSelectedPatient(null);
              fetchPatients(); // Refresh list on return
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Patient List */}
            <section className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="font-semibold text-gray-800">Live Patient Queue</h2>
                  <button onClick={fetchPatients} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-3 font-medium">Patient ID</th>
                        <th className="px-6 py-3 font-medium">Age/Gender</th>
                        <th className="px-6 py-3 font-medium">Risk Status</th>
                        <th className="px-6 py-3 font-medium">Score</th>
                        <th className="px-6 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {patients.map(patient => (
                        <tr key={patient.id} className="hover:bg-gray-50/50 transition duration-150">
                          <td className="px-6 py-4 font-medium text-gray-900">{patient.patientId}</td>
                          <td className="px-6 py-4 text-gray-600">{patient.age} / {patient.gender}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskColor(patient.currentRiskLevel)}`}>
                              {patient.currentRiskLevel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-mono">{patient.currentRiskScore?.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setSelectedPatient(patient.patientId)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {patients.length === 0 && !loading && (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                            No patients in queue
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Right Column: Admission Form */}
            <aside className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-gray-800">Admit Patient</h2>
                </div>
                <form onSubmit={handleAdmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                      placeholder="e.g. P-12345"
                      value={newPatient.patientId}
                      onChange={e => setNewPatient({ ...newPatient, patientId: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <input
                        type="number"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                        value={newPatient.age}
                        onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                        value={newPatient.gender}
                        onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition duration-200 flex justify-center items-center gap-2"
                  >
                    {submitting ? 'Admitting...' : 'Admit Patient'}
                  </button>
                </form>
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white text-center">
                <Heart className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <h3 className="font-semibold text-lg">System Status</h3>
                <p className="text-white/80 text-sm mt-1">Live AI Monitoring Active</p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  <span className="text-xs font-mono uppercase tracking-widest opacity-75">Operational</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
