class HistogramVisualizer {
  constructor() {
    // initialize data structures first
    this.data = Array(100).fill(0);
    this.sum = 0;
    this.count = 0;
    this.averages = [];
    this.sumOfSquares = 0;  // sum of squares for variance calculation
    
    this.animationId = null;
    this.config = {
      barColor: 'rgba(76, 154, 255, 0.85)',   
      lineColor: 'rgba(0, 184, 148, 0.85)',
      gridColor: 'rgba(255, 255, 255, 0.03)',
      canvasWidth: 800,
      canvasHeight: 400,
      maxDataPoints: 1000, // limit points for line chart
      sampleThreshold: 10000 // threshold for sampling to prevent lag
    };

    this.initElements();
    this.setupCanvases();
    this.bindEvents();

    this.isAnimating = false;
    this.startTime = null;
    this.framesProcessed = 0;

    this.paused = false;
    this.currentInterval = 0;
  }

  initElements() {
    // styling stuff and initializing
    this.barCanvas = document.getElementById('bar-canvas');
    this.lineCanvas = document.getElementById('line-canvas');
    this.barCtx = this.barCanvas.getContext('2d');
    this.lineCtx = this.lineCanvas.getContext('2d');
    
    this.runButton = document.getElementById('run-btn');
    this.btnText = this.runButton.querySelector('.btn-text');
    this.btnLoader = this.runButton.querySelector('.btn-loader');
    this.btnLoader.style.display = 'none';
    
    this.runButton.onclick = () => this.handleRunClick();
    
    this.counterElement = document.getElementById('counter');
    this.rangeInput = document.getElementById('interval');
    this.rangeOutput = document.getElementById('interval-value');
    
    this.rangeInput.oninput = (e) => {
      this.rangeOutput.value = e.target.value;
    };
  }

  setupCanvases() {
    [this.barCanvas, this.lineCanvas].forEach(canvas => {
      canvas.width = this.config.canvasWidth;
      canvas.height = this.config.canvasHeight;
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => this.setupCanvases());
  }

  resetState() {
    this.data = Array(100).fill(0);
    this.sum = 0;
    this.count = 0;
    this.averages = [];
    this.sumOfSquares = 0;
    this.clearCanvases();
  }

  clearCanvases() {
    this.barCtx.clearRect(0, 0, this.barCanvas.width, this.barCanvas.height);
    this.lineCtx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
  }

  generateNumber() {
    const value = Math.floor(Math.random() * 100);
    // convert to 1-100 range
    const actualValue = value + 1;
    this.data[value]++;
    this.sum += actualValue;
    // store sum of squares
    this.sumOfSquares += actualValue * actualValue;
    this.count++;
    this.averages.push(this.sum / this.count);
  }

  drawHistogram() {
    const scaleX = this.barCanvas.width / 100;
    const maxCount = Math.max(...this.data) || 1;
    const scaleY = this.barCanvas.height / maxCount;

    this.data.forEach((count, i) => {
      const barHeight = count * scaleY;
      const hue = 210 + (i / 100 * 30); // gradient
      this.barCtx.fillStyle = `hsla(${hue}, 70%, 60%, 0.85)`;
      this.barCtx.fillRect(
        i * scaleX,
        this.barCanvas.height - barHeight,
        scaleX - 1,
        barHeight
      );
    });
  }

  drawLineChart() {
    if (this.averages.length === 0) return;

    // sample for performance
    let plotPoints;
    if (this.averages.length > this.config.sampleThreshold) {
      const sampleInterval = Math.ceil(this.averages.length / this.config.maxDataPoints);
      plotPoints = this.averages.filter((_, i) => i % sampleInterval === 0 || i === this.averages.length - 1);
    } else {
      plotPoints = this.averages;
    }

    const scaleX = this.lineCanvas.width / (plotPoints.length - 1);
    const minAvg = Math.min(...plotPoints);
    const maxAvg = Math.max(...plotPoints);
    const range = maxAvg - minAvg || 1;
    const scaleY = this.lineCanvas.height / range;

    // draw line chart
    this.lineCtx.beginPath();
    plotPoints.forEach((avg, i) => {
      const x = i * scaleX;
      const y = this.lineCanvas.height - ((avg - minAvg) * scaleY);
      
      if (i === 0) {
        this.lineCtx.moveTo(x, y);
      } else {
        this.lineCtx.lineTo(x, y);
      }
    });

    this.lineCtx.strokeStyle = this.config.lineColor;
    this.lineCtx.lineWidth = 2;
    this.lineCtx.stroke();

    if (plotPoints.length <= 100) {
      plotPoints.forEach((avg, i) => {
        const x = i * scaleX;
        const y = this.lineCanvas.height - ((avg - minAvg) * scaleY);
        this.lineCtx.beginPath();
        this.lineCtx.arc(x, y, 2, 0, Math.PI * 2);
        this.lineCtx.fillStyle = this.config.lineColor;
        this.lineCtx.fill();
      });
    }
  }

  updateCounter(value) {
    this.counterElement.textContent = value.toLocaleString();
  }

  animate(frameCount) {
    this.generateNumber();
    this.clearCanvases();
    this.drawHistogram();
    this.drawLineChart();
    this.updateCounter(frameCount);

    if (frameCount < this.totalFrames) {
      this.animationId = requestAnimationFrame(() => this.animate(++frameCount));
    } else {
      this.stopAnimation();
    }
  }

  startAnimation(totalNumbers, interval) {
    if (this.isAnimating) return;
    
    this.stopAnimation();
    this.resetState();
    this.totalFrames = totalNumbers;
    this.currentInterval = interval;
    
    this.runButton.disabled = false;
    this.btnText.textContent = 'Stop';
    this.btnLoader.style.display = 'inline-block';
    
    this.isAnimating = true;
    this.startTime = performance.now();
    this.framesProcessed = 0;
    
    this.updateMetrics();
    this.animationLoop();
  }

  animationLoop() {
    if (!this.isAnimating) {
      this.stopAnimation(); // hide loading icon
      return;
    }

    // get fresh interval value from input
    this.currentInterval = +document.getElementById('interval').value;
    
    const elapsed = performance.now() - this.startTime;
    const targetFrames = this.currentInterval > 0 
      ? Math.floor(elapsed / this.currentInterval)
      : this.totalFrames;

    // process frames
    const framesToProcess = Math.min(
      targetFrames - this.framesProcessed,
      this.currentInterval === 0 ? this.totalFrames : 100
    );

    for (let i = 0; i < framesToProcess; i++) {
      if (this.framesProcessed >= this.totalFrames) break;
      this.generateNumber();
      this.framesProcessed++;
    }

    // update metrics every frame
    this.updateMetrics();

    // update visuals
    this.updateCounter(this.framesProcessed);
    this.clearCanvases();
    this.drawHistogram();
    this.drawLineChart();

    if (this.framesProcessed < this.totalFrames) {
      this.animationId = requestAnimationFrame(() => this.animationLoop());
    } else {
      this.stopAnimation();
    }
  }

  stopAnimation() {
    this.isAnimating = false;
    this.btnText.textContent = 'Run';
    this.btnLoader.style.display = 'none';
    this.runButton.disabled = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.updateMetrics();
  }

  handleRunClick() {
    if (this.isAnimating) {
      this.stopAnimation();
    } else {
      const numRandomNumbers = +document.getElementById('num-random-numbers').value;
      const interval = +document.getElementById('interval').value;
      
      if (numRandomNumbers <= 0 || interval < 0) {
        alert('Please enter valid numbers (interval ≥ 0)');
        return;
      }
      
      this.startAnimation(numRandomNumbers, interval);
    }
  }

  calculateStatistics() {
    if (!this.data || this.count === 0) return null;

    try {
      // mean
      const mean = this.sum / this.count;

      // variance and standard deviation
      const variance = (this.sumOfSquares / this.count) - (mean * mean);
      const stdDev = Math.sqrt(variance);

      // chi-squared test for uniform distribution
      const expected = this.count / 100;  // expected frequency for uniform distribution
      const chiSquared = this.data.reduce((acc, observed) => 
        acc + Math.pow(observed - expected, 2) / expected, 0);

      // 95% confidence interval for the mean
      const confidenceInterval = 1.96 * stdDev / Math.sqrt(this.count);

      return {
        mean: mean.toFixed(2),
        stdDev: stdDev.toFixed(2),
        chiSquared: chiSquared.toFixed(2),
        confidenceInterval: confidenceInterval.toFixed(2)
      };
    } catch (error) {
      console.error('Error calculating statistics:', error);
      return null;
    }
  }

  updateMetrics() {
    const stats = this.calculateStatistics();
    if (!stats) return;

    document.getElementById('std-dev').textContent = stats.stdDev;
    document.getElementById('chi-squared').textContent = stats.chiSquared;
    document.getElementById('confidence').textContent = `±${stats.confidenceInterval}`;
  }
}

const visualizer = new HistogramVisualizer();