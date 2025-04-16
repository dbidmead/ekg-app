import React from 'react';
import { QRSMeasurements, calculateQRSArea, calculateQRSAxis } from '../utils/axisCalculations';
import { 
  getAxisValueFromType, 
  classifyAxisValue, 
  getRandomValueInAxisRange, 
  getAxisRangeFromType
} from '../utils/axisConstants';

interface AxisDashboardProps {
  leadIMeasurements: QRSMeasurements;
  leadIIMeasurements: QRSMeasurements;
  arrowColor?: string; // Optional prop to set arrow color
  selectedAxisType?: string; // The axis type selected by the user
}

const AxisDashboard: React.FC<AxisDashboardProps> = ({ 
  leadIMeasurements, 
  leadIIMeasurements,
  arrowColor = '#0066cc', // Default to blue
  selectedAxisType = ''
}) => {
  // Calculate areas with error handling
  let leadIArea = 0;
  let leadIIArea = 0;
  try {
    leadIArea = calculateQRSArea(leadIMeasurements);
    leadIIArea = calculateQRSArea(leadIIMeasurements);
    console.log('Lead I Area:', leadIArea.toFixed(2), 'mm²');
    console.log('Lead II Area:', leadIIArea.toFixed(2), 'mm²');
  } catch (error) {
    console.error('Error calculating QRS areas:', error);
  }

  // Calculate axis from the areas
  const rawAxis = calculateQRSAxis(leadIArea, leadIIArea);
  
  // Debug calculation steps
  if (rawAxis !== null) {
    console.log('====== DETAILED AXIS CALCULATION ======');
    console.log('Lead I Area:', leadIArea.toFixed(2), 'mm²');
    console.log('Lead II Area:', leadIIArea.toFixed(2), 'mm²');
    
    // Calculate raw angle using the formula
    const numerator = 2 * leadIIArea - leadIArea;
    const denominator = Math.sqrt(3) * leadIArea;
    console.log('Numerator (2*leadII - leadI):', numerator.toFixed(2));
    console.log('Denominator (√3*leadI):', denominator.toFixed(2));
    
    const rawAngle = Math.atan(numerator / denominator) * (180 / Math.PI);
    console.log('Raw Angle (atan):', rawAngle.toFixed(2));
    
    // Check quadrant adjustment
    const quadrantAdjusted = leadIArea < 0 ? rawAngle + 180 : rawAngle;
    console.log('After Quadrant Check:', quadrantAdjusted.toFixed(2));
    
    // Normalize to -180 to +180
    let normalized = ((quadrantAdjusted % 360) + 360) % 360;
    if (normalized > 180) normalized -= 360;
    console.log('Final Normalized (-180 to +180):', normalized.toFixed(2));
    console.log('======================================');
  }
  
  // Normalize to -180 to +180 range
  let axis = null;
  if (rawAxis !== null) {
    axis = ((rawAxis % 360) + 360) % 360;
    if (axis > 180) axis -= 360;
  }
  
  console.log('Raw Axis:', rawAxis?.toFixed(2), '°');
  console.log('Normalized Axis:', axis?.toFixed(2), '°');
  
  // When an axis type is selected, get a random value within that range
  if (selectedAxisType) {
    console.log('Using explicit axis selection:', selectedAxisType);
    
    // Get a random value within the selected range
    axis = getRandomValueInAxisRange(selectedAxisType);
    const range = getAxisRangeFromType(selectedAxisType);
    
    console.log(`Setting axis to ${axis}° (random value in range ${range.MIN}° to ${range.MAX}°)`);
  }
  
  // Use the axis value to determine the classification
  const axisClassification = classifyAxisValue(axis);
  
  // Check if axis is normal or abnormal (not in normal range)
  const isNormal = axisClassification === 'Normal';
  
  // Create a CSS class based on the axis classification
  const axisValueClass = `axis-value ${isNormal ? 'normal' : 'abnormal'}`;

  // Format axis for display
  const formatAxis = (axis: number | null): string => {
    if (axis === null) return 'Indeterminate';
    return `${axis.toFixed(1)}°`;
  };

  // Exit early if we don't have valid measurements
  if (!axis) {
    return (
      <div className="axis-dashboard">
        <h3>Mean QRS Axis</h3>
        <div className="axis-value indeterminate">Indeterminate</div>
      </div>
    );
  }

  // Generate degree markers for the compass
  const generateDegreeMarkers = () => {
    const markers = [];
    const CIRCLE_RADIUS = 48;
    const HASH_RADIUS = 48.5; // Slightly larger to ensure visual connection
    
    for (let degree = 0; degree < 360; degree += 1) {
      const angle = (degree * Math.PI) / 180;
      const length = degree % 30 === 0 ? 8 : degree % 10 === 0 ? 5 : degree % 5 === 0 ? 3 : 1;
      
      // Start slightly outside the circle border to ensure visual connection
      const x1 = HASH_RADIUS * Math.cos(angle);
      const y1 = HASH_RADIUS * Math.sin(angle);
      // Project inward by the mark length
      const x2 = (CIRCLE_RADIUS - length) * Math.cos(angle);
      const y2 = (CIRCLE_RADIUS - length) * Math.sin(angle);
      
      markers.push(
        <line
          key={degree}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#333"
          strokeWidth={degree % 30 === 0 ? "1.0" : degree % 10 === 0 ? "0.75" : "0.5"}
          strokeLinecap="butt"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    return markers;
  };

  // For ECG axis, 0° is east, 90° is south, ±180° is west, -90° is north
  // Use the axis value for display
  const axisAngle = axis || 0;
  
  // Convert ECG axis angle to radians for calculating arrow coordinates
  // ECG angles are counterclockwise from east (0°)
  const angleRadians = (axisAngle * Math.PI) / 180;
  
  // Calculate end coordinates for the arrow
  const arrowLength = 43;
  const arrowX = arrowLength * Math.cos(angleRadians);
  const arrowY = arrowLength * Math.sin(angleRadians);
  
  // Calculate coordinates for arrowhead
  const headLength = 14; // Increased length for a more elongated arrow
  const headWidth = 4; // Narrow width for a sharper appearance
  
  // Calculate arrowhead tip point (same as arrowX, arrowY)
  const tipX = arrowX;
  const tipY = arrowY;
  
  // Calculate position of arrowhead base
  const headBaseX = (arrowLength - headLength) * Math.cos(angleRadians);
  const headBaseY = (arrowLength - headLength) * Math.sin(angleRadians);
  
  // Calculate perpendicular vector for arrowhead wings
  const perpX = -headWidth * Math.sin(angleRadians);
  const perpY = headWidth * Math.cos(angleRadians);
  
  // Calculate arrowhead wing points
  const leftWingX = headBaseX + perpX;
  const leftWingY = headBaseY + perpY;
  const rightWingX = headBaseX - perpX;
  const rightWingY = headBaseY - perpY;
  
  return (
    <div className="measurements-grid">
      <div className="lead-measurements">
        <h3>Lead I</h3>
        <div className="measurement-row">
          <span>Q Wave:</span>
          <span>{leadIMeasurements.qAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row">
          <span>R Wave:</span>
          <span>{leadIMeasurements.rAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row">
          <span>S Wave:</span>
          <span>{leadIMeasurements.sAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row total">
          <span>Net Area:</span>
          <span>{leadIArea.toFixed(1)} mm²</span>
        </div>
      </div>

      <div className="lead-measurements">
        <h3>Lead II</h3>
        <div className="measurement-row">
          <span>Q Wave:</span>
          <span>{leadIIMeasurements.qAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row">
          <span>R Wave:</span>
          <span>{leadIIMeasurements.rAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row">
          <span>S Wave:</span>
          <span>{leadIIMeasurements.sAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row total">
          <span>Net Area:</span>
          <span>{leadIIArea.toFixed(1)} mm²</span>
        </div>
      </div>

      <div className="axis-result">
        <h3>Mean QRS Axis</h3>
        <div className={axisValueClass}>
          {formatAxis(axis)}
          <div className="axis-classification">{axisClassification}</div>
        </div>
      </div>

      <div className="axis-compass">
        <div className="compass-circle">
          <div className="compass-marker right">0°</div>
          <div className="compass-marker bottom">+90°</div>
          <div className="compass-marker left">±180°</div>
          <div className="compass-marker top">-90°</div>
          
          <svg 
            viewBox="-50 -50 100 100" 
            style={{ 
              position: 'absolute',
              width: '100%',
              height: '100%',
            }}
          >
            {/* Degree markers */}
            {generateDegreeMarkers()}
            
            {/* Circle border */}
            <circle
              cx="0"
              cy="0"
              r="48"
              fill="none"
              stroke="#333"
              strokeWidth="1.25"
            />
            
            {/* Improved arrow shaft with better line cap */}
            <line 
              x1="0" 
              y1="0" 
              x2={headBaseX} 
              y2={headBaseY} 
              stroke={arrowColor} 
              strokeWidth="2"
              strokeLinecap="butt"
            />
            
            {/* Sharper arrowhead as polygon */}
            <polygon 
              points={`${tipX},${tipY} ${leftWingX},${leftWingY} ${rightWingX},${rightWingY}`} 
              fill={arrowColor}
              stroke="none"
            />
            
            {/* Center dot */}
            <circle 
              cx="0" 
              cy="0" 
              r="2.25" 
              fill={arrowColor}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AxisDashboard; 