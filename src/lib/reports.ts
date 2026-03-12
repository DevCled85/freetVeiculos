import { supabase, Vehicle, Damage, FuelLog, Checklist, Profile } from './supabase';

export interface ReportMetrics {
    totalFuelLiters: number;
    totalFuelCost: number;
    globalAvgConsumption: number;
    totalVehicles: number;
    activeVehicles: number;
    maintenanceVehicles: number;
    pendingDamages: number;
    resolvedDamages: number;
}

/*
- **New Flags**: Added `is_super` to `profiles` and `is_super_data` to all shared tables (`vehicles`, `checklists`, `damages`, `fuel_logs`, `notifications`, `audit_logs`).
- **Self-Visibility**: Ensured that even isolated test users can ALWAYS see their own profile and records, allowing them to log in and interact with the system correctly while remaining hidden from others.
*/
export interface ReportData {
    vehicles: Vehicle[];
    damages: Damage[];
    fuelLogs: FuelLog[];
    checklists: Checklist[];
    profiles: Pick<Profile, 'id' | 'full_name'>[];
    metrics: ReportMetrics;
    vehicleMetrics: Record<string, {
        kmTraveled: number;
        liters: number;
        cost: number;
        avg: number;
        minKm: number;
        maxKm: number;
    }>;
}

/**
 * Fetches all the necessary data to assemble a complete System Report snapshot.
 * Provide optional startDate and endDate strings in YYYY-MM-DD format to filter the data.
 */
export const generateReportData = async (startDate?: string, endDate?: string): Promise<ReportData> => {
    let damagesQuery = supabase.from('damages').select('*, vehicles(brand, model, plate, color)');
    let fuelQuery = supabase.from('fuel_logs').select('*, vehicles(brand, model, plate, color)').order('created_at', { ascending: false });
    let checklistQuery = supabase.from('checklists').select('*, checklist_items(*), vehicles(brand, model, plate, color)').order('created_at', { ascending: false });

    if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        damagesQuery = damagesQuery.gte('created_at', start.toISOString());
        fuelQuery = fuelQuery.gte('created_at', start.toISOString());
        checklistQuery = checklistQuery.gte('created_at', start.toISOString());
    }
    if (endDate) {
        const end = new Date(endDate + 'T23:59:59.999');
        damagesQuery = damagesQuery.lte('created_at', end.toISOString());
        fuelQuery = fuelQuery.lte('created_at', end.toISOString());
        checklistQuery = checklistQuery.lte('created_at', end.toISOString());
    }

    // Data range: let's get everything for a global report, or filtering by dates.
    const [vehRes, damRes, fuelRes, checkRes, profRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        damagesQuery,
        fuelQuery,
        checklistQuery,
        supabase.from('profiles').select('id, full_name, is_super')
    ]);

    if (vehRes.error) throw vehRes.error;
    if (damRes.error) throw damRes.error;
    if (fuelRes.error) throw fuelRes.error;
    if (checkRes.error) throw checkRes.error;

    const rawProfiles = profRes.data || [];
    const superUser = rawProfiles.find(p => (p as any).is_super);
    const superUserId = superUser?.id;

    const vehicles = vehRes.data as Vehicle[];
    const profiles = rawProfiles.filter(p => p.id !== superUserId);
    const damages = superUserId ? (damRes.data as Damage[]).filter(d => d.reported_by !== superUserId) : damRes.data as Damage[];
    const fuelLogs = superUserId ? (fuelRes.data as FuelLog[]).filter(f => f.driver_id !== superUserId) : fuelRes.data as FuelLog[];
    const checklists = superUserId ? (checkRes.data || []).filter(c => c.driver_id !== superUserId) : checkRes.data || [];

    // Calculate Metrics
    let totalFuelLiters = 0;
    let totalFuelCost = 0;
    let pendingDamages = 0;
    let resolvedDamages = 0;

    const vMetrics: Record<string, { kmTraveled: number; liters: number; cost: number; avg: number; minKm: number; maxKm: number }> = {};

    vehicles.forEach(v => {
        vMetrics[v.id] = { kmTraveled: 0, liters: 0, cost: 0, avg: 0, minKm: Infinity, maxKm: 0 };
    });

    fuelLogs.forEach(log => {
        totalFuelLiters += log.liters;
        totalFuelCost += log.value;
        const vid = log.vehicle_id;
        if (vMetrics[vid]) {
            vMetrics[vid].liters += log.liters;
            vMetrics[vid].cost += log.value;
            if (log.mileage < vMetrics[vid].minKm) vMetrics[vid].minKm = log.mileage;
            if (log.mileage > vMetrics[vid].maxKm) vMetrics[vid].maxKm = log.mileage;
        }
    });

    let totalKmTraveled = 0;
    Object.keys(vMetrics).forEach(vid => {
        const met = vMetrics[vid];
        if (met.maxKm > met.minKm && met.minKm !== Infinity) {
            met.kmTraveled = met.maxKm - met.minKm;
            totalKmTraveled += met.kmTraveled;
        }
        if (met.liters > 0 && met.kmTraveled > 0) {
            met.avg = met.kmTraveled / met.liters;
        }
    });

    let globalAvgConsumption = 0;
    if (totalFuelLiters > 0 && totalKmTraveled > 0) {
        globalAvgConsumption = totalKmTraveled / totalFuelLiters;
    }

    damages.forEach(d => {
        if (d.status === 'resolved') resolvedDamages++;
        else pendingDamages++;
    });

    return {
        vehicles,
        damages,
        fuelLogs,
        checklists,
        profiles,
        metrics: {
            totalFuelLiters,
            totalFuelCost,
            globalAvgConsumption,
            totalVehicles: vehicles.length,
            activeVehicles: vehicles.filter(v => v.status === 'active').length,
            maintenanceVehicles: vehicles.filter(v => ['maintenance', 'inactive'].includes(v.status)).length,
            pendingDamages,
            resolvedDamages
        },
        vehicleMetrics: vMetrics
    };
};
