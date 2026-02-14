const express = require('express');
const router = express.Router();
const { Patient, Vitals, RiskAssessment, Escalation } = require('../models');
const calculateRiskScore = require('../utils/riskCalculator');
const { io } = require('../app'); // Import socket.io instance for real-time updates

// GET /api/patients - List patients (with pagination)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { count, rows } = await Patient.findAndCountAll({
            limit,
            offset,
            order: [['updatedAt', 'DESC']] // Show recently updated first
        });

        res.json({
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            patients: rows
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/patients/:id - Get single patient details
router.get('/:id', async (req, res) => {
    try {
        const patient = await Patient.findOne({
            where: { patientId: req.params.id },
            include: [
                { model: Vitals, limit: 5, order: [['timestamp', 'DESC']] }, // Last 5 vitals
                { model: RiskAssessment, limit: 1, order: [['timestamp', 'DESC']] }, // Current Risk
                { model: Escalation, limit: 1, order: [['createdAt', 'DESC']] } // Active Escalation
            ]
        });

        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json(patient);
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/patients - Admit new patient
router.post('/', async (req, res) => {
    try {
        const { patientId, age, gender } = req.body;
        // Simple validation
        if (!patientId || !age) return res.status(400).json({ error: 'Missing required fields' });

        const patient = await Patient.create({
            patientId,
            age,
            gender,
            currentRiskLevel: 'LOW',
            currentRiskScore: 0
        });

        res.status(201).json(patient);
    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/patients/:id/vitals - Submit Vitals (The Core Logic)
router.post('/:id/vitals', async (req, res) => {
    try {
        const { id } = req.params;
        const { heartRate, systolicBp, diastolicBp, spo2, temperature } = req.body;

        // 1. Find Patient
        const patient = await Patient.findOne({ where: { patientId: id } });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        // 2. Save Vitals
        const vitals = await Vitals.create({
            patientId: id,
            heartRate, systolicBp, diastolicBp, spo2, temperature
        });

        // 3. Calculate Risk
        const risk = calculateRiskScore({ heartRate, systolicBp, spo2 });

        // 4. Save Risk Assessment
        const riskAssessment = await RiskAssessment.create({
            patientId: id,
            riskLevel: risk.level,
            riskScore: risk.score,
            factors: risk.factors
        });

        // 5. Update Patient Current Status
        if (patient.currentRiskLevel !== risk.level) {
            // Risk Changed! Trigger Escalation Logic later
            console.log(`Risk changed for ${id}: ${patient.currentRiskLevel} -> ${risk.level}`);

            // Update patient record
            patient.currentRiskLevel = risk.level;
            patient.currentRiskScore = risk.score;
            await patient.save();

            // IF HIGH/CRITICAL -> Create Escalation (Simple Logic)
            if (['HIGH', 'CRITICAL'].includes(risk.level)) {
                await Escalation.create({
                    patientId: id,
                    status: 'PENDING',
                    slaDeadline: new Date(Date.now() + 15 * 60000) // 15 mins for MVP
                });

                // Notify via Websocket
                // Note: 'io' might need to be imported differently if circular dependency is an issue.
                // For MVP, we can emit if `io` is available on `req.app.get('io')` or similar.
            }
        }

        res.json({
            vitals,
            riskLevel: risk.level,
            riskScore: risk.score,
            factors: risk.factors
        });

    } catch (error) {
        console.error('Error submitting vitals:', error);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
