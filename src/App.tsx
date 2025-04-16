import React, { useState, useEffect } from 'react'
import './App.css'
import EKGTracing from './components/EKGTracing'
import AxisDashboard from './components/AxisDashboard'
import { QRSMeasurements } from './utils/axisCalculations'
import { AXIS_SAMPLE_DATA } from './utils/axisConstants'

const App: React.FC = () => {
  const [selectedAxis, setSelectedAxis] = useState<string>('')
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

  return (
    <div className="app-container">
      <h1>EKG Axis Trainer</h1>
      
      <div className="main-content">
        <div className="ekg-grid">
          <div className="lead-container">
            <h3>Lead I</h3>
            <div className="tracing-container">
              <EKGTracing lead="I" />
            </div>
          </div>
          <div className="lead-container">
            <h3>aVR</h3>
            <div className="tracing-container">
              <EKGTracing lead="aVR" />
            </div>
          </div>
          <div className="lead-container">
            <h3>Lead II</h3>
            <div className="tracing-container">
              <EKGTracing lead="II" />
            </div>
          </div>
          <div className="lead-container">
            <h3>aVL</h3>
            <div className="tracing-container">
              <EKGTracing lead="aVL" />
            </div>
          </div>
          <div className="lead-container">
            <h3>Lead III</h3>
            <div className="tracing-container">
              <EKGTracing lead="III" />
            </div>
          </div>
          <div className="lead-container">
            <h3>aVF</h3>
            <div className="tracing-container">
              <EKGTracing lead="aVF" />
            </div>
          </div>
        </div>

        <form className="axis-selection">
          <h2>Select the Mean QRS Axis</h2>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="normal"
                checked={selectedAxis === 'normal'}
                onChange={(e) => setSelectedAxis(e.target.value)}
              />
              Normal Axis
            </label>
            <label>
              <input
                type="radio"
                value="left"
                checked={selectedAxis === 'left'}
                onChange={(e) => setSelectedAxis(e.target.value)}
              />
              Left Axis Deviation
            </label>
            <label>
              <input
                type="radio"
                value="right"
                checked={selectedAxis === 'right'}
                onChange={(e) => setSelectedAxis(e.target.value)}
              />
              Right Axis Deviation
            </label>
            <label>
              <input
                type="radio"
                value="extreme"
                checked={selectedAxis === 'extreme'}
                onChange={(e) => setSelectedAxis(e.target.value)}
              />
              Extreme Axis Deviation
            </label>
          </div>
        </form>
      </div>

      <div className="dashboard-section">
        <AxisDashboard
          leadIMeasurements={leadIMeasurements}
          leadIIMeasurements={leadIIMeasurements}
          arrowColor="#0066cc" // Explicitly set blue color
          selectedAxisType={selectedAxis}
        />
      </div>
    </div>
  )
}

export default App
