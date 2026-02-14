function calculateRiskScore(vitals) {
    let score = 0;
    const factors = [];

    const { heartRate, systolicBp, spo2 } = vitals;

    // Heart Rate
    if (heartRate) {
        if (heartRate > 120 || heartRate < 50) {
            score += 30;
            factors.push('Abnormal Heart Rate');
        } else if (heartRate > 100 || heartRate < 60) {
            score += 15;
            factors.push('Elevated/Low Heart Rate');
        }
    }

    // Blood Pressure (Systolic)
    if (systolicBp) {
        if (systolicBp > 180 || systolicBp < 90) {
            score += 30;
            factors.push('Critical Blood Pressure');
        } else if (systolicBp > 140 || systolicBp < 100) {
            score += 15;
            factors.push('Elevated/Low Blood Pressure');
        }
    }

    // Oxygen Saturation
    if (spo2) {
        if (spo2 < 90) {
            score += 40;
            factors.push('Critical SpO2');
        } else if (spo2 < 95) {
            score += 20;
            factors.push('Low SpO2');
        }
    }

    // Determine Level
    let level = 'LOW';
    if (score >= 70) level = 'CRITICAL';
    else if (score >= 40) level = 'HIGH';
    else if (score >= 20) level = 'MEDIUM';

    return { score, level, factors };
}

module.exports = calculateRiskScore;
