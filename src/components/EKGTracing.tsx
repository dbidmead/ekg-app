import React from 'react';

interface EKGTracingProps {
  lead: string;
  height?: number;
  width?: number;
}

const EKGTracing: React.FC<EKGTracingProps> = ({ lead, height = 125, width = 375 }) => {
  // Calculate dimensions (6.25px = 1mm to match grid at 125% scale)
  const smallBoxSize = 6.25; // 1mm = 6.25px (25% larger than original 5px)
  const viewBoxWidth = Math.ceil(width / smallBoxSize) * smallBoxSize;
  const viewBoxHeight = viewBoxWidth / 2; // maintain 2:1 aspect ratio

  const getPathForLead = (lead: string): string => {
    const baseY = viewBoxHeight / 2;
    const centerX = viewBoxWidth / 2;
    const ekgWidth = viewBoxWidth * 0.8;
    
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

    switch (lead) {
      case 'I':
        // P wave (1.5mm)
        path += `Q ${pWaveStart + pWaveWidth/2} ${baseY - 1.5 * mmToPx} ${pWaveStart + pWaveWidth} ${baseY} `;
        // PR segment
        path += `L ${qrsStart} ${baseY} `;
        // QRS complex (7mm)
        path += `L ${qrsStart + qrsWidth/4} ${baseY + 1.5 * mmToPx} L ${centerX} ${baseY - 7 * mmToPx} L ${qrsEnd} ${baseY} `;
        // ST segment
        path += `L ${tWaveStart} ${baseY} `;
        // T wave (3mm)
        path += `Q ${tWaveStart + tWaveWidth/2} ${baseY - 3 * mmToPx} ${tWaveStart + tWaveWidth} ${baseY} `;
        break;

      case 'II':
        // P wave (2mm)
        path += `Q ${pWaveStart + pWaveWidth/2} ${baseY - 2 * mmToPx} ${pWaveStart + pWaveWidth} ${baseY} `;
        // PR segment
        path += `L ${qrsStart} ${baseY} `;
        // QRS complex (10mm)
        path += `L ${qrsStart + qrsWidth/4} ${baseY + 2 * mmToPx} L ${centerX} ${baseY - 10 * mmToPx} L ${qrsEnd} ${baseY} `;
        // ST segment
        path += `L ${tWaveStart} ${baseY} `;
        // T wave (4mm)
        path += `Q ${tWaveStart + tWaveWidth/2} ${baseY - 4 * mmToPx} ${tWaveStart + tWaveWidth} ${baseY} `;
        break;

      case 'III':
        // P wave (1mm)
        path += `Q ${pWaveStart + pWaveWidth/2} ${baseY - 1 * mmToPx} ${pWaveStart + pWaveWidth} ${baseY} `;
        // PR segment
        path += `L ${qrsStart} ${baseY} `;
        // QRS complex (5mm)
        path += `L ${qrsStart + qrsWidth/4} ${baseY + 1.5 * mmToPx} L ${centerX} ${baseY - 5 * mmToPx} L ${qrsEnd} ${baseY} `;
        // ST segment
        path += `L ${tWaveStart} ${baseY} `;
        // T wave (2.5mm)
        path += `Q ${tWaveStart + tWaveWidth/2} ${baseY - 2.5 * mmToPx} ${tWaveStart + tWaveWidth} ${baseY} `;
        break;

      case 'aVR':
        // P wave (inverted, 1.5mm)
        path += `Q ${pWaveStart + pWaveWidth/2} ${baseY + 1.5 * mmToPx} ${pWaveStart + pWaveWidth} ${baseY} `;
        // PR segment
        path += `L ${qrsStart} ${baseY} `;
        // QRS complex (negative, 8mm)
        path += `L ${qrsStart + qrsWidth/4} ${baseY - 2 * mmToPx} L ${centerX} ${baseY + 8 * mmToPx} L ${qrsEnd} ${baseY} `;
        // ST segment
        path += `L ${tWaveStart} ${baseY} `;
        // T wave (inverted, 3mm)
        path += `Q ${tWaveStart + tWaveWidth/2} ${baseY + 3 * mmToPx} ${tWaveStart + tWaveWidth} ${baseY} `;
        break;

      case 'aVL':
        // P wave (biphasic, 1mm each way)
        path += `Q ${pWaveStart + pWaveWidth/3} ${baseY - 1 * mmToPx} ${pWaveStart + pWaveWidth/2} ${baseY} `;
        path += `Q ${pWaveStart + pWaveWidth*2/3} ${baseY + 1 * mmToPx} ${pWaveStart + pWaveWidth} ${baseY} `;
        // PR segment
        path += `L ${qrsStart} ${baseY} `;
        // QRS complex (biphasic, 3mm)
        path += `L ${qrsStart + qrsWidth/4} ${baseY - 3 * mmToPx} L ${centerX} ${baseY + 3 * mmToPx} L ${qrsEnd} ${baseY} `;
        // ST segment
        path += `L ${tWaveStart} ${baseY} `;
        // T wave (small negative, 1.5mm)
        path += `Q ${tWaveStart + tWaveWidth/2} ${baseY + 1.5 * mmToPx} ${tWaveStart + tWaveWidth} ${baseY} `;
        break;

      case 'aVF':
        // P wave (2mm)
        path += `Q ${pWaveStart + pWaveWidth/2} ${baseY - 2 * mmToPx} ${pWaveStart + pWaveWidth} ${baseY} `;
        // PR segment
        path += `L ${qrsStart} ${baseY} `;
        // QRS complex (8mm)
        path += `L ${qrsStart + qrsWidth/4} ${baseY + 2 * mmToPx} L ${centerX} ${baseY - 8 * mmToPx} L ${qrsEnd} ${baseY} `;
        // ST segment
        path += `L ${tWaveStart} ${baseY} `;
        // T wave (3.5mm)
        path += `Q ${tWaveStart + tWaveWidth/2} ${baseY - 3.5 * mmToPx} ${tWaveStart + tWaveWidth} ${baseY} `;
        break;

      default:
        path += `L ${viewBoxWidth} ${baseY} `;
        break;
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