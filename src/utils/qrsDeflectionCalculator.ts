/**
 * QRS Deflection Calculator
 * 
 * This utility provides functions to calculate realistic QRS deflections
 * for all six limb leads (I, II, III, aVR, aVL, aVF) based on a specified QRS axis angle.
 * 
 * The calculations are based on the principles of cardiac vectors and Einthoven's triangle.
 */


/**
 * Represents the QRS deflection in millimeters for a single lead
 */
export interface QRSDeflection {
  q: number; // Q wave deflection in mm
  r: number; // R wave deflection in mm
  s: number; // S wave deflection in mm
}

/**
 * Represents QRS deflections for all six limb leads
 */
export interface LimbLeadDeflections {
  leadI: QRSDeflection;
  leadII: QRSDeflection;
  leadIII: QRSDeflection;
  aVR: QRSDeflection;
  aVL: QRSDeflection;
  aVF: QRSDeflection;
}

/**
 * Calculates the projection of the QRS vector onto a specified lead angle
 * @param qrsAxisAngle - QRS axis angle in degrees
 * @param leadAngle - Lead angle in degrees
 * @returns The projection value (between -1 and 1)
 */
export const calculateLeadProjection = (qrsAxisAngle: number, leadAngle: number): number => {
  // Convert angles to radians
  const qrsRad = (qrsAxisAngle * Math.PI) / 180;
  const leadRad = (leadAngle * Math.PI) / 180;

  // Calculate dot product of unit vectors
  // cos(θ1) * cos(θ2) + sin(θ1) * sin(θ2) = cos(θ1 - θ2)
  return Math.cos(qrsRad - leadRad);
};

// Clinical minimum values in mm for QRS deflections based on literature
const MIN_CLINICAL_VALUES = {
  Q_AMPLITUDE: 0,     // Eliminated Q waves for educational purposes
  R_AMPLITUDE: 3.5,   // Unchanged
  S_AMPLITUDE: 2.0,   // Unchanged
  TOTAL_AMPLITUDE: 7.0 // Unchanged
};

// Lower minimums for R waves in negative projections to allow proper QS dominance
const MIN_R_FOR_NEGATIVE_PROJECTION = 0.2; // Increased from 0.1

// For extremely negative projections, use virtually no R wave
const MIN_R_FOR_EXTREME_NEGATIVE = 0.05; // Increased from 0.02


/**
 * Generate a realistic QRS complex deflection based on the projection value
 * @param projection - Projection value from -1 to 1
 * @param baseAmplitude - Base amplitude to scale the deflection
 * @returns QRS deflection with q, r, and s values
 */
export const generateQRSDeflection = (projection: number, baseAmplitude: number): QRSDeflection => {
  // Handle invalid input values
  if (projection === undefined || baseAmplitude === undefined || isNaN(projection) || isNaN(baseAmplitude)) {
    return { q: 0, r: 1, s: 0 }; // Return safe default values
  }

  // Increase base amplitude by 300% to make waveforms more prominent
  baseAmplitude = baseAmplitude * 3.0;

  // Calculate actual deflection values based on projection and area-under-curve concept
  let q = 0, r = 0, s = 0;
  
  // Perpendicular threshold - when projection is near zero, create isoelectric pattern
  const PERPENDICULAR_THRESHOLD = 0.15;
  const isNearlyPerpendicular = Math.abs(projection) < PERPENDICULAR_THRESHOLD;
  
  // Fully perpendicular (projection near zero) - create isoelectric pattern (area-under-curve sums to zero)
  if (isNearlyPerpendicular) {
    // Calculate how close to perpendicular we are (0 = exactly perpendicular, 1 = at threshold)
    const perpendicularFactor = Math.abs(projection) / PERPENDICULAR_THRESHOLD;
    
    // For isoelectric pattern, we need equal area under Q-S and R components
    // Since area is amplitude × width (and we assume constant width), we balance amplitudes
    if (projection >= 0) {
      // Slight positive projection - create balanced pattern with slightly higher R wave
      r = MIN_CLINICAL_VALUES.R_AMPLITUDE * (1.5 + perpendicularFactor);
      q = -MIN_CLINICAL_VALUES.Q_AMPLITUDE * (1.0 + (0.5 * perpendicularFactor));
      s = -MIN_CLINICAL_VALUES.S_AMPLITUDE * (1.0 + (0.5 * perpendicularFactor));
      
      // Ensure area under curve sums close to zero (R area ≈ Q+S area)
      // We use 1.0 as approximate relative widths
      const rArea = r * 1.0;
      const qsArea = Math.abs(q) * 0.5 + Math.abs(s) * 0.5;
      
      // If areas aren't balanced, adjust s-wave to compensate
      if (Math.abs(rArea - qsArea) > 0.2 * Math.max(rArea, qsArea)) {
        s = -((rArea / 0.5) - Math.abs(q));
      }
    } else {
      // Slight negative projection - create balanced pattern with slightly higher Q-S waves
      r = MIN_CLINICAL_VALUES.R_AMPLITUDE * (1.5 - perpendicularFactor * 0.3);
      q = -MIN_CLINICAL_VALUES.Q_AMPLITUDE * (1.2 + perpendicularFactor * 0.3);
      s = -MIN_CLINICAL_VALUES.S_AMPLITUDE * (1.2 + perpendicularFactor * 0.3);
      
      // Ensure area under curve sums close to zero (R area ≈ Q+S area)
      const rArea = r * 1.0;
      const qsArea = Math.abs(q) * 0.5 + Math.abs(s) * 0.5;
      
      // If areas aren't balanced, adjust r-wave to compensate
      if (Math.abs(rArea - qsArea) > 0.2 * Math.max(rArea, qsArea)) {
        r = qsArea;
      }
    }
  }
  // Positive projection (vector aligned with lead) - create R-dominant pattern
  else if (projection > 0) {
    // Scale amplitude based on projection strength
    const scaledAmplitude = baseAmplitude * (0.5 + (projection * 0.5));
    
    // R-dominant pattern - area under R should be greater than area under Q+S
    r = scaledAmplitude * 0.8; // Majority of amplitude goes to R
    
    // Partition remaining amplitude between Q and S waves inversely to projection
    // As projection increases, Q and S decrease relative to R
    const qsRatio = Math.max(0.1, 0.5 - (projection * 0.4));
    q = -scaledAmplitude * qsRatio * 0.4;
    s = -scaledAmplitude * qsRatio * 0.6;
    
    // For very strong projection, further reduce Q wave
    if (projection > 0.7) {
      q *= (1 - ((projection - 0.7) / 0.3) * 0.5);
    }
  }
  // Negative projection (vector opposing lead) - create QS-dominant pattern
  else {
    // Scale amplitude based on projection strength
    const projectionStrength = Math.abs(projection);
    const scaledAmplitude = baseAmplitude * (0.5 + (projectionStrength * 0.5));
    
    // Q and S dominant pattern - area under Q+S should be much greater than area under R
    // Partition amplitude between Q, R, and S based on projection strength
    // Drastically reduce R-wave ratio for opposing vectors
    const rRatio = Math.max(0.05, 0.2 - (projectionStrength * 0.2)); // Severely reduced from 0.1/0.4/0.4 to 0.05/0.2/0.2
    r = scaledAmplitude * rRatio;
    
    // For very negative projection, create deep QS pattern with minimal R wave
    if (projectionStrength > 0.7) {
      const deepQSFactor = (projectionStrength - 0.7) / 0.3;
      
      // Nearly eliminate R wave for very negative projections
      r *= (1 - deepQSFactor * 0.98); // Almost completely eliminate for extreme negative
      
      // Deep QS pattern with dominant Q wave and S wave
      q = -scaledAmplitude * (0.7 + (deepQSFactor * 0.3)); // Significantly increased
      s = -scaledAmplitude * (0.6 + (deepQSFactor * 0.3)); // Significantly increased
    } else {
      // Standard negative projection with enhanced Q and S waves
      q = -scaledAmplitude * 0.65; // Increased
      s = -scaledAmplitude * 0.55; // Increased
    }
    
    // For strong negative projection, make sure Q+S area overwhelmingly exceeds R area
    if (projectionStrength > 0.5) {
      const qsArea = Math.abs(q) + Math.abs(s);
      const rArea = r;
      
      // If R area is still too large relative to QS, further reduce it
      if (rArea > qsArea * 0.08) { // Drastically reduced from 0.25 to 0.08
        r = qsArea * 0.08;
      }
    }
    
    // For extreme negative projections, enforce a virtually non-existent R wave
    if (projectionStrength > 0.8) {
      const qsArea = Math.abs(q) + Math.abs(s);
      // Cap R at 5% of Q+S for extreme negative projections
      if (r > qsArea * 0.05) {
        r = qsArea * 0.05;
      }
    }
  }
  
  // Apply minimum values but ensure the area-under-curve relationship is maintained
  // For R waves, ensure minimum visibility ONLY if not a negative projection
  if (projection >= 0) {
    r = Math.max(r, MIN_CLINICAL_VALUES.R_AMPLITUDE);
  } else {
    // For negative projections, use extremely low minimum for R to allow proper QS dominance
    const strength = Math.abs(projection);
    if (strength > 0.8) {
      // For extreme negative projections, use virtually no minimum
      r = Math.max(r, MIN_R_FOR_EXTREME_NEGATIVE);
    } else {
      // For moderate negative projections, use lower minimum
      r = Math.max(r, MIN_R_FOR_NEGATIVE_PROJECTION);
    }
  }
  
  // For Q and S waves, keep as zeros if they started as zeros, otherwise ensure minimum
  if (q < 0) q = Math.min(q, -MIN_CLINICAL_VALUES.Q_AMPLITUDE);
  if (s < 0) s = Math.min(s, -MIN_CLINICAL_VALUES.S_AMPLITUDE);
  
  // Ensure the final total deflection has sufficient amplitude (min 3.5 mV)
  const totalAmplitude = Math.abs(q) + r + Math.abs(s);
  if (totalAmplitude < MIN_CLINICAL_VALUES.TOTAL_AMPLITUDE) {
    // For negative projections, prioritize boosting Q and S over R
    if (projection < 0) {
      // Calculate how much additional amplitude we need
      const deficit = MIN_CLINICAL_VALUES.TOTAL_AMPLITUDE - totalAmplitude;
      // Distribute the deficit to Q and S, preserving their ratio
      const qsRatio = Math.abs(q) / (Math.abs(q) + Math.abs(s) + 0.0001); // Avoid division by zero
      
      // Apply the boost primarily to Q and S
      q -= deficit * qsRatio;
      s -= deficit * (1 - qsRatio);
      
      // Don't boost R at all for negative projections
    } else {
      // Standard boost for all components
      const boostFactor = MIN_CLINICAL_VALUES.TOTAL_AMPLITUDE / totalAmplitude;
      q *= boostFactor;
      r *= boostFactor;
      s *= boostFactor;
    }
  }
  
  // Return the final QRS deflection
  return {
    q: q,
    r: r,
    s: s
  };
};

/**
 * Normalize deflections to ensure they're within reasonable bounds
 * @param deflections - QRS deflections for all limb leads
 * @returns Normalized deflections
 */
export const normalizeDeflections = <T extends { q: number; r: number; s: number }>(deflections: Record<string, T>): Record<string, T> => {
  // Make a deep copy of the deflections to avoid modifying the original
  const normalizedDeflections = {} as Record<string, T>;
  for (const lead in deflections) {
    normalizedDeflections[lead] = { ...deflections[lead] };
  }

  // Find the maximum absolute amplitude across all leads
  let maxRAmplitude = 0;
  let maxQSAmplitude = 0;
  let maxNegativeDominantLead = "";
  let maxNegativeDominance = 0;

  // First pass - identify the maximum amplitudes and negative-dominant leads
  for (const lead in normalizedDeflections) {
    const { q, r, s } = normalizedDeflections[lead];
    maxRAmplitude = Math.max(maxRAmplitude, r);
    maxQSAmplitude = Math.max(maxQSAmplitude, Math.abs(q) + Math.abs(s));
    
    // Calculate negative dominance (how much QS dominates over R)
    const qsArea = Math.abs(q) + Math.abs(s);
    const negativeDominance = qsArea > 0 ? qsArea / (r + 0.0001) : 0;
    
    // Track the lead with maximum negative dominance
    if (negativeDominance > maxNegativeDominance) {
      maxNegativeDominance = negativeDominance;
      maxNegativeDominantLead = lead;
    }
  }

  // Calculate a scaling factor if any amplitude exceeds the maximum
  const MAX_TOTAL_AMPLITUDE = 10.0;  // Reduced from 20.0 to match our half-height scale
  const MAX_R_AMPLITUDE = 8.0;       // Reduced from 16.0 to match our half-height scale
  const MAX_QS_AMPLITUDE = 8.0;      // Reduced from 16.0 to match our half-height scale
  
  // Check if we need to scale down
  const totalMaxAmplitude = maxRAmplitude + maxQSAmplitude;
  const rScalingFactor = maxRAmplitude > MAX_R_AMPLITUDE ? MAX_R_AMPLITUDE / maxRAmplitude : 1;
  const qsScalingFactor = maxQSAmplitude > MAX_QS_AMPLITUDE ? MAX_QS_AMPLITUDE / maxQSAmplitude : 1;
  const totalScalingFactor = totalMaxAmplitude > MAX_TOTAL_AMPLITUDE ? MAX_TOTAL_AMPLITUDE / totalMaxAmplitude : 1;
  
  // Use the most restrictive scaling factor
  const scalingFactor = Math.min(rScalingFactor, qsScalingFactor, totalScalingFactor);
  
  // If scaling is needed
  if (scalingFactor < 1) {
    // Second pass - apply scaling with special handling for negative-dominant leads
    for (const lead in normalizedDeflections) {
      const deflection = normalizedDeflections[lead];
      
      // Determine if this is a negative-dominant lead (high QS to R ratio)
      const { q, r, s } = deflection;
      const qsArea = Math.abs(q) + Math.abs(s);
      const rArea = r;
      const isNegativeDominant = (qsArea > rArea * 3);
      
      // Special case - preserve negative dominance for negative-dominant leads
      if (isNegativeDominant) {
        // Scale QS with normal factor but use enhanced factor for R to preserve QS dominance
        deflection.q *= scalingFactor;
        deflection.s *= scalingFactor;
        
        // Scale R more aggressively to preserve negative dominance
        const rScaleFactor = Math.min(scalingFactor, scalingFactor * 0.7);
        deflection.r *= rScaleFactor;
        
        // Additional check to ensure R doesn't dominate after scaling
        const scaledQsArea = Math.abs(deflection.q) + Math.abs(deflection.s);
        const scaledRArea = deflection.r;
        
        // If scaling made R relatively too large, reduce it further
        if (scaledRArea > scaledQsArea * 0.2) {
          deflection.r = scaledQsArea * 0.2;
        }
      } 
      // For leads with extreme negative dominance, preserve it even more aggressively
      else if (lead === maxNegativeDominantLead && maxNegativeDominance > 8) {
        // Scale Q and S with slightly relaxed factor
        const qsScaleFactor = Math.min(1, scalingFactor * 1.2);
        deflection.q *= qsScaleFactor;
        deflection.s *= qsScaleFactor;
        
        // Scale R very aggressively
        const rScaleFactor = Math.min(scalingFactor, scalingFactor * 0.5);
        deflection.r *= rScaleFactor;
        
        // Ensure R remains minimal
        const scaledQsArea = Math.abs(deflection.q) + Math.abs(deflection.s);
        deflection.r = Math.min(deflection.r, scaledQsArea * 0.1);
      }
      // Normal case - apply standard scaling
      else {
        deflection.q *= scalingFactor;
        deflection.r *= scalingFactor;
        deflection.s *= scalingFactor;
      }
    }
  }

  // Return the normalized deflections
  return normalizedDeflections;
};

/**
 * Normalize limb lead deflections to keep amplitudes within reasonable bounds
 */
function normalizeLimbLeadDeflections(deflections: LimbLeadDeflections): LimbLeadDeflections {
  const MAX_DEFLECTION = 9.0; // Reduced from 18.0 to match our new half-height scale
  
  // Create a deep copy and sanitize any invalid values
  const sanitizedDeflections: LimbLeadDeflections = JSON.parse(JSON.stringify(deflections));
  
  // Ensure all values are valid numbers
  Object.keys(sanitizedDeflections).forEach(lead => {
    const leadKey = lead as keyof LimbLeadDeflections;
    const deflection = sanitizedDeflections[leadKey];
    
    if (!isValidNumber(deflection.q)) deflection.q = 0;
    if (!isValidNumber(deflection.r)) deflection.r = 1.0;
    if (!isValidNumber(deflection.s)) deflection.s = -0.5;
  });
  
  // Calculate the maximum absolute value across all deflections
  let maxAbsValue = 0;
  
  Object.keys(sanitizedDeflections).forEach(lead => {
    const leadKey = lead as keyof LimbLeadDeflections;
    const deflection = sanitizedDeflections[leadKey];
    
    Object.keys(deflection).forEach(component => {
      const compKey = component as keyof QRSDeflection;
      const value = deflection[compKey];
      if (isValidNumber(value)) {
        maxAbsValue = Math.max(maxAbsValue, Math.abs(value));
      }
    });
  });
  
  // If the maximum value exceeds our threshold, scale everything down proportionally
  if (maxAbsValue > MAX_DEFLECTION && maxAbsValue > 0) {
    const scaleFactor = MAX_DEFLECTION / maxAbsValue;
    
    Object.keys(sanitizedDeflections).forEach(lead => {
      const leadKey = lead as keyof LimbLeadDeflections;
      Object.keys(sanitizedDeflections[leadKey]).forEach(component => {
        const compKey = component as keyof QRSDeflection;
        sanitizedDeflections[leadKey][compKey] *= scaleFactor;
      });
    });
  }
  
  return sanitizedDeflections;
}

// Helper function to check if a value is a valid number
function isValidNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}


/**
 * Calculate the QRS deflections for all 6 limb leads based on the QRS axis angle
 */
export function calculateLimbLeadDeflections(axisAngle: number, baseAmplitude: number = 1.0): LimbLeadDeflections {
  // Ensure the axis angle is within the valid range
  axisAngle = ((axisAngle % 360) + 360) % 360;
  if (axisAngle > 180) {
    axisAngle -= 360;
  }

  // Define lead angles in the hexaxial reference system
  const leadAngles = {
    leadI: 0,
    leadII: 60,
    leadIII: 120,
    aVR: -150,
    aVL: -30,
    aVF: 90
  };
  
  // First calculate deflections for Lead I and Lead II using projection
  const leadI = createQRSDeflection(axisAngle, leadAngles.leadI, baseAmplitude);
  const leadII = createQRSDeflection(axisAngle, leadAngles.leadII, baseAmplitude);
  
  // Ensure r and s values are valid numbers
  if (!isValidNumber(leadI.r)) leadI.r = 0;
  if (!isValidNumber(leadI.s)) leadI.s = 0;
  if (!isValidNumber(leadII.r)) leadII.r = 0;
  if (!isValidNumber(leadII.s)) leadII.s = 0;
  
  // Calculate Lead III using direct vector projection for proper peak morphology
  // NOTE: Using direct projection instead of Einthoven's Law (Lead II - Lead I)
  // prevents flat peaks while maintaining clinical accuracy for education
  const leadIII_direct = createQRSDeflection(axisAngle, leadAngles.leadIII, baseAmplitude);
  const leadIII = {
    q: 0, // Always zero for educational purposes
    r: leadIII_direct.r,
    s: leadIII_direct.s
  };
  
  // UNIFIED APPROACH: All augmented leads use direct vector projection
  // This ensures consistent morphology and eliminates visual artifacts
  
  // aVR: Use direct vector projection for consistency with other leads
  const aVR_direct = createQRSDeflection(axisAngle, leadAngles.aVR, baseAmplitude);
  const aVR = {
    q: 0, // Always zero for educational purposes
    r: aVR_direct.r,
    s: aVR_direct.s
  };
  
  // aVL: Direct vector projection prevents flat peaks
  const aVL_direct = createQRSDeflection(axisAngle, leadAngles.aVL, baseAmplitude);
  const aVL = {
    q: 0, // Always zero for educational purposes
    r: aVL_direct.r,
    s: aVL_direct.s
  };
  
  // aVF: Direct vector projection prevents flat peaks
  const aVF_direct = createQRSDeflection(axisAngle, leadAngles.aVF, baseAmplitude);
  const aVF = {
    q: 0, // Always zero for educational purposes
    r: aVF_direct.r,
    s: aVF_direct.s
  };
  
  // Combine all leads
  const deflections: LimbLeadDeflections = {
    leadI,
    leadII,
    leadIII,
    aVR,
    aVL,
    aVF
  };

  // Apply minimum clinical values to ensure they're visually distinguishable
  const deflectionsWithMins = applyMinimumValues(deflections);
  
  // Normalize to ensure amplitude stays within reasonable bounds
  const normalizedDeflections = normalizeLimbLeadDeflections(deflectionsWithMins);
  
  return normalizedDeflections;
}

/**
 * Apply minimum clinical values to QRS deflections to ensure they're visually distinguishable
 */
function applyMinimumValues(deflections: LimbLeadDeflections): LimbLeadDeflections {
  const minValues: Record<string, number> = {
    q: 0,     // Always zero for educational purposes
    r: 0.3,   // Unchanged 
    s: 0.15   // Unchanged
  };

  // Create a deep copy to avoid modifying the original
  const result: LimbLeadDeflections = JSON.parse(JSON.stringify(deflections));
  
  // Apply minimum values to each lead's deflections
  Object.keys(result).forEach(lead => {
    const leadKey = lead as keyof LimbLeadDeflections;
    
    // Always set Q to 0 for educational purposes
    result[leadKey].q = 0;
    
    // Apply minimum values to R and S
    ['r', 's'].forEach(component => {
      const compKey = component as keyof QRSDeflection;
      const value = result[leadKey][compKey];
      
      // Only apply minimum if the component exists and is below the minimum threshold
      if (value !== 0 && Math.abs(value) < minValues[component]) {
        result[leadKey][compKey] = value > 0 ? minValues[component] : -minValues[component];
      }
    });
  });
  
  return result;
}

/**
 * Generate a QRS deflection for a given lead based on the QRS axis angle
 */
function createQRSDeflection(axisAngle: number, leadAngle: number, baseAmplitude: number = 1.0): QRSDeflection {
  // Validate inputs to prevent NaN values
  if (!isValidNumber(axisAngle)) axisAngle = 0;
  if (!isValidNumber(leadAngle)) leadAngle = 0;
  if (!isValidNumber(baseAmplitude) || baseAmplitude <= 0) baseAmplitude = 1.0;
  
  // Increase the base amplitude for visibility, but scale appropriately to only use half the display height
  const amplifiedBaseAmplitude = baseAmplitude * 1.8; // Reduced from 3.0 to make waveforms use about half the display height
  
  // Calculate the angle difference between QRS axis and lead angle
  // Normalize it to range [-180, 180]
  let angleDiff = normalizeAngle(leadAngle - axisAngle);
  
  // Convert to absolute difference in range [0, 180]
  const absAngleDiff = Math.abs(angleDiff);
  
  // For educational purposes, we're eliminating Q waves entirely
  const qValue = 0; // No Q waves
  
  // Define a constant total amplitude for R+S to maintain consistent transitions
  // This will be distributed between R and S based on angle difference
  // Reduced to occupy only half of the display height
  const TOTAL_AMPLITUDE = 3.0 * amplifiedBaseAmplitude; // Reduced from 6.0
  
  // Calculate proportion distribution between R and S based on angle difference
  // At 0°, R gets 90% of total amplitude, S gets 10%
  // At 90°, R gets 50% of total amplitude, S gets 50%
  // At 180°, R gets 10% of total amplitude, S gets 90%
  
  // Normalize angle difference to a proportion from 0 to 1
  const angleProportion = absAngleDiff / 180;
  
  // Calculate R and S distribution (from 90% down to 10% for R, opposite for S)
  // Linear interpolation between extremes
  const rProportion = 0.9 - (0.8 * angleProportion);
  const sProportion = 0.1 + (0.8 * angleProportion);
  
  // Calculate initial R and S amplitudes
  let rAmp = TOTAL_AMPLITUDE * rProportion;
  let sAmp = -(TOTAL_AMPLITUDE * sProportion);
  
  // For 90-degree difference (perpendicular), ensure we have about 12.5% of display height
  // (which is 25% of the half-height we're targeting)
  // At 90 degrees, angleProportion = 0.5, so both R and S should be equal
  if (Math.abs(absAngleDiff - 90) < 5) {
    // Fine-tune to exactly 12.5% of expected display height
    rAmp = 1.5 * amplifiedBaseAmplitude; // Reduced from 3.0
    sAmp = -1.5 * amplifiedBaseAmplitude; // Reduced from 3.0
  }
  
  // Apply some additional scaling to enhance extreme cases
  // For near 0° alignment, boost R even more
  if (absAngleDiff < 15) {
    rAmp *= 1.2;
    sAmp *= 0.8;
  }
  
  // For near 180° opposition, boost S even more
  if (absAngleDiff > 165) {
    rAmp *= 0.8;
    sAmp *= 1.2;
  }
  
  // Final validation to ensure we don't return NaN values
  if (!isValidNumber(rAmp)) rAmp = 1.0;
  if (!isValidNumber(sAmp)) sAmp = -0.5;
  
  return {
    q: qValue,
    r: rAmp,
    s: sAmp
  };
}

/**
 * Normalize an angle to the range [-180, 180]
 */
function normalizeAngle(angle: number): number {
  // Validate input to prevent NaN values
  if (!isValidNumber(angle)) return 0;
  
  angle = ((angle % 360) + 360) % 360;
  if (angle > 180) {
    angle -= 360;
  }
  return angle;
}

/**
 * Generate realistic QRS deflections for the six limb leads based on the QRS axis angle
 * A convenient alias for calculateLimbLeadDeflections
 * @param qrsAxisAngle - QRS axis angle in degrees
 * @returns Object containing deflections for all six limb leads
 */
export const generateRealisticQRSDeflections = (qrsAxisAngle: number): LimbLeadDeflections => {
  try {
    return calculateLimbLeadDeflections(qrsAxisAngle);
  } catch (error) {
    // Return default values with proper structure to prevent further errors
    return {
      leadI: { q: -MIN_CLINICAL_VALUES.Q_AMPLITUDE, r: MIN_CLINICAL_VALUES.R_AMPLITUDE, s: -MIN_CLINICAL_VALUES.S_AMPLITUDE },
      leadII: { q: -MIN_CLINICAL_VALUES.Q_AMPLITUDE, r: MIN_CLINICAL_VALUES.R_AMPLITUDE, s: -MIN_CLINICAL_VALUES.S_AMPLITUDE },
      leadIII: { q: -MIN_CLINICAL_VALUES.Q_AMPLITUDE, r: MIN_CLINICAL_VALUES.R_AMPLITUDE, s: -MIN_CLINICAL_VALUES.S_AMPLITUDE },
      aVR: { q: MIN_CLINICAL_VALUES.Q_AMPLITUDE, r: -MIN_CLINICAL_VALUES.R_AMPLITUDE, s: MIN_CLINICAL_VALUES.S_AMPLITUDE },
      aVL: { q: -MIN_CLINICAL_VALUES.Q_AMPLITUDE, r: MIN_CLINICAL_VALUES.R_AMPLITUDE, s: -MIN_CLINICAL_VALUES.S_AMPLITUDE },
      aVF: { q: -MIN_CLINICAL_VALUES.Q_AMPLITUDE, r: MIN_CLINICAL_VALUES.R_AMPLITUDE, s: -MIN_CLINICAL_VALUES.S_AMPLITUDE },
    };
  }
}; 