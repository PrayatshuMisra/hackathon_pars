import { z } from "zod";

export const patientSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    age: z.coerce.number().min(0, "Age must be valid").max(120, "Age must be realistic"),
    gender: z.enum(["Male", "Female", "Other"]),
    symptoms: z.string().min(5, "Please describe symptoms in more detail"),
    emergencyName: z.string().min(2, "Contact name is required").optional().or(z.literal("")),
    emergencyPhone: z.string().regex(/^\+?[\d\s-]{10,}$/, "Invalid phone number").optional().or(z.literal("")),
});

export type PatientFormValues = z.infer<typeof patientSchema>;
