import React from 'react';
import EKGTracing from './EKGTracing';
import { ChestLeadDeflections, CHEST_LEADS, ChestLeadPattern, calculateChestLeadDeflections } from '../utils/chestLeadDeflectionCalculator';

interface ChestLeadsProps {
  qrsAxisAngle: number;
  patternType?: ChestLeadPattern;
  leadWidth?: number;
  leadHeight?: number;
}

/**
 * ChestLeads component displays all six precordial leads (V1-V6)
 * in a horizontal row with appropriate QRS deflections based on 
 * the provided QRS axis angle.
 */
const ChestLeads: React.FC<ChestLeadsProps> = ({
  qrsAxisAngle,
  patternType = ChestLeadPattern.NORMAL,
  leadWidth = 300,
  leadHeight = 150,
}) => {
  // Calculate QRS deflections for all chest leads
  const chestLeadDeflections: ChestLeadDeflections = calculateChestLeadDeflections(
    qrsAxisAngle,
    patternType
  );
  
  // Create adapter function to convert chest lead deflection to limb lead format
  const createDeflectionsObject = (leadDeflection: typeof chestLeadDeflections[keyof ChestLeadDeflections]) => {
    return {
      leadI: leadDeflection,
      leadII: leadDeflection,
      leadIII: leadDeflection,
      aVR: leadDeflection,
      aVL: leadDeflection,
      aVF: leadDeflection
    };
  };
  
  // Styles as regular React inline styles
  const containerStyle = {
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  };
  
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px'
  };
  
  const itemStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center'
  };
  
  const labelStyle = {
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '14px'
  };
  
  return (
    <div style={containerStyle} className="chest-leads-container">
      <div style={gridStyle} className="chest-leads-grid">
        {CHEST_LEADS.map(lead => (
          <div key={lead} style={itemStyle} className="chest-lead-item">
            <div style={labelStyle} className="lead-label">{lead}</div>
            <EKGTracing
              lead={lead}
              width={leadWidth}
              height={leadHeight}
              qrsDeflections={createDeflectionsObject(chestLeadDeflections[lead as keyof ChestLeadDeflections])}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChestLeads; 