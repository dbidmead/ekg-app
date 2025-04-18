import React from 'react';
import { QRSDeflection, LimbLeadDeflections, calculateLimbLeadDeflections } from '../utils/qrsDeflectionCalculator';

interface EKGTracingProps {
  lead: string;
  height?: number;
  width?: number;
  qrsDeflections?: {
    leadI: QRSDeflection;
    leadII: QRSDeflection;
    leadIII: QRSDeflection;
    aVR: QRSDeflection;
    aVL: QRSDeflection;
    aVF: QRSDeflection;
  };
  axisAngle?: number; // Add QRS axis angle prop
}

const EKGTracing: React.FC<EKGTracingProps> = ({ 
  lead, 
  width = 375,
  qrsDeflections,
  axisAngle = 60 // Default to normal axis angle 
}) => {
  // Calculate dimensions (6.25px = 1mm to match grid at 125% scale)
  const smallBoxSize = 6.25; // 1mm = 6.25px (25% larger than original 5px)
  const viewBoxWidth = Math.ceil(width / smallBoxSize) * smallBoxSize;
  const viewBoxHeight = viewBoxWidth / 2; // maintain 2:1 aspect ratio
  const safeZoneHeight = viewBoxHeight * 0.8; // 80% of height for safe amplitude zone
  const baseY = viewBoxHeight / 2;
  const maxQRSHeight = viewBoxHeight * 0.4; // Maximum QRS height should be 40% of view height

  const getPathForLead = (lead: string): string => {
    const centerX = viewBoxWidth / 2;
    
    // Standard ECG measurements (6.25px = 1mm)
    const mmToPx = 6.25; // Convert millimeters to pixels at 125% scale
    
    // Timing intervals (in mm, converted to px)
    const pWaveWidth = 2 * mmToPx;     // 0.08s = 2mm
    const prInterval = 4 * mmToPx;      // 0.16s = 4mm
    const qrsWidth = 2.25 * mmToPx;    // 0.09s = 2.25mm
    const stSegment = 2 * mmToPx;      // 0.08s = 2mm
    const tWaveWidth = 4 * mmToPx;     // 0.16s = 4mm

    // Calculate positions
    const pWaveStart = centerX - (pWaveWidth + prInterval + qrsWidth/2);
    const qrsStart = centerX - qrsWidth/2;
    const qrsEnd = centerX + qrsWidth/2;
    const tWaveStart = qrsEnd + stSegment;

    // Start path from left edge
    let path = `M 0 ${baseY} L ${pWaveStart} ${baseY} `;

    // Helper function to constrain a value within safe boundaries
    const constrainToSafeZone = (value: number): number => {
      const maxDisplacement = safeZoneHeight / 2; // Half of the safe zone (above or below baseline)
      // Constrain between baseY - maxDisplacement and baseY + maxDisplacement
      return Math.max(baseY - maxDisplacement, Math.min(baseY + maxDisplacement, value));
    };

    // Get QRS deflection for the current lead
    let qrsDeflection: QRSDeflection | null = null;
    
    // If deflections are provided directly, use them
    if (qrsDeflections) {
      switch (lead) {
        case 'I': qrsDeflection = qrsDeflections.leadI; break;
        case 'II': qrsDeflection = qrsDeflections.leadII; break;
        case 'III': qrsDeflection = qrsDeflections.leadIII; break;
        case 'aVR': qrsDeflection = qrsDeflections.aVR; break;
        case 'aVL': qrsDeflection = qrsDeflections.aVL; break;
        case 'aVF': qrsDeflection = qrsDeflections.aVF; break;
      }
    }
    // If no pre-calculated deflections and axis angle is provided, use the standard calculation function
    else if (axisAngle !== undefined) {
      // Calculate deflections using the same function used throughout the application
      const calculatedDeflections: LimbLeadDeflections = calculateLimbLeadDeflections(axisAngle);
      
      // Get the specific deflection for this lead
      switch (lead) {
        case 'I': qrsDeflection = calculatedDeflections.leadI; break;
        case 'II': qrsDeflection = calculatedDeflections.leadII; break;
        case 'III': qrsDeflection = calculatedDeflections.leadIII; break;
        case 'aVR': qrsDeflection = calculatedDeflections.aVR; break;
        case 'aVL': qrsDeflection = calculatedDeflections.aVL; break;
        case 'aVF': qrsDeflection = calculatedDeflections.aVF; break;
      }
    }

    if (qrsDeflection) {
      // P wave - same for each lead based on lead type
      let pWaveAmplitude = 0;
      switch (lead) {
        case 'I':
          pWaveAmplitude = 1.5 * mmToPx;
          break;
        case 'II':
        case 'aVF':
          pWaveAmplitude = 2 * mmToPx;
          break;
        case 'III':
          pWaveAmplitude = 1 * mmToPx;
          break;
        case 'aVR':
          pWaveAmplitude = -1.5 * mmToPx;
          break;
        case 'aVL':
          // Biphasic P wave for aVL
          const aVLPWavePoint1 = constrainToSafeZone(baseY - 1 * mmToPx);
          const aVLPWavePoint2 = constrainToSafeZone(baseY + 1 * mmToPx);
          path += `Q ${pWaveStart + pWaveWidth/3} ${aVLPWavePoint1} ${pWaveStart + pWaveWidth/2} ${baseY} `;
          path += `Q ${pWaveStart + pWaveWidth*2/3} ${aVLPWavePoint2} ${pWaveStart + pWaveWidth} ${baseY} `;
          pWaveAmplitude = 0; // Skip the standard P wave
          break;
      }
      
      // Draw standard P wave for non-biphasic leads
      if (pWaveAmplitude !== 0) {
        const pWavePoint = constrainToSafeZone(baseY - pWaveAmplitude);
        path += `Q ${pWaveStart + pWaveWidth/2} ${pWavePoint} ${pWaveStart + pWaveWidth} ${baseY} `;
      }
      
      // PR segment
      path += `L ${qrsStart} ${baseY} `;
      
      // QRS complex using the deflection values
      // Calculate control points for smooth QRS with constraints
      let qPoint, rPoint, sPoint;
      
      // Scale factor for QRS amplitude
      const qrsScaleFactor = maxQRSHeight / (5 * mmToPx);
      
      // IMPORTANT: In SVG, y coordinate increases downward, so to make values go up (positive), 
      // we subtract from baseY, and to make values go down (negative), we add to baseY
      
      // Convert QRS deflection values to screen coordinates
      // For all waves, we subtract from baseY to maintain consistent direction logic
      // Negative values will render below baseline, positive values above
      qPoint = constrainToSafeZone(baseY - (qrsDeflection.q * qrsScaleFactor * mmToPx));
      rPoint = constrainToSafeZone(baseY - (qrsDeflection.r * qrsScaleFactor * mmToPx));
      sPoint = constrainToSafeZone(baseY - (qrsDeflection.s * qrsScaleFactor * mmToPx));
      
      // Calculate positions within QRS complex
      const qPos = qrsStart + qrsWidth * 0.2; // Q wave position
      const rPos = qrsStart + qrsWidth * 0.5; // R wave position (at center)
      const sPos = qrsEnd - qrsWidth * 0.2;   // S wave position

      // Determine if this is a predominantly negative complex (QS pattern)
      const isPredominantlyNegative = Math.abs(qrsDeflection.r) < (Math.abs(qrsDeflection.q) + Math.abs(qrsDeflection.s));
      
      // Adjust control points based on the relative amplitudes of the waves
      let qToRFactor = 0.3; // Default control point distance factor
      let rToSFactor = 0.3; // Default control point distance factor
      
      // For predominantly negative complexes, adjust the control points
      if (isPredominantlyNegative || Math.abs(qrsDeflection.r) < 0.8) {
        // Calculate q/s dominance ratio to adjust curve shape
        const qRatio = Math.abs(qrsDeflection.q) / (Math.abs(qrsDeflection.q) + Math.abs(qrsDeflection.r) + Math.abs(qrsDeflection.s));
        const sRatio = Math.abs(qrsDeflection.s) / (Math.abs(qrsDeflection.q) + Math.abs(qrsDeflection.r) + Math.abs(qrsDeflection.s));
        
        // Bring control points closer to the dominant wave
        qToRFactor = Math.max(0.15, 0.3 - qRatio * 0.2);
        rToSFactor = Math.max(0.15, 0.3 - sRatio * 0.2);
      }
      
      // Calculate the improved control points
      const qToRcp1 = qPos + (rPos - qPos) * qToRFactor;       
      const qToRcp2 = rPos - (rPos - qPos) * qToRFactor;       
      const rToScp1 = rPos + (sPos - rPos) * rToSFactor;       
      const rToScp2 = sPos - (sPos - rPos) * rToSFactor;      
      
      // First segment: baseline to Q wave (still linear)
      path += `L ${qPos} ${qPoint} `;
      
      // Draw the QRS complex with optimized control points
      if (isPredominantlyNegative && Math.abs(qPoint - sPoint) < (mmToPx * 0.5)) {
        // For very flat QS patterns, use a simpler curve
        path += `Q ${rPos} ${Math.min(qPoint, sPoint)} ${sPos} ${sPoint} `;
      } else {
        // Standard Bezier curves for normal QRS complexes
        path += `C ${qToRcp1} ${qPoint} ${qToRcp2} ${rPoint} ${rPos} ${rPoint} `;
        path += `C ${rToScp1} ${rPoint} ${rToScp2} ${sPoint} ${sPos} ${sPoint} `;
      }
      
      // S back to baseline
      path += `L ${qrsEnd} ${baseY} `;
      
      // ST segment
      path += `L ${tWaveStart} ${baseY} `;
      
      // T wave - scales with lead
      let tWaveHeight = 0;
      switch (lead) {
        case 'I': tWaveHeight = 3 * mmToPx; break;
        case 'II': tWaveHeight = 4 * mmToPx; break;
        case 'III': tWaveHeight = 2.5 * mmToPx; break;
        case 'aVR': tWaveHeight = -3 * mmToPx; break;
        case 'aVL': tWaveHeight = -1.5 * mmToPx; break;
        case 'aVF': tWaveHeight = 3.5 * mmToPx; break;
      }
      
      const tWavePoint = constrainToSafeZone(baseY - tWaveHeight);
      path += `Q ${tWaveStart + tWaveWidth/2} ${tWavePoint} ${tWaveStart + tWaveWidth} ${baseY} `;
    } else {
      // Fallback to static tracings if no deflections provided
      switch (lead) {
        case 'I':
          // P wave (1.5mm)
          const pWaveHeightI = constrainToSafeZone(baseY - 1.5 * mmToPx);
          path += `Q ${pWaveStart + pWaveWidth/2} ${pWaveHeightI} ${pWaveStart + pWaveWidth} ${baseY} `;
          
          // PR segment
          path += `L ${qrsStart} ${baseY} `;
          
          // QRS complex (smooth qRs pattern)
          const qPointI = constrainToSafeZone(baseY + 1.5 * mmToPx);
          const rPointI = constrainToSafeZone(baseY - 7 * mmToPx);
          const sPointI = constrainToSafeZone(baseY + 1 * mmToPx);
          
          // Calculate positions
          const qPosI = qrsStart + qrsWidth * 0.2;
          const rPosI = qrsStart + qrsWidth * 0.5;
          const sPosI = qrsEnd - qrsWidth * 0.2;
          
          // Improved control points
          const qToRcp1I = qPosI + (rPosI - qPosI) * 0.3;
          const qToRcp2I = rPosI - (rPosI - qPosI) * 0.3;
          const rToScp1I = rPosI + (sPosI - rPosI) * 0.3;
          const rToScp2I = sPosI - (sPosI - rPosI) * 0.3;

          // Draw the complex with smoother curves
          path += `L ${qPosI} ${qPointI} `;
          path += `C ${qToRcp1I} ${qPointI} ${qToRcp2I} ${rPointI} ${rPosI} ${rPointI} `;
          path += `C ${rToScp1I} ${rPointI} ${rToScp2I} ${sPointI} ${sPosI} ${sPointI} `;
          
          // End of QRS
          path += `L ${qrsEnd} ${baseY} `;
          
          // ST segment
          path += `L ${tWaveStart} ${baseY} `;
          
          // T wave (3mm)
          const tWaveHeightI = constrainToSafeZone(baseY - 3 * mmToPx);
          path += `Q ${tWaveStart + tWaveWidth/2} ${tWaveHeightI} ${tWaveStart + tWaveWidth} ${baseY} `;
          break;
  
        case 'II':
          // P wave (2mm)
          const pWaveHeightII = constrainToSafeZone(baseY - 2 * mmToPx);
          path += `Q ${pWaveStart + pWaveWidth/2} ${pWaveHeightII} ${pWaveStart + pWaveWidth} ${baseY} `;
          
          // PR segment
          path += `L ${qrsStart} ${baseY} `;
          
          // QRS complex (smooth qRs pattern)
          const qPointII = constrainToSafeZone(baseY + 2 * mmToPx);
          const rPointII = constrainToSafeZone(baseY - 10 * mmToPx);
          const sPointII = constrainToSafeZone(baseY + 1 * mmToPx);
          
          // Calculate positions
          const qPosII = qrsStart + qrsWidth * 0.2;
          const rPosII = qrsStart + qrsWidth * 0.5;
          const sPosII = qrsEnd - qrsWidth * 0.2;
          
          // Improved control points
          const qToRcp1II = qPosII + (rPosII - qPosII) * 0.3;
          const qToRcp2II = rPosII - (rPosII - qPosII) * 0.3;
          const rToScp1II = rPosII + (sPosII - rPosII) * 0.3;
          const rToScp2II = sPosII - (sPosII - rPosII) * 0.3;

          // Draw the complex with smoother curves
          path += `L ${qPosII} ${qPointII} `;
          path += `C ${qToRcp1II} ${qPointII} ${qToRcp2II} ${rPointII} ${rPosII} ${rPointII} `;
          path += `C ${rToScp1II} ${rPointII} ${rToScp2II} ${sPointII} ${sPosII} ${sPointII} `;
          
          // End of QRS
          path += `L ${qrsEnd} ${baseY} `;
          
          // ST segment
          path += `L ${tWaveStart} ${baseY} `;
          
          // T wave (4mm)
          const tWaveHeightII = constrainToSafeZone(baseY - 4 * mmToPx);
          path += `Q ${tWaveStart + tWaveWidth/2} ${tWaveHeightII} ${tWaveStart + tWaveWidth} ${baseY} `;
          break;
  
        case 'III':
          // P wave (1mm)
          const pWaveHeightIII = constrainToSafeZone(baseY - 1 * mmToPx);
          path += `Q ${pWaveStart + pWaveWidth/2} ${pWaveHeightIII} ${pWaveStart + pWaveWidth} ${baseY} `;
          
          // PR segment
          path += `L ${qrsStart} ${baseY} `;
          
          // QRS complex (smooth qRs pattern)
          const qPointIII = constrainToSafeZone(baseY + 1.5 * mmToPx);
          const rPointIII = constrainToSafeZone(baseY - 5 * mmToPx);
          const sPointIII = constrainToSafeZone(baseY + 1 * mmToPx);
          
          // Calculate positions
          const qPosIII = qrsStart + qrsWidth * 0.2;
          const rPosIII = qrsStart + qrsWidth * 0.5;
          const sPosIII = qrsEnd - qrsWidth * 0.2;
          
          // Improved control points
          const qToRcp1III = qPosIII + (rPosIII - qPosIII) * 0.3;
          const qToRcp2III = rPosIII - (rPosIII - qPosIII) * 0.3;
          const rToScp1III = rPosIII + (sPosIII - rPosIII) * 0.3;
          const rToScp2III = sPosIII - (sPosIII - rPosIII) * 0.3;

          // Draw the complex with smoother curves
          path += `L ${qPosIII} ${qPointIII} `;
          path += `C ${qToRcp1III} ${qPointIII} ${qToRcp2III} ${rPointIII} ${rPosIII} ${rPointIII} `;
          path += `C ${rToScp1III} ${rPointIII} ${rToScp2III} ${sPointIII} ${sPosIII} ${sPointIII} `;
          
          // End of QRS
          path += `L ${qrsEnd} ${baseY} `;
          
          // ST segment
          path += `L ${tWaveStart} ${baseY} `;
          
          // T wave (2.5mm)
          const tWaveHeightIII = constrainToSafeZone(baseY - 2.5 * mmToPx);
          path += `Q ${tWaveStart + tWaveWidth/2} ${tWaveHeightIII} ${tWaveStart + tWaveWidth} ${baseY} `;
          break;
  
        case 'aVR':
          // P wave (inverted, 1.5mm)
          const pWaveHeightAVR = constrainToSafeZone(baseY + 1.5 * mmToPx);
          path += `Q ${pWaveStart + pWaveWidth/2} ${pWaveHeightAVR} ${pWaveStart + pWaveWidth} ${baseY} `;
          
          // PR segment
          path += `L ${qrsStart} ${baseY} `;
          
          // QRS complex for aVR (predominantly negative)
          const qPointAVR = constrainToSafeZone(baseY - 2 * mmToPx); // Small positive deflection
          const rPointAVR = constrainToSafeZone(baseY + 8 * mmToPx); // Deep negative deflection
          const sPointAVR = constrainToSafeZone(baseY - 1 * mmToPx); // Small positive finish
          
          // Calculate positions
          const qPosAVR = qrsStart + qrsWidth * 0.2;
          const rPosAVR = qrsStart + qrsWidth * 0.5;
          const sPosAVR = qrsEnd - qrsWidth * 0.2;
          
          // Improved control points
          const qToRcp1AVR = qPosAVR + (rPosAVR - qPosAVR) * 0.3;
          const qToRcp2AVR = rPosAVR - (rPosAVR - qPosAVR) * 0.3;
          const rToScp1AVR = rPosAVR + (sPosAVR - rPosAVR) * 0.3;
          const rToScp2AVR = sPosAVR - (sPosAVR - rPosAVR) * 0.3;

          // Draw the complex with smoother curves
          path += `L ${qPosAVR} ${qPointAVR} `;
          path += `C ${qToRcp1AVR} ${qPointAVR} ${qToRcp2AVR} ${rPointAVR} ${rPosAVR} ${rPointAVR} `;
          path += `C ${rToScp1AVR} ${rPointAVR} ${rToScp2AVR} ${sPointAVR} ${sPosAVR} ${sPointAVR} `;
          
          // End of QRS
          path += `L ${qrsEnd} ${baseY} `;
          
          // ST segment
          path += `L ${tWaveStart} ${baseY} `;
          
          // T wave (inverted, 3mm)
          const tWaveHeightAVR = constrainToSafeZone(baseY + 3 * mmToPx);
          path += `Q ${tWaveStart + tWaveWidth/2} ${tWaveHeightAVR} ${tWaveStart + tWaveWidth} ${baseY} `;
          break;
  
        case 'aVL':
          // P wave (biphasic, 1mm each way)
          const aVLPWavePoint1 = constrainToSafeZone(baseY - 1 * mmToPx);
          const aVLPWavePoint2 = constrainToSafeZone(baseY + 1 * mmToPx);
          path += `Q ${pWaveStart + pWaveWidth/3} ${aVLPWavePoint1} ${pWaveStart + pWaveWidth/2} ${baseY} `;
          path += `Q ${pWaveStart + pWaveWidth*2/3} ${aVLPWavePoint2} ${pWaveStart + pWaveWidth} ${baseY} `;
          
          // PR segment
          path += `L ${qrsStart} ${baseY} `;
          
          // QRS complex (biphasic)
          const qPointAVL = constrainToSafeZone(baseY - 3 * mmToPx); // Initial positive
          const rPointAVL = constrainToSafeZone(baseY + 3 * mmToPx); // Negative deflection
          const sPointAVL = constrainToSafeZone(baseY - 1 * mmToPx); // Terminal positive
          
          // Calculate positions
          const qPosAVL = qrsStart + qrsWidth * 0.2;
          const rPosAVL = qrsStart + qrsWidth * 0.5;
          const sPosAVL = qrsEnd - qrsWidth * 0.2;
          
          // Improved control points
          const qToRcp1AVL = qPosAVL + (rPosAVL - qPosAVL) * 0.3;
          const qToRcp2AVL = rPosAVL - (rPosAVL - qPosAVL) * 0.3;
          const rToScp1AVL = rPosAVL + (sPosAVL - rPosAVL) * 0.3;
          const rToScp2AVL = sPosAVL - (sPosAVL - rPosAVL) * 0.3;

          // Draw the complex with smoother curves
          path += `L ${qPosAVL} ${qPointAVL} `;
          path += `C ${qToRcp1AVL} ${qPointAVL} ${qToRcp2AVL} ${rPointAVL} ${rPosAVL} ${rPointAVL} `;
          path += `C ${rToScp1AVL} ${rPointAVL} ${rToScp2AVL} ${sPointAVL} ${sPosAVL} ${sPointAVL} `;
          
          // End of QRS
          path += `L ${qrsEnd} ${baseY} `;
          
          // ST segment
          path += `L ${tWaveStart} ${baseY} `;
          
          // T wave (small negative, 1.5mm)
          const tWaveHeightAVL = constrainToSafeZone(baseY + 1.5 * mmToPx);
          path += `Q ${tWaveStart + tWaveWidth/2} ${tWaveHeightAVL} ${tWaveStart + tWaveWidth} ${baseY} `;
          break;
  
        case 'aVF':
          // P wave (2mm)
          const pWaveHeightAVF = constrainToSafeZone(baseY - 2 * mmToPx);
          path += `Q ${pWaveStart + pWaveWidth/2} ${pWaveHeightAVF} ${pWaveStart + pWaveWidth} ${baseY} `;
          
          // PR segment
          path += `L ${qrsStart} ${baseY} `;
          
          // QRS complex (smooth qRs pattern)
          const qPointAVF = constrainToSafeZone(baseY + 2 * mmToPx);
          const rPointAVF = constrainToSafeZone(baseY - 8 * mmToPx);
          const sPointAVF = constrainToSafeZone(baseY + 1 * mmToPx);
          
          // Calculate positions
          const qPosAVF = qrsStart + qrsWidth * 0.2;
          const rPosAVF = qrsStart + qrsWidth * 0.5;
          const sPosAVF = qrsEnd - qrsWidth * 0.2;
          
          // Improved control points
          const qToRcp1AVF = qPosAVF + (rPosAVF - qPosAVF) * 0.3;
          const qToRcp2AVF = rPosAVF - (rPosAVF - qPosAVF) * 0.3;
          const rToScp1AVF = rPosAVF + (sPosAVF - rPosAVF) * 0.3;
          const rToScp2AVF = sPosAVF - (sPosAVF - rPosAVF) * 0.3;

          // Draw the complex with smoother curves
          path += `L ${qPosAVF} ${qPointAVF} `;
          path += `C ${qToRcp1AVF} ${qPointAVF} ${qToRcp2AVF} ${rPointAVF} ${rPosAVF} ${rPointAVF} `;
          path += `C ${rToScp1AVF} ${rPointAVF} ${rToScp2AVF} ${sPointAVF} ${sPosAVF} ${sPointAVF} `;
          
          // End of QRS
          path += `L ${qrsEnd} ${baseY} `;
          
          // ST segment
          path += `L ${tWaveStart} ${baseY} `;
          
          // T wave (3.5mm)
          const tWaveHeightAVF = constrainToSafeZone(baseY - 3.5 * mmToPx);
          path += `Q ${tWaveStart + tWaveWidth/2} ${tWaveHeightAVF} ${tWaveStart + tWaveWidth} ${baseY} `;
          break;
  
        default:
          path += `L ${viewBoxWidth} ${baseY} `;
          break;
      }
    }

    // Extend baseline to right edge
    path += `L ${viewBoxWidth} ${baseY}`;

    return path;
  };

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%' }}
    >
      <path
        d={getPathForLead(lead)}
        stroke="#ff4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default EKGTracing; 