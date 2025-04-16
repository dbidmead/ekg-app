import { useEffect, useRef } from 'react';

interface AxisCompassProps {
  axis: number;
}

export default function AxisCompass({ axis }: AxisCompassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up coordinate system
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Draw coordinate plane
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 1;

    // Draw horizontal and vertical lines
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();

    // Draw degree markers - draw these BEFORE the circle to ensure connection
    for (let degree = 0; degree < 360; degree += 1) {
      const angle = (degree * Math.PI) / 180;
      let length = 0;
      
      // Determine length of hash mark based on degree
      if (degree % 30 === 0) {
        length = 8;
        ctx.lineWidth = 1.5;
      } else if (degree % 10 === 0) {
        length = 5;
        ctx.lineWidth = 1.2;
      } else if (degree % 5 === 0) {
        length = 3;
        ctx.lineWidth = 0.9;
      } else {
        length = 1;
        ctx.lineWidth = 0.7;
      }
      
      // Draw hash mark - start slightly outside the circle to ensure visual connection
      ctx.beginPath();
      ctx.strokeStyle = '#404040';
      const outerRadius = radius + 0.5; // Start slightly beyond the circle edge
      ctx.moveTo(
        centerX + outerRadius * Math.cos(angle),
        centerY + outerRadius * Math.sin(angle)
      );
      ctx.lineTo(
        centerX + (radius - length) * Math.cos(angle),
        centerY + (radius - length) * Math.sin(angle)
      );
      ctx.stroke();
    }

    // Extra hash marks for the small sections where gaps might appear
    // These will be positioned between the regular hash marks
    for (let degree = 0; degree < 360; degree += 1) {
      // Add extra hash marks every 0.5 degrees near the cardinal points (0, 90, 180, 270)
      // This creates double-density in those regions
      const cardinalRegion = 
        (degree >= 0 && degree <= 10) || 
        (degree >= 80 && degree <= 100) || 
        (degree >= 170 && degree <= 190) || 
        (degree >= 260 && degree <= 280);
        
      if (cardinalRegion) {
        const halfDegree = degree + 0.5;
        const angle = (halfDegree * Math.PI) / 180;
        const length = 1;  // Small hash mark
        
        ctx.beginPath();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = '#404040';
        const outerRadius = radius + 0.5;
        ctx.moveTo(
          centerX + outerRadius * Math.cos(angle),
          centerY + outerRadius * Math.sin(angle)
        );
        ctx.lineTo(
          centerX + (radius - length) * Math.cos(angle),
          centerY + (radius - length) * Math.sin(angle)
        );
        ctx.stroke();
      }
    }

    // Draw circle - draw on top of hash marks for clean edge
    ctx.beginPath();
    ctx.lineWidth = 2; // Increased thickness
    ctx.strokeStyle = '#333333'; // Darker stroke color
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw degree markers
    ctx.font = '12px monospace';
    ctx.fillStyle = '#808080';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    [0, 90, 180, -90].forEach((deg) => {
      const angle = (deg - 90) * Math.PI / 180;
      const x = centerX + (radius + 15) * Math.cos(angle);
      const y = centerY + (radius + 15) * Math.sin(angle);
      ctx.fillText(deg + '°', x, y);
    });

    // Draw axis arrow
    const arrowAngle = (axis - 90) * Math.PI / 180;
    const arrowLength = radius - 10;
    
    ctx.beginPath();
    ctx.strokeStyle = '#0066cc'; // Changed to a different shade of blue
    ctx.lineWidth = 2;
    
    // Draw main line
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + arrowLength * Math.cos(arrowAngle),
      centerY + arrowLength * Math.sin(arrowAngle)
    );
    
    // Draw arrowhead
    const headLength = 10;
    const headAngle = Math.PI / 6;
    
    ctx.lineTo(
      centerX + (arrowLength - headLength) * Math.cos(arrowAngle + headAngle),
      centerY + (arrowLength - headLength) * Math.sin(arrowAngle + headAngle)
    );
    ctx.moveTo(
      centerX + arrowLength * Math.cos(arrowAngle),
      centerY + arrowLength * Math.sin(arrowAngle)
    );
    ctx.lineTo(
      centerX + (arrowLength - headLength) * Math.cos(arrowAngle - headAngle),
      centerY + (arrowLength - headLength) * Math.sin(arrowAngle - headAngle)
    );
    
    ctx.stroke();
    
    // Draw center dot
    ctx.beginPath();
    ctx.fillStyle = '#0066cc'; // Changed to match the arrow color
    ctx.arc(centerX, centerY, 2.25, 0, 2 * Math.PI);
    ctx.fill();

  }, [axis]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={200} 
      style={{ 
        width: '100%', 
        height: '100%',
        maxWidth: '200px',
        maxHeight: '200px',
        margin: '0 auto'
      }}
    />
  );
} 