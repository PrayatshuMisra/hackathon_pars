const http = require('http');
const { app, sequelize } = require('../src/app'); // Import app instance (not running yet)

let server;

function startServer() {
    return new Promise((resolve) => {
        // Check if port is in use or just pick a random one?
        // Let's stick to 5000 as configured in .env or app.js
        // Actually app.js calls server.listen() immediately at the bottom!
        // This defines a "race condition" if we import it.
        // Ideally app.js should export a start function.
        // But since app.js executes `start()` at bottom, importing it might start it effectively.
        // Let's assume importing it starts it. We just need to wait a sec.
        setTimeout(resolve, 2000);
    });
}

function request(path, method, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTest() {
    console.log('--- Starting Integration Test ---');
    await startServer();

    try {
        // 1. Admit Patient
        const patientId = `TEST-${Date.now()}`;
        console.log(`\n1. Admitting Patient: ${patientId}`);
        const admission = await request('/api/patients', 'POST', {
            patientId,
            age: 50,
            gender: 'M'
        });
        console.log('Admission Result:', admission);

        if (admission.error) throw new Error('Admission failed');

        // 2. Submit Critical Vitals
        console.log(`\n2. Submitting Critical Vitals (HR=130, SpO2=88)`);
        const vitalsResult = await request(`/api/patients/${patientId}/vitals`, 'POST', {
            heartRate: 130, // Critical
            systolicBp: 110,
            diastolicBp: 70,
            spo2: 88, // Critical
            temperature: 37.5
        });
        console.log('Vitals Response:', JSON.stringify(vitalsResult, null, 2));

        // 3. Verify Risk Update
        console.log(`\n3. Verifying Risk Level (Expected: CRITICAL)`);
        const patient = await request(`/api/patients/${patientId}`, 'GET');
        console.log(`Current Risk Level: ${patient.currentRiskLevel}`);

        if (patient.currentRiskLevel === 'CRITICAL' || vitalsResult.riskLevel === 'CRITICAL') {
            console.log('\n✅ TEST PASSED: Risk updated correctly.');
        } else {
            console.log('\n❌ TEST FAILED: Risk not updated.');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        console.log('Test Complete. Use Ctrl+C to exit if server persists.');
        process.exit(0);
    }
}

runTest();
