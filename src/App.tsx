import './App.css'

function App() {
  return (
    <div className="app-container">
      <h1>EKG Analysis</h1>
      
      <div className="main-content">
        <div className="ekg-grid">
          {/* Left Column */}
          <div className="ekg-lead">
            <h3>Lead I</h3>
            <div className="tracing-container"></div>
          </div>
          <div className="ekg-lead">
            <h3>aVR</h3>
            <div className="tracing-container"></div>
          </div>
          <div className="ekg-lead">
            <h3>Lead II</h3>
            <div className="tracing-container"></div>
          </div>
          <div className="ekg-lead">
            <h3>aVL</h3>
            <div className="tracing-container"></div>
          </div>
          <div className="ekg-lead">
            <h3>Lead III</h3>
            <div className="tracing-container"></div>
          </div>
          <div className="ekg-lead">
            <h3>aVF</h3>
            <div className="tracing-container"></div>
          </div>
        </div>

        <div className="axis-selection">
          <h2>Axis Selection</h2>
          <form>
            <div className="radio-group">
              <label>
                <input type="radio" name="axis" value="normal" />
                Normal Axis
              </label>
              <label>
                <input type="radio" name="axis" value="right" />
                Right Axis
              </label>
              <label>
                <input type="radio" name="axis" value="left" />
                Left Axis
              </label>
              <label>
                <input type="radio" name="axis" value="northwest" />
                Northwest Axis
              </label>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
