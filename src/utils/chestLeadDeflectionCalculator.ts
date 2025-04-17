/**
 * Chest Lead Deflection Calculator
 * 
 * This utility provides functions to calculate realistic QRS deflections
 * for the six chest leads (V1, V2, V3, V4, V5, V6) based on a specified QRS axis angle
 * and any other relevant parameters.
 * 
 * The calculations aim to create physiologically realistic precordial lead waveforms
 * that reflect the changes in QRS morphology across the chest wall.
 */

import { MAX_DEFLECTION } from './axisConstants';
import { QRSDeflection } from './qrsDeflectionCalculator';

// Array of chest lead names for easy iteration
export const CHEST_LEADS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

// Chest lead angles are conceptual, representing progression across chest wall
export const CHEST_LEAD_PROGRESSION = {
  V1: 0,    // Starting point (rightmost)
  V2: 0.2,  // 20% along the progression
  V3: 0.4,  // 40% along the progression
  V4: 0.6,  // 60% along the progression
  V5: 0.8,  // 80% along the progression
  V6: 1     // Endpoint (leftmost)
};

/**
 * Represents QRS deflections for all six chest leads
 */
export interface ChestLeadDeflections {
  V1: QRSDeflection;
  V2: QRSDeflection;
  V3: QRSDeflection;
  V4: QRSDeflection;
  V5: QRSDeflection;
  V6: QRSDeflection;
}

/**
 * Enumeration of common chest lead pattern types
 */
export enum ChestLeadPattern {
  NORMAL = 'normal',
  LEFT_VENTRICULAR_HYPERTROPHY = 'lvh',
  RIGHT_VENTRICULAR_HYPERTROPHY = 'rvh',
  ANTERIOR_INFARCT = 'anterior_mi',
  LATERAL_INFARCT = 'lateral_mi',
  RBBB = 'rbbb',
  LBBB = 'lbbb'
}

/**
 * Generates a QRS deflection for a specific chest lead
 * @param position - The position along the V1-V6 progression (0 to 1)
 * @param qrsAxisAngle - The QRS axis angle in degrees
 * @param patternType - The type of chest lead pattern to generate
 * @param baseAmplitude - The base amplitude to scale deflections
 * @returns QRS deflection object with q, r, and s values
 */
export const generateChestLeadDeflection = (
  position: number,
  qrsAxisAngle: number,
  patternType: ChestLeadPattern = ChestLeadPattern.NORMAL,
  baseAmplitude: number = 10
): QRSDeflection => {
  // Default values
  let q = 0;
  let r = 0;
  let s = 0;

  // Normal progression pattern (r wave progressively increases, s wave decreases)
  if (patternType === ChestLeadPattern.NORMAL) {
    // In V1-V2, small r wave, deep S wave
    if (position <= 0.2) {
      r = baseAmplitude * 0.2 * (1 + position * 2);
      s = -baseAmplitude * (0.8 - position * 0.5);
      q = -baseAmplitude * 0.05;
    }
    // In V3-V4, transition zone with equal R and S
    else if (position <= 0.6) {
      const transitionFactor = (position - 0.2) / 0.4;
      r = baseAmplitude * (0.4 + transitionFactor * 0.4);
      s = -baseAmplitude * (0.7 - transitionFactor * 0.5);
      q = -baseAmplitude * (0.05 + transitionFactor * 0.1);
    }
    // In V5-V6, tall R wave, small S wave
    else {
      const lateralFactor = (position - 0.6) / 0.4;
      r = baseAmplitude * (0.8 + lateralFactor * 0.1);
      s = -baseAmplitude * (0.2 - lateralFactor * 0.15);
      q = -baseAmplitude * (0.15 + lateralFactor * 0.05);
    }

    // Adjust based on QRS axis angle
    // Axis affects the overall amplitude pattern
    const axisEffect = Math.cos((qrsAxisAngle - 60) * Math.PI / 180);
    
    // Scale deflections based on axis (higher effect in lateral leads)
    const axisScaleFactor = 1 + axisEffect * position * 0.3;
    r *= axisScaleFactor;
    s *= axisScaleFactor;
    q *= axisScaleFactor;
  } 
  // Left ventricular hypertrophy pattern
  else if (patternType === ChestLeadPattern.LEFT_VENTRICULAR_HYPERTROPHY) {
    if (position <= 0.2) {
      r = baseAmplitude * 0.2;
      s = -baseAmplitude * 0.9;
      q = -baseAmplitude * 0.05;
    } else if (position <= 0.6) {
      const transitionFactor = (position - 0.2) / 0.4;
      r = baseAmplitude * (0.2 + transitionFactor * 0.8);
      s = -baseAmplitude * (0.9 - transitionFactor * 0.4);
      q = -baseAmplitude * (0.05 + transitionFactor * 0.15);
    } else {
      r = baseAmplitude * 1.5; // Tall R waves in lateral leads
      s = -baseAmplitude * 0.2;
      q = -baseAmplitude * 0.25; // Deep Q waves in lateral leads
    }
  }
  // Right ventricular hypertrophy pattern
  else if (patternType === ChestLeadPattern.RIGHT_VENTRICULAR_HYPERTROPHY) {
    if (position <= 0.2) {
      r = baseAmplitude * 0.8; // Tall R wave in V1
      s = -baseAmplitude * 0.4;
      q = -baseAmplitude * 0.05;
    } else if (position <= 0.6) {
      const transitionFactor = (position - 0.2) / 0.4;
      r = baseAmplitude * (0.8 - transitionFactor * 0.4);
      s = -baseAmplitude * (0.4 + transitionFactor * 0.3);
      q = -baseAmplitude * 0.05;
    } else {
      r = baseAmplitude * 0.4; // Smaller R waves in lateral leads
      s = -baseAmplitude * 0.7; // Persistent S waves
      q = -baseAmplitude * 0.05;
    }
  }
  // Anterior MI pattern
  else if (patternType === ChestLeadPattern.ANTERIOR_INFARCT) {
    if (position <= 0.6) {
      // QS pattern in V1-V4
      r = baseAmplitude * 0.1;
      s = -baseAmplitude * 0.9;
      q = -baseAmplitude * 0.3;
    } else {
      // More normal in lateral leads
      const lateralFactor = (position - 0.6) / 0.4;
      r = baseAmplitude * (0.1 + lateralFactor * 0.7);
      s = -baseAmplitude * (0.9 - lateralFactor * 0.7);
      q = -baseAmplitude * (0.3 - lateralFactor * 0.2);
    }
  }
  // Right bundle branch block pattern
  else if (patternType === ChestLeadPattern.RBBB) {
    if (position <= 0.2) {
      // RSR' pattern in V1-V2 (simplifying as exaggerated R)
      r = baseAmplitude * 0.9;
      s = -baseAmplitude * 0.5;
      q = -baseAmplitude * 0.05;
    } else if (position <= 0.6) {
      const transitionFactor = (position - 0.2) / 0.4;
      r = baseAmplitude * (0.9 - transitionFactor * 0.3);
      s = -baseAmplitude * (0.5 + transitionFactor * 0.2);
      q = -baseAmplitude * (0.05 + transitionFactor * 0.1);
    } else {
      // Wide S wave in lateral leads
      r = baseAmplitude * 0.6;
      s = -baseAmplitude * 0.7;
      q = -baseAmplitude * 0.15;
    }
  }
  // Left bundle branch block pattern
  else if (patternType === ChestLeadPattern.LBBB) {
    if (position <= 0.2) {
      // QS pattern in V1-V2
      r = baseAmplitude * 0.1;
      s = -baseAmplitude * 0.9;
      q = -baseAmplitude * 0.2;
    } else if (position <= 0.6) {
      const transitionFactor = (position - 0.2) / 0.4;
      r = baseAmplitude * (0.1 + transitionFactor * 0.7);
      s = -baseAmplitude * (0.9 - transitionFactor * 0.7);
      q = -baseAmplitude * 0.2;
    } else {
      // Tall R with no S in lateral leads
      r = baseAmplitude * 1.2;
      s = -baseAmplitude * 0.1;
      q = -baseAmplitude * 0.2;
    }
  }
  
  // Ensure values don't exceed reasonable limits
  q = Math.max(-baseAmplitude, Math.min(0, q)); // Q waves are negative or zero
  r = Math.max(0, Math.min(baseAmplitude * 2, r)); // R waves are positive
  s = Math.max(-baseAmplitude * 2, Math.min(0, s)); // S waves are negative or zero
  
  return { q, r, s };
};

/**
 * Calculate QRS deflections for the six chest leads based on the QRS axis angle and pattern
 * @param qrsAxisAngle - QRS axis angle in degrees
 * @param patternType - The type of chest lead pattern
 * @returns Object containing deflections for all six chest leads
 */
export const calculateChestLeadDeflections = (
  qrsAxisAngle: number,
  patternType: ChestLeadPattern = ChestLeadPattern.NORMAL
): ChestLeadDeflections => {
  // Generate QRS deflections for each chest lead
  const deflections = CHEST_LEADS.reduce((acc, lead) => {
    const position = CHEST_LEAD_PROGRESSION[lead as keyof typeof CHEST_LEAD_PROGRESSION];
    acc[lead as keyof ChestLeadDeflections] = generateChestLeadDeflection(
      position,
      qrsAxisAngle,
      patternType
    );
    return acc;
  }, {} as ChestLeadDeflections);
  
  return normalizeDeflections(deflections);
};

/**
 * Normalize deflections to ensure they're within reasonable bounds
 * @param deflections - QRS deflections for all chest leads
 * @returns Normalized deflections
 */
export const normalizeDeflections = (deflections: ChestLeadDeflections): ChestLeadDeflections => {
  // Copy deflections to avoid mutating input
  const normalizedDeflections = { ...deflections };
  
  // Function to normalize a single QRS deflection
  const normalizeQRS = (qrs: QRSDeflection): QRSDeflection => {
    // Calculate total deflection magnitude
    const totalMagnitude = Math.abs(qrs.q) + qrs.r + Math.abs(qrs.s);
    
    // If total magnitude exceeds MAX_DEFLECTION, scale down proportionally
    if (totalMagnitude > MAX_DEFLECTION) {
      const scaleFactor = MAX_DEFLECTION / totalMagnitude;
      return {
        q: qrs.q * scaleFactor,
        r: qrs.r * scaleFactor,
        s: qrs.s * scaleFactor
      };
    }
    
    return qrs;
  };
  
  // Normalize each lead
  CHEST_LEADS.forEach(lead => {
    const leadKey = lead as keyof ChestLeadDeflections;
    normalizedDeflections[leadKey] = normalizeQRS(normalizedDeflections[leadKey]);
  });
  
  return normalizedDeflections;
}; 