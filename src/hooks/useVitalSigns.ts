import { useState, useEffect, useRef, useCallback } from 'react';

export type VitalSignType = 'heartRate' | 'spo2' | 'systolic' | 'diastolic' | 'temperature' | 'stressLevel' | 'steps' | 'calories';
export type PatientCondition = 'NORMAL' | 'TACHYCARDIA' | 'BRADYCARDIA' | 'HYPOXIA' | 'HYPERTENSIVE_CRISIS' | 'SHOCK';

interface VitalLog {
    time: string;
    value: number;
}

interface VitalsHistory {
    heartRate: VitalLog[];
    spo2: VitalLog[];
    systolic: VitalLog[];
    diastolic: VitalLog[];
    temperature: VitalLog[];
    stressLevel: VitalLog[];
}

interface CurrentVitals {
    heartRate: number;
    spo2: number;
    systolic: number;
    diastolic: number;
    temperature: number;
    stressLevel: number;
    steps: number;
    calories: number;
}

const HISTORY_LENGTH = 30;

// Base ranges for conditions
const RANGES = {
    NORMAL: { hr: [60, 90], spo2: [96, 100], sys: [110, 130], dia: [70, 85], temp: [36.4, 37.0], stress: [10, 30] },
    TACHYCARDIA: { hr: [120, 160], spo2: [95, 99], sys: [110, 140], dia: [70, 90], temp: [37.0, 37.8], stress: [50, 75] },
    BRADYCARDIA: { hr: [30, 50], spo2: [94, 98], sys: [90, 110], dia: [50, 70], temp: [35.5, 36.4], stress: [20, 40] },
    HYPOXIA: { hr: [100, 130], spo2: [80, 88], sys: [130, 150], dia: [85, 100], temp: [37.5, 38.5], stress: [65, 90] },
    HYPERTENSIVE_CRISIS: { hr: [90, 120], spo2: [94, 98], sys: [180, 220], dia: [110, 130], temp: [37.0, 37.5], stress: [70, 95] },
    SHOCK: { hr: [130, 160], spo2: [90, 95], sys: [70, 90], dia: [40, 60], temp: [35.0, 36.2], stress: [80, 100] },
};

export function useVitalSigns(initialCondition: PatientCondition = 'NORMAL') {
    const [condition, setCondition] = useState<PatientCondition>(initialCondition);
    const [history, setHistory] = useState<VitalsHistory>({
        heartRate: [],
        spo2: [],
        systolic: [],
        diastolic: [],
        temperature: [],
        stressLevel: [],
    });

    const dataRef = useRef<CurrentVitals>({
        heartRate: 75,
        spo2: 98,
        systolic: 120,
        diastolic: 80,
        temperature: 36.7,
        stressLevel: 20,
        steps: 4200,
        calories: 185,
    });

    const noiseOffset = useRef(Math.random() * 1000);

    const nextValue = useCallback((current: number, min: number, max: number, noiseFactor: number) => {
        const target = (min + max) / 2;
        const noise = (Math.random() - 0.5) * noiseFactor;
        const delta = (target - current) * 0.15;
        return Math.max(min, Math.min(max, current + delta + noise));
    }, []);

    useEffect(() => {
        let animationFrameId: number;
        let lastUpdate = Date.now();

        const updateLoop = () => {
            const now = Date.now();
            if (now - lastUpdate >= 1000) {
                lastUpdate = now;
                const range = RANGES[condition];

                const newHR = Math.round(nextValue(dataRef.current.heartRate, range.hr[0], range.hr[1], 5));
                const newSpO2 = Math.round(nextValue(dataRef.current.spo2, range.spo2[0], range.spo2[1], 1.5));
                const newSys = Math.round(nextValue(dataRef.current.systolic, range.sys[0], range.sys[1], 4));
                const newDia = Math.round(nextValue(dataRef.current.diastolic, range.dia[0], range.dia[1], 3));
                const newTemp = parseFloat(nextValue(dataRef.current.temperature, range.temp[0], range.temp[1], 0.1).toFixed(1));
                const newStress = Math.round(nextValue(dataRef.current.stressLevel, range.stress[0], range.stress[1], 3));
                const newSteps = dataRef.current.steps + Math.floor(Math.random() * 3);
                const newCal = dataRef.current.calories + (Math.random() > 0.7 ? 1 : 0);

                dataRef.current = {
                    heartRate: newHR,
                    spo2: newSpO2,
                    systolic: newSys,
                    diastolic: newDia,
                    temperature: newTemp,
                    stressLevel: newStress,
                    steps: newSteps,
                    calories: newCal,
                };

                const timeLabel = new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

                setHistory(prev => {
                    const updateSeries = (series: VitalLog[], newVal: number) => {
                        const newSeries = [...series, { time: timeLabel, value: newVal }];
                        return newSeries.slice(-HISTORY_LENGTH);
                    };

                    return {
                        heartRate: updateSeries(prev.heartRate, newHR),
                        spo2: updateSeries(prev.spo2, newSpO2),
                        systolic: updateSeries(prev.systolic, newSys),
                        diastolic: updateSeries(prev.diastolic, newDia),
                        temperature: updateSeries(prev.temperature, newTemp),
                        stressLevel: updateSeries(prev.stressLevel, newStress),
                    };
                });
            }

            animationFrameId = requestAnimationFrame(updateLoop);
        };

        updateLoop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [condition, nextValue]);

    return {
        current: dataRef.current,
        history,
        condition,
        setCondition,
    };
}
