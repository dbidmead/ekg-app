import React, { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import EKGTracing from './components/EKGTracing'
import AxisDashboard from './components/AxisDashboard'
import { QRSMeasurements } from './utils/axisCalculations'
import { AXIS_SAMPLE_DATA } from './utils/axisConstants'
import { LimbLeadDeflections, generateRealisticQRSDeflections } from './utils/qrsDeflectionCalculator'

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
    
    // Use exact values as displayed on the buttons
    let axisValue: number;
    switch(axisType) {
      case 'normal':
        axisValue = 60; // +60°
        break;
      case 'left':
        axisValue = -45; // -45°
        break;
      case 'right':
        axisValue = 120; // +120°
        break;
      case 'extreme':
        axisValue = -135; // -135°
        break;
      default:
        axisValue = 60; // Default to normal axis
    }
    
    // Calculate deflections for this preset axis value
    const deflections = getCachedDeflections(axisValue);
    
    // Set the axis angle and QRS deflections
    setAxisAngle(axisValue);
    setQrsDeflections(deflections);
    
    // Also update lead measurements to ensure consistency
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
  }, []);

  return (
    <>
      <div className="app-container">
        <h1>EKG Axis Trainer</h1>
        
        <div className="main-content">
          <div className="left-panel">
            <div className="ekg-grid">
              <div className="lead-container">
                <h3>Lead I</h3>
                <div className="tracing-container">
                  <EKGTracing lead="I" axisAngle={axisAngle} qrsDeflections={qrsDeflections} />
                </div>
              </div>
              <div className="lead-container">
                <h3>aVR</h3>
                <div className="tracing-container">
                  <EKGTracing lead="aVR" axisAngle={axisAngle} qrsDeflections={qrsDeflections} />
                </div>
              </div>
              <div className="lead-container">
                <h3>Lead II</h3>
                <div className="tracing-container">
                  <EKGTracing lead="II" axisAngle={axisAngle} qrsDeflections={qrsDeflections} />
                </div>
              </div>
              <div className="lead-container">
                <h3>aVL</h3>
                <div className="tracing-container">
                  <EKGTracing lead="aVL" axisAngle={axisAngle} qrsDeflections={qrsDeflections} />
                </div>
              </div>
              <div className="lead-container">
                <h3>Lead III</h3>
                <div className="tracing-container">
                  <EKGTracing lead="III" axisAngle={axisAngle} qrsDeflections={qrsDeflections} />
                </div>
              </div>
              <div className="lead-container">
                <h3>aVF</h3>
                <div className="tracing-container">
                  <EKGTracing lead="aVF" axisAngle={axisAngle} qrsDeflections={qrsDeflections} />
                </div>
              </div>
            </div>
          </div>

          <div className="preset-controls">
            <div className="preset-buttons">
              <button 
                className={`preset-button ${selectedAxis === 'normal' ? 'active' : ''}`}
                onClick={() => handlePresetAxisClick('normal')}
              >
                Normal Axis <span className="degrees">+60°</span>
              </button>
              <button 
                className={`preset-button ${selectedAxis === 'left' ? 'active' : ''}`}
                onClick={() => handlePresetAxisClick('left')}
              >
                Left Axis Deviation <span className="degrees">-45°</span>
              </button>
              <button 
                className={`preset-button ${selectedAxis === 'right' ? 'active' : ''}`}
                onClick={() => handlePresetAxisClick('right')}
              >
                Right Axis Deviation <span className="degrees">+120°</span>
              </button>
              <button 
                className={`preset-button ${selectedAxis === 'extreme' ? 'active' : ''}`}
                onClick={() => handlePresetAxisClick('extreme')}
              >
                Extreme Axis Deviation <span className="degrees">-135°</span>
              </button>
            </div>
            
            <div className="compass-container">
              <div className="mobile-instructions">
                Tap and drag the compass to adjust axis
              </div>
              <div className="compass-circle">
                <div className="compass-marker right">0°</div>
                <div className="compass-marker bottom">+90°</div>
                <div className="compass-marker left">±180°</div>
                <div className="compass-marker top">-90°</div>
                <AxisDashboard 
                  axisAngle={axisAngle} 
                  onAxisChange={handleAxisChange}
                  selectedAxisType={selectedAxis}
                  arrowColor="#0066cc"
                  leadIMeasurements={leadIMeasurements}
                  leadIIMeasurements={leadIIMeasurements}
                />
              </div>
            </div>

            <div className="dashboard-section">
              <div className={`axis-value ${axisAngle >= -30 && axisAngle <= 90 ? 'normal' : 'abnormal'}`}>
                {axisAngle > 0 ? `+${Math.round(axisAngle)}°` : `${Math.round(axisAngle)}°`}
              </div>
              <div className="axis-classification">
                {axisAngle >= -30 && axisAngle <= 90 
                  ? 'Normal Axis' 
                  : axisAngle > 90 && axisAngle <= 180 
                    ? 'Right Axis Deviation'
                    : axisAngle < -30 && axisAngle >= -90
                      ? 'Left Axis Deviation'
                      : 'Extreme Axis Deviation'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
