const { Patient, Vitals, RiskAssessment } = require('../src/models');
const sequelize = require('../src/config/database');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const count = await Patient.count();
        console.log(`Total Patients: ${count}`);

        if (count > 0) {
            const patient = await Patient.findOne({
                include: [Vitals, RiskAssessment], // Test associations
                order: [['id', 'ASC']]
            });

            console.log('\n--- Sample Patient ---');
            console.log(`ID: ${patient.patientId}`);
            console.log(`Age: ${patient.age}`);
            console.log(`Risk Level: ${patient.currentRiskLevel}`);

            if (patient.Vitals && patient.Vitals.length > 0) {
                const v = patient.Vitals[0];
                console.log(`Vitals: HR=${v.heartRate}, BP=${v.systolicBp}/${v.diastolicBp}, SpO2=${v.spo2}%`);
            } else {
                console.log('Vitals: None found (Check association)');
            }

            if (patient.RiskAssessments && patient.RiskAssessments.length > 0) {
                const r = patient.RiskAssessments[0];
                console.log(`Risk Assessment: Score=${r.riskScore}, Level=${r.riskLevel}`);
            } else {
                console.log('Risk Assessment: None found (Check association)');
            }
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

test();
