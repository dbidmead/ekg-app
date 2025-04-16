/**
 * Constants for ECG axis values and ranges
 * This file centralizes all axis-related constants to ensure consistency across the application
 */

// Axis classification ranges are the primary definition
export const AXIS_RANGES = {
  NORMAL: { MIN: -30, MAX: 90 },       // Normal axis range
  LEFT: { MIN: -90, MAX: -30 },        // Left axis deviation range
  RIGHT: { MIN: 90, MAX: 180 },        // Right axis deviation range
  EXTREME: { MIN: -180, MAX: -90 }     // Extreme axis deviation range
};

// Representative values for display and UI purposes (middle of each range)
export const AXIS_VALUES = {
  NORMAL: 60, // Representative value for normal axis
  LEFT: -45,  // Representative value for left axis deviation
  RIGHT: 120, // Representative value for right axis deviation 
  EXTREME: -135 // Representative value for extreme axis deviation
};

// Mapping between selection values and axis type
export const AXIS_TYPE_MAP = {
  'normal': 'NORMAL',
  'left': 'LEFT',
  'right': 'RIGHT',
  'extreme': 'EXTREME'
};

// Standard QRS measurements for each axis type
export const AXIS_SAMPLE_DATA = {
  normal: {
    leadI: {
      qDuration: 1,
      qAmplitude: -1,
      rAmplitude: 8,
      sAmplitude: 0,
      sDuration: 1
    },
    leadII: {
      qDuration: 1,
      qAmplitude: -1,
      rAmplitude: 15,
      sAmplitude: 0,
      sDuration: 1
    }
  },
  left: {
    leadI: {
      qDuration: 1,
      qAmplitude: -1,
      rAmplitude: 0,
      sAmplitude: -10,
      sDuration: 1
    },
    leadII: {
      qDuration: 1,
      qAmplitude: -2,
      rAmplitude: 0,
      sAmplitude: 0,
      sDuration: 1
    }
  },
  right: {
    leadI: {
      qDuration: 1,
      qAmplitude: -2,
      rAmplitude: 2,
      sAmplitude: -5,
      sDuration: 1
    },
    leadII: {
      qDuration: 1,
      qAmplitude: -1,
      rAmplitude: 15,
      sAmplitude: 0,
      sDuration: 1
    }
  },
  extreme: {
    leadI: {
      qDuration: 1,
      qAmplitude: -3,
      rAmplitude: 2,
      sAmplitude: -8,
      sDuration: 1
    },
    leadII: {
      qDuration: 1,
      qAmplitude: -3,
      rAmplitude: 1,
      sAmplitude: -10,
      sDuration: 1
    }
  }
};

// Helper function to get the representative axis value from a selection type
export const getAxisValueFromType = (type: string): number => {
  const axisType = AXIS_TYPE_MAP[type as keyof typeof AXIS_TYPE_MAP];
  return axisType ? AXIS_VALUES[axisType as keyof typeof AXIS_VALUES] : AXIS_VALUES.NORMAL;
};

// Helper function to get the range for a given axis type
export const getAxisRangeFromType = (type: string): { MIN: number, MAX: number } => {
  const axisType = AXIS_TYPE_MAP[type as keyof typeof AXIS_TYPE_MAP];
  return axisType ? AXIS_RANGES[axisType as keyof typeof AXIS_RANGES] : AXIS_RANGES.NORMAL;
};

// Helper function to get a random value within a specific axis range
export const getRandomValueInAxisRange = (type: string): number => {
  const range = getAxisRangeFromType(type);
  // Generate a random value within the range and round to one decimal place
  return Math.round((Math.random() * (range.MAX - range.MIN) + range.MIN) * 10) / 10;
};

// Helper function to check if an axis value falls within a particular range
export const isAxisInRange = (axis: number, type: string): boolean => {
  const range = getAxisRangeFromType(type);
  // Normalize axis to -180 to +180 range
  const normalizedAxis = ((axis % 360) + 540) % 360 - 180;
  return normalizedAxis >= range.MIN && normalizedAxis <= range.MAX;
};

// Helper function to classify an axis value
export const classifyAxisValue = (axis: number | null): string => {
  if (axis === null) return 'Indeterminate';
  
  // Normalize axis to -180 to +180 range
  const normalizedAxis = ((axis % 360) + 540) % 360 - 180;
  
  if (normalizedAxis >= AXIS_RANGES.NORMAL.MIN && normalizedAxis <= AXIS_RANGES.NORMAL.MAX) 
    return 'Normal';
  if (normalizedAxis > AXIS_RANGES.RIGHT.MIN && normalizedAxis <= AXIS_RANGES.RIGHT.MAX) 
    return 'Right Axis Deviation';
  if (normalizedAxis >= AXIS_RANGES.LEFT.MIN && normalizedAxis < AXIS_RANGES.LEFT.MAX) 
    return 'Left Axis Deviation';
  return 'Extreme Axis Deviation';
}; 