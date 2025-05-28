class HistogramVisualizer {
  constructor() {
    this.data = Array(100).fill(0);
    this.sum = 0;
    this.count = 0;
    this.averages = [];
    this.sumOfSquares = 0;
    
    this.animationId = null;
    this.config = {
      barColor: 'rgba(76, 154, 255, 0.85)',   
      lineColor: 'rgba(0, 184, 148, 0.85)',
      gridColor: 'rgba(255, 255, 255, 0.03)',
      canvasWidth: 800,
      canvasHeight: 400,
      maxDataPoints: 1000,
      sampleThreshold: 10000
    };

    this.selectedDistribution = 'uniform';
    this.distributionParams = {};

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

    this.distributionSelect = document.getElementById('distribution');
    this.distParamGroups = document.querySelectorAll('.dist-params');
    this.distributionSelect.onchange = () => this.updateDistParamVisibility();
    this.updateDistParamVisibility();
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

  updateDistParamVisibility() {
    const dist = this.distributionSelect.value;
    this.selectedDistribution = dist;
    this.distParamGroups.forEach(group => {
      group.style.display = group.getAttribute('data-dist') === dist ? '' : 'none';
    });
  }

  getDistributionParams() {
    switch (this.selectedDistribution) {
      case 'normal':
        return {
          mean: +document.getElementById('normal-mean').value,
          stddev: +document.getElementById('normal-stddev').value
        };
      case 'binomial':
        return {
          n: +document.getElementById('binomial-n').value,
          p: +document.getElementById('binomial-p').value
        };
      case 'poisson':
        return {
          lambda: +document.getElementById('poisson-lambda').value
        };
      default:
        return {};
    }
  }

  resetState() {
    this.data = Array(100).fill(0);
    this.sum = 0;
    this.count = 0;
    this.averages = [];
    this.sumOfSquares = 0;
    this.clearCanvases();

    this.selectedDistribution = this.distributionSelect.value;
    this.distributionParams = this.getDistributionParams();
  }

  clearCanvases() {
    this.barCtx.clearRect(0, 0, this.barCanvas.width, this.barCanvas.height);
    this.lineCtx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
  }

  generateNumber() {
    let value;
    switch (this.selectedDistribution) {
      case 'uniform':
        value = Math.floor(Math.random() * 100) + 1;
        break;
      case 'normal': {
        // box-Muller transform
        const { mean, stddev } = this.distributionParams;
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        value = Math.round(mean + stddev * z);
        value = Math.max(1, Math.min(100, value));
        break;
      }
      case 'binomial': {
        const { n, p } = this.distributionParams;
        let successes = 0;
        for (let i = 0; i < n; i++) {
          if (Math.random() < p) successes++;
        }
        value = Math.max(1, Math.min(100, successes));
        break;
      }
      case 'poisson': {
        const { lambda } = this.distributionParams;
        let L = Math.exp(-lambda), k = 0, pVal = 1;
        do {
          k++;
          pVal *= Math.random();
        } while (pVal > L);
        value = k - 1;
        value = Math.max(1, Math.min(100, value));
        break;
      }
      default:
        value = Math.floor(Math.random() * 100) + 1;
    }
    this.data[value - 1]++;
    this.sum += value;
    this.sumOfSquares += value * value;
    this.count++;
    this.averages.push(this.sum / this.count);
  }

  drawHistogram() {
    const scaleX = this.barCanvas.width / 100;
    const maxCount = Math.max(...this.data) || 1;
    const scaleY = this.barCanvas.height / maxCount;

    this.data.forEach((count, i) => {
      const barHeight = count * scaleY;
      const hue = 210 + (i / 100 * 30);
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
      this.stopAnimation();
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

    this.updateMetrics();
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
      
      this.selectedDistribution = this.distributionSelect.value;
      this.distributionParams = this.getDistributionParams();
      this.startAnimation(numRandomNumbers, interval);
    }
  }

  calculateExpectedFrequencies() {
    const expected = Array(100).fill(0);
    switch (this.selectedDistribution) {
      case 'uniform': {
        const freq = this.count / 100;
        expected.fill(freq);
        break;
      }
      case 'normal': {
        const { mean, stddev } = this.distributionParams;
        let totalProb = 0;
        for (let i = 1; i <= 100; i++) {
          const prob = (1 / (stddev * Math.sqrt(2 * Math.PI))) *
            Math.exp(-0.5 * Math.pow((i - mean) / stddev, 2));
          expected[i - 1] = prob;
          totalProb += prob;
        }

        for (let i = 0; i < 100; i++) {
          expected[i] = expected[i] / totalProb * this.count;
        }
        break;
      }
      case 'binomial': {
        const { n, p } = this.distributionParams;
        // Binomial PMF for k = 1..100
        // log to avoid overflow for large n
        //  log(n choose k)
        function logBinom(n, k) {
          let res = 0;
          for (let i = 1; i <= k; i++) {
            res += Math.log(n - i + 1) - Math.log(i);
          }
          return res;
        }
        let totalProb = 0;
        for (let i = 1; i <= 100; i++) {
          if (i > n) {
            expected[i - 1] = 0;
            continue;
          }
          const logP = logBinom(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p);
          const prob = Math.exp(logP);
          expected[i - 1] = prob;
          totalProb += prob;
        }

        for (let i = 0; i < 100; i++) {
          expected[i] = expected[i] / totalProb * this.count;
        }
        break;
      }
      case 'poisson': {
        const { lambda } = this.distributionParams;
        // Poisson PMF for k = 1..100
        let totalProb = 0;
        for (let i = 1; i <= 100; i++) {
          // P(k) = (λ^k * e^-λ) / k!
          let logP = i * Math.log(lambda) - lambda;
          // log(k!)
          let logFact = 0;
          for (let j = 2; j <= i; j++) logFact += Math.log(j);
          logP -= logFact;
          const prob = Math.exp(logP);
          expected[i - 1] = prob;
          totalProb += prob;
        }
        
        for (let i = 0; i < 100; i++) {
          expected[i] = expected[i] / totalProb * this.count;
        }
        break;
      }
      default: {
        // fallback: uniform
        const freq = this.count / 100;
        expected.fill(freq);
      }
    }
    return expected;
  }

  calculateStatistics() {
    if (!this.data || this.count === 0) return null;

    try {
      // mean
      const mean = this.sum / this.count;

      // variance and standard deviation
      const variance = (this.sumOfSquares / this.count) - (mean * mean);
      const stdDev = Math.sqrt(variance);

      // chi-squared test for selected distribution
      let chiSquared = 0;
      const expected = this.calculateExpectedFrequencies();
      let valid = true;
      for (let i = 0; i < 100; i++) {
        
        if (expected[i] < 1e-8) continue;
        chiSquared += Math.pow(this.data[i] - expected[i], 2) / expected[i];
      }
      if (!isFinite(chiSquared)) valid = false;

      // 95% confidence interval for the mean
      const confidenceInterval = 1.96 * stdDev / Math.sqrt(this.count);

      return {
        mean: mean.toFixed(2),
        stdDev: stdDev.toFixed(2),
        chiSquared: valid ? chiSquared.toFixed(2) : 'N/A',
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