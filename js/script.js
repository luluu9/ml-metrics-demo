// Main configuration
const config = {
    width: 500,
    height: 400,
    padding: 30,
    dotRadius: 5,
    mode: 'add', // 'add' or 'remove'
};

// Initialize the data structure
let data = {
    tp: [], // true positives
    fn: [], // false negatives
    fp: [], // false positives
    tn: [], // true negatives
};

// Initialize SVG
const svg = d3.select('#diagram-container')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${config.width} ${config.height}`)
    .attr('class', 'diagram')
    .attr('preserveAspectRatio', 'xMidYMid meet');

// Calculate the center and radius
const centerX = config.width / 2;
const centerY = config.height / 2;
const radius = Math.min(config.width, config.height) / 2 - config.padding;

// Create background regions for the four quadrants
function setupBackground() {
    // Create background for the entire diagram
    svg.append('rect')
        .attr('width', config.width)
        .attr('height', config.height)
        .attr('fill', '#f8f9fa')
        .attr('rx', 8)
        .attr('ry', 8);
        
    // Add background for predicted negative area (outside circle, light red)
    svg.append('rect')
        .attr('width', config.width)
        .attr('height', config.height)
        .attr('fill', 'rgba(255, 200, 200, 0.3)')
        .attr('rx', 8)
        .attr('ry', 8);
        
    // Add background for predicted positive area (inside circle, light green)
    svg.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', radius)
        .attr('fill', 'rgba(200, 255, 200, 0.3)');

    // Add vertical divider line
    svg.append('line')
        .attr('x1', centerX)
        .attr('y1', 0)
        .attr('x2', centerX)
        .attr('y2', config.height)
        .attr('class', 'divider');

    // Draw the decision circle boundary
    svg.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', radius)
        .attr('class', 'circle-boundary');

    // Add labels for the quadrants
    svg.append('text')
        .attr('x', centerX / 2)
        .attr('y', config.padding)
        .attr('text-anchor', 'middle')
        .attr('class', 'label')
        .text('Positives (P)');

    svg.append('text')
        .attr('x', centerX + centerX / 2)
        .attr('y', config.padding)
        .attr('text-anchor', 'middle')
        .attr('class', 'label')
        .text('Negatives (N)');    
        
}

// Setup event handling
function setupEvents() {
    // Setup the click event on the diagram for adding/removing dots
    svg.on('click', function(event) {
        if (config.mode === 'add') {
            const [x, y] = d3.pointer(event);
            addDot(x, y);
        }
    });

    // Setup the mode buttons
    document.getElementById('add-mode').addEventListener('click', function() {
        setMode('add');
    });

    document.getElementById('remove-mode').addEventListener('click', function() {
        setMode('remove');
    });

    // Setup the random generation button
    document.getElementById('generate-random').addEventListener('click', function() {
        generateRandomDistribution();
    });

    // Setup the clear all button
    document.getElementById('clear-all').addEventListener('click', function() {
        clearAllDots();
    });
    
    // Setup sliders
    const classBalanceSlider = document.getElementById('class-balance');
    const predictionAccuracySlider = document.getElementById('prediction-accuracy');
    
    // Update values when sliders change
    classBalanceSlider.addEventListener('input', updateDistributionPreview);
    predictionAccuracySlider.addEventListener('input', updateDistributionPreview);
    
    // Initialize distribution preview
    updateDistributionPreview();
}

// Set interaction mode (add or remove dots)
function setMode(mode) {
    config.mode = mode;
    
    // Update button styling
    document.getElementById('add-mode').classList.toggle('active', mode === 'add');
    document.getElementById('remove-mode').classList.toggle('active', mode === 'remove');
    
    // Update cursor style
    const cursorStyle = mode === 'add' ? 'crosshair' : 'pointer';
    svg.style('cursor', cursorStyle);
    
    // Update dot cursor style
    svg.selectAll('.dot')
        .style('cursor', mode === 'remove' ? 'not-allowed' : 'pointer');
}

// Add a dot at the specified coordinates
function addDot(x, y) {
    // Determine the quadrant and category of the dot
    const isLeftSide = x < centerX;
    const isInsideCircle = Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2) < Math.pow(radius, 2);
    
    let category;
    if (isLeftSide && isInsideCircle) {
        category = 'tp'; // True positive
    } else if (isLeftSide && !isInsideCircle) {
        category = 'fn'; // False negative
    } else if (!isLeftSide && isInsideCircle) {
        category = 'fp'; // False positive
    } else {
        category = 'tn'; // True negative
    }
    
    // Add the dot to the appropriate array
    data[category].push({ x, y });
    
    // Update the visualization
    renderDots();
    updateMetrics();
}

// Remove a dot
function removeDot(category, index) {
    // Remove the dot from the array
    data[category].splice(index, 1);
    
    // Update the visualization
    renderDots();
    updateMetrics();
}

// Clear all dots
function clearAllDots() {
    // Reset data
    data = {
        tp: [],
        fn: [],
        fp: [],
        tn: []
    };
    
    // Update visualization
    renderDots();
    updateMetrics();
    
    // Also update distribution preview from sliders (since we have no dots now)
    updateDistributionPreview();
}

// Render all dots
function renderDots() {
    // Helper function to render dots for a specific category
    const renderDotsForCategory = (category) => {
        const dots = svg.selectAll(`.dot.${category}`)
            .data(data[category]);
            
        // Remove old dots
        dots.exit().remove();
        
        // Add new dots
        dots.enter()
            .append('circle')
            .attr('class', `dot ${category}`)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', config.dotRadius)
            .on('click', function(event, d) {
                if (config.mode === 'remove') {
                    event.stopPropagation();
                    const index = data[category].indexOf(d);
                    removeDot(category, index);
                }
            });
            
        // Update existing dots
        dots.attr('cx', d => d.x)
            .attr('cy', d => d.y);
    };
    
    // Render dots for all categories
    renderDotsForCategory('tp');
    renderDotsForCategory('fn');
    renderDotsForCategory('fp');
    renderDotsForCategory('tn');
}

// Update distribution preview based on slider values
function updateDistributionPreview() {
    const classBalance = parseInt(document.getElementById('class-balance').value);
    const predictionAccuracy = parseInt(document.getElementById('prediction-accuracy').value);
    
    // Update slider value text
    document.getElementById('class-balance-value').textContent = 
        `${classBalance}% Positives / ${100-classBalance}% Negatives`;
    document.getElementById('prediction-accuracy-value').textContent = 
        `${predictionAccuracy}% True / ${100-predictionAccuracy}% False`;
    
    // Calculate distribution percentages
    const positivePercent = classBalance;
    const negativePercent = 100 - classBalance;
    const truePercent = predictionAccuracy;
    const falsePercent = 100 - predictionAccuracy;
    
    // Calculate quadrant percentages
    const tpPercent = Math.round((positivePercent * truePercent) / 100);
    const fnPercent = Math.round((positivePercent * falsePercent) / 100);
    const fpPercent = Math.round((negativePercent * falsePercent) / 100);
    const tnPercent = Math.round((negativePercent * truePercent) / 100);
    
    // Ensure sum equals 100%
    const sum = tpPercent + fnPercent + fpPercent + tnPercent;
    let adjustment = 100 - sum;
    
    // Apply adjustment to the largest value
    let largestValue = Math.max(tpPercent, fnPercent, fpPercent, tnPercent);
    let adjustedTpPercent = tpPercent;
    let adjustedFnPercent = fnPercent;
    let adjustedFpPercent = fpPercent;
    let adjustedTnPercent = tnPercent;
    
    if (largestValue === tpPercent) adjustedTpPercent += adjustment;
    else if (largestValue === fnPercent) adjustedFnPercent += adjustment;
    else if (largestValue === fpPercent) adjustedFpPercent += adjustment;
    else adjustedTnPercent += adjustment;
      // Only update percentage displays when there are no dots
    // (otherwise actual percentages will be shown in updateMetrics)
    const total = data.tp.length + data.fn.length + data.fp.length + data.tn.length;
    if (total === 0) {
        document.getElementById('preview-tp').textContent = `${adjustedTpPercent}%`;
        document.getElementById('preview-fn').textContent = `${adjustedFnPercent}%`;
        document.getElementById('preview-fp').textContent = `${adjustedFpPercent}%`;
        document.getElementById('preview-tn').textContent = `${adjustedTnPercent}%`;
    }
    
    return {
        tp: adjustedTpPercent,
        fn: adjustedFnPercent,
        fp: adjustedFpPercent,
        tn: adjustedTnPercent
    };
}

// Generate random distribution based on slider values
function generateRandomDistribution() {
    // Get total dots and percentages from slider controls
    const totalDots = parseInt(document.getElementById('total-dots').value);
    const percentages = updateDistributionPreview();
    
    const tpPercent = percentages.tp / 100;
    const fnPercent = percentages.fn / 100;
    const fpPercent = percentages.fp / 100;
    const tnPercent = percentages.tn / 100;
    
    // Calculate number of dots for each category
    const tpCount = Math.round(totalDots * tpPercent);
    const fnCount = Math.round(totalDots * fnPercent);
    const fpCount = Math.round(totalDots * fpPercent);
    const tnCount = Math.round(totalDots * tnPercent);
    
    // Clear existing data
    clearAllDots();
    
    // Helper function to generate a random position within a quadrant
    const generateRandomPosition = (isLeftSide, isInsideCircle) => {
        const x = isLeftSide ? 
            Math.random() * centerX : 
            centerX + Math.random() * centerX;
            
        const y = Math.random() * config.height;
        
        // Check if position is inside/outside the circle as required
        const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        const isInCircle = distanceFromCenter < radius;
        
        // If position doesn't match the circle requirement, try again
        if (isInCircle !== isInsideCircle) {
            return generateRandomPosition(isLeftSide, isInsideCircle);
        }
        
        return { x, y };
    };
    
    // Generate dots for each category
    for (let i = 0; i < tpCount; i++) {
        data.tp.push(generateRandomPosition(true, true));
    }
    
    for (let i = 0; i < fnCount; i++) {
        data.fn.push(generateRandomPosition(true, false));
    }
    
    for (let i = 0; i < fpCount; i++) {
        data.fp.push(generateRandomPosition(false, true));
    }
    
    for (let i = 0; i < tnCount; i++) {
        data.tn.push(generateRandomPosition(false, false));
    }
    
    // Update visualization
    renderDots();
    updateMetrics();
}

// Validate percentages to ensure they sum to 100%
function validatePercentages() {
    const tpPercent = parseInt(document.getElementById('tp-percent').value) || 0;
    const fnPercent = parseInt(document.getElementById('fn-percent').value) || 0;
    const fpPercent = parseInt(document.getElementById('fp-percent').value) || 0;
    const tnPercent = parseInt(document.getElementById('tn-percent').value) || 0;
    
    const total = tpPercent + fnPercent + fpPercent + tnPercent;
    
    // If total exceeds 100%, adjust the last changed input
    if (total > 100) {
        // Find which input was last changed and adjust it
        // This is a simplified approach, a more sophisticated approach would track the last changed input
        document.getElementById('tn-percent').value = Math.max(0, 100 - (tpPercent + fnPercent + fpPercent));
    }
}

// Calculate and update metrics
function updateMetrics() {
    // Get counts for each category
    const tp = data.tp.length;
    const fn = data.fn.length;
    const fp = data.fp.length;
    const tn = data.tn.length;
    const total = tp + fn + fp + tn;
    
    // Update count displays
    document.getElementById('total-points-display').textContent = `(Total: ${total})`;
    document.getElementById('tp-count').textContent = tp;
    document.getElementById('fn-count').textContent = fn;
    document.getElementById('fp-count').textContent = fp;
    document.getElementById('tn-count').textContent = tn;
    
    // Calculate and update actual percentages (not just the expected ones from sliders)
    if (total > 0) {
        const tpPercent = Math.round((tp / total) * 100);
        const fnPercent = Math.round((fn / total) * 100);
        const fpPercent = Math.round((fp / total) * 100);
        const tnPercent = Math.round((tn / total) * 100);
        
        // Ensure percentages sum to 100%
        let sum = tpPercent + fnPercent + fpPercent + tnPercent;
        let adjustment = 100 - sum;
        
        // Apply adjustment to the largest value
        let largestValue = Math.max(tpPercent, fnPercent, fpPercent, tnPercent);
        let adjustedTpPercent = tpPercent;
        let adjustedFnPercent = fnPercent;
        let adjustedFpPercent = fpPercent;
        let adjustedTnPercent = tnPercent;
        
        if (largestValue === tpPercent) adjustedTpPercent += adjustment;
        else if (largestValue === fnPercent) adjustedFnPercent += adjustment;
        else if (largestValue === fpPercent) adjustedFpPercent += adjustment;
        else adjustedTnPercent += adjustment;
        
        // Update percentage displays
        document.getElementById('preview-tp').textContent = `${adjustedTpPercent}%`;
        document.getElementById('preview-fn').textContent = `${adjustedFnPercent}%`;
        document.getElementById('preview-fp').textContent = `${adjustedFpPercent}%`;
        document.getElementById('preview-tn').textContent = `${adjustedTnPercent}%`;
    } else {
        // If no dots, show 0% for all
        document.getElementById('preview-tp').textContent = '0%';
        document.getElementById('preview-fn').textContent = '0%';
        document.getElementById('preview-fp').textContent = '0%';
        document.getElementById('preview-tn').textContent = '0%';
    }
    
    // Calculate metrics if we have data
    if (total > 0) {
        // Accuracy: (TP + TN) / (TP + TN + FP + FN)
        const accuracy = (tp + tn) / total;
        document.getElementById('accuracy').textContent = formatMetric(accuracy);
        
        // Precision: TP / (TP + FP)
        const precision = tp + fp > 0 ? tp / (tp + fp) : 'N/A';
        document.getElementById('precision').textContent = formatMetric(precision);
        
        // Recall: TP / (TP + FN)
        const recall = tp + fn > 0 ? tp / (tp + fn) : 'N/A';
        document.getElementById('recall').textContent = formatMetric(recall);
        
        // F1 Score: 2 * (Precision * Recall) / (Precision + Recall)
        let f1Score = 'N/A';
        if (precision !== 'N/A' && recall !== 'N/A' && precision + recall > 0) {
            f1Score = 2 * (precision * recall) / (precision + recall);
        }
        document.getElementById('f1-score').textContent = formatMetric(f1Score);
        
        // Matthews Correlation Coefficient (MCC)
        // (TP*TN - FP*FN) / sqrt((TP+FP) * (TP+FN) * (TN+FP) * (TN+FN))
        let mcc = 'N/A';
        const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
        if (denominator > 0) {
            mcc = ((tp * tn) - (fp * fn)) / denominator;
        }
        document.getElementById('mcc').textContent = formatMetric(mcc);
        
        // G-Mean Recall: sqrt(Sensitivity * Specificity)
        // Sensitivity = Recall = TPR = TP / (TP + FN)
        // Specificity = TNR = TN / (TN + FP)
        let gMean = 'N/A';
        const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 0;
        const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
        if (sensitivity > 0 && specificity > 0) {
            gMean = Math.sqrt(sensitivity * specificity);
        }
        document.getElementById('g-mean').textContent = formatMetric(gMean);
    } else {
        // Reset metrics if no data
        const metrics = ['accuracy', 'precision', 'recall', 'f1-score', 'mcc', 'g-mean'];
        metrics.forEach(metric => {
            document.getElementById(metric).textContent = 'N/A';
        });
    }
}

// Format metric value for display
function formatMetric(value) {
    if (value === 'N/A' || value === undefined) return 'N/A';
    return value.toFixed(4);
}

// Initialize the application
function init() {
    setupBackground();
    setupEvents();
    renderDots();
    updateMetrics();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
