const canvas = document.getElementById('spiderWeb');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const mouse = {x: null, y: null};
window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
});

// Increase grid spacing for better performance
const gridSpacing = 75;
const cellSize = gridSpacing;
const grid = {};

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.isActive = false;
    }
    
    draw() {
        if(this.isActive) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    
    update() {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.isActive = distance < 150;
        
        if(this.isActive) {
            this.x -= dx * 0.05;
            this.y -= dy * 0.05;
        } else {
            this.x += (this.baseX - this.x) * 0.05;
            this.y += (this.baseY - this.y) * 0.05;
        }
        
        // Update grid position if needed
        const newCellX = Math.floor(this.x / cellSize);
        const newCellY = Math.floor(this.y / cellSize);
        const newCellKey = `${newCellX},${newCellY}`;
        
        if(this.cell !== newCellKey) {
            // Remove from old cell
            if(this.cell && grid[this.cell]) {
                const index = grid[this.cell].indexOf(this);
                if(index > -1) {
                    grid[this.cell].splice(index, 1);
                }
            }
            
            // Add to new cell
            if(!grid[newCellKey]) {
                grid[newCellKey] = [];
            }
            grid[newCellKey].push(this);
            this.cell = newCellKey;
        }
    }
}

function addToGrid(point) {
    const cellX = Math.floor(point.x / cellSize);
    const cellY = Math.floor(point.y / cellSize);
    const cellKey = `${cellX},${cellY}`;
    
    if(!grid[cellKey]) {
        grid[cellKey] = [];
    }
    grid[cellKey].push(point);
    point.cell = cellKey;
}

const points = [];
// Create points and add to spatial grid
for(let y = 0; y <= canvas.height; y += gridSpacing) {
    for(let x = 0; x <= canvas.width; x += gridSpacing) {
        const point = new Point(x, y);
        points.push(point);
        addToGrid(point);
    }
}

function connectPoints() {
    // Store connections to draw
    const connections = [];
    
    // Use cached set to avoid duplicate connections
    const connected = new Set();
    
    for(let i = 0; i < points.length; i++) {
        const point = points[i];
        const cellX = Math.floor(point.x / cellSize);
        const cellY = Math.floor(point.y / cellSize);
        
        // Check neighboring cells
        for(let y = -1; y <= 1; y++) {
            for(let x = -1; x <= 1; x++) {
                const checkKey = `${cellX + x},${cellY + y}`;
                if(grid[checkKey]) {
                    grid[checkKey].forEach(neighbor => {
                        // Create a unique key for this pair of points
                        const connectionKey = point.id < neighbor.id ? 
                            `${point.id}-${neighbor.id}` : 
                            `${neighbor.id}-${point.id}`;
                        
                        // Only process if we haven't connected these points yet
                        if(!connected.has(connectionKey) && point !== neighbor) {
                            const dx = point.x - neighbor.x;
                            const dy = point.y - neighbor.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if(distance < gridSpacing) {
                                const opacity = 1 - (distance / gridSpacing);
                                connections.push({
                                    x1: point.x,
                                    y1: point.y,
                                    x2: neighbor.x,
                                    y2: neighbor.y,
                                    opacity: opacity
                                });
                                
                                connected.add(connectionKey);
                            }
                        }
                    });
                }
            }
        }
    }
    
    // Draw all connections
    connections.forEach(conn => {
        ctx.beginPath();
        ctx.moveTo(conn.x1, conn.y1);
        ctx.lineTo(conn.x2, conn.y2);
        ctx.strokeStyle = `rgba(255,255,255,${conn.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });
}

// Assign unique IDs to points for connection tracking
points.forEach((point, index) => {
    point.id = index;
});

let lastTime = 0;
const fpsLimit = 60;

function animate(timestamp) {
    requestAnimationFrame(animate);
    
    // Throttle to target fps
    if (timestamp - lastTime < 1000 / fpsLimit) return;
    lastTime = timestamp;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update all points
    points.forEach(point => point.update());
    
    // Draw inactive points first (no shadows)
    points.filter(p => !p.isActive).forEach(point => point.draw());
    
    // Draw connections
    connectPoints();
    
    // Draw active points last (with shadows)
    points.filter(p => p.isActive).forEach(point => point.draw());
}

animate();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Clear spatial grid
    for(let key in grid) {
        delete grid[key];
    }
    
    // Recreate points
    points.length = 0;
    for(let y = 0; y <= canvas.height; y += gridSpacing) {
        for(let x = 0; x <= canvas.width; x += gridSpacing) {
            const point = new Point(x, y);
            points.push(point);
            addToGrid(point);
        }
    }
    
    // Reassign IDs
    points.forEach((point, index) => {
        point.id = index;
    });
});