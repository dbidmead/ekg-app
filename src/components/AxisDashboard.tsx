import React, { useRef, useState, useEffect, useCallback } from 'react';
import { QRSMeasurements, calculateQRSArea, calculateQRSAxis } from '../utils/axisCalculations';
import { 
  getAxisValueFromType, 
  classifyAxisValue, 
  getRandomValueInAxisRange, 
  getAxisRangeFromType
} from '../utils/axisConstants';
import { generateRealisticQRSDeflections, QRSDeflection, LimbLeadDeflections } from '../utils/qrsDeflectionCalculator';

// Simple throttle function to limit update frequency
const throttle = (fn: Function, delay: number) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

// Debounce function to delay execution until after a pause
const debounce = (fn: Function, delay: number) => {
  let timeoutId: number;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

interface AxisDashboardProps {
  leadIMeasurements: QRSMeasurements;
  leadIIMeasurements: QRSMeasurements;
  arrowColor?: string; // Optional prop to set arrow color
  selectedAxisType?: string; // The axis type selected by the user
  onAxisChange?: (axis: number, deflections: {
    leadI: QRSDeflection;
    leadII: QRSDeflection;
    leadIII: QRSDeflection;
    aVR: QRSDeflection;
    aVL: QRSDeflection;
    aVF: QRSDeflection;
  }) => void; // Callback to update QRS deflections
}

const AxisDashboard: React.FC<AxisDashboardProps> = ({ 
  leadIMeasurements, 
  leadIIMeasurements,
  arrowColor = '#0066cc', // Default to blue
  selectedAxisType = '',
  onAxisChange
}) => {
  // State for the current axis angle
  const [axisAngle, setAxisAngle] = useState<number>(0);
  
  // Refs for tracking drag state and animation
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef<boolean>(false);
  const lastAngle = useRef<number>(0);
  const userInteractionRef = useRef<boolean>(false); // Track if user has interacted
  
  // Calculate areas with error handling
  let leadIArea = 0;
  let leadIIArea = 0;
  try {
    leadIArea = calculateQRSArea(leadIMeasurements);
    leadIIArea = calculateQRSArea(leadIIMeasurements);
  } catch (error) {
    // Silently handle error
  }

  // Set initial axis angle based on measurements
  useEffect(() => {
    // Skip this update if the user is actively interacting with the control
    // or if interaction just ended (to prevent snapping back)
    if (isDragging.current || userInteractionRef.current) {
      return;
    }

    const rawAxis = calculateQRSAxis(leadIArea, leadIIArea);
    if (rawAxis !== null) {
      let normalizedAxis = ((rawAxis % 360) + 360) % 360;
      if (normalizedAxis > 180) normalizedAxis -= 360;
      
      setAxisAngle(normalizedAxis);
      lastAngle.current = normalizedAxis;
    }
  }, [leadIArea, leadIIArea]);
  
  // Throttled function to update parent component with new angle and deflections
  // This ensures real-time updates without overwhelming the system
  const updateParent = useCallback(
    throttle((newAngle: number) => {
      if (onAxisChange) {
        // Generate new deflections for the current angle
        const deflections = generateRealisticQRSDeflections(newAngle);
        // Notify the parent component
        onAxisChange(newAngle, deflections);
      }
    }, 50), // Reduced frequency for better performance
    [onAxisChange]
  );
  
  // Debounced function to ensure a final update after user stops moving
  const debouncedFinalUpdate = useCallback(
    debounce((finalAngle: number) => {
      if (onAxisChange) {
        const finalDeflections = generateRealisticQRSDeflections(finalAngle);
        onAxisChange(finalAngle, finalDeflections);
      }
    }, 100), // 100ms after movement stops
    [onAxisChange]
  );
  
  // Update local angle state and parent component when angle changes during drag
  const updateAngle = useCallback((newAngle: number) => {
    // Update local state immediately for responsive UI
    setAxisAngle(newAngle);
    lastAngle.current = newAngle;
    
    // Update parent component (throttled) during drag
    updateParent(newAngle);
  }, [updateParent]);
  
  // Convert mouse coordinates to angle with improved smoothness
  const getAngleFromMousePosition = useCallback((clientX: number, clientY: number): number => {
    if (!svgRef.current) return lastAngle.current;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;
    
    // Calculate position relative to center of the compass
    const x = clientX - svgRect.left - centerX;
    const y = clientY - svgRect.top - centerY;
    
    // Calculate distance from center
    const distance = Math.sqrt(x * x + y * y);
    
    // Handle very small movements near center or clicks directly on center
    if (distance < 2) {
      return lastAngle.current;
    }
    
    // Calculate raw angle using atan2
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    
    // Handle the wrapping from +180 to -180 degrees
    // If we're currently near the boundary and crossing it, adjust the angle
    // to prevent jumps
    if (lastAngle.current > 150 && angle < -150) {
      angle += 360; // We crossed the boundary from positive to negative
    } else if (lastAngle.current < -150 && angle > 150) {
      angle -= 360; // We crossed the boundary from negative to positive
    }
    
    // Apply smooth interpolation based on distance from center
    // Further from center = more precise control (less smoothing)
    const maxSmoothing = 0.85;
    const minSmoothing = 0.2;
    const distanceNormalized = Math.min(1, Math.max(0, (distance - 5) / 50));
    const smoothingFactor = maxSmoothing - (maxSmoothing - minSmoothing) * distanceNormalized;
    
    // Apply the calculated smoothing factor
    angle = lastAngle.current * smoothingFactor + angle * (1 - smoothingFactor);
    
    // Normalize to -180 to +180 range
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    
    return angle;
  }, []);
  
  // Handle mouse down event to start dragging
  const handleMouseDown = (e: React.PointerEvent<SVGElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    isDragging.current = true;
    userInteractionRef.current = true; // Mark that user has interacted
    
    // Update angle immediately on click
    const newAngle = getAngleFromMousePosition(e.clientX, e.clientY);
    updateAngle(newAngle);
    
    // Capture pointer to ensure continued tracking even if mouse leaves the SVG
    if (svgRef.current) {
      svgRef.current.setPointerCapture(e.pointerId);
    }
  };
  
  // Handle mouse move event to update angle during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    
    // Get new angle from mouse position
    const newAngle = getAngleFromMousePosition(e.clientX, e.clientY);
    
    // Only update if the change is significant
    if (Math.abs(newAngle - lastAngle.current) > 0.2) { // Reduced threshold for better responsiveness
      updateAngle(newAngle);
    }
  }, [getAngleFromMousePosition, updateAngle]);
  
  // Handle mouse up event to stop dragging
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      
      // Release pointer capture
      if (svgRef.current && 'releasePointerCapture' in svgRef.current) {
        try {
          svgRef.current.releasePointerCapture((e as unknown as PointerEvent).pointerId);
        } catch (err) {
          // Silently handle if pointerId isn't available
        }
      }
      
      // Final update with the most precise values when user stops dragging
      debouncedFinalUpdate(lastAngle.current);
      
      // Reset user interaction after a delay to allow for state to settle
      setTimeout(() => {
        userInteractionRef.current = false;
      }, 500);
    }
  }, [debouncedFinalUpdate]);
  
  // Add pointer events for better touch support
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    
    const newAngle = getAngleFromMousePosition(e.clientX, e.clientY);
    if (Math.abs(newAngle - lastAngle.current) > 0.2) {
      updateAngle(newAngle);
    }
  }, [getAngleFromMousePosition, updateAngle]);
  
  // Add and remove event listeners for mouse/pointer events
  useEffect(() => {
    // Use pointer events for better cross-device support
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handleMouseUp as unknown as EventListener);
    
    // Fallback to mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handleMouseUp as unknown as EventListener);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handlePointerMove]);
  
  // Move the new useEffect hook here, after all existing hooks
  // Update axis when selectedAxisType changes (from preset buttons)
  useEffect(() => {
    if (selectedAxisType) {
      // A preset was clicked in the parent component
      // Let's set userInteractionRef to false to allow the measurements-based update
      userInteractionRef.current = false;
      
      // The axisAngle will be updated via the leadIMeasurements+leadIIMeasurements effect
      // so we don't need to do anything else here
    }
  }, [selectedAxisType]);
  
  // Use the axis value to determine the classification
  const axisClassification = classifyAxisValue(axisAngle);
  
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
  if (!axisAngle) {
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
  // Convert ECG axis angle to radians for calculating arrow coordinates
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
  
  // Get measurements for display based on leadIMeasurements and leadIIMeasurements from props
  const displayLeadI = leadIMeasurements;
  const displayLeadII = leadIIMeasurements;
  
  // Recalculate areas based on the measurements from props
  let displayLeadIArea = 0;
  let displayLeadIIArea = 0;
  try {
    displayLeadIArea = calculateQRSArea(displayLeadI);
    displayLeadIIArea = calculateQRSArea(displayLeadII);
  } catch (error) {
    // Silently handle error
  }

  return (
    <div className="measurements-grid">
      <div className="lead-measurements">
        <h3>Lead I</h3>
        <div className="measurement-row">
          <span>Q Wave:</span>
          <span>{displayLeadI.qAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row">
          <span>R Wave:</span>
          <span>{displayLeadI.rAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row">
          <span>S Wave:</span>
          <span>{displayLeadI.sAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row total">
          <span>Net Area:</span>
          <span>{displayLeadIArea.toFixed(1)} mm²</span>
        </div>
      </div>

      <div className="lead-measurements">
        <h3>Lead II</h3>
        <div className="measurement-row">
          <span>Q Wave:</span>
          <span>{displayLeadII.qAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row">
          <span>R Wave:</span>
          <span>{displayLeadII.rAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row">
          <span>S Wave:</span>
          <span>{displayLeadII.sAmplitude.toFixed(1)} mm</span>
        </div>
        <div className="measurement-row total">
          <span>Net Area:</span>
          <span>{displayLeadIIArea.toFixed(1)} mm²</span>
        </div>
      </div>

      <div className="axis-result">
        <h3>Mean QRS Axis</h3>
        <div className={axisValueClass}>
          {formatAxis(axisAngle)}
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
            ref={svgRef}
            viewBox="-50 -50 100 100" 
            style={{ 
              position: 'absolute',
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              touchAction: 'none' // Prevent default touch actions to avoid scrolling while dragging
            }}
            onPointerDown={handleMouseDown}
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