const fs = require('fs');
const path = require('path');
const { Patient, Vitals, RiskAssessment } = require('../src/models');
const sequelize = require('../src/config/database');

const CSV_PATH = path.join(__dirname, '../../../patients_data_with_risk_levels.csv');

async function seed() {
    try {
        await sequelize.sync({ force: true }); // Reset DB
        console.log('Database synced. Reading CSV...');

        const data = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = data.split('\n').filter(line => line.trim() !== '');
        const header = lines.shift(); // Remove header

        const patients = [];
        const vitals = [];
        const risks = [];

        console.log(`Processing ${lines.length} records...`);

        for (const line of lines) {
            const cols = line.split(',');
            if (cols.length < 18) continue;

            // Map columns based on:
            // Patient_ID,Age,Gender,BMI,Heart_Rate,Systolic_BP,Diastolic_BP,O2_Saturation,Temp...
            const [
                patientId, age, gender, bmi,
                heartRate, systolicBp, diastolicBp, spo2, temp,
                respRate, painScore, gcs, diabetes, hypertension, heartDisease,
                arrivalMode, chiefComplaint, riskScore, riskLevel
            ] = cols;

            patients.push({
                patientId,
                age: parseInt(age),
                gender,
                currentRiskLevel: riskLevel?.trim(),
                currentRiskScore: parseFloat(riskScore)
            });

            vitals.push({
                patientId,
                heartRate: parseInt(heartRate),
                systolicBp: parseInt(systolicBp),
                diastolicBp: parseInt(diastolicBp),
                spo2: parseFloat(spo2),
                temperature: parseFloat(temp)
            });

            risks.push({
                patientId,
                riskLevel: riskLevel?.trim(),
                riskScore: parseFloat(riskScore),
                factors: {
                    bmi, respRate, painScore, gcs,
                    history: { diabetes, hypertension, heartDisease },
                    chiefComplaint
                }
            });
        }

        // Bulk Insert (Chunking to avoid memory issues if needed, but 5000 is fine for SQLite)
        await Patient.bulkCreate(patients);
        console.log(`Inserted ${patients.length} patients.`);

        // Vitals and Risks need valid Patient IDs, but since we just inserted them, it should be fine.
        // However, SQLite bulkCreate doesn't return foreign keys easily in some versions.
        // But since we are setting the foreign key 'patientId' manually (if we defined it as string), 
        // wait, our model uses `id` (integer) as primary key but we have `patientId` (string) as a field.
        // We defined association on `patientId`. Let's verify `index.js`.
        // "Patient.hasMany(Vitals, { foreignKey: 'patientId', sourceKey: 'patientId' });"
        // "Vitals.belongsTo(Patient, { foreignKey: 'patientId', targetKey: 'patientId' });"
        // This expects `Vitals` to have a `patientId` column that matches `Patient.patientId`.
        // We didn't explicitly define `patientId` in Vitals model! Sequelize adds it automatically but usually as `PatientId` (integer) referencing `id`.
        // Since we specified `sourceKey: 'patientId'`, Sequelize uses the string ID.
        // BUT we need to make sure Vitals model has `patientId` string column.

        // Let's create the records with the association data included or ensure column exists.
        // Safer to just use the mapped data and trust Sequelize created the column from association definition.
        // BUT creating payload for Vitals with `patientId` property might fail if the column isn't defined in the model schema,
        // unless we use `Patient.create({ ...vitals: [...] }, { include: [Vitals] })`.

        // Refactoring to use efficient bulk insert:
        // We need to define `patientId` in Vitals/Risk models explicitly to allow bulk insert with foreign key.
        // I'll update the models briefly or just assume Sequelize is smart enough (it often isn't for bulkCreate with custom FKs without explicit definition).

        // To be safe and fast: I will rely on the fact that I'm setting `patientId` in the data object,
        // and I'll update Vitals/Risk models to include `patientId` string column to match.

        await Vitals.bulkCreate(vitals);
        console.log(`Inserted ${vitals.length} vitals.`);

        await RiskAssessment.bulkCreate(risks);
        console.log(`Inserted ${risks.length} risk assessments.`);

        console.log('Seeding complete!');
    } catch (error) {
        console.error('Seeding failed:', error);
    }
}

seed();
