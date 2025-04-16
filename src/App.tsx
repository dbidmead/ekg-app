import React, { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import EKGTracing from './components/EKGTracing'
import AxisDashboard from './components/AxisDashboard'
import { QRSMeasurements } from './utils/axisCalculations'
import { AXIS_SAMPLE_DATA, AXIS_VALUES, AXIS_TYPE_MAP } from './utils/axisConstants'
import { QRSDeflection, LimbLeadDeflections, generateRealisticQRSDeflections } from './utils/qrsDeflectionCalculator'

// More aggressive caching mechanism for QRS deflections
const cachedDeflections = new Map<number, LimbLeadDeflections>();

// Cache QRS deflections with memoization based on rounded angle
const getCachedDeflections = (angle: number): LimbLeadDeflections => {
  // Round to nearest integer for caching to reduce calculations
  const roundedAngle = Math.round(angle);
  
  if (!cachedDeflections.has(roundedAngle)) {
    // Cache miss - generate and store
    const deflections = generateRealisticQRSDeflections(angle);
    cachedDeflections.set(roundedAngle, deflections);
    
    // Keep cache size reasonable
    if (cachedDeflections.size > 360) {
      // Remove oldest entries if cache gets too large
      const keys = Array.from(cachedDeflections.keys());
      if (keys.length > 0) {
        cachedDeflections.delete(keys[0]);
      }
    }
    
    return deflections;
  }
  
  // Cache hit
  return cachedDeflections.get(roundedAngle)!;
};

// Round to specific decimal places
const roundToDecimal = (value: number, decimals: number = 1): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const App: React.FC = () => {
  const [selectedAxis, setSelectedAxis] = useState<string>('')
  const [axisAngle, setAxisAngle] = useState<number>(60) // Default axis angle
  const [qrsDeflections, setQrsDeflections] = useState<LimbLeadDeflections>(() => 
    generateRealisticQRSDeflections(60) // Initialize with default axis
  )
  
  // Initial Lead I and II measurements (only used if not using QRS deflections)
  const [leadIMeasurements, setLeadIMeasurements] = useState<QRSMeasurements>({
    qDuration: 1,    // 40ms
    qAmplitude: -2,
    rAmplitude: 10,
    sAmplitude: -1,
    sDuration: 1     // 40ms
  })

  const [leadIIMeasurements, setLeadIIMeasurements] = useState<QRSMeasurements>({
    qDuration: 1,    // 40ms
    qAmplitude: -1,
    rAmplitude: 15,
    sAmplitude: 0,
    sDuration: 1     // 40ms
  })

  // Update measurements when axis selection changes
  useEffect(() => {
    if (selectedAxis && AXIS_SAMPLE_DATA[selectedAxis as keyof typeof AXIS_SAMPLE_DATA]) {
      const sample = AXIS_SAMPLE_DATA[selectedAxis as keyof typeof AXIS_SAMPLE_DATA];
      setLeadIMeasurements(sample.leadI);
      setLeadIIMeasurements(sample.leadII);
    }
  }, [selectedAxis]);
  
  // Track whether we're in the middle of a drag operation
  const isDraggingRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  
  // Handler for axis changes from the compass
  const handleAxisChange = useCallback((newAxisAngle: number, newDeflections: LimbLeadDeflections) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = now;
    
    // Detect if we're in a drag operation based on update frequency
    if (timeSinceLastUpdate < 100) {
      // Fast updates indicate dragging
      isDraggingRef.current = true;
      updateCountRef.current += 1;
    } else if (timeSinceLastUpdate > 250) {
      // Slow updates indicate normal interaction or final update after dragging
      isDraggingRef.current = false;
      updateCountRef.current = 0;
    }
    
    // Round to 1 decimal place for display, but calculate with full precision
    const roundedAngle = roundToDecimal(newAxisAngle);
    
    // Calculate deflections (use cached values when possible)
    let deflections = newDeflections;
    
    // IMPORTANT: Always update QRS deflections to keep the EKG tracings in sync
    // but avoid unnecessary recalculation of QRS deflections
    if (!deflections || Object.keys(deflections).length === 0) {
      deflections = getCachedDeflections(newAxisAngle);
    }
    
    // Always update angle and deflections immediately to keep UI responsive
    setAxisAngle(roundedAngle);
    setQrsDeflections(deflections);
    
    // If this is a final update or not a dragging operation, update the preset and measurements
    const isFinalUpdate = timeSinceLastUpdate > 250 || !isDraggingRef.current;
    
    // When dragging is done or this is not a drag operation, update all state
    if (isFinalUpdate) {
      // When dragging, the preset is no longer active
      setSelectedAxis('');
      
      // Update lead measurements for dashboard display
      if (deflections?.leadI && deflections?.leadII) {
        setLeadIMeasurements({
          qDuration: 1,
          qAmplitude: roundToDecimal(deflections.leadI.q),
          rAmplitude: roundToDecimal(deflections.leadI.r),
          sAmplitude: roundToDecimal(deflections.leadI.s),
          sDuration: 1
        });
        
        setLeadIIMeasurements({
          qDuration: 1,
          qAmplitude: roundToDecimal(deflections.leadII.q),
          rAmplitude: roundToDecimal(deflections.leadII.r),
          sAmplitude: roundToDecimal(deflections.leadII.s),
          sDuration: 1
        });
      }
    }
  }, []);
  
  // Handler for preset axis button clicks
  const handlePresetAxisClick = useCallback((axisType: string) => {
    // Reset dragging state
    isDraggingRef.current = false;
    updateCountRef.current = 0;
    
    setSelectedAxis(axisType);
    
    // Get the axis angle value for this preset
    const axisValue = AXIS_VALUES[AXIS_TYPE_MAP[axisType as keyof typeof AXIS_TYPE_MAP] as keyof typeof AXIS_VALUES];
    
    // Set the axis angle and calculate new deflections
    setAxisAngle(axisValue);
    setQrsDeflections(getCachedDeflections(axisValue));
  }, []);

  // Flag to determine which approach to use for EKG rendering
  const useDirectAngleApproach = true;

  return (
    <>
      <div className="app-container">
        <h1>EKG Axis Trainer</h1>
        
        <div className="main-content">
          <div className="ekg-grid">
            <div className="lead-container">
              <h3>Lead I</h3>
              <div className="tracing-container">
                <EKGTracing lead="I" axisAngle={axisAngle} />
              </div>
            </div>
            <div className="lead-container">
              <h3>aVR</h3>
              <div className="tracing-container">
                <EKGTracing lead="aVR" axisAngle={axisAngle} />
              </div>
            </div>
            <div className="lead-container">
              <h3>Lead II</h3>
              <div className="tracing-container">
                <EKGTracing lead="II" axisAngle={axisAngle} />
              </div>
            </div>
            <div className="lead-container">
              <h3>aVL</h3>
              <div className="tracing-container">
                <EKGTracing lead="aVL" axisAngle={axisAngle} />
              </div>
            </div>
            <div className="lead-container">
              <h3>Lead III</h3>
              <div className="tracing-container">
                <EKGTracing lead="III" axisAngle={axisAngle} />
              </div>
            </div>
            <div className="lead-container">
              <h3>aVF</h3>
              <div className="tracing-container">
                <EKGTracing lead="aVF" axisAngle={axisAngle} />
              </div>
            </div>
          </div>

          <div className="preset-controls">
            <h2>Preset Axis Angles</h2>
            <div className="preset-buttons">
              <button 
                className={`preset-button ${selectedAxis === 'normal' ? 'active' : ''}`}
                onClick={() => handlePresetAxisClick('normal')}
              >
                Normal Axis
                <span className="degrees">+60°</span>
              </button>
              
              <button 
                className={`preset-button ${selectedAxis === 'left' ? 'active' : ''}`}
                onClick={() => handlePresetAxisClick('left')}
              >
                Left Axis Deviation
                <span className="degrees">-45°</span>
              </button>
              
              <button 
                className={`preset-button ${selectedAxis === 'right' ? 'active' : ''}`}
                onClick={() => handlePresetAxisClick('right')}
              >
                Right Axis Deviation
                <span className="degrees">+120°</span>
              </button>
              
              <button 
                className={`preset-button ${selectedAxis === 'extreme' ? 'active' : ''}`}
                onClick={() => handlePresetAxisClick('extreme')}
              >
                Extreme Axis Deviation
                <span className="degrees">-135°</span>
              </button>
            </div>
            
            <p className="drag-instructions">Or click and drag the compass arrow below to set a custom axis angle</p>
          </div>
        </div>

        <div className="dashboard-section">
          <AxisDashboard
            leadIMeasurements={leadIMeasurements}
            leadIIMeasurements={leadIIMeasurements}
            arrowColor="#0066cc" 
            selectedAxisType={selectedAxis}
            onAxisChange={handleAxisChange}
          />
        </div>
      </div>
    </>
  )
}

export default App
