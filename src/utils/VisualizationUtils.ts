/**
 * Visualization utilities for RNA structures
 */

import { Coordinate3D, FoldingResult } from '../types';

export class VisualizationUtils {
  /**
   * Convert folding result to PDB format
   */
  static toPDB(result: FoldingResult): string {
    const lines: string[] = [];
    
    // Header
    lines.push('HEADER    RNA STRUCTURE');
    lines.push(`TITLE     ${result.sequence.substring(0, 60)}`);
    lines.push(`REMARK   1 ENERGY: ${result.energy.toFixed(2)} KCAL/MOL`);
    lines.push(`REMARK   2 METHOD: ${result.metadata.method}`);
    
    // Atoms
    result.coordinates.forEach((coord, i) => {
      const base = result.sequence[i];
      const resNum = i + 1;
      
      // Phosphate
      lines.push(this.formatATOM(
        i * 3 + 1, 'P', base, resNum, 
        coord[0], coord[1], coord[2]
      ));
      
      // Sugar (C3')
      lines.push(this.formatATOM(
        i * 3 + 2, "C3'", base, resNum,
        coord[0] + 1.5, coord[1], coord[2]
      ));
      
      // Base (N1/N9)
      const atomName = (base === 'A' || base === 'G') ? 'N9' : 'N1';
      lines.push(this.formatATOM(
        i * 3 + 3, atomName, base, resNum,
        coord[0] + 3.0, coord[1], coord[2]
      ));
    });
    
    // Connectivity
    lines.push('TER');
    
    // Base pairs as CONECT records
    result.pairs.forEach(pair => {
      lines.push(`CONECT ${pair.i * 3 + 3} ${pair.j * 3 + 3}`);
    });
    
    lines.push('END');
    
    return lines.join('\n');
  }

  /**
   * Format ATOM record for PDB
   */
  private static formatATOM(
    serial: number,
    atomName: string,
    resName: string,
    resSeq: number,
    x: number,
    y: number,
    z: number
  ): string {
    return [
      'ATOM  ',
      serial.toString().padStart(5),
      ' ',
      atomName.padEnd(4),
      ' ',
      resName.padEnd(3),
      ' A',
      resSeq.toString().padStart(4),
      '    ',
      x.toFixed(3).padStart(8),
      y.toFixed(3).padStart(8),
      z.toFixed(3).padStart(8),
      '  1.00  0.00           ',
      atomName[0].padEnd(2)
    ].join('');
  }

  /**
   * Generate SVG visualization of secondary structure
   */
  static toSVG(result: FoldingResult, width: number = 800, height: number = 600): string {
    const svg: string[] = [];
    
    svg.push(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`);
    svg.push('<rect width="100%" height="100%" fill="white"/>');
    
    // Project 3D to 2D
    const coords2D = this.projectTo2D(result.coordinates, width, height);
    
    // Draw backbone
    svg.push('<path d="');
    coords2D.forEach((coord, i) => {
      svg.push(i === 0 ? `M ${coord[0]} ${coord[1]}` : ` L ${coord[0]} ${coord[1]}`);
    });
    svg.push('" stroke="black" stroke-width="2" fill="none"/>');
    
    // Draw base pairs
    result.pairs.forEach(pair => {
      const coord1 = coords2D[pair.i];
      const coord2 = coords2D[pair.j];
      
      const color = pair.type === 'WC' ? 'blue' : 
                   pair.type === 'wobble' ? 'green' : 'red';
      
      svg.push(`<line x1="${coord1[0]}" y1="${coord1[1]}" ` +
               `x2="${coord2[0]}" y2="${coord2[1]}" ` +
               `stroke="${color}" stroke-width="1" opacity="0.5"/>`);
    });
    
    // Draw bases
    coords2D.forEach((coord, i) => {
      const base = result.sequence[i];
      const color = this.getBaseColor(base);
      
      svg.push(`<circle cx="${coord[0]}" cy="${coord[1]}" r="5" fill="${color}"/>`);
      svg.push(`<text x="${coord[0]}" y="${coord[1] + 3}" ` +
               `text-anchor="middle" font-size="10" fill="white">${base}</text>`);
    });
    
    svg.push('</svg>');
    
    return svg.join('\n');
  }

  /**
   * Project 3D coordinates to 2D
   */
  private static projectTo2D(
    coords3D: Coordinate3D[], 
    width: number, 
    height: number
  ): Array<[number, number]> {
    // Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    coords3D.forEach(coord => {
      minX = Math.min(minX, coord[0]);
      maxX = Math.max(maxX, coord[0]);
      minY = Math.min(minY, coord[1]);
      maxY = Math.max(maxY, coord[1]);
    });
    
    // Add padding
    const padding = 50;
    const scaleX = (width - 2 * padding) / (maxX - minX);
    const scaleY = (height - 2 * padding) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);
    
    // Project
    return coords3D.map(coord => [
      padding + (coord[0] - minX) * scale,
      padding + (coord[1] - minY) * scale
    ]);
  }

  /**
   * Get color for base
   */
  private static getBaseColor(base: string): string {
    switch (base) {
      case 'A': return '#FF6B6B';  // Red
      case 'U': return '#4ECDC4';  // Cyan
      case 'G': return '#45B7D1';  // Blue
      case 'C': return '#96CEB4';  // Green
      default: return '#666666';   // Gray
    }
  }

  /**
   * Generate dot-bracket notation with energy annotation
   */
  static toDotBracketWithEnergy(result: FoldingResult): string {
    const lines: string[] = [];
    
    // Sequence
    lines.push(`>${result.sequence.length} bases, E=${result.energy.toFixed(2)} kcal/mol`);
    lines.push(result.sequence);
    lines.push(result.secondary);
    
    // Per-position energy (simplified)
    const energyLine = result.sequence.split('').map((_, i) => {
      // Check if position is in a pair
      const isPaired = result.pairs.some(p => p.i === i || p.j === i);
      return isPaired ? '-' : '.';
    }).join('');
    
    lines.push(energyLine);
    
    return lines.join('\n');
  }

  /**
   * Calculate structure statistics
   */
  static getStatistics(result: FoldingResult): {
    length: number;
    pairs: number;
    unpaired: number;
    gcContent: number;
    stems: number;
    loops: number;
  } {
    const gcCount = (result.sequence.match(/[GC]/g) || []).length;
    const unpaired = result.secondary.split('').filter(c => c === '.').length;
    
    // Count stems (consecutive pairs)
    let stems = 0;
    let inStem = false;
    
    for (let i = 1; i < result.secondary.length; i++) {
      if (result.secondary[i] === '(' && result.secondary[i-1] === '(') {
        if (!inStem) {
          stems++;
          inStem = true;
        }
      } else {
        inStem = false;
      }
    }
    
    // Count loops (consecutive unpaired)
    let loops = 0;
    let inLoop = false;
    
    for (let i = 1; i < result.secondary.length; i++) {
      if (result.secondary[i] === '.' && result.secondary[i-1] === '.') {
        if (!inLoop) {
          loops++;
          inLoop = true;
        }
      } else {
        inLoop = false;
      }
    }
    
    return {
      length: result.sequence.length,
      pairs: result.pairs.length,
      unpaired,
      gcContent: gcCount / result.sequence.length,
      stems,
      loops
    };
  }
}