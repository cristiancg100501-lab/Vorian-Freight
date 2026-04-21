import * as turf from '@turf/turf';

export const TOLL_MATCH_RADIUS_METERS = 100;

export const cleanReferenceCode = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, '');

export const isHoliday = (date: Date) => {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const holidays = [
        '1-1', '3-29', '3-30', '5-1', '5-21', '6-20', '6-29', '7-16', '8-15',
        '9-18', '9-19', '9-20', '10-12', '10-31', '11-1', '12-8', '12-25'
    ];
    return holidays.includes(`${m}-${d}`);
};

export const getAvoPrice = (entry: any, exit: any, dateObj: Date, selectedCategory: string, avoMatrix: any[]) => {
    const catNum = selectedCategory === 'cat1' ? 1 : selectedCategory === 'cat2' ? 2 : 3;

    const entryCode = cleanReferenceCode(entry.reference_code);
    const exitCode = cleanReferenceCode(exit.reference_code);

    const match = avoMatrix.find(m => 
        cleanReferenceCode(m.entry_portico_ref) === entryCode && 
        cleanReferenceCode(m.exit_portico_ref) === exitCode &&
        Number(m.category) === catNum
    );
    
    if (!match) {
        return { 
            price: 0, 
            tag: 'TRAMO NO ENCONTRADO EN MATRIZ', 
            color: 'slate-500',
            debug: `Buscando: "${entry.reference_code}" ➔ "${exit.reference_code}" (Cat: ${catNum})`
        };
    }

    const totalMins = dateObj.getHours() * 60 + dateObj.getMinutes();
    const isBusinessDay = dateObj.getDay() >= 1 && dateObj.getDay() <= 5;
    const isPeak = isBusinessDay && ((totalMins >= 450 && totalMins <= 570) || (totalMins >= 1050 && totalMins <= 1170));
    
    const price = isPeak ? match.tbp_price : match.tbfp_price;
    return { 
        price: Number(price), 
        tag: isPeak ? 'TARIFA PUNTA (AVO)' : 'TARIFA VALLE (AVO)', 
        color: 'yellow' 
    };
};

export const calculateTollCost = (portico: any, dateObj: Date, category: string) => {
    const data = portico.tariffs_json?.[category];
    if (!data) return { price: 0, tag: 'SIN TARIFA', color: 'gray-400' };

    const hh = dateObj.getHours().toString().padStart(2, '0');
    const mm = dateObj.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const isSaturday = dateObj.getDay() === 6;
    const isSunday = dateObj.getDay() === 0;
    const isFriday = dateObj.getDay() === 5;
    const isNationalHoliday = isHoliday(dateObj);
    
    const isEveOfHoliday = (() => {
        const tomorrow = new Date(dateObj);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return isHoliday(tomorrow);
    })();

    const isHighSeason = (() => {
        const m = dateObj.getMonth() + 1;
        const d = dateObj.getDate();
        if (m === 12 && d >= 20) return true;
        if (m === 1 || m === 2) return true;
        if (m === 3 && d <= 10) return true;
        return false;
    })();

    const isWeekendCondition = isNationalHoliday || isSunday;

    // Default base price
    let activePriceStr = data.price_tbfp || data.price_tbp || data.price_ts || '0';
    let currentTag = 'TARIFA BASE';
    let color = 'slate-500';

    if (portico.concession_name === 'Ruta 78' || portico.name.includes("Melipilla")) {
        const isEvePhase1 = isFriday || isEveOfHoliday;
        let isSpecialPeriod = false;

        const hr = dateObj.getHours();

        if (isEvePhase1 && hr >= 14 && hr < 24) isSpecialPeriod = true;
        if (isWeekendCondition && hr >= 10 && hr < 24) isSpecialPeriod = true;
        if (isSaturday && hr >= 10 && hr < 14) isSpecialPeriod = true;
        if (isHighSeason && isWeekendCondition && hr >= 8 && hr < 24) isSpecialPeriod = true;

        if (isSpecialPeriod && data.price_tbp) {
            activePriceStr = data.price_tbp;
            currentTag = 'TBP RUTA 78';
            color = 'blue-400';
        } else {
            activePriceStr = data.price_tbfp || activePriceStr;
            currentTag = 'TBFP RUTA 78';
            color = 'blue-200';
        }
    } else {
        const checkWindow = (windowsStr: string | undefined): boolean => {
            if (!windowsStr || windowsStr === '0' || windowsStr.trim() === '') return false;
            const ranges = windowsStr.split(',').map(r => r.trim());
            for (const range of ranges) {
                const [start, end] = range.split(' a ').map(s => s.trim().replace(' hrs.', ''));
                if (!start || !end) continue;
                if (timeStr >= start && timeStr <= end) return true;
            }
            return false;
        };

        if (isWeekendCondition) {
            if (checkWindow(data.ts_domingo)) { activePriceStr = data.price_ts; currentTag = 'TS DOM/FERIADO'; color = 'red-500'; }
            else if (checkWindow(data.tbp_domingo)) { activePriceStr = data.price_tbp; currentTag = 'TBP DOM/FERIADO'; color = 'amber-500'; }
            else { activePriceStr = data.price_tbfp || activePriceStr; currentTag = 'TBFP DOM/FERIADO'; color = 'green-500'; }
        } else if (isSaturday) {
            if (checkWindow(data.ts_sabado)) { activePriceStr = data.price_ts; currentTag = 'TS SÁBADO'; color = 'red-500'; }
            else if (checkWindow(data.tbp_sabado)) { activePriceStr = data.price_tbp; currentTag = 'TBP SÁBADO'; color = 'amber-500'; }
            else { activePriceStr = data.price_tbfp || activePriceStr; currentTag = 'TBFP SÁBADO'; color = 'green-500'; }
        } else {
            if (checkWindow(data.ts_laboral)) { activePriceStr = data.price_ts; currentTag = 'TS LABORAL'; color = 'red-500'; }
            else if (checkWindow(data.tbp_laboral)) { activePriceStr = data.price_tbp; currentTag = 'TBP LABORAL'; color = 'amber-500'; }
            else { activePriceStr = data.price_tbfp || activePriceStr; currentTag = 'TBFP LABORAL'; color = 'green-500'; }
        }
    }

    return { price: Number(activePriceStr) || 0, tag: currentTag, color };
};

export const getTollsForRoute = (
    routeGeometry: any, 
    porticos: any[], 
    avoMatrix: any[], 
    pickupDateObj: Date, 
    selectedCategory: string
) => {
    if (!routeGeometry || !porticos.length) return { tollsCost: 0, tollsCount: 0, breakdowns: [], tollNames: [] };

    const routeLine = turf.lineString(routeGeometry.coordinates);
    let potentialTolls: any[] = [];

    porticos.forEach(portico => {
        if (!portico.latitude || !portico.longitude) return;
        const pt = turf.point([portico.longitude, portico.latitude]);
        const dist = turf.pointToLineDistance(pt, routeLine, { units: 'meters' });
        
        if (dist <= TOLL_MATCH_RADIUS_METERS) {
            const snapped = turf.nearestPointOnLine(routeLine, pt);
            const pos = snapped.properties.location || 0;
            potentialTolls.push({ portico, dist, pos });
        }
    });

    const grouped = new Map<string, any>();
    potentialTolls.forEach(item => {
        const key = item.portico.reference_code || item.portico.name || item.portico.id;
        if (!grouped.has(key)) {
            grouped.set(key, item);
        } else {
            if (item.dist < grouped.get(key).dist) {
                grouped.set(key, item);
            }
        }
    });

    let crossedArray = Array.from(grouped.values()).sort((a, b) => a.pos - b.pos);

    const avoPorticos = crossedArray.filter(item => item.portico.concession_name === 'AVO');
    const standardPorticos = crossedArray.filter(item => item.portico.concession_name !== 'AVO');

    let breakdowns: any[] = [];
    let tollsCost = 0;
    
    // Process Standard Tolls
    standardPorticos.forEach(item => {
        const portico = item.portico;
        // Simulating travel time progression
        // Assuming average speed 60km/h: pos is distance in kilometers (turf nearestPointOnLine returns pos in km if units not explicitly set? turf uses degrees by default for line-length... wait!)
        // nearestPointOnLine return properties.location in the same unit as the measurement, which by default is km!
        const travelMins = item.pos / 60 * 60; // pos km / 60km/hr * 60 mins = pos mins!
        const porticoTimeObj = new Date(pickupDateObj.getTime() + travelMins * 60 * 1000);
        
        const pricing = calculateTollCost(portico, porticoTimeObj, selectedCategory);
        breakdowns.push({ 
            name: portico.name, 
            cost: pricing.price, 
            tag: pricing.tag, 
            color: pricing.color 
        });
        tollsCost += pricing.price;
    });

    // Process AVO Section
    if (avoPorticos.length >= 1) {
        const entry = avoPorticos[0].portico;
        const exit = avoPorticos[avoPorticos.length - 1].portico;
        
        // Simulating entry time
        const travelMins = avoPorticos[0].pos / 60 * 60;
        const entryTimeObj = new Date(pickupDateObj.getTime() + travelMins * 60 * 1000);

        const avoPricing = getAvoPrice(entry, exit, entryTimeObj, selectedCategory, avoMatrix);
        
        breakdowns.push({
            name: `Tramo AVO: ${entry.name} ➔ ${exit.name}`,
            cost: avoPricing.price,
            tag: avoPricing.tag,
            color: avoPricing.color
        });
        tollsCost += avoPricing.price;
        
        // Add zero-cost visual markers for all intermediate AVO porticos so Map can render them!
        avoPorticos.forEach(item => {
            breakdowns.push({
                name: item.portico.name,
                cost: 0,
                tag: 'PARTE DE TRAMO AVO',
                color: avoPricing.color
            });
        });
    }

    return { 
        tollsCost, 
        tollsCount: crossedArray.length, 
        breakdowns,
        tollNames: crossedArray.map(t => t.portico.name)
    };
};
