/**
 * Utility functions for calculating cardiac axis
 */

export interface QRSMeasurements {
  qDuration: number;  // in mm (40ms per mm)
  qAmplitude: number; // in mm
  rAmplitude: number; // in mm
  sAmplitude: number; // in mm
  sDuration: number;  // in mm
}

/**
 * Validates QRS measurements are within physiological ranges
 * @param measurements - Object containing QRS wave measurements
 * @returns boolean indicating if measurements are valid
 */
export const validateQRSMeasurements = (measurements: QRSMeasurements): boolean => {
  const { qDuration, qAmplitude, rAmplitude, sAmplitude, sDuration } = measurements;
  
  // Convert durations to ms
  const qDurationMs = qDuration * 40;
  const sDurationMs = sDuration * 40;
  const totalDurationMs = qDurationMs + sDurationMs;
  
  // Validate durations (total QRS should be between 60-200ms)
  if (totalDurationMs < 60 || totalDurationMs > 200) return false;
  
  // Validate amplitudes (typically between -20mm to +20mm)
  if (Math.abs(qAmplitude) > 20 || Math.abs(rAmplitude) > 20 || Math.abs(sAmplitude) > 20) return false;
  
  return true;
};

/**
 * Calculates the area under a QRS complex
 * For wide QRS complexes (≥120ms), only considers first 80ms
 * @param measurements - Object containing QRS wave measurements
 * @returns Net area (positive - negative areas) in mm²
 * @throws Error if measurements are invalid
 */
export const calculateQRSArea = (measurements: QRSMeasurements): number => {
  if (!validateQRSMeasurements(measurements)) {
    throw new Error('Invalid QRS measurements provided');
  }

  const { qDuration, qAmplitude, rAmplitude, sAmplitude, sDuration } = measurements;
  
  // Convert durations from mm to ms (40ms per mm)
  const qDurationMs = qDuration * 40;
  const sDurationMs = sDuration * 40;
  const totalDurationMs = qDurationMs + sDurationMs;
  
  // If QRS is wide (≥120ms), limit calculation to first 80ms
  if (totalDurationMs >= 120) {
    const scaleFactor = 80 / totalDurationMs;
    const adjustedQDuration = qDuration * (qDurationMs < 80 ? 1 : scaleFactor);
    const adjustedSDuration = sDuration * (qDurationMs >= 80 ? 0 : scaleFactor * (80 - qDurationMs) / sDurationMs);
    
    // Calculate areas using adjusted durations
    const qArea = -(adjustedQDuration * qAmplitude) / 2;
    const rArea = (rAmplitude * (adjustedQDuration + adjustedSDuration)) / 2;
    const sArea = -(adjustedSDuration * sAmplitude) / 2;
    
    return qArea + rArea + sArea;
  }
  
  // For normal QRS duration, calculate full areas
  const qArea = -(qDuration * qAmplitude) / 2;
  const rArea = (rAmplitude * (qDuration + sDuration)) / 2;
  const sArea = -(sDuration * sAmplitude) / 2;
  
  return qArea + rArea + sArea;
};

/**
 * Determines if the QRS axis is indeterminate
 * @param leadIArea - Net area of QRS complex in Lead I (mm²)
 * @param leadIIArea - Net area of QRS complex in Lead II (mm²)
 * @returns boolean indicating if axis is indeterminate
 */
export const isAxisIndeterminate = (leadIArea: number, leadIIArea: number): boolean => {
  // Axis is considered indeterminate if both leads have very small areas
  const THRESHOLD = 0.5; // mm²
  return Math.abs(leadIArea) < THRESHOLD && Math.abs(leadIIArea) < THRESHOLD;
};

/**
 * Calculates the QRS axis using Lead I and Lead II areas
 * @param leadIArea - Net area of QRS complex in Lead I (mm²)
 * @param leadIIArea - Net area of QRS complex in Lead II (mm²)
 * @returns QRS axis in degrees or null if indeterminate
 */
export const calculateQRSAxis = (leadIArea: number, leadIIArea: number): number | null => {
  if (isAxisIndeterminate(leadIArea, leadIIArea)) {
    return null;
  }

  const axis = Math.atan((2 * leadIIArea - leadIArea) / (Math.sqrt(3) * leadIArea)) * (180 / Math.PI);
  
  // Adjust for quadrant (if Lead I is negative)
  return leadIArea < 0 ? axis + 180 : axis;
};

/**
 * Classifies the QRS axis into standard clinical categories
 * @param axis - Calculated axis in degrees
 * @returns Clinical classification of the axis
 */
export const classifyAxis = (axis: number | null): string => {
  if (axis === null) return 'Indeterminate';
  
  // Normalize axis to -180 to +180 range
  const normalizedAxis = ((axis % 360) + 540) % 360 - 180;
  
  if (normalizedAxis >= -30 && normalizedAxis <= 90) return 'Normal';
  if (normalizedAxis > 90 && normalizedAxis <= 180) return 'Right Axis Deviation';
  if (normalizedAxis >= -90 && normalizedAxis < -30) return 'Left Axis Deviation';
  return 'Extreme Axis Deviation';
};

/**
 * Helper function to format axis to one decimal place
 * @param axis - Calculated axis in degrees
 * @returns Formatted axis string
 */
export const formatAxis = (axis: number | null): string => {
  if (axis === null) return 'Indeterminate';
  return `${axis.toFixed(1)}°`;
}; 