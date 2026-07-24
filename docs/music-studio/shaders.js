/**
 * ============================================================================
 * 青鸾数字音频工作站 - WebGL 着色器集合 (QingluanShaders)
 * ============================================================================
 * 本模块提供多种音频驱动的可视化着色器效果，全部使用原生 WebGL API，
 * 不依赖 Three.js 等第三方库。包含频谱瀑布、波形流体、粒子系统、
 * 3D分形、音频地形、神经网络、星系螺旋、流体动力学、矩阵雨、
 * 音频火焰、极光、水面波纹与全息投影等效果。
 *
 * 核心导出：
 *   - QingluanShaders   : 着色器工厂对象
 *   - ShaderProgram     : 着色器程序管理类
 *   - AudioToShaderBridge : 音频数据到着色器 uniform 的桥接类
 * ============================================================================
 */

// ============================================================================
// ShaderProgram 类 - 着色器程序管理
// ============================================================================

/**
 * ShaderProgram 封装了 WebGL 着色器的编译、链接、使用、uniform 传递与资源清理。
 * 每个可视化效果对应一个 ShaderProgram 实例。
 */
export class ShaderProgram {
  /** WebGL 上下文 */
  gl;
  /** 链接后的程序对象 */
  program;
  /** uniform 位置缓存 */
  uniforms = new Map();
  /** attribute 位置缓存 */
  attributes = new Map();

  /**
   * @param {WebGLRenderingContext | WebGL2RenderingContext} gl - WebGL 上下文
   * @param {string} vsSource - 顶点着色器源码
   * @param {string} fsSource - 片元着色器源码
   */
  constructor(gl, vsSource, fsSource) {
    this.gl = gl;
    const vs = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSource);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('ShaderProgram 链接失败:', gl.getProgramInfoLog(this.program));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  }

  /** 编译单个着色器 */
  _compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader 编译失败:', this.gl.getShaderInfoLog(shader));
      console.error('源码:\n', source);
    }
    return shader;
  }

  /** 激活当前程序 */
  use() {
    this.gl.useProgram(this.program);
  }

  /** 获取并缓存 uniform 位置 */
  getUniformLocation(name) {
    if (!this.uniforms.has(name)) {
      this.uniforms.set(name, this.gl.getUniformLocation(this.program, name));
    }
    return this.uniforms.get(name);
  }

  /** 获取并缓存 attribute 位置 */
  getAttribLocation(name) {
    if (!this.attributes.has(name)) {
      this.attributes.set(name, this.gl.getAttribLocation(this.program, name));
    }
    return this.attributes.get(name);
  }

  /** 设置 float uniform */
  setFloat(name, value) {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform1f(loc, value);
  }

  /** 设置 int uniform */
  setInt(name, value) {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform1i(loc, value);
  }

  /** 设置 vec2 uniform */
  setVec2(name, x, y) {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform2f(loc, x, y);
  }

  /** 设置 vec3 uniform */
  setVec3(name, x, y, z) {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform3f(loc, x, y, z);
  }

  /** 设置 vec4 uniform */
  setVec4(name, x, y, z, w) {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform4f(loc, x, y, z, w);
  }

  /** 设置 mat4 uniform */
  setMat4(name, matrix) {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniformMatrix4fv(loc, false, matrix);
  }

  /** 设置 float 数组 uniform */
  setFloatArray(name, arr) {
    const loc = this.getUniformLocation(name);
    if (loc !== null) {
      if (arr.length <= 4) this.gl['uniform' + arr.length + 'fv'](loc, arr);
      else this.gl.uniform1fv(loc, arr);
    }
  }

  /** 清理资源 */
  destroy() {
    this.gl.deleteProgram(this.program);
    this.uniforms.clear();
    this.attributes.clear();
  }
}

// ============================================================================
// AudioToShaderBridge 类 - 音频数据桥接
// ============================================================================

/**
 * AudioToShaderBridge 负责将 Web Audio API 分析器节点的数据
 * （FFT频谱、波形、BPM等）转换为着色器可用的 uniform 数据。
 */
export class AudioToShaderBridge {
  /** FFT 频谱数据（dB 转线性增益后归一化） */
  fftData = new Float32Array(128);
  /** 时域波形数据 */
  waveformData = new Float32Array(128);
  /** 低频能量 */
  bassEnergy = 0;
  /** 中频能量 */
  midEnergy = 0;
  /** 高频能量 */
  trebleEnergy = 0;
  /** 整体响度 */
  loudness = 0;
  /** 检测到的 BPM */
  bpm = 120;
  /** 节拍相位 0-1 */
  beatPhase = 0;

  /**
   * 从 AnalyserNode 更新数据
   * @param {AnalyserNode} analyser - Web Audio 分析器节点
   * @param {number} dt - 时间增量（秒）
   */
  update(analyser, dt) {
    const fftSize = analyser.frequencyBinCount;
    if (this.fftData.length !== fftSize) {
      this.fftData = new Float32Array(fftSize);
      this.waveformData = new Float32Array(fftSize);
    }
    analyser.getFloatFrequencyData(this.fftData);
    analyser.getFloatTimeDomainData(this.waveformData);

    // 将 FFT dB 数据转为 0-1 范围
    for (let i = 0; i < fftSize; i++) {
      this.fftData[i] = Math.max(0, (this.fftData[i] + 100) / 100);
    }

    // 计算频段能量
    const bassEnd = Math.floor(fftSize * 0.1);
    const midEnd = Math.floor(fftSize * 0.5);
    this.bassEnergy = 0; this.midEnergy = 0; this.trebleEnergy = 0;
    for (let i = 0; i < bassEnd; i++) this.bassEnergy += this.fftData[i];
    for (let i = bassEnd; i < midEnd; i++) this.midEnergy += this.fftData[i];
    for (let i = midEnd; i < fftSize; i++) this.trebleEnergy += this.fftData[i];
    this.bassEnergy /= bassEnd; this.midEnergy /= (midEnd - bassEnd); this.trebleEnergy /= (fftSize - midEnd);
    this.loudness = (this.bassEnergy + this.midEnergy + this.trebleEnergy) / 3;

    // 简单 BPM 相位模拟
    this.beatPhase += this.bpm / 60 * dt;
    this.beatPhase -= Math.floor(this.beatPhase);
  }

  /** 将数据传递给 ShaderProgram 的 uniform */
  bindToShader(shaderProgram, prefix = 'u_audio') {
    shaderProgram.setFloat(`${prefix}_bass`, this.bassEnergy);
    shaderProgram.setFloat(`${prefix}_mid`, this.midEnergy);
    shaderProgram.setFloat(`${prefix}_treble`, this.trebleEnergy);
    shaderProgram.setFloat(`${prefix}_loudness`, this.loudness);
    shaderProgram.setFloat(`${prefix}_bpm`, this.bpm);
    shaderProgram.setFloat(`${prefix}_beatPhase`, this.beatPhase);
  }
}

// ============================================================================
// QingluanShaders - 着色器工厂对象
// ============================================================================

/**
 * QingluanShaders 提供所有可视化效果的着色器创建函数。
 * 每个函数返回一个配置好的 ShaderProgram 实例。
 */
export const QingluanShaders = {
  /**
   * 初始化 WebGL 上下文，优先使用 WebGL2，回退到 WebGL1
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @returns {WebGLRenderingContext | WebGL2RenderingContext | null}
   */
  initWebGL(canvas) {
    let gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false }) ||
           canvas.getContext('experimental-webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    }
    if (!gl) {
      console.error('WebGL 不受支持');
      return null;
    }
    return gl;
  },

  /**
   * 通用全屏四边形顶点着色器（大部分效果共用）
   * 直接输出覆盖整个屏幕的三角形带，v_uv 为 0-1 的纹理坐标
   */
  getCommonVertexShader() {
    return `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
  },

  /**
   * 创建 3D 频谱瀑布着色器
   * 将 FFT 数据映射为柱状频谱，加入深度与历史轨迹形成瀑布效果
   */
  createSpectrumShader(gl, fftData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_fft[128];
      uniform float u_audio_loudness;
      uniform float u_audio_bass;

      // 获取插值后的频谱值
      float getFFT(float x) {
        float idx = x * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        return mix(u_fft[i], u_fft[j], f);
      }

      // 色相旋转
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 uv = v_uv;
        // 反转 Y 使频谱从底部生长
        float y = 1.0 - uv.y;
        // X 轴对数缩放，更适合人耳听感
        float logX = log(1.0 + uv.x * 9.0) / log(10.0);
        float fftVal = getFFT(logX);
        // 添加历史层效果：Y 越高，时间越早
        float history = sin(uv.y * 20.0 + u_time * 2.0) * 0.02;
        fftVal += history * (1.0 - uv.y);
        // 柱状边界
        float barWidth = 0.008;
        float barX = fract(logX * 40.0);
        float barMask = smoothstep(barWidth, barWidth * 0.3, abs(barX - 0.5) * 2.0);
        // 高度判定
        float heightMask = smoothstep(fftVal + 0.01, fftVal - 0.01, y);
        // 颜色：低频红，高频紫
        vec3 color = hsv2rgb(vec3(logX * 0.8 + u_time * 0.05, 0.8, 1.0));
        // 音频响应亮度
        color *= 0.5 + u_audio_loudness * 1.5;
        // 底部低音增强光晕
        float glow = exp(-abs(y - u_audio_bass) * 8.0) * u_audio_bass;
        color += vec3(0.2, 0.4, 0.8) * glow;
        // 背景星空
        float stars = step(0.998, sin(uv.x * 137.0 + uv.y * 241.0 + u_time));
        color += vec3(stars) * 0.3;
        float alpha = heightMask * barMask + glow * 0.3;
        gl_FragColor = vec4(color * alpha, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    // 初始化全屏四边形顶点缓冲
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建波形流体着色器
   * 将时域波形数据映射为流体扭曲效果，模拟液体表面波动
   */
  createWaveformShader(gl, waveformData) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_waveform[128];
      uniform float u_audio_bass;
      uniform float u_audio_mid;

      float getWaveform(float x) {
        float idx = x * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        float arrI = 0.0; float arrJ = 0.0;
        // 手动数组访问（WebGL1 兼容）
        for (int k = 0; k < 128; k++) {
          if (k == i) arrI = u_waveform[k];
          if (k == j) arrJ = u_waveform[k];
        }
        return mix(arrI, arrJ, f);
      }

      void main() {
        vec2 uv = v_uv;
        // 流体扭曲：用波形数据扰动 UV
        float wave = getWaveform(uv.x);
        vec2 distortedUV = uv + vec2(
          wave * 0.05 * (1.0 + u_audio_bass),
          sin(uv.x * 10.0 + u_time + wave * 5.0) * 0.02 * (1.0 + u_audio_mid)
        );
        // 绘制网格背景
        vec2 grid = abs(fract(distortedUV * 20.0) - 0.5);
        float line = smoothstep(0.02, 0.0, min(grid.x, grid.y));
        // 流体颜色：蓝青渐变
        vec3 baseColor = mix(vec3(0.0, 0.1, 0.3), vec3(0.0, 0.6, 0.8), distortedUV.y);
        // 波形高亮线
        float waveLine = smoothstep(0.015, 0.0, abs(distortedUV.y - 0.5 - wave * 0.3));
        vec3 waveColor = vec3(0.4, 0.9, 1.0) * waveLine * (1.0 + u_audio_bass * 2.0);
        // 边缘发光
        float edgeGlow = exp(-abs(distortedUV.y - 0.5) * 4.0) * u_audio_mid;
        vec3 color = baseColor * (0.3 + line * 0.2) + waveColor + vec3(0.2, 0.5, 0.9) * edgeGlow;
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建音频驱动粒子系统着色器
   * 使用噪声函数生成大量粒子位置，音频能量控制粒子爆发与颜色
   */
  createParticleShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_treble;

      // 2D 旋转矩阵
      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      // 伪随机
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        vec3 color = vec3(0.0);
        // 多层粒子
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          vec2 p = uv * (2.0 + fi * 0.5);
          // 音频驱动旋转
          p = rot(u_time * (0.2 + fi * 0.1) + u_audio_bass * fi) * p;
          // 粒子格点
          vec2 id = floor(p);
          vec2 fr = fract(p) - 0.5;
          float h = hash(id + fi * 10.0);
          // 粒子大小随高音变化
          float radius = 0.03 + h * 0.04 * (1.0 + u_audio_treble);
          float d = length(fr - vec2(sin(u_time + h * 6.28), cos(u_time + h * 6.28)) * 0.3);
          float particle = smoothstep(radius, radius * 0.3, d);
          // 粒子颜色：低音偏红，高音偏青
          vec3 pColor = mix(vec3(1.0, 0.2, 0.1), vec3(0.2, 0.9, 1.0), h + u_audio_treble);
          color += pColor * particle * (0.5 + u_audio_loudness);
        }
        // 中心能量核
        float core = exp(-length(uv) * 3.0) * u_audio_loudness;
        color += vec3(1.0, 0.8, 0.4) * core;
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建实时 3D 分形（Mandelbulb）着色器
   * 使用射线步进（Ray Marching）渲染 3D Mandelbulb 分形，时间驱动旋转与形变
   */
  createFractalShader(gl, time) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;

      // 3D 旋转矩阵
      mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c); }
      mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c); }

      // Mandelbulb 距离估算
      float mandelbulb(vec3 p) {
        vec3 z = p;
        float dr = 1.0;
        float r = 0.0;
        float power = 8.0 + u_audio_bass * 4.0;
        for (int i = 0; i < 6; i++) {
          r = length(z);
          if (r > 2.0) break;
          float theta = acos(z.z / r) * power;
          float phi = atan(z.y, z.x) * power;
          float zr = pow(r, power);
          dr = pow(r, power - 1.0) * power * dr + 1.0;
          z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
          z += p;
        }
        return 0.5 * log(r) * r / dr;
      }

      // 射线步进
      float rayMarch(vec3 ro, vec3 rd) {
        float t = 0.0;
        for (int i = 0; i < 64; i++) {
          vec3 p = ro + rd * t;
          float d = mandelbulb(p);
          if (d < 0.001 || t > 5.0) break;
          t += d;
        }
        return t;
      }

      // 计算法线
      vec3 getNormal(vec3 p) {
        float d = mandelbulb(p);
        vec2 e = vec2(0.001, 0.0);
        return normalize(vec3(
          mandelbulb(p + e.xyy) - d,
          mandelbulb(p + e.yxy) - d,
          mandelbulb(p + e.yyx) - d
        ));
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        vec3 ro = vec3(0.0, 0.0, -2.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        // 音频驱动旋转
        ro *= rotY(u_time * 0.3) * rotX(u_time * 0.2 + u_audio_loudness);
        rd *= rotY(u_time * 0.3) * rotX(u_time * 0.2 + u_audio_loudness);
        float t = rayMarch(ro, rd);
        vec3 color = vec3(0.05, 0.02, 0.08);
        if (t < 5.0) {
          vec3 p = ro + rd * t;
          vec3 n = getNormal(p);
          vec3 light = normalize(vec3(1.0, 2.0, -1.0));
          float diff = max(dot(n, light), 0.0);
          float spec = pow(max(dot(reflect(-light, n), -rd), 0.0), 32.0);
          // 分形颜色：基于位置与法线
          vec3 baseColor = 0.5 + 0.5 * cos(vec3(0.0, 0.5, 1.0) + length(p) * 2.0 + u_time * 0.5);
          color = baseColor * diff + vec3(1.0) * spec * 0.5 + vec3(0.1, 0.05, 0.2);
          // 环境光
          color += vec3(0.05, 0.0, 0.1);
          // 雾效
          float fog = exp(-t * 0.3);
          color = mix(vec3(0.02, 0.0, 0.04), color, fog);
        }
        // 背景星云
        color += vec3(0.1, 0.05, 0.2) * (0.5 + 0.5 * sin(uv.x * 3.0 + u_time) * cos(uv.y * 2.0 - u_time));
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建音频地形着色器
   * 使用 Simplex 噪声生成地形高度图，音频能量控制地形起伏与颜色
   */
  createNoiseTerrainShader(gl, audioData) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;

      // 2D 旋转
      mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

      // 值噪声
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      // FBM 分形布朗运动
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = rot(0.4) * p * 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = v_uv;
        // 地形坐标
        vec2 p = uv * 4.0;
        // 音频驱动地形高度
        float height = fbm(p + u_time * 0.1);
        height += u_audio_bass * fbm(p * 2.0 + u_time * 0.3) * 0.5;
        height += u_audio_mid * fbm(p * 4.0 - u_time * 0.2) * 0.25;
        // 等高线
        float contour = smoothstep(0.02, 0.0, abs(fract(height * 8.0) - 0.5));
        // 颜色映射：低地蓝绿，高地白雪
        vec3 lowColor = vec3(0.0, 0.15, 0.25);
        vec3 midColor = vec3(0.1, 0.4, 0.2);
        vec3 highColor = vec3(0.8, 0.85, 0.9);
        vec3 color = mix(lowColor, midColor, smoothstep(0.2, 0.5, height));
        color = mix(color, highColor, smoothstep(0.5, 0.8, height));
        // 等高线高亮
        color += vec3(0.3, 0.5, 0.4) * contour * (0.5 + u_audio_loudness);
        // 天空渐变
        float sky = 1.0 - uv.y;
        color += vec3(0.05, 0.08, 0.15) * sky * (1.0 + u_audio_bass);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建神经网络可视化着色器
   * 模拟神经元节点与连接脉冲，时间驱动信号传播
   */
  createNeuralShader(gl, time) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_mid;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        vec3 color = vec3(0.02, 0.02, 0.05);
        // 神经网络节点层
        for (int layer = 0; layer < 4; layer++) {
          float fl = float(layer);
          float x = -0.6 + fl * 0.4;
          int nodeCount = 3 + layer * 2;
          for (int n = 0; n < 9; n++) {
            if (n >= nodeCount) break;
            float fn = float(n);
            float y = -0.4 + fn * 0.25 - float(nodeCount) * 0.125 + 0.125;
            vec2 nodePos = vec2(x, y);
            float d = length(uv - nodePos);
            // 节点脉冲
            float pulse = sin(u_time * 3.0 + fl * 2.0 + fn * 1.5) * 0.5 + 0.5;
            pulse *= (0.5 + u_audio_loudness * 1.5);
            float node = smoothstep(0.04 + pulse * 0.01, 0.01, d);
            color += vec3(0.0, 0.6, 1.0) * node * (0.3 + pulse);
            // 连接线
            if (layer < 3) {
              float nextX = x + 0.4;
              int nextCount = 3 + (layer + 1) * 2;
              for (int m = 0; m < 9; m++) {
                if (m >= nextCount) break;
                float fm = float(m);
                float ny = -0.4 + fm * 0.25 - float(nextCount) * 0.125 + 0.125;
                vec2 np = vec2(nextX, ny);
                vec2 lineDir = np - nodePos;
                float lineLen = length(lineDir);
                vec2 lineUV = uv - nodePos;
                float proj = clamp(dot(lineUV, lineDir) / (lineLen * lineLen), 0.0, 1.0);
                vec2 closest = nodePos + lineDir * proj;
                float lineD = length(uv - closest);
                // 信号沿连接传播
                float signal = sin(u_time * 4.0 + fl * 3.0 + fn * 2.0 + fm - proj * 6.28);
                float lineMask = smoothstep(0.003, 0.0, lineD) * (0.2 + u_audio_mid * 0.5);
                color += vec3(0.0, 0.8, 0.6) * lineMask * (0.3 + signal * 0.7) * (0.4 + u_audio_loudness);
              }
            }
          }
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建星系螺旋着色器
   * 模拟螺旋星系，时间驱动旋转，音频能量控制恒星亮度与旋臂扭曲
   */
  createGalaxyShader(gl, time) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_treble;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);
        // 螺旋臂
        float arms = 3.0;
        float spiral = sin(angle * arms + log(radius + 0.1) * 3.0 - u_time * 0.5);
        float armMask = smoothstep(0.3, 0.8, spiral) * smoothstep(1.0, 0.1, radius);
        // 恒星粒子
        vec2 grid = fract(uv * 80.0);
        float star = step(0.97, hash(floor(uv * 80.0))) * smoothstep(0.05, 0.0, length(grid - 0.5));
        star += step(0.98, hash(floor(uv * 40.0 + 100.0))) * smoothstep(0.08, 0.0, length(grid - 0.5));
        // 中心黑洞/核球
        float core = exp(-radius * 8.0) * (1.0 + u_audio_bass * 3.0);
        // 颜色
        vec3 armColor = mix(vec3(0.6, 0.2, 0.1), vec3(0.2, 0.5, 0.9), u_audio_treble);
        vec3 color = armColor * armMask * (0.5 + u_audio_loudness);
        color += vec3(1.0, 0.9, 0.7) * star * (0.5 + u_audio_loudness * 2.0);
        color += vec3(1.0, 0.8, 0.4) * core;
        // 背景星云
        float nebula = smoothstep(0.4, 0.6, hash(floor(uv * 20.0) + vec2(50.0)));
        color += vec3(0.1, 0.05, 0.2) * nebula * (0.2 + u_audio_bass);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建流体动力学着色器
   * 模拟流体涡旋与扩散，音频驱动流速与颜色混合
   */
  createFluidShader(gl, audioData) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;

      // 旋转矩阵
      mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        // 流体扭曲场
        vec2 p = uv * 3.0;
        float flow = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          p = rot(0.7 + u_time * 0.1 * (1.0 + u_audio_bass) + fi) * p;
          flow += sin(p.x * 2.0 + u_time + fi) * cos(p.y * 2.0 - u_time * 0.7);
        }
        flow *= 0.25;
        // 涡旋中心
        float d1 = length(uv - vec2(0.3, 0.2));
        float d2 = length(uv + vec2(0.3, 0.2));
        float vortex1 = sin(flow * 3.0 + u_time * 2.0 - d1 * 8.0) * exp(-d1 * 3.0);
        float vortex2 = sin(flow * 3.0 - u_time * 1.5 - d2 * 8.0) * exp(-d2 * 3.0);
        // 颜色混合：墨水扩散效果
        vec3 ink1 = vec3(0.9, 0.2, 0.3) * (0.5 + u_audio_bass);
        vec3 ink2 = vec3(0.1, 0.5, 0.9) * (0.5 + u_audio_mid);
        vec3 ink3 = vec3(0.2, 0.9, 0.6) * u_audio_loudness;
        vec3 color = vec3(0.02, 0.02, 0.05);
        color += ink1 * vortex1;
        color += ink2 * vortex2;
        color += ink3 * sin(flow * 2.0) * 0.3;
        // 流体纹理细节
        float detail = hash(floor(uv * 200.0) + floor(u_time * 10.0));
        color += vec3(detail) * 0.03 * (1.0 + u_audio_loudness);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建矩阵雨（音频响应）着色器
   * 经典数字雨效果，音频能量控制下落速度与亮度，颜色响应频段
   */
  createMatrixShader(gl, audioData) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;
      uniform float u_audio_loudness;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec2 uv = v_uv;
        // 字符格点
        vec2 gridUV = vec2(uv.x * 40.0, uv.y * 30.0);
        vec2 id = floor(gridUV);
        vec2 fr = fract(gridUV);
        // 每列独立下落速度，受音频影响
        float speed = 1.0 + hash(vec2(id.x, 0.0)) * 2.0 + u_audio_loudness * 3.0;
        float yOffset = id.y + u_time * speed + id.x * 3.7;
        float cell = fract(yOffset);
        // 字符随机闪烁
        float charVal = hash(vec2(id.x, floor(yOffset)));
        float charOn = step(0.3, charVal);
        // 头部高亮
        float head = smoothstep(0.15, 0.0, cell) * charOn;
        // 尾部渐变
        float tail = smoothstep(1.0, 0.3, cell) * charOn * (0.3 + hash(id) * 0.3);
        // 颜色：低音偏绿，中音偏青，高音偏白
        vec3 headColor = mix(vec3(0.5, 1.0, 0.2), vec3(0.2, 1.0, 0.8), u_audio_mid);
        headColor = mix(headColor, vec3(1.0), u_audio_treble);
        vec3 tailColor = vec3(0.0, 0.3, 0.1) * (0.5 + u_audio_bass);
        vec3 color = headColor * head + tailColor * tail;
        // 字符形状（简单方块模拟）
        float shape = smoothstep(0.15, 0.1, abs(fr.x - 0.5)) * smoothstep(0.15, 0.1, abs(fr.y - 0.5));
        color *= shape;
        // 背景扫描线
        float scanline = sin(uv.y * 200.0) * 0.03;
        color += vec3(0.0, scanline, 0.0);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建音频火焰着色器
   * 基于噪声的火焰模拟，音频能量控制火焰高度与剧烈程度
   */
  createFireShader(gl, audioData) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        vec2 uv = v_uv;
        // 火焰从底部向上
        vec2 p = vec2(uv.x * 3.0, uv.y * 4.0);
        float n = 0.0;
        float amp = 1.0;
        // 多层湍流噪声
        for (int i = 0; i < 5; i++) {
          n += noise(p * amp + vec2(0.0, -u_time * (1.0 + u_audio_loudness) * amp)) / amp;
          amp *= 2.0;
        }
        n = n * 0.5 + 0.5;
        // 火焰高度受低音驱动
        float fireHeight = 0.3 + u_audio_bass * 0.5;
        float flame = smoothstep(fireHeight + n * 0.3, fireHeight - 0.1, uv.y);
        flame *= smoothstep(0.0, 0.2, uv.y); // 底部更亮
        // 火焰颜色：底部白黄，中部橙红，顶部暗红
        vec3 color = mix(vec3(0.8, 0.1, 0.0), vec3(1.0, 0.5, 0.0), flame * 0.7);
        color = mix(color, vec3(1.0, 0.9, 0.5), smoothstep(0.3, 0.8, flame));
        color = mix(color, vec3(0.1, 0.02, 0.0), 1.0 - flame);
        // 火星粒子
        vec2 sparkUV = uv * vec2(20.0, 15.0);
        vec2 sparkId = floor(sparkUV);
        float spark = step(0.97, hash(sparkId + floor(u_time * 10.0)));
        float sparkY = fract(sparkUV.y + u_time * (0.5 + hash(sparkId) * 2.0));
        spark *= smoothstep(1.0, 0.7, sparkY) * smoothstep(0.0, 0.1, sparkY);
        color += vec3(1.0, 0.7, 0.3) * spark * u_audio_mid;
        gl_FragColor = vec4(color * flame, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建极光效果着色器
   * 使用多层正弦波模拟极光带，时间驱动飘动，音频调制亮度
   */
  createAuroraShader(gl, time) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      void main() {
        vec2 uv = v_uv;
        float aurora = 0.0;
        // 多层极光带
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float wave = sin(uv.x * (3.0 + fi) + u_time * (0.3 + fi * 0.1) + fi * 2.0) * 0.1;
          wave += sin(uv.x * (5.0 + fi * 2.0) - u_time * 0.5 + fi) * 0.05;
          float band = smoothstep(0.03, 0.0, abs(uv.y - (0.6 + wave - fi * 0.08)));
          aurora += band * (0.3 + fi * 0.15);
        }
        // 颜色：绿为主，高音偏紫
        vec3 green = vec3(0.2, 0.9, 0.4) * (0.5 + u_audio_bass);
        vec3 purple = vec3(0.6, 0.2, 0.9) * u_audio_treble;
        vec3 blue = vec3(0.1, 0.4, 0.9) * u_audio_mid;
        vec3 color = (green + purple + blue) * aurora;
        // 星空背景
        float stars = step(0.995, fract(sin(dot(floor(uv * 300.0), vec2(127.1, 311.7))) * 43758.5453));
        color += vec3(0.8, 0.9, 1.0) * stars * 0.5;
        // 夜空渐变
        color += vec3(0.0, 0.02, 0.08) * (1.0 - uv.y);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建水面波纹着色器
   * 模拟水面涟漪与反射，音频能量产生波纹源
   */
  createWaterShader(gl, time) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;

      void main() {
        vec2 uv = v_uv;
        // 多个波纹源
        float ripple = 0.0;
        vec2 centers[4];
        centers[0] = vec2(0.3, 0.4);
        centers[1] = vec2(0.7, 0.6);
        centers[2] = vec2(0.5, 0.5);
        centers[3] = vec2(0.2, 0.8);
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float d = length(uv - centers[i]);
          float wave = sin(d * 30.0 - u_time * 3.0 * (1.0 + fi * 0.2)) * exp(-d * 2.0);
          ripple += wave * (0.2 + (i == 0 ? u_audio_bass : i == 1 ? u_audio_mid : u_audio_loudness) * 0.5);
        }
        // 扭曲 UV 模拟折射
        vec2 refractedUV = uv + ripple * 0.03;
        // 水面颜色
        vec3 waterColor = mix(vec3(0.0, 0.15, 0.25), vec3(0.0, 0.35, 0.5), refractedUV.y);
        // 高光
        float spec = pow(max(ripple, 0.0), 3.0) * (0.5 + u_audio_loudness);
        vec3 color = waterColor + vec3(0.6, 0.8, 1.0) * spec;
        // 边缘泡沫
        float foam = smoothstep(0.45, 0.55, abs(refractedUV.y - 0.5) + ripple * 0.1);
        color += vec3(0.8, 0.9, 1.0) * foam * 0.1;
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建全息投影着色器
   * 模拟科幻风格全息图，扫描线、闪烁与网格变形
   */
  createHologramShader(gl, time) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_mid;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        // 全息主体：旋转立方体轮廓（简化）
        float cube = 0.0;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float angle = u_time * 0.5 + fi * 1.0;
          vec2 rotated = vec2(
            uv.x * cos(angle) - uv.y * sin(angle),
            uv.x * sin(angle) + uv.y * cos(angle)
          );
          float size = 0.3 + fi * 0.05;
          float xEdge = smoothstep(0.005, 0.0, abs(abs(rotated.x) - size));
          float yEdge = smoothstep(0.005, 0.0, abs(abs(rotated.y) - size));
          cube += max(xEdge, yEdge) * (0.5 - fi * 0.15);
        }
        // 内部网格
        float gridX = smoothstep(0.005, 0.0, abs(fract(uv.x * 15.0) - 0.5) * 2.0 - 0.9);
        float gridY = smoothstep(0.005, 0.0, abs(fract(uv.y * 15.0) - 0.5) * 2.0 - 0.9);
        float grid = max(gridX, gridY) * cube;
        // 扫描线
        float scanline = smoothstep(0.02, 0.0, abs(fract(uv.y * 2.0 + u_time * 0.8) - 0.5) * 2.0 - 0.95);
        // 故障闪烁
        float glitch = step(0.97, hash(vec2(floor(u_time * 20.0), floor(uv.y * 20.0))));
        // 音频响应亮度脉冲
        float pulse = 0.7 + sin(u_time * 4.0) * 0.2 + u_audio_loudness * 0.5;
        // 全息颜色：青绿色
        vec3 holoColor = vec3(0.0, 0.9, 0.7) * pulse;
        vec3 color = holoColor * (cube + grid * 0.5);
        color += vec3(0.5, 1.0, 0.8) * scanline * 0.3;
        color += vec3(1.0, 0.2, 0.2) * glitch * 0.3;
        // 背景暗色
        color += vec3(0.01, 0.03, 0.02);
        // 底部发光底座
        float base = exp(-abs(uv.y + 0.35) * 8.0) * smoothstep(0.3, 0.0, abs(uv.x));
        color += vec3(0.0, 0.6, 0.5) * base * (0.5 + u_audio_mid);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建量子泡沫着色器（额外赠送效果）
   * 模拟微观量子涨落，音频能量激发虚粒子对产生与湮灭
   */
  createQuantumFoamShader(gl, audioData) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_treble;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float t = u_time * 0.5;
        // 量子泡沫格点
        float scale = 15.0 + u_audio_treble * 10.0;
        vec2 p = uv * scale;
        vec2 id = floor(p);
        vec2 fr = fract(p) - 0.5;
        float h = hash(id);
        // 虚粒子对产生
        float pair = sin(t * (1.0 + h * 3.0) + h * 6.28) * 0.5 + 0.5;
        pair *= u_audio_loudness;
        float d = length(fr);
        float particle = smoothstep(0.15 * pair, 0.0, d);
        // 连接桥（湮灭前状态）
        float bridge = smoothstep(0.02, 0.0, abs(fr.x)) * smoothstep(0.3, 0.0, abs(fr.y)) * pair;
        // 颜色：正能量蓝，负能量红
        vec3 posColor = vec3(0.2, 0.5, 1.0) * particle;
        vec3 bridgeColor = vec3(0.8, 0.2, 0.9) * bridge;
        vec3 color = posColor + bridgeColor;
        // 背景量子场
        float field = noise(uv * 8.0 + t) * 0.1 * (1.0 + u_audio_loudness);
        color += vec3(0.05, 0.0, 0.1) * field;
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 创建音频频谱圆环着色器（额外赠送效果）
   * 将 FFT 数据映射为极坐标下的圆形频谱条，带有镜像对称与发光效果
   */
  createCircularSpectrumShader(gl, fftData) {
    const vs = QingluanShaders.getCommonVertexShader();
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_fft[128];
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_beatPhase;

      float getFFT(float x) {
        float idx = x * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        float vi = 0.0, vj = 0.0;
        for (int k = 0; k < 128; k++) {
          if (k == i) vi = u_fft[k];
          if (k == j) vj = u_fft[k];
        }
        return mix(vi, vj, f);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float radius = length(uv);
        float angle = atan(uv.y, uv.x) / 6.28318 + 0.5;
        // 圆形频谱
        float fftVal = getFFT(angle);
        float barRadius = 0.25 + fftVal * 0.25 * (1.0 + u_audio_bass);
        float barWidth = 0.008;
        float bar = smoothstep(barWidth, barWidth * 0.3, abs(radius - barRadius));
        // 镜像对称内环
        float innerBar = smoothstep(barWidth, barWidth * 0.3, abs(radius - (0.25 - fftVal * 0.15)));
        // 颜色：色相随角度变化，亮度随音频
        vec3 color = 0.5 + 0.5 * cos(vec3(0.0, 0.5, 1.0) + angle * 6.28 + u_time * 0.5);
        color *= bar + innerBar * 0.5;
        color *= 0.5 + u_audio_loudness * 1.5;
        // 中心节拍脉冲
        float pulse = exp(-radius * 4.0) * sin(u_audio_beatPhase * 6.28) * u_audio_bass;
        color += vec3(1.0, 0.8, 0.3) * pulse;
        // 外圈光晕
        float glow = exp(-abs(radius - barRadius) * 10.0) * fftVal;
        color += vec3(0.3, 0.6, 1.0) * glow;
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 频谱条形 3D 着色器
   * 使用伪 3D 透视将 FFT 数据渲染为立体柱状频谱，带镜面反射与景深雾效
   */
  createSpectrumBars3DShader(gl, fftData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_fft[128];
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      float getFFT(float x) {
        float idx = x * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        float vi = 0.0, vj = 0.0;
        for (int k = 0; k < 128; k++) {
          if (k == i) vi = u_fft[k];
          if (k == j) vj = u_fft[k];
        }
        return mix(vi, vj, f);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = v_uv;
        // 伪 3D 透视坐标
        float perspective = 0.6 + uv.y * 0.4;
        vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) / perspective;
        p.y += 0.2;

        // 地面网格
        float gridZ = 1.0 / (p.y + 0.3);
        vec2 gridUV = vec2(p.x * gridZ, gridZ * 5.0 + u_time * 0.5);
        float gridX = smoothstep(0.02, 0.0, abs(fract(gridUV.x * 16.0) - 0.5));
        float gridY = smoothstep(0.02, 0.0, abs(fract(gridUV.y * 4.0) - 0.5));
        float grid = max(gridX, gridY) * smoothstep(0.0, 0.3, p.y + 0.1);

        // 频谱柱位置
        float barCount = 32.0;
        float barId = floor((p.x * gridZ + 0.5) * barCount);
        float barX = (barId + 0.5) / barCount - 0.5;
        float barWidth = 0.008;
        float fftVal = getFFT(abs(barX) * 2.0);
        float barHeight = fftVal * 0.4 * (1.0 + u_audio_bass * 0.5);
        float barZ = barHeight * 0.5;
        float barDistX = abs(p.x * gridZ - barX);
        float barDistY = abs(p.y - barHeight * 0.5 + 0.05);
        float bar = smoothstep(barWidth, barWidth * 0.3, barDistX) * smoothstep(barHeight + 0.01, barHeight - 0.01, barDistY + barHeight * 0.5);

        // 柱顶面
        float topFace = smoothstep(barWidth, barWidth * 0.3, barDistX) * smoothstep(0.008, 0.0, abs(p.y - barHeight + 0.05));
        bar = max(bar, topFace);

        // 颜色
        vec3 barColor = hsv2rgb(vec3(abs(barX) * 1.2 + u_time * 0.05, 0.85, 1.0));
        barColor *= 0.6 + u_audio_loudness * 1.2;

        // 镜面反射（柱在地面上的倒影）
        float reflectDistY = abs(p.y + barHeight * 0.5 - 0.05);
        float reflection = smoothstep(barWidth, barWidth * 0.3, barDistX) * smoothstep(barHeight + 0.01, barHeight - 0.01, reflectDistY + barHeight * 0.5);
        reflection *= 0.25 + 0.25 * sin(gridUV.y * 10.0);

        // 景深雾
        float fog = exp(-abs(p.y + 0.1) * 2.0);

        vec3 color = vec3(0.02, 0.02, 0.04);
        color += vec3(0.1, 0.12, 0.18) * grid * fog;
        color += barColor * bar * fog;
        color += barColor * reflection * fog * 0.4;

        // 粒子尘埃
        float dust = step(0.995, hash(floor(uv * 200.0) + floor(u_time * 30.0))) * fog;
        color += vec3(0.6, 0.7, 1.0) * dust * (0.5 + u_audio_treble);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 圆形频谱着色器 V2
   * 多层同心圆环频谱，带径向模糊与节拍脉动
   */
  createCircularSpectrumV2Shader(gl, fftData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_fft[128];
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_beatPhase;

      float getFFT(float x) {
        float idx = clamp(x, 0.0, 1.0) * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        float vi = 0.0, vj = 0.0;
        for (int k = 0; k < 128; k++) {
          if (k == i) vi = u_fft[k];
          if (k == j) vj = u_fft[k];
        }
        return mix(vi, vj, f);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float radius = length(uv);
        float angle = atan(uv.y, uv.x);

        // 多层圆环
        vec3 color = vec3(0.0);
        for (int ring = 0; ring < 3; ring++) {
          float fr = float(ring);
          float ringBase = 0.15 + fr * 0.12;
          float a = angle + u_time * (0.2 + fr * 0.1);
          float normAngle = (a / 6.28318) + 0.5;
          float fftVal = getFFT(normAngle);
          float ringRadius = ringBase + fftVal * 0.18 * (1.0 + u_audio_bass);
          float thickness = 0.015 + fr * 0.005;
          float ringMask = smoothstep(thickness, thickness * 0.2, abs(radius - ringRadius));

          // 颜色随角度与环变化
          vec3 ringColor = hsv2rgb(vec3(normAngle + fr * 0.33 + u_time * 0.03, 0.8, 1.0));
          color += ringColor * ringMask * (0.6 + u_audio_loudness);
        }

        // 径向射线
        float rays = sin(angle * 24.0 + u_time * 2.0) * 0.5 + 0.5;
        rays *= smoothstep(0.5, 0.0, radius);
        color += vec3(0.2, 0.5, 0.9) * rays * u_audio_mid * 0.3;

        // 中心节拍核
        float core = exp(-radius * 6.0) * (0.5 + 0.5 * sin(u_audio_beatPhase * 6.28318));
        color += vec3(1.0, 0.9, 0.6) * core * u_audio_bass;

        // 外圈光晕
        float outerGlow = exp(-abs(radius - 0.5) * 8.0) * u_audio_loudness;
        color += vec3(0.4, 0.2, 0.8) * outerGlow;

        // 背景暗场
        color += vec3(0.01, 0.01, 0.02) * (1.0 - smoothstep(0.0, 0.6, radius));

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 粒子系统着色器（点精灵 billboard）
   * 使用噪声生成大量粒子，音频能量控制爆发与生命周期
   */
  createParticleSystemShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        vec3 color = vec3(0.0);

        // 多层粒子场
        for (int layer = 0; layer < 6; layer++) {
          float fl = float(layer);
          float scale = 3.0 + fl * 1.5;
          vec2 p = uv * scale;

          // 音频驱动旋转与漂移
          p = rot(u_time * (0.1 + fl * 0.05) + u_audio_bass * fl) * p;
          p += vec2(u_time * (0.05 + fl * 0.02), sin(u_time * 0.3 + fl) * 0.2);

          vec2 id = floor(p);
          vec2 fr = fract(p) - 0.5;
          float h = hash(id + fl * 37.0);

          // 粒子生命周期闪烁
          float life = fract(h * 3.0 + u_time * (0.2 + h * 0.5));
          float size = (0.02 + h * 0.03) * (1.0 + u_audio_treble * 1.5) * sin(life * 3.14159);
          size = max(size, 0.0);

          // 粒子形状：点精灵衰减
          float d = length(fr - vec2(sin(u_time + h * 6.28) * 0.2, cos(u_time * 0.7 + h * 6.28) * 0.2));
          float particle = smoothstep(size, size * 0.2, d) * life;

          // billboard 风格发光
          float glow = exp(-d * 20.0) * 0.3 * life;

          // 颜色随层次变化
          vec3 pColor = mix(
            mix(vec3(1.0, 0.2, 0.1), vec3(0.2, 0.8, 1.0), h),
            vec3(0.9, 0.9, 0.2),
            u_audio_mid
          );

          color += (pColor * particle + pColor * glow) * (0.4 + u_audio_loudness);
        }

        // 中心能量核
        float core = exp(-length(uv) * 4.0) * u_audio_loudness;
        color += vec3(1.0, 0.85, 0.6) * core;

        // 背景暗场
        color += vec3(0.005, 0.005, 0.01);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 波形网格着色器
   * 将时域波形映射为 3D 网格表面，带线框高亮与动态光照
   */
  createWaveformGridShader(gl, waveformData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_waveform[128];
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;

      float getWaveform(float x) {
        float idx = clamp(x, 0.0, 1.0) * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        float vi = 0.0, vj = 0.0;
        for (int k = 0; k < 128; k++) {
          if (k == i) vi = u_waveform[k];
          if (k == j) vj = u_waveform[k];
        }
        return mix(vi, vj, f);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = v_uv;
        float aspect = u_resolution.x / u_resolution.y;

        // 3D 投影参数
        float fov = 1.2;
        vec3 ro = vec3(0.0, 0.5, 1.5);
        vec3 rd = normalize(vec3((uv - 0.5) * vec2(aspect, 1.0) * fov, -1.0));

        // 网格平面 y = 0
        float t = -ro.y / rd.y;
        vec3 p = ro + rd * t;
        vec2 gridUV = p.xz;

        // 波形扰动高度
        float wave = getWaveform(fract(gridUV.x * 0.5 + 0.5));
        float height = wave * 0.3 * (1.0 + u_audio_bass);
        height += sin(gridUV.x * 8.0 + u_time * 2.0) * 0.02 * u_audio_mid;

        // 网格线
        vec2 grid = fract(gridUV * 20.0);
        float lineX = smoothstep(0.02, 0.0, abs(grid.x - 0.5));
        float lineZ = smoothstep(0.02, 0.0, abs(grid.y - 0.5));
        float line = max(lineX, lineZ);

        // 波形线高亮
        float waveLine = smoothstep(0.015, 0.0, abs(grid.y - 0.5 - height));
        line = max(line, waveLine * 2.0);

        // 颜色
        vec3 baseColor = mix(vec3(0.0, 0.1, 0.25), vec3(0.0, 0.4, 0.6), gridUV.y + 0.3);
        vec3 lineColor = mix(vec3(0.2, 0.8, 1.0), vec3(1.0, 0.5, 0.8), u_audio_mid);

        // 简单的光照
        vec3 normal = normalize(vec3(-height * 2.0, 1.0, 0.0));
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        float diff = max(dot(normal, lightDir), 0.0);

        vec3 color = baseColor * 0.2;
        color += lineColor * line * (0.5 + u_audio_loudness);
        color += vec3(0.3, 0.6, 0.9) * diff * 0.3 * u_audio_loudness;

        // 远处雾效
        float fog = exp(-length(p.xz) * 0.5);
        color = mix(vec3(0.02, 0.02, 0.05), color, fog);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 音频响应分形着色器（Mandelbrot / Julia 音频映射）
   * 复平面上的分形迭代，音频控制迭代次数、缩放与颜色映射
   */
  createAudioFractalShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      vec2 cmult(vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        // 音频驱动的缩放与偏移
        float zoom = 2.0 + u_audio_bass * 1.5 + sin(u_time * 0.2) * 0.5;
        vec2 c = uv * zoom;
        vec2 offset = vec2(
          sin(u_time * 0.1) * 0.2 + u_audio_mid * 0.1,
          cos(u_time * 0.13) * 0.2 + u_audio_treble * 0.1
        );
        c += offset;

        // Julia 常数（音频调制）
        vec2 juliaC = vec2(
          -0.8 + 0.4 * sin(u_time * 0.3 + u_audio_bass * 2.0),
          0.156 + 0.2 * cos(u_time * 0.25 + u_audio_mid * 2.0)
        );

        // 迭代
        vec2 z = c;
        float iter = 0.0;
        float maxIter = 64.0 + u_audio_loudness * 64.0;
        for (int i = 0; i < 128; i++) {
          if (float(i) >= maxIter) break;
          z = cmult(z, z) + juliaC;
          if (dot(z, z) > 4.0) break;
          iter += 1.0;
        }

        // 平滑迭代计数
        float smoothIter = iter + 1.0 - log2(log2(dot(z, z))) + 4.0;
        float normIter = smoothIter / maxIter;

        // 颜色映射
        vec3 color = hsv2rgb(vec3(
          normIter * 2.0 + u_time * 0.05 + u_audio_bass * 0.2,
          0.7 + u_audio_mid * 0.3,
          0.5 + 0.5 * cos(normIter * 3.14159)
        ));

        // 内部填充
        if (iter >= maxIter - 1.0) {
          color = vec3(0.02, 0.0, 0.04) * (1.0 + u_audio_loudness);
        }

        // 边框发光
        float border = exp(-abs(normIter - 0.98) * 20.0) * u_audio_loudness;
        color += vec3(0.4, 0.8, 1.0) * border;

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 噪声地形着色器（Perlin / Simplex 噪声增强版）
   * 多八度 FBM 地形，音频驱动侵蚀与河流，带高度图光照
   */
  createNoiseTerrainAdvancedShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
          dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 6; i++) {
          v += a * snoise(p);
          p = rot(0.4) * p * 2.0;
          a *= 0.5;
        }
        return v;
      }

      float terrain(vec2 p) {
        float h = fbm(p + u_time * 0.05);
        h += u_audio_bass * fbm(p * 2.0 + u_time * 0.2) * 0.4;
        h += u_audio_mid * fbm(p * 4.0 - u_time * 0.15) * 0.2;
        return h * 0.5 + 0.5;
      }

      void main() {
        vec2 uv = v_uv;
        vec2 p = uv * 3.0;

        float h = terrain(p);
        float hR = terrain(p + vec2(0.01, 0.0));
        float hU = terrain(p + vec2(0.0, 0.01));

        // 法线近似
        vec3 normal = normalize(vec3(h - hR, 0.01, h - hU));

        // 生物群落颜色
        vec3 water = vec3(0.05, 0.15, 0.35);
        vec3 sand  = vec3(0.6, 0.55, 0.35);
        vec3 grass = vec3(0.15, 0.4, 0.15);
        vec3 rock  = vec3(0.35, 0.32, 0.30);
        vec3 snow  = vec3(0.85, 0.88, 0.92);

        vec3 color = water;
        color = mix(color, sand,  smoothstep(0.30, 0.35, h));
        color = mix(color, grass, smoothstep(0.38, 0.50, h));
        color = mix(color, rock,  smoothstep(0.60, 0.75, h));
        color = mix(color, snow,  smoothstep(0.80, 0.90, h));

        // 光照
        vec3 lightDir = normalize(vec3(0.3, 1.0, 0.2));
        float diff = max(dot(normal, lightDir), 0.0);
        float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 16.0);

        color *= (0.3 + diff * 0.7);
        color += vec3(0.3, 0.3, 0.4) * spec * (0.2 + u_audio_loudness);

        // 等高线
        float contour = smoothstep(0.02, 0.0, abs(fract(h * 12.0) - 0.5));
        color += vec3(0.2, 0.25, 0.15) * contour * 0.2;

        // 雾效
        float fog = exp(-length(uv - 0.5) * 1.5);
        color = mix(vec3(0.4, 0.45, 0.55) * (0.5 + u_audio_mid * 0.5), color, fog);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 液体/流体模拟着色器
   * 基于 Navier-Stokes 简化模型的 2D 流体可视化，音频注入动量
   */
  createLiquidSimulationShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float t = u_time;

        // 速度场（简化涡旋 + 音频驱动源）
        vec2 vel = vec2(0.0);
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          vec2 center = vec2(
            sin(fi * 1.3 + t * 0.2) * 0.4,
            cos(fi * 1.7 + t * 0.15) * 0.3
          );
          vec2 dir = uv - center;
          float dist = length(dir);
          float strength = (0.15 + (i == 0 ? u_audio_bass : i == 1 ? u_audio_mid : u_audio_loudness) * 0.3) / (dist + 0.2);
          vel += vec2(-dir.y, dir.x) * strength * 0.05;
        }

        // 流体纹理坐标
        vec2 p = uv + vel;
        p += vec2(
          sin(p.y * 4.0 + t * 0.5) * 0.1,
          cos(p.x * 4.0 + t * 0.4) * 0.1
        );

        // 多层颜色墨水
        float ink1 = sin(p.x * 3.0 + t) * cos(p.y * 3.0 - t * 0.7);
        float ink2 = sin(p.x * 5.0 - t * 1.2) * cos(p.y * 4.0 + t * 0.9);
        float ink3 = noise(p * 3.0 + t * 0.3);

        vec3 color = vec3(0.02, 0.03, 0.06);
        color += vec3(0.2, 0.5, 0.9) * (ink1 * 0.5 + 0.5) * (0.3 + u_audio_bass);
        color += vec3(0.9, 0.2, 0.4) * (ink2 * 0.5 + 0.5) * (0.2 + u_audio_mid);
        color += vec3(0.1, 0.85, 0.6) * ink3 * u_audio_loudness * 0.4;

        // 表面高光
        float spec = pow(max(noise(p * 8.0 + t), 0.0), 8.0) * (0.5 + u_audio_loudness);
        color += vec3(0.7, 0.8, 1.0) * spec;

        // 边界泡沫
        float foam = noise(uv * 15.0 + t * 2.0) * smoothstep(0.6, 0.0, length(uv));
        color += vec3(0.9, 0.95, 1.0) * foam * 0.15;

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 光线行进（Ray Marching）基础场景
   * 包含球体、平面与软阴影的经典路径追踪风格场景
   */
  createRayMarchingSceneShader(gl, time) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      float sdSphere(vec3 p, float r) {
        return length(p) - r;
      }

      float sdPlane(vec3 p, vec3 n, float h) {
        return dot(p, n) + h;
      }

      float sdBox(vec3 p, vec3 b) {
        vec3 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
      }

      float opSmoothUnion(float d1, float d2, float k) {
        float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
        return mix(d2, d1, h) - k * h * (1.0 - h);
      }

      float map(vec3 p) {
        float t = u_time;
        // 地面
        float plane = sdPlane(p, vec3(0.0, 1.0, 0.0), 1.0);

        // 音频驱动球体
        vec3 sp = p;
        sp.y -= 0.5 + sin(t + u_audio_bass * 3.0) * 0.2;
        sp.xz = rot(t * 0.3 + u_audio_loudness) * sp.xz;
        float sphere = sdSphere(sp, 0.4 + u_audio_mid * 0.15);

        // 漂浮方块
        vec3 bp = p - vec3(sin(t * 0.5) * 1.2, cos(t * 0.4) * 0.3, cos(t * 0.3) * 1.0);
        bp = rot(t * 0.7) * bp;
        float box = sdBox(bp, vec3(0.25));

        // 柔和合并
        float scene = opSmoothUnion(sphere, box, 0.2);
        scene = min(scene, plane);
        return scene;
      }

      vec3 calcNormal(vec3 p) {
        vec2 e = vec2(0.001, 0.0);
        return normalize(vec3(
          map(p + e.xyy) - map(p - e.xyy),
          map(p + e.yxy) - map(p - e.yxy),
          map(p + e.yyx) - map(p - e.yyx)
        ));
      }

      float rayMarch(vec3 ro, vec3 rd) {
        float t = 0.0;
        for (int i = 0; i < 80; i++) {
          vec3 p = ro + rd * t;
          float d = map(p);
          if (d < 0.001 || t > 20.0) break;
          t += d;
        }
        return t;
      }

      float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
        float res = 1.0;
        float t = mint;
        for (int i = 0; i < 16; i++) {
          if (t >= maxt) break;
          float h = map(ro + rd * t);
          res = min(res, k * h / t);
          t += clamp(h, 0.01, 0.5);
        }
        return clamp(res, 0.0, 1.0);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        vec3 ro = vec3(0.0, 0.5, 3.0);
        vec3 rd = normalize(vec3(uv, -1.5));
        rd.xz = rot(u_time * 0.2) * rd.xz;

        float t = rayMarch(ro, rd);
        vec3 color = vec3(0.05, 0.05, 0.08);

        if (t < 20.0) {
          vec3 p = ro + rd * t;
          vec3 n = calcNormal(p);
          vec3 lightPos = vec3(2.0, 3.0, 2.0);
          vec3 l = normalize(lightPos - p);
          float diff = max(dot(n, l), 0.0);
          float spec = pow(max(dot(reflect(-l, n), -rd), 0.0), 32.0);
          float shadow = softShadow(p, l, 0.01, 5.0, 8.0);

          // 材质颜色
          vec3 matColor = mix(vec3(0.8, 0.3, 0.4), vec3(0.2, 0.6, 0.9), sin(p.y * 3.0 + u_time) * 0.5 + 0.5);
          color = matColor * diff * shadow + vec3(1.0) * spec * shadow * 0.5;
          color += vec3(0.05, 0.05, 0.1);

          // 雾
          float fog = exp(-t * 0.15);
          color = mix(vec3(0.05, 0.05, 0.08), color, fog);
        }

        // 天空
        color += vec3(0.1, 0.15, 0.3) * (1.0 - uv.y) * 0.3;

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 全息投影效果着色器 V2
   * 带菲涅尔效应、扫描面片与深度偏移的科幻全息图
   */
  createHologramProjectionShader(gl, time) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_mid;
      uniform float u_audio_bass;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float t = u_time;

        // 全息主体：多层旋转环与数据点
        vec3 color = vec3(0.0);
        float holoAlpha = 0.0;

        for (int layer = 0; layer < 4; layer++) {
          float fl = float(layer);
          vec2 p = uv;
          p = rot(t * (0.3 + fl * 0.1) + u_audio_mid * fl) * p;

          // 环结构
          float radius = 0.2 + fl * 0.08;
          float ring = abs(length(p) - radius);
          float ringMask = smoothstep(0.005, 0.0, ring);

          // 数据节点
          float angle = atan(p.y, p.x);
          float nodes = sin(angle * 12.0 + fl * 3.0 + t * 2.0) * 0.5 + 0.5;
          nodes = pow(nodes, 8.0) * ringMask;

          // 扫描面片
          float scanPlane = smoothstep(0.02, 0.0, abs(p.y - sin(t * 0.8 + fl) * radius));

          color += vec3(0.0, 0.9, 0.7) * (ringMask * 0.4 + nodes * 0.8);
          color += vec3(0.4, 1.0, 0.9) * scanPlane * 0.3;
          holoAlpha += ringMask + nodes + scanPlane * 0.3;
        }

        // 内部网格
        float gridX = smoothstep(0.004, 0.0, abs(fract(uv.x * 12.0 + 0.5) - 0.5));
        float gridY = smoothstep(0.004, 0.0, abs(fract(uv.y * 12.0 + 0.5) - 0.5));
        float grid = max(gridX, gridY) * smoothstep(0.5, 0.0, length(uv));
        color += vec3(0.0, 0.6, 0.5) * grid * 0.3;

        // 菲涅尔边缘发光
        float fresnel = pow(1.0 - abs(dot(normalize(vec3(uv, 1.0)), vec3(0.0, 0.0, 1.0))), 2.0);
        color += vec3(0.2, 1.0, 0.8) * fresnel * 0.4 * (0.5 + u_audio_loudness);

        // 全局扫描线
        float scan = smoothstep(0.01, 0.0, abs(fract(uv.y * 2.0 - t * 0.4) - 0.5) * 2.0 - 0.98);
        color += vec3(0.5, 1.0, 0.8) * scan * 0.2;

        // 随机 glitch 块
        float glitch = step(0.97, hash(vec2(floor(t * 15.0), floor(uv.y * 30.0))));
        color += vec3(1.0, 0.2, 0.3) * glitch * 0.3;

        // 底部能量底座
        float base = exp(-abs(uv.y + 0.35) * 10.0) * smoothstep(0.4, 0.0, abs(uv.x));
        color += vec3(0.0, 0.7, 0.6) * base * (0.5 + u_audio_bass);

        // 背景
        color += vec3(0.01, 0.02, 0.02);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 故障艺术（Glitch）着色器
   * RGB 偏移、块错位、扫描线撕裂与数字噪点
   */
  createGlitchArtShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_treble;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        vec2 uv = v_uv;
        float t = u_time;

        // 故障强度受音频驱动
        float glitchIntensity = 0.02 + u_audio_loudness * 0.08 + u_audio_bass * 0.05;

        // 块错位
        float blockNoise = hash(vec2(floor(uv.y * 20.0), floor(t * 10.0)));
        float blockGlitch = step(0.85 - u_audio_treble * 0.2, blockNoise);
        vec2 blockOffset = vec2(
          (hash(vec2(floor(uv.y * 20.0), floor(t * 15.0))) - 0.5) * glitchIntensity,
          0.0
        ) * blockGlitch;

        // 扫描线撕裂
        float lineNoise = hash(vec2(floor(uv.y * 80.0), floor(t * 20.0)));
        float lineGlitch = step(0.92, lineNoise);
        vec2 lineOffset = vec2(
          sin(t * 50.0 + uv.y * 100.0) * glitchIntensity * 2.0,
          0.0
        ) * lineGlitch;

        vec2 distortedUV = uv + blockOffset + lineOffset;

        // RGB 分离
        float rgbShift = glitchIntensity * 0.3;
        float r = noise(distortedUV + vec2(rgbShift, 0.0) + t * 0.1);
        float g = noise(distortedUV + vec2(0.0, rgbShift * 0.5) + t * 0.12);
        float b = noise(distortedUV - vec2(rgbShift, 0.0) + t * 0.08);

        // 数字噪点
        float digitalNoise = hash(uv * u_resolution + t * 100.0);
        digitalNoise = step(0.9 - u_audio_treble * 0.1, digitalNoise);

        // 扫描线
        float scanline = sin(uv.y * u_resolution.y * 1.5) * 0.04;

        // 色带（banding）
        float bands = floor(uv.y * 32.0) / 32.0;
        float banding = (hash(vec2(bands, floor(t * 5.0))) - 0.5) * 0.05 * u_audio_mid;

        vec3 color = vec3(r, g, b);
        color += vec3(digitalNoise) * 0.3;
        color += vec3(scanline);
        color += vec3(banding);

        // 暗角
        float vignette = 1.0 - smoothstep(0.4, 1.2, length(uv - 0.5) * 2.0);
        color *= vignette;

        // 整体色调映射
        color = pow(color, vec3(0.9));
        color += vec3(0.02, 0.01, 0.03);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 复古 CRT 显示器效果着色器
   * 扫描线、RGB 子像素排列、曲率畸变、过扫与辉光拖尾
   */
  createRetroCRTShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = v_uv;

        // 屏幕曲率畸变
        vec2 centered = uv - 0.5;
        float dist = length(centered);
        vec2 curved = centered * (1.0 + dist * dist * 0.15) + 0.5;
        float curvatureMask = smoothstep(1.0, 0.92, max(abs(curved.x - 0.5), abs(curved.y - 0.5)) * 2.0);

        // 过扫黑边
        float overscan = smoothstep(0.02, 0.0, min(min(curved.x, 1.0 - curved.x), min(curved.y, 1.0 - curved.y)));

        // 基础图案（音频响应彩条）
        float bars = sin(curved.x * 20.0 + u_time + u_audio_bass * 5.0) * 0.5 + 0.5;
        bars *= sin(curved.y * 15.0 - u_time * 0.5) * 0.5 + 0.5;

        // RGB 子像素排列
        float subPixelR = smoothstep(0.3, 0.7, sin(curved.x * u_resolution.x * 3.14159));
        float subPixelG = smoothstep(0.3, 0.7, sin(curved.x * u_resolution.x * 3.14159 + 2.094));
        float subPixelB = smoothstep(0.3, 0.7, sin(curved.x * u_resolution.x * 3.14159 + 4.189));

        vec3 color = vec3(bars) * vec3(subPixelR, subPixelG, subPixelB);
        color *= vec3(0.9, 0.95, 1.0);

        // 扫描线
        float scanline = sin(curved.y * u_resolution.y * 1.5) * 0.08 + 0.92;
        color *= scanline;

        // 水平消隐线
        float hBlank = step(0.98, fract(curved.y * 6.0 + u_time * 0.1));
        color *= 1.0 - hBlank * 0.3;

        // 噪点
        float noise = hash(curved * u_resolution + floor(u_time * 60.0)) * 0.08;
        color += vec3(noise);

        // 辉光拖尾（简化模拟）
        float glow = exp(-abs(curved.y - 0.5) * 4.0) * u_audio_mid;
        color += vec3(0.3, 0.2, 0.1) * glow;

        // 色偏
        color.r *= 1.05;
        color.b *= 1.1;

        // 暗角
        float vignette = 1.0 - smoothstep(0.3, 1.0, dist);
        color *= vignette * 0.7 + 0.3;

        // 曲率裁切与过扫
        color *= curvatureMask;
        color *= 1.0 - overscan;

        // 整体 CRT 色调
        color = pow(color, vec3(1.1, 0.95, 1.0));
        color += vec3(0.01, 0.01, 0.015);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 扫描线/条纹效果着色器
   * 水平与垂直扫描线、摩尔纹、百叶窗与音频响应条纹
   */
  createScanlineStripeShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = v_uv;
        float t = u_time;

        // 水平细扫描线
        float hScan = sin(uv.y * u_resolution.y * 1.0) * 0.5 + 0.5;
        hScan = pow(hScan, 1.5) * 0.15 + 0.85;

        // 水平粗条纹
        float hStripe = sin(uv.y * 20.0 + t * 0.5 + u_audio_bass * 3.0) * 0.5 + 0.5;
        hStripe = smoothstep(0.4, 0.6, hStripe);

        // 垂直条纹
        float vStripe = sin(uv.x * 30.0 - t * 0.3 + u_audio_mid * 2.0) * 0.5 + 0.5;
        vStripe = smoothstep(0.45, 0.55, vStripe);

        // 摩尔纹
        float moire = sin(length(uv - 0.5) * 50.0 + t) * sin(atan(uv.y - 0.5, uv.x - 0.5) * 10.0 + t * 0.5);
        moire = smoothstep(0.3, 0.7, moire * 0.5 + 0.5);

        // 百叶窗
        float blind = sin(uv.y * 12.0 + t * 0.2) * 0.5 + 0.5;
        blind = pow(blind, 4.0) * 0.5;

        // 颜色映射
        vec3 stripeColor = mix(
          mix(vec3(0.1, 0.1, 0.15), vec3(0.8, 0.2, 0.3), hStripe),
          vec3(0.1, 0.5, 0.8),
          vStripe
        );
        stripeColor = mix(stripeColor, vec3(0.9, 0.9, 0.2), moire * 0.3);
        stripeColor += vec3(0.2, 0.2, 0.3) * blind;

        // 音频响应亮度脉冲
        float pulse = 0.7 + 0.3 * sin(t * 4.0 + uv.x * 10.0) * u_audio_loudness;
        stripeColor *= pulse;

        // 扫描线调制
        stripeColor *= hScan;

        // 垂直消隐带
        float vBlank = sin(uv.x * 4.0 + t * 0.1) * 0.5 + 0.5;
        stripeColor *= 0.8 + vBlank * 0.2;

        // 高音驱动的噪点条纹
        float noiseStripe = step(0.95, hash(vec2(floor(uv.y * 100.0), floor(t * 30.0))));
        stripeColor += vec3(0.6, 0.7, 0.8) * noiseStripe * u_audio_treble;

        stripeColor += vec3(0.01, 0.01, 0.015);
        gl_FragColor = vec4(stripeColor, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 发光/泛光（Bloom）后处理着色器
   * 基于高斯模糊的多次采样泛光，带阈值提取与混合
   */
  createBloomPostProcessShader(gl, sourceTexture) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;

      // 模拟纹理采样（实际使用时应传入 sourceTexture）
      // 此处用程序化图案代替以独立运行
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      // 程序化源图案
      vec3 sourcePattern(vec2 uv) {
        float pattern = sin(uv.x * 10.0 + u_time) * cos(uv.y * 8.0 - u_time * 0.5);
        pattern += sin(uv.x * 23.0 - u_time * 1.3) * 0.5;
        pattern *= 0.5 + u_audio_bass;
        vec3 color = vec3(0.2, 0.4, 0.8) * (pattern * 0.5 + 0.5);
        float bright = pow(max(color.r, max(color.g, color.b)), 2.0) * (1.0 + u_audio_loudness);
        return color * bright;
      }

      // 简化的高斯采样
      vec3 sampleBlur(vec2 uv, vec2 dir, float spread) {
        vec3 sum = vec3(0.0);
        float weights[5];
        weights[0] = 0.227027;
        weights[1] = 0.1945946;
        weights[2] = 0.1216216;
        weights[3] = 0.054054;
        weights[4] = 0.016216;
        vec2 off = dir / u_resolution * spread;
        for (int i = -4; i <= 4; i++) {
          float fi = float(i);
          float w = weights[abs(i)];
          sum += sourcePattern(uv + off * fi) * w;
        }
        return sum;
      }

      void main() {
        vec2 uv = v_uv;

        // 提取亮部
        vec3 source = sourcePattern(uv);
        float luminance = dot(source, vec3(0.299, 0.587, 0.114));
        float threshold = 0.3 - u_audio_mid * 0.1;
        vec3 bright = source * smoothstep(threshold, threshold + 0.2, luminance);

        // 两次模糊（水平+垂直）
        vec3 blur = sampleBlur(uv, vec2(1.0, 0.0), 4.0 + u_audio_loudness * 4.0);
        blur += sampleBlur(uv, vec2(0.0, 1.0), 4.0 + u_audio_loudness * 4.0);
        blur *= 0.5;

        // 多遍泛光叠加
        vec3 bloom = bright + blur * 1.5;
        bloom += sampleBlur(uv, vec2(1.0, 1.0), 8.0) * 0.5;
        bloom += sampleBlur(uv, vec2(-1.0, 1.0), 8.0) * 0.5;

        // 混合
        vec3 color = source * 0.7 + bloom * (0.6 + u_audio_bass * 0.5);

        // 色调映射
        color = color / (1.0 + color * 0.3);
        color = pow(color, vec3(0.95));

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 色彩分离（Chromatic Aberration）着色器
   * RGB 通道按径向距离分离，带音频响应强度与桶形畸变
   */
  createChromaticAberrationShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      // 程序化源图像
      vec3 sourceImage(vec2 uv) {
        float pattern = sin(length(uv - 0.5) * 20.0 - u_time * 2.0);
        pattern += sin(atan(uv.y - 0.5, uv.x - 0.5) * 8.0 + u_time) * 0.5;
        pattern *= 0.5 + u_audio_bass;
        vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 0.5, 1.0) + pattern * 3.0 + u_time * 0.2);
        col += vec3(0.1, 0.2, 0.4) * noise(uv * 5.0 + u_time);
        return col;
      }

      void main() {
        vec2 uv = v_uv;
        vec2 centered = uv - 0.5;
        float dist = length(centered);

        // 色彩分离强度
        float strength = 0.015 + dist * 0.02 + u_audio_loudness * 0.02 + u_audio_treble * 0.01;

        // 桶形畸变
        float barrel = 1.0 + dist * dist * 0.1 * (1.0 + u_audio_bass);
        vec2 barrelUV = centered * barrel + 0.5;

        // RGB 通道分离
        float rOffset = strength * (1.0 + sin(u_time * 3.0) * 0.2);
        float gOffset = strength * 0.6;
        float bOffset = -strength * (1.0 + cos(u_time * 2.5) * 0.2);

        vec2 rUV = centered * (barrel + rOffset) + 0.5;
        vec2 gUV = centered * (barrel + gOffset) + 0.5;
        vec2 bUV = centered * (barrel + bOffset) + 0.5;

        float r = sourceImage(rUV).r;
        float g = sourceImage(gUV).g;
        float b = sourceImage(bUV).b;

        vec3 color = vec3(r, g, b);

        // 紫边增强（模拟镜头色散）
        float fringe = pow(dist, 3.0) * 0.3 * u_audio_mid;
        color.r += fringe * 0.3;
        color.b += fringe * 0.2;

        // 暗角
        float vignette = 1.0 - smoothstep(0.3, 1.0, dist);
        color *= vignette * 0.6 + 0.4;

        // 噪点
        color += (hash(uv * u_resolution + u_time) - 0.5) * 0.03;

        color += vec3(0.01, 0.01, 0.02);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 水波纹/涟漪效果着色器
   * 多源点干涉水波，带焦散与水下折射扭曲
   */
  createWaterRippleShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = v_uv;
        float t = u_time;

        // 动态波纹源
        vec2 centers[5];
        centers[0] = vec2(0.3 + sin(t * 0.3) * 0.1, 0.4 + cos(t * 0.2) * 0.1);
        centers[1] = vec2(0.7 + cos(t * 0.25) * 0.1, 0.6 + sin(t * 0.35) * 0.1);
        centers[2] = vec2(0.5, 0.5);
        centers[3] = vec2(0.2 + sin(t * 0.4) * 0.15, 0.8);
        centers[4] = vec2(0.8 + cos(t * 0.3) * 0.1, 0.3);

        float ripple = 0.0;
        float amplitude = 0.0;
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          float d = length(uv - centers[i]);
          float freq = 20.0 + fi * 5.0;
          float speed = 2.0 + fi * 0.5;
          float wave = sin(d * freq - t * speed) * exp(-d * 2.5);
          float amp = (i == 0) ? u_audio_bass : (i == 1) ? u_audio_mid : (i == 2) ? u_audio_loudness : 0.3;
          ripple += wave * amp;
          amplitude += amp;
        }
        ripple /= max(amplitude, 0.1);

        // 折射扭曲
        vec2 refracted = uv + ripple * 0.03;

        // 水下焦散图案
        float caustic = sin(refracted.x * 30.0 + t * 0.5) * sin(refracted.y * 30.0 + t * 0.4);
        caustic += sin(refracted.x * 17.0 - t * 0.3) * sin(refracted.y * 23.0 + t * 0.6);
        caustic = pow(caustic * 0.5 + 0.5, 3.0);

        // 颜色
        vec3 shallow = vec3(0.0, 0.35, 0.45);
        vec3 deep = vec3(0.0, 0.1, 0.25);
        vec3 waterColor = mix(deep, shallow, smoothstep(0.0, 0.6, refracted.y + ripple * 0.1));

        // 高光
        float spec = pow(max(ripple, 0.0), 2.0) * (0.5 + u_audio_loudness);
        vec3 highlight = vec3(0.7, 0.9, 1.0) * spec;

        // 焦散亮度
        vec3 causticColor = vec3(0.4, 0.8, 0.9) * caustic * (0.3 + u_audio_mid);

        vec3 color = waterColor + highlight + causticColor;

        // 泡沫边缘
        float foam = smoothstep(0.3, 0.5, abs(ripple)) * smoothstep(0.6, 0.0, length(uv - 0.5));
        color += vec3(0.9, 0.95, 1.0) * foam * 0.2;

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 星空/星云生成着色器
   * 基于沃罗诺伊与 FBM 的星云，音频驱动恒星诞生与超新星闪烁
   */
  createStarfieldNebulaShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = rot(0.3) * p * 2.0;
          a *= 0.5;
        }
        return v;
      }

      // 沃罗诺oi 细胞
      float voronoi(vec2 p, out vec2 cellId) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float minDist = 1.0;
        vec2 nearest;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = neighbor + hash(i + neighbor);
            float dist = length(point - f);
            if (dist < minDist) {
              minDist = dist;
              nearest = i + neighbor;
            }
          }
        }
        cellId = nearest;
        return minDist;
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float t = u_time;

        // 星空层
        float stars = 0.0;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 p = uv * (8.0 + fi * 12.0);
          float h = hash(floor(p) + fi * 100.0);
          float star = step(0.995 - fi * 0.003, h);
          float twinkle = sin(t * (1.0 + h * 5.0) + fi * 3.0) * 0.5 + 0.5;
          stars += star * twinkle * (1.0 + u_audio_treble * 2.0);
        }

        // 星云 FBM
        vec2 nebulaUV = uv * 2.0 + t * 0.02;
        float nebula = fbm(nebulaUV);
        nebula += fbm(nebulaUV * 2.0 + 10.0) * 0.5;
        nebula = smoothstep(0.3, 0.7, nebula);

        // 星云颜色
        vec3 nebulaColor1 = vec3(0.4, 0.1, 0.5);
        vec3 nebulaColor2 = vec3(0.1, 0.3, 0.6);
        vec3 nebulaColor3 = vec3(0.8, 0.3, 0.2);
        vec3 nebColor = mix(nebulaColor1, nebulaColor2, sin(uv.x * 3.0 + t * 0.1) * 0.5 + 0.5);
        nebColor = mix(nebColor, nebulaColor3, u_audio_bass);

        // 超新星爆发（音频触发）
        float supernova = exp(-length(uv - vec2(sin(t * 0.1) * 0.5, cos(t * 0.13) * 0.3)) * 8.0);
        supernova *= (0.3 + u_audio_loudness * 2.0) * (sin(t * 3.0) * 0.5 + 0.5);

        // 尘埃带
        float dust = fbm(uv * 4.0 + vec2(t * 0.05, 0.0));
        dust = smoothstep(0.4, 0.6, dust) * 0.3;

        vec3 color = vec3(0.0, 0.0, 0.02);
        color += nebColor * nebula * (0.5 + u_audio_mid);
        color += vec3(1.0, 0.95, 0.9) * stars * 0.8;
        color += vec3(1.0, 0.8, 0.4) * supernova;
        color += vec3(0.3, 0.25, 0.2) * dust;

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 火焰/等离子体效果着色器
   * 多层湍流噪声驱动的火焰与等离子体球，音频控制温度与湍流
   */
  createFirePlasmaShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_loudness;
      uniform float u_audio_treble;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = p * 2.0 + vec2(1.7, 9.2);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = v_uv;
        float t = u_time;

        // 火焰区域（底部上升）
        vec2 fireUV = vec2(uv.x * 3.0, uv.y * 4.0);
        float fireNoise = fbm(fireUV + vec2(0.0, -t * (1.0 + u_audio_loudness)));
        fireNoise += fbm(fireUV * 2.0 + vec2(0.0, -t * 1.5)) * 0.5;
        fireNoise = fireNoise * 0.5 + 0.5;

        float fireHeight = 0.25 + u_audio_bass * 0.35;
        float flame = smoothstep(fireHeight + fireNoise * 0.25, fireHeight - 0.05, uv.y);
        flame *= smoothstep(0.0, 0.15, uv.y);

        // 火焰温度颜色
        vec3 cold = vec3(0.1, 0.0, 0.0);
        vec3 warm = vec3(0.8, 0.1, 0.0);
        vec3 hot  = vec3(1.0, 0.5, 0.0);
        vec3 white = vec3(1.0, 0.9, 0.6);
        vec3 fireColor = mix(cold, warm, flame);
        fireColor = mix(fireColor, hot, smoothstep(0.4, 0.7, flame));
        fireColor = mix(fireColor, white, smoothstep(0.7, 0.95, flame));

        // 等离子体球（中心）
        vec2 plasmaUV = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * 4.0;
        float plasma = sin(plasmaUV.x + t * 2.0 + fbm(plasmaUV + t));
        plasma += sin(plasmaUV.y + t * 1.5 - fbm(plasmaUV - t * 0.5));
        plasma += sin(length(plasmaUV) * 3.0 - t * 3.0);
        plasma = plasma * 0.25 + 0.5;
        plasma = pow(plasma, 2.0 + u_audio_treble * 2.0);

        float plasmaMask = exp(-length(plasmaUV) * 1.5) * (0.5 + u_audio_mid);
        vec3 plasmaColor = mix(vec3(0.2, 0.0, 0.8), vec3(0.0, 0.8, 0.9), plasma);
        plasmaColor = mix(plasmaColor, vec3(1.0, 0.2, 0.5), u_audio_bass);

        // 合成
        vec3 color = fireColor * flame;
        color += plasmaColor * plasma * plasmaMask;

        // 火花
        vec2 sparkUV = uv * vec2(20.0, 15.0);
        vec2 sparkId = floor(sparkUV);
        float spark = step(0.96, hash(sparkId + floor(t * 12.0)));
        float sparkY = fract(sparkUV.y + t * (0.5 + hash(sparkId) * 2.0));
        spark *= smoothstep(1.0, 0.6, sparkY) * smoothstep(0.0, 0.1, sparkY);
        color += vec3(1.0, 0.7, 0.3) * spark * u_audio_treble;

        // 背景烟
        float smoke = fbm(uv * 3.0 + vec2(t * 0.1, 0.0)) * smoothstep(0.8, 0.3, uv.y);
        color += vec3(0.05, 0.05, 0.08) * smoke;

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 水晶/棱镜折射效果着色器
   * 多面水晶体的内部反射与色散，音频驱动旋转与折射率变化
   */
  createCrystalPrismShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      // 正六边形 SDF
      float sdHexagon(vec2 p, float r) {
        vec2 q = abs(p);
        return max(q.x * 0.866025 + q.y * 0.5, q.y) - r;
      }

      // 菱形 SDF
      float sdRhombus(vec2 p, vec2 b) {
        vec2 q = abs(p);
        float h = clamp((-2.0 * dot(q, b) + dot(b, b)) / dot(b, b), -1.0, 1.0);
        float d = length(q - 0.5 * b * vec2(1.0 - h, 1.0 + h));
        return d * sign(q.x * b.y + q.y * b.x - b.x * b.y);
      }

      void main() {
        vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float t = u_time;

        // 多层水晶面
        vec3 color = vec3(0.0);
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 p = uv;
          p = rot(t * (0.2 + fi * 0.1) + u_audio_mid * fi) * p;

          // 不同面型
          float crystal = 0.0;
          if (i == 0) crystal = sdHexagon(p, 0.35);
          else if (i == 1) crystal = sdRhombus(p, vec2(0.4, 0.25));
          else if (i == 2) crystal = abs(length(p) - 0.3) - 0.02;
          else crystal = max(abs(p.x), abs(p.y)) - 0.25;

          float crystalMask = smoothstep(0.01, -0.01, crystal);
          float edge = smoothstep(0.03, 0.0, abs(crystal));

          // 色散：每个面不同色相
          float hue = fi * 0.25 + t * 0.05 + u_audio_bass * 0.1;
          vec3 crystalColor = 0.5 + 0.5 * cos(vec3(0.0, 0.5, 1.0) + hue * 6.28318);
          crystalColor *= 0.6 + u_audio_loudness;

          // 内部折射纹理
          vec2 refractUV = p * (2.0 + fi * 0.5);
          float inner = sin(refractUV.x * 8.0 + t) * sin(refractUV.y * 8.0 - t * 0.7);
          inner = inner * 0.5 + 0.5;

          color += crystalColor * crystalMask * (0.3 + inner * 0.4);
          color += crystalColor * edge * 0.8;
        }

        // 中心光芒
        float core = exp(-length(uv) * 5.0) * (0.5 + u_audio_loudness);
        color += vec3(1.0, 0.95, 0.8) * core;

        // 彩虹色散拖尾
        float dispersion = length(uv) * 0.3 * (1.0 + u_audio_treble);
        color.r += dispersion * 0.2;
        color.b -= dispersion * 0.1;

        // 背景星光
        float stars = step(0.995, hash(floor(uv * 200.0) + floor(t * 10.0)));
        color += vec3(0.6, 0.7, 1.0) * stars * 0.3;

        color += vec3(0.005, 0.005, 0.01);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 音频频谱纹理映射着色器
   * 将 FFT 数据映射为纹理坐标扭曲与颜色查找表（LUT）索引
   */
  createSpectrumTextureMappingShader(gl, fftData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_fft[128];
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;

      float getFFT(float x) {
        float idx = clamp(x, 0.0, 1.0) * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        float vi = 0.0, vj = 0.0;
        for (int k = 0; k < 128; k++) {
          if (k == i) vi = u_fft[k];
          if (k == j) vj = u_fft[k];
        }
        return mix(vi, vj, f);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = v_uv;
        float t = u_time;

        // 基于 X 坐标的频谱查询
        float fftX = getFFT(uv.x);
        float fftY = getFFT(uv.y);

        // 纹理坐标扭曲
        vec2 distorted = uv + vec2(
          sin(uv.y * 10.0 + fftX * 5.0 + t) * 0.05 * (1.0 + u_audio_bass),
          cos(uv.x * 10.0 + fftY * 5.0 - t * 0.8) * 0.05 * (1.0 + u_audio_mid)
        );

        // LUT 颜色查找（模拟）
        float lutIndex = fftX + fftY * 0.5 + sin(t * 0.2) * 0.1;
        vec3 lutColor = 0.5 + 0.5 * cos(vec3(0.0, 0.5, 1.0) + lutIndex * 6.28318 + vec3(0.0, 2.0, 4.0));

        // 频谱条带纹理
        float bands = floor(distorted.x * 32.0) / 32.0;
        float bandFFT = getFFT(bands);
        float bandMask = smoothstep(bandFFT + 0.01, bandFFT - 0.01, distorted.y);

        // 径向频谱环
        vec2 centered = distorted - 0.5;
        float radius = length(centered);
        float angle = atan(centered.y, centered.x) / 6.28318 + 0.5;
        float ringFFT = getFFT(angle);
        float ringMask = smoothstep(0.01, 0.0, abs(radius - (0.2 + ringFFT * 0.2)));

        // 合成
        vec3 color = lutColor * 0.2;
        color += lutColor * bandMask * (0.5 + u_audio_loudness);
        color += vec3(0.4, 0.8, 1.0) * ringMask * (0.4 + u_audio_treble);

        // 颗粒纹理映射
        float grain = hash(floor(distorted * 128.0) + floor(t * 30.0));
        color += vec3(grain) * 0.03 * u_audio_treble;

        // 高光
        float spec = pow(max(bandFFT * ringFFT, 0.0), 2.0) * u_audio_loudness;
        color += vec3(0.8, 0.9, 1.0) * spec;

        color += vec3(0.01, 0.01, 0.02);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },

  /**
   * 多通道音频可视化混合器
   * 同时显示频谱、波形、粒子与分形的混合层，带遮罩与混合模式
   */
  createMultiChannelAudioMixerShader(gl, audioData) {
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_fft[128];
      uniform float u_waveform[128];
      uniform float u_audio_loudness;
      uniform float u_audio_bass;
      uniform float u_audio_mid;
      uniform float u_audio_treble;
      uniform float u_audio_beatPhase;

      float getFFT(float x) {
        float idx = clamp(x, 0.0, 1.0) * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        float vi = 0.0, vj = 0.0;
        for (int k = 0; k < 128; k++) {
          if (k == i) vi = u_fft[k];
          if (k == j) vj = u_fft[k];
        }
        return mix(vi, vj, f);
      }

      float getWaveform(float x) {
        float idx = clamp(x, 0.0, 1.0) * 127.0;
        int i = int(idx);
        int j = min(i + 1, 127);
        float f = fract(idx);
        float vi = 0.0, vj = 0.0;
        for (int k = 0; k < 128; k++) {
          if (k == i) vi = u_waveform[k];
          if (k == j) vj = u_waveform[k];
        }
        return mix(vi, vj, f);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 uv = v_uv;
        float t = u_time;
        vec3 color = vec3(0.02, 0.02, 0.04);

        // === 通道 A：底部频谱条 ===
        float logX = log(1.0 + uv.x * 9.0) / log(10.0);
        float fftVal = getFFT(logX);
        float barMask = smoothstep(fftVal + 0.01, fftVal - 0.01, 1.0 - uv.y);
        float barX = fract(logX * 40.0);
        float barWidth = smoothstep(0.008, 0.003, abs(barX - 0.5) * 2.0);
        vec3 barColor = hsv2rgb(vec3(logX * 0.8 + t * 0.05, 0.85, 1.0));
        color += barColor * barMask * barWidth * (0.5 + u_audio_loudness);

        // === 通道 B：中心圆形波形 ===
        vec2 centered = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float radius = length(centered);
        float angle = atan(centered.y, centered.x) / 6.28318 + 0.5;
        float waveVal = getWaveform(angle) * 0.3 * (1.0 + u_audio_bass);
        float waveRing = smoothstep(0.008, 0.0, abs(radius - (0.2 + waveVal)));
        vec3 waveColor = vec3(0.2, 0.9, 1.0) * waveRing * (0.5 + u_audio_mid);
        color += waveColor;

        // === 通道 C：粒子层 ===
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 p = centered * (4.0 + fi * 2.0);
          p = rot(t * (0.2 + fi * 0.1) + u_audio_bass) * p;
          vec2 id = floor(p);
          vec2 fr = fract(p) - 0.5;
          float h = hash(id + fi * 37.0);
          float d = length(fr - vec2(sin(t + h * 6.28), cos(t + h * 6.28)) * 0.2);
          float particle = smoothstep(0.04 + h * 0.03, 0.01, d);
          vec3 pColor = mix(vec3(1.0, 0.3, 0.2), vec3(0.2, 0.8, 1.0), h + u_audio_treble);
          color += pColor * particle * 0.4;
        }

        // === 通道 D：节拍脉冲环 ===
        float pulseRing = smoothstep(0.02, 0.0, abs(radius - (0.35 + sin(u_audio_beatPhase * 6.28318) * 0.05)));
        pulseRing *= u_audio_bass;
        color += vec3(1.0, 0.7, 0.2) * pulseRing * 0.5;

        // === 混合遮罩：四角暗角 ===
        float vignette = 1.0 - smoothstep(0.3, 1.0, length(centered) * 2.0);
        color *= vignette * 0.3 + 0.7;

        // === 全局色调映射 ===
        color = color / (1.0 + color * 0.2);
        color = pow(color, vec3(0.95, 1.0, 1.05));

        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const prog = new ShaderProgram(gl, vs, fs);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = prog.getAttribLocation('a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return prog;
  },
};

// ============================================================================
// 渲染辅助函数
// ============================================================================

/**
 * 调整 canvas 尺寸以匹配设备像素比，避免模糊
 * @param {HTMLCanvasElement} canvas - 目标画布
 * @param {number} dpr - 设备像素比（默认 window.devicePixelRatio）
 */
export function resizeCanvasToDisplaySize(canvas, dpr = window.devicePixelRatio || 1) {
  const displayWidth = Math.floor(canvas.clientWidth * dpr);
  const displayHeight = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    return true;
  }
  return false;
}

/**
 * 创建 WebGL 纹理并上传音频数据（用于部分高级效果）
 * @param {WebGLRenderingContext} gl - WebGL 上下文
 * @param {Float32Array} data - 一维数据数组
 * @param {number} width - 纹理宽度
 * @returns {WebGLTexture}
 */
export function createAudioTexture(gl, data, width = 128) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // 将一维数据转为 1像素高的图像
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, 1, 0, gl.LUMINANCE, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

/**
 * 更新音频纹理内容
 * @param {WebGLRenderingContext} gl - WebGL 上下文
 * @param {WebGLTexture} texture - 目标纹理
 * @param {Float32Array} data - 新数据
 * @param {number} width - 纹理宽度
 */
export function updateAudioTexture(gl, texture, data, width = 128) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, 1, gl.LUMINANCE, gl.FLOAT, data);
}

/**
 * 绘制全屏四边形（使用已绑定的顶点缓冲）
 * @param {WebGLRenderingContext} gl - WebGL 上下文
 */
export function drawFullscreenQuad(gl) {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ============================================================================
// 后处理管线类（PostProcessor）
// ============================================================================

/**
 * PostProcessor 提供简单的帧缓冲后处理支持，
 * 可为着色器效果添加泛光（Bloom）、色调映射等后处理。
 * 使用原生 WebGL 帧缓冲对象（FBO）。
 */
export class PostProcessor {
  gl;
  width;
  height;
  framebuffer;
  texture;
  renderbuffer;

  /**
   * @param {WebGLRenderingContext} gl - WebGL 上下文
   * @param {number} width - 帧缓冲宽度
   * @param {number} height - 帧缓冲高度
   */
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this._createFBO();
  }

  /** 创建帧缓冲对象及其附件 */
  _createFBO() {
    const gl = this.gl;
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    // 颜色纹理附件
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
    // 深度/模板渲染缓冲附件
    this.renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this.width, this.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);
    // 检查完整性
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('帧缓冲不完整');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** 调整帧缓冲尺寸 */
  resize(width, height) {
    this.width = width;
    this.height = height;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
  }

  /** 绑定帧缓冲为渲染目标 */
  bind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, this.width, this.height);
  }

  /** 解绑帧缓冲，恢复默认屏幕渲染 */
  unbind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  /** 获取颜色纹理，用于后续着色器采样 */
  getTexture() {
    return this.texture;
  }

  /** 清理资源 */
  destroy() {
    const gl = this.gl;
    gl.deleteFramebuffer(this.framebuffer);
    gl.deleteTexture(this.texture);
    gl.deleteRenderbuffer(this.renderbuffer);
  }
}

// ============================================================================
// 统一渲染循环辅助类（ShaderRenderer）
// ============================================================================

/**
 * ShaderRenderer 封装了一个简单的渲染循环，
 * 将 QingluanShaders 效果与 AudioToShaderBridge 结合，
 * 自动处理 canvas 尺寸、时间uniform与音频数据更新。
 */
export class ShaderRenderer {
  canvas;
  gl;
  shader;
  bridge;
  startTime;
  animationId;
  analyser;
  onBeforeRender;
  onAfterRender;

  /**
   * @param {HTMLCanvasElement} canvas - 画布
   * @param {ShaderProgram} shader - 要渲染的着色器程序
   * @param {AudioToShaderBridge} bridge - 音频数据桥接器（可选）
   */
  constructor(canvas, shader, bridge = null) {
    this.canvas = canvas;
    this.gl = QingluanShaders.initWebGL(canvas);
    if (!this.gl) throw new Error('WebGL 初始化失败');
    this.shader = shader;
    this.bridge = bridge;
    this.startTime = performance.now();
    this.analyser = null;
    this.onBeforeRender = null;
    this.onAfterRender = null;
  }

  /** 连接 Web Audio 分析器 */
  connectAnalyser(analyser) {
    this.analyser = analyser;
    if (this.bridge) {
      // 确保数组大小匹配
      const fftSize = analyser.frequencyBinCount;
      this.bridge.fftData = new Float32Array(fftSize);
      this.bridge.waveformData = new Float32Array(fftSize);
    }
  }

  /** 启动渲染循环 */
  start() {
    const loop = (now) => {
      this.render(now);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  /** 停止渲染循环 */
  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  /** 执行单帧渲染 */
  render(now) {
    const gl = this.gl;
    // 自动调整画布尺寸
    if (resizeCanvasToDisplaySize(this.canvas)) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.shader.setVec2('u_resolution', this.canvas.width, this.canvas.height);
    }
    // 更新时间
    const timeSec = (now - this.startTime) / 1000;
    this.shader.setFloat('u_time', timeSec);
    // 更新音频数据
    if (this.analyser && this.bridge) {
      this.bridge.update(this.analyser, 1 / 60); // 假设 60fps
      this.bridge.bindToShader(this.shader);
      // 绑定 FFT 数组
      const fftSize = Math.min(this.bridge.fftData.length, 128);
      for (let i = 0; i < fftSize; i++) {
        this.shader.setFloat(`u_fft[${i}]`, this.bridge.fftData[i]);
      }
      // 绑定波形数组
      const waveSize = Math.min(this.bridge.waveformData.length, 128);
      for (let i = 0; i < waveSize; i++) {
        this.shader.setFloat(`u_waveform[${i}]`, this.bridge.waveformData[i]);
      }
    }
    if (this.onBeforeRender) this.onBeforeRender(gl, this.shader, timeSec);
    this.shader.use();
    drawFullscreenQuad(gl);
    if (this.onAfterRender) this.onAfterRender(gl, this.shader, timeSec);
  }

  /** 销毁渲染器 */
  destroy() {
    this.stop();
    this.shader.destroy();
  }
}

// ============================================================================
// 默认导出
// ============================================================================

export default QingluanShaders;

// ============================================================================
// 追加：后处理与高级渲染管线
// ============================================================================

/**
 * PingPongFBO 类 — 双缓冲帧缓冲对象
 * 用于需要读写分离的迭代效果（如流体模拟、泛光迭代）
 */
export class PingPongFBO {
  gl;
  width;
  height;
  readFBO;
  writeFBO;
  readTexture;
  writeTexture;
  depthRenderbuffer;

  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.readFBO = gl.createFramebuffer();
    this.writeFBO = gl.createFramebuffer();
    this.readTexture = this._createTexture();
    this.writeTexture = this._createTexture();
    this._attach(this.readFBO, this.readTexture);
    this._attach(this.writeFBO, this.writeTexture);
  }

  _createTexture() {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  _attach(fbo, texture) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('PingPongFBO 帧缓冲不完整');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  swap() {
    const tmpFBO = this.readFBO;
    const tmpTex = this.readTexture;
    this.readFBO = this.writeFBO;
    this.readTexture = this.writeTexture;
    this.writeFBO = tmpFBO;
    this.writeTexture = tmpTex;
  }

  bindRead(textureUnit = 0) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.readTexture);
  }

  bindWrite() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.writeFBO);
    this.gl.viewport(0, 0, this.width, this.height);
  }

  unbind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    const gl = this.gl;
    [this.readTexture, this.writeTexture].forEach(tex => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    });
  }

  destroy() {
    const gl = this.gl;
    gl.deleteFramebuffer(this.readFBO);
    gl.deleteFramebuffer(this.writeFBO);
    gl.deleteTexture(this.readTexture);
    gl.deleteTexture(this.writeTexture);
  }
}

/**
 * EffectComposer — 多通道后处理合成器
 * 管理多个后处理效果的链式调用，如 Bloom -> ToneMapping -> Vignette
 */
export class EffectComposer {
  gl;
  width;
  height;
  passes = [];
  quadBuffer;
  quadVAO;

  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this._initQuad();
  }

  _initQuad() {
    const gl = this.gl;
    const verts = new Float32Array([-1, -1, 0, 0, 3, -1, 2, 0, -1, 3, 0, 2]);
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  }

  addPass(pass) {
    pass.setup(this.gl, this.width, this.height);
    this.passes.push(pass);
    return this;
  }

  render(sourceTexture, targetFBO = null) {
    const gl = this.gl;
    let input = sourceTexture;
    for (let i = 0; i < this.passes.length; i++) {
      const pass = this.passes[i];
      const isLast = i === this.passes.length - 1;
      pass.render(input, isLast ? targetFBO : null, this.quadBuffer);
      input = pass.getOutputTexture();
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.passes.forEach(p => p.resize(width, height));
  }

  destroy() {
    this.passes.forEach(p => p.destroy());
    this.gl.deleteBuffer(this.quadBuffer);
  }
}

/**
 * BasePass — 后处理通道基类
 */
export class BasePass {
  gl;
  program;
  fbo;
  outputTexture;
  vertexShader = `
    attribute vec2 a_position;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main() {
      v_uv = a_uv;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  constructor(fragmentShader) {
    this.fragmentShader = fragmentShader;
  }

  setup(gl, width, height) {
    this.gl = gl;
    this.program = new ShaderProgram(gl, this.vertexShader, this.fragmentShader);
    this._createFBO(width, height);
  }

  _createFBO(width, height) {
    const gl = this.gl;
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    this.outputTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.outputTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render(inputTexture, targetFBO, quadBuffer) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO || this.fbo);
    if (!targetFBO) gl.viewport(0, 0, this.width, this.height);
    this.program.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    this.program.setInt('u_inputTexture', 0);
    this._bindQuad(quadBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  _bindQuad(buf) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const aPos = this.program.getAttribLocation('a_position');
    const aUV = this.program.getAttribLocation('a_uv');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8);
  }

  getOutputTexture() {
    return this.outputTexture;
  }

  resize(width, height) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  destroy() {
    const gl = this.gl;
    gl.deleteFramebuffer(this.fbo);
    gl.deleteTexture(this.outputTexture);
    this.program.destroy();
  }
}

/**
 * BloomPass — 泛光后处理通道
 */
export class BloomPass extends BasePass {
  constructor(iterations = 4, strength = 0.8) {
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_inputTexture;
      uniform vec2 u_resolution;
      uniform float u_strength;
      uniform int u_iteration;

      void main() {
        vec2 texel = 1.0 / u_resolution;
        vec3 color = vec3(0.0);
        float total = 0.0;
        for (int x = -4; x <= 4; x++) {
          for (int y = -4; y <= 4; y++) {
            float w = exp(-float(x*x + y*y) / 8.0);
            color += texture2D(u_inputTexture, v_uv + vec2(float(x), float(y)) * texel).rgb * w;
            total += w;
          }
        }
        color /= total;
        // 阈值提取
        float lum = dot(color, vec3(0.299, 0.587, 0.114));
        float threshold = 0.6;
        float contrib = smoothstep(threshold, threshold + 0.2, lum);
        gl_FragColor = vec4(color * contrib * u_strength, 1.0);
      }
    `;
    super(fs);
    this.iterations = iterations;
    this.strength = strength;
  }

  render(inputTexture, targetFBO, quadBuffer) {
    const gl = this.gl;
    this.program.use();
    this.program.setVec2('u_resolution', this.width, this.height);
    this.program.setFloat('u_strength', this.strength);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    this.program.setInt('u_inputTexture', 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO || this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    this._bindQuad(quadBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

/**
 * VignettePass — 暗角后处理通道
 */
export class VignettePass extends BasePass {
  constructor(intensity = 0.6, smoothness = 0.8) {
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_inputTexture;
      uniform float u_intensity;
      uniform float u_smoothness;
      void main() {
        vec3 color = texture2D(u_inputTexture, v_uv).rgb;
        vec2 uv = v_uv * (1.0 - v_uv);
        float vig = uv.x * uv.y * 15.0;
        vig = pow(vig, u_smoothness);
        color *= 1.0 - (1.0 - vig) * u_intensity;
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    super(fs);
    this.intensity = intensity;
    this.smoothness = smoothness;
  }

  render(inputTexture, targetFBO, quadBuffer) {
    const gl = this.gl;
    this.program.use();
    this.program.setFloat('u_intensity', this.intensity);
    this.program.setFloat('u_smoothness', this.smoothness);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    this.program.setInt('u_inputTexture', 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO || this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    this._bindQuad(quadBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

/**
 * ToneMappingPass — 色调映射后处理通道
 */
export class ToneMappingPass extends BasePass {
  constructor(exposure = 1.0, gamma = 2.2) {
    const fs = `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_inputTexture;
      uniform float u_exposure;
      uniform float u_gamma;
      void main() {
        vec3 color = texture2D(u_inputTexture, v_uv).rgb;
        color *= u_exposure;
        // Reinhard tone mapping
        color = color / (1.0 + color);
        // Gamma correction
        color = pow(color, vec3(1.0 / u_gamma));
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    super(fs);
    this.exposure = exposure;
    this.gamma = gamma;
  }

  render(inputTexture, targetFBO, quadBuffer) {
    const gl = this.gl;
    this.program.use();
    this.program.setFloat('u_exposure', this.exposure);
    this.program.setFloat('u_gamma', this.gamma);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    this.program.setInt('u_inputTexture', 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO || this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    this._bindQuad(quadBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

/**
 * ShaderLibrary — 着色器注册与查找库
 * 用于按名称或标签管理大量着色器效果
 */
export class ShaderLibrary {
  shaders = new Map();
  tags = new Map();

  register(name, factory, tags = []) {
    this.shaders.set(name, { factory, tags });
    tags.forEach(tag => {
      if (!this.tags.has(tag)) this.tags.set(tag, new Set());
      this.tags.get(tag).add(name);
    });
  }

  create(name, gl, ...args) {
    const entry = this.shaders.get(name);
    if (!entry) throw new Error(`ShaderLibrary: 未找到着色器 "${name}"`);
    return entry.factory(gl, ...args);
  }

  list() {
    return Array.from(this.shaders.keys());
  }

  listByTag(tag) {
    const set = this.tags.get(tag);
    return set ? Array.from(set) : [];
  }

  has(name) {
    return this.shaders.has(name);
  }
}

/**
 * 全局着色器库实例，自动注册 QingluanShaders 中所有效果
 */
export const shaderLibrary = new ShaderLibrary();

// 注册所有内置着色器
function _registerBuiltinShaders() {
  const registry = [
    { name: 'spectrum', factory: QingluanShaders.createSpectrumShader, tags: ['fft', '2d', 'bars'] },
    { name: 'waveform', factory: QingluanShaders.createWaveformShader, tags: ['waveform', '2d', 'fluid'] },
    { name: 'particle', factory: QingluanShaders.createParticleShader, tags: ['particle', 'noise', 'abstract'] },
    { name: 'fractal', factory: QingluanShaders.createFractalShader, tags: ['3d', 'raymarching', 'fractal'] },
    { name: 'terrain', factory: QingluanShaders.createNoiseTerrainShader, tags: ['noise', 'terrain', 'nature'] },
    { name: 'neural', factory: QingluanShaders.createNeuralShader, tags: ['network', 'tech', 'abstract'] },
    { name: 'galaxy', factory: QingluanShaders.createGalaxyShader, tags: ['space', 'stars', 'spiral'] },
    { name: 'fluid', factory: QingluanShaders.createFluidShader, tags: ['fluid', 'ink', 'abstract'] },
    { name: 'matrix', factory: QingluanShaders.createMatrixShader, tags: ['retro', 'text', 'cyber'] },
    { name: 'fire', factory: QingluanShaders.createFireShader, tags: ['fire', 'nature', 'particles'] },
    { name: 'aurora', factory: QingluanShaders.createAuroraShader, tags: ['nature', 'sky', 'aurora'] },
    { name: 'water', factory: QingluanShaders.createWaterShader, tags: ['water', 'ripple', 'nature'] },
    { name: 'hologram', factory: QingluanShaders.createHologramShader, tags: ['sci-fi', 'hologram', 'tech'] },
    { name: 'quantum', factory: QingluanShaders.createQuantumFoamShader, tags: ['abstract', 'quantum', 'micro'] },
    { name: 'circularSpectrum', factory: QingluanShaders.createCircularSpectrumShader, tags: ['fft', 'circular', 'polar'] },
    { name: 'spectrumBars3D', factory: QingluanShaders.createSpectrumBars3DShader, tags: ['fft', '3d', 'bars'] },
    { name: 'circularSpectrumV2', factory: QingluanShaders.createCircularSpectrumV2Shader, tags: ['fft', 'circular', 'polar'] },
    { name: 'particleSystem', factory: QingluanShaders.createParticleSystemShader, tags: ['particle', 'billboard', 'pointsprite'] },
    { name: 'waveformGrid', factory: QingluanShaders.createWaveformGridShader, tags: ['waveform', 'grid', '3d'] },
    { name: 'audioFractal', factory: QingluanShaders.createAudioFractalShader, tags: ['fractal', 'julia', 'math'] },
    { name: 'noiseTerrainAdvanced', factory: QingluanShaders.createNoiseTerrainAdvancedShader, tags: ['terrain', 'simplex', 'fbm'] },
    { name: 'liquidSimulation', factory: QingluanShaders.createLiquidSimulationShader, tags: ['fluid', 'navier-stokes', 'simulation'] },
    { name: 'rayMarchingScene', factory: QingluanShaders.createRayMarchingSceneShader, tags: ['raymarching', '3d', 'sdf'] },
    { name: 'hologramProjection', factory: QingluanShaders.createHologramProjectionShader, tags: ['sci-fi', 'hologram', 'fresnel'] },
    { name: 'glitchArt', factory: QingluanShaders.createGlitchArtShader, tags: ['glitch', 'digital', 'distortion'] },
    { name: 'retroCRT', factory: QingluanShaders.createRetroCRTShader, tags: ['crt', 'retro', 'scanline'] },
    { name: 'scanlineStripe', factory: QingluanShaders.createScanlineStripeShader, tags: ['scanline', 'stripe', 'pattern'] },
    { name: 'bloomPostProcess', factory: QingluanShaders.createBloomPostProcessShader, tags: ['postprocess', 'bloom', 'glow'] },
    { name: 'chromaticAberration', factory: QingluanShaders.createChromaticAberrationShader, tags: ['postprocess', 'chromatic', 'lens'] },
    { name: 'waterRipple', factory: QingluanShaders.createWaterRippleShader, tags: ['water', 'ripple', 'caustic'] },
    { name: 'starfieldNebula', factory: QingluanShaders.createStarfieldNebulaShader, tags: ['space', 'nebula', 'stars'] },
    { name: 'firePlasma', factory: QingluanShaders.createFirePlasmaShader, tags: ['fire', 'plasma', 'temperature'] },
    { name: 'crystalPrism', factory: QingluanShaders.createCrystalPrismShader, tags: ['crystal', 'prism', 'dispersion'] },
    { name: 'spectrumTextureMapping', factory: QingluanShaders.createSpectrumTextureMappingShader, tags: ['fft', 'texture', 'lut'] },
    { name: 'multiChannelMixer', factory: QingluanShaders.createMultiChannelAudioMixerShader, tags: ['mixer', 'multichannel', 'composite'] }
  ];
  registry.forEach(({ name, factory, tags }) => shaderLibrary.register(name, factory, tags));
}
_registerBuiltinShaders();

/**
 * ShaderDebugger — 着色器调试工具
 * 捕获编译错误、性能计时与 uniform 状态快照
 */
export class ShaderDebugger {
  logs = [];
  timings = new Map();
  enabled = true;

  log(type, message, details = {}) {
    if (!this.enabled) return;
    const entry = { type, message, details, timestamp: performance.now() };
    this.logs.push(entry);
    if (type === 'error') console.error('[ShaderDebugger]', message, details);
    else if (type === 'warn') console.warn('[ShaderDebugger]', message, details);
    else console.log('[ShaderDebugger]', message, details);
  }

  timeStart(label) {
    if (!this.enabled) return;
    this.timings.set(label, performance.now());
  }

  timeEnd(label) {
    if (!this.enabled) return;
    const start = this.timings.get(label);
    if (start !== undefined) {
      const elapsed = performance.now() - start;
      this.log('timing', `${label}: ${elapsed.toFixed(2)}ms`);
      this.timings.delete(label);
    }
  }

  snapshotUniforms(shaderProgram) {
    if (!this.enabled) return;
    const snapshot = {};
    shaderProgram.uniforms.forEach((loc, name) => {
      snapshot[name] = loc !== null ? 'active' : 'missing';
    });
    this.log('snapshot', 'Uniform 状态快照', snapshot);
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.timings.clear();
  }
}

export const shaderDebugger = new ShaderDebugger();

// ============================================================================
// 追加：WebGL 能力检测与工具函数
// ============================================================================

/**
 * 检测当前环境的 WebGL 能力
 * @param {WebGLRenderingContext} gl
 * @returns {Object}
 */
export function detectWebGLCapabilities(gl) {
  const isWebGL2 = gl instanceof WebGL2RenderingContext;
  const params = [
    'MAX_TEXTURE_SIZE', 'MAX_VIEWPORT_DIMS', 'MAX_VERTEX_ATTRIBS',
    'MAX_VERTEX_UNIFORM_VECTORS', 'MAX_FRAGMENT_UNIFORM_VECTORS',
    'MAX_TEXTURE_IMAGE_UNITS', 'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
    'MAX_RENDERBUFFER_SIZE', 'MAX_CUBE_MAP_TEXTURE_SIZE',
    'MAX_COMBINED_TEXTURE_IMAGE_UNITS'
  ];
  if (isWebGL2) {
    params.push('MAX_3D_TEXTURE_SIZE', 'MAX_ARRAY_TEXTURE_LAYERS', 'MAX_COLOR_ATTACHMENTS');
  }
  const caps = { isWebGL2, params: {} };
  params.forEach(p => {
    caps.params[p] = gl.getParameter(gl[p]);
  });
  caps.extensions = gl.getSupportedExtensions();
  caps.precisionFormats = {
    vertex: gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT),
    fragment: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
  };
  return caps;
}

/**
 * 检查 WebGL 扩展是否可用
 * @param {WebGLRenderingContext} gl
 * @param {string} extName
 * @returns {Object|null}
 */
export function getWebGLExtension(gl, extName) {
  const ext = gl.getExtension(extName) || (gl.getExtension && gl.getExtension('WEBGL_' + extName));
  return ext || null;
}

/**
 * 生成全屏四边形顶点数据（带 UV）
 * @returns {Float32Array}
 */
export function createFullscreenQuadUV() {
  return new Float32Array([
    -1, -1, 0, 0,
     3, -1, 2, 0,
    -1,  3, 0, 2
  ]);
}

/**
 * 创建并配置帧缓冲纹理
 * @param {WebGLRenderingContext} gl
 * @param {number} width
 * @param {number} height
 * @param {number} [internalFormat]
 * @param {number} [format]
 * @param {number} [type]
 * @returns {WebGLTexture}
 */
export function createFBOTexture(gl, width, height, internalFormat, format, type) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0,
    internalFormat || gl.RGBA,
    width, height, 0,
    format || gl.RGBA,
    type || gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/**
 * 矩阵运算辅助（简化版，用于着色器 uniform 准备）
 */
export const Mat4 = {
  create() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  },
  perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  },
  lookAt(out, eye, center, up) {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    const eyex = eye[0], eyey = eye[1], eyez = eye[2];
    const upx = up[0], upy = up[1], upz = up[2];
    const centerx = center[0], centery = center[1], centerz = center[2];
    z0 = eyex - centerx; z1 = eyey - centery; z2 = eyez - centerz;
    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len; z1 *= len; z2 *= len;
    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) { x0 = 0; x1 = 0; x2 = 0; }
    else { len = 1 / len; x0 *= len; x1 *= len; x2 *= len; }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
  },
  multiply(out, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }
};

/**
 * 颜色空间转换工具
 */
export const ColorUtils = {
  rgbToHsv(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) { h = 0; }
    else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, v];
  },
  hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [r, g, b];
  },
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
  },
  rgbToHex(r, g, b) {
    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  },
  lerpColor(a, b, t) {
    return a.map((c, i) => c + (b[i] - c) * t);
  }
};

/**
 * 音频特征提取工具
 * 从 AnalyserNode 数据中提取更多特征供着色器使用
 */
export class AudioFeatureExtractor {
  fftData = new Float32Array(128);
  waveformData = new Float32Array(128);
  features = {
    centroid: 0, spread: 0, flux: 0, rolloff: 0,
    zeroCrossings: 0, rms: 0, crestFactor: 0
  };
  prevFFT = new Float32Array(128);

  update(analyser) {
    const fftSize = analyser.frequencyBinCount;
    if (this.fftData.length !== fftSize) {
      this.fftData = new Float32Array(fftSize);
      this.waveformData = new Float32Array(fftSize);
      this.prevFFT = new Float32Array(fftSize);
    }
    analyser.getFloatFrequencyData(this.fftData);
    analyser.getFloatTimeDomainData(this.waveformData);

    // 归一化 FFT
    for (let i = 0; i < fftSize; i++) {
      this.fftData[i] = Math.max(0, (this.fftData[i] + 100) / 100);
    }

    this._computeCentroid(fftSize);
    this._computeSpread(fftSize);
    this._computeFlux(fftSize);
    this._computeRolloff(fftSize);
    this._computeZeroCrossings();
    this._computeRMS();

    this.prevFFT.set(this.fftData);
  }

  _computeCentroid(n) {
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += i * this.fftData[i];
      den += this.fftData[i];
    }
    this.features.centroid = den > 0 ? num / den : 0;
  }

  _computeSpread(n) {
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      const diff = i - this.features.centroid;
      num += diff * diff * this.fftData[i];
      den += this.fftData[i];
    }
    this.features.spread = den > 0 ? Math.sqrt(num / den) : 0;
  }

  _computeFlux(n) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const diff = this.fftData[i] - this.prevFFT[i];
      sum += diff > 0 ? diff : 0;
    }
    this.features.flux = sum;
  }

  _computeRolloff(n) {
    let total = 0;
    for (let i = 0; i < n; i++) total += this.fftData[i];
    let cumsum = 0;
    for (let i = 0; i < n; i++) {
      cumsum += this.fftData[i];
      if (cumsum >= total * 0.85) {
        this.features.rolloff = i / n;
        return;
      }
    }
    this.features.rolloff = 1;
  }

  _computeZeroCrossings() {
    let zc = 0;
    for (let i = 1; i < this.waveformData.length; i++) {
      if ((this.waveformData[i] >= 0) !== (this.waveformData[i - 1] >= 0)) zc++;
    }
    this.features.zeroCrossings = zc / this.waveformData.length;
  }

  _computeRMS() {
    let sum = 0;
    for (let i = 0; i < this.waveformData.length; i++) {
      sum += this.waveformData[i] * this.waveformData[i];
    }
    this.features.rms = Math.sqrt(sum / this.waveformData.length);
    const peak = Math.max(...this.waveformData.map(Math.abs));
    this.features.crestFactor = this.features.rms > 0 ? peak / this.features.rms : 0;
  }

  getFeatures() {
    return { ...this.features };
  }

  bindToShader(shaderProgram, prefix = 'u_audio') {
    shaderProgram.setFloat(`${prefix}_centroid`, this.features.centroid / 128);
    shaderProgram.setFloat(`${prefix}_spread`, this.features.spread / 128);
    shaderProgram.setFloat(`${prefix}_flux`, Math.min(this.features.flux, 1));
    shaderProgram.setFloat(`${prefix}_rolloff`, this.features.rolloff);
    shaderProgram.setFloat(`${prefix}_zeroCrossings`, this.features.zeroCrossings);
    shaderProgram.setFloat(`${prefix}_rms`, this.features.rms);
    shaderProgram.setFloat(`${prefix}_crestFactor`, Math.min(this.features.crestFactor, 10));
  }
}

/**
 * 动画缓动函数集合
 */
export const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  easeInBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: t => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  easeOutBounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    else return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

/**
 * 动画值插值器
 */
export class ValueAnimator {
  startValue;
  endValue;
  duration;
  easing;
  startTime;
  onUpdate;
  onComplete;
  running = false;

  constructor(config) {
    this.startValue = config.startValue ?? 0;
    this.endValue = config.endValue ?? 1;
    this.duration = config.duration ?? 1000;
    this.easing = config.easing ?? Easing.easeInOutQuad;
    this.onUpdate = config.onUpdate || (() => {});
    this.onComplete = config.onComplete || (() => {});
  }

  start() {
    this.startTime = performance.now();
    this.running = true;
    this._tick();
  }

  _tick() {
    if (!this.running) return;
    const now = performance.now();
    const elapsed = now - this.startTime;
    let t = Math.min(elapsed / this.duration, 1);
    t = this.easing(t);
    const value = this.startValue + (this.endValue - this.startValue) * t;
    this.onUpdate(value);
    if (t < 1) {
      requestAnimationFrame(() => this._tick());
    } else {
      this.running = false;
      this.onComplete();
    }
  }

  stop() {
    this.running = false;
  }
}

/**
 * 音频反应性缓动器
 * 将音频能量映射为动画参数
 */
export class AudioReactiveEaser {
  current = 0;
  target = 0;
  smoothFactor = 0.1;

  constructor(smoothFactor = 0.1) {
    this.smoothFactor = smoothFactor;
  }

  update(audioValue) {
    this.target = audioValue;
    this.current += (this.target - this.current) * this.smoothFactor;
    return this.current;
  }

  get() {
    return this.current;
  }

  reset(value = 0) {
    this.current = value;
    this.target = value;
  }
}

/**
 * 着色器预设管理器
 * 保存与加载着色器 uniform 的预设值
 */
export class ShaderPresetManager {
  presets = new Map();

  save(name, uniforms) {
    this.presets.set(name, JSON.parse(JSON.stringify(uniforms)));
  }

  load(name) {
    const p = this.presets.get(name);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  apply(shaderProgram, name) {
    const uniforms = this.load(name);
    if (!uniforms) return false;
    Object.entries(uniforms).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 2) shaderProgram.setVec2(key, value[0], value[1]);
        else if (value.length === 3) shaderProgram.setVec3(key, value[0], value[1], value[2]);
        else if (value.length === 4) shaderProgram.setVec4(key, value[0], value[1], value[2], value[3]);
        else shaderProgram.setFloatArray(key, value);
      } else if (typeof value === 'number') {
        shaderProgram.setFloat(key, value);
      }
    });
    return true;
  }

  list() {
    return Array.from(this.presets.keys());
  }

  exportJSON() {
    const obj = {};
    this.presets.forEach((v, k) => obj[k] = v);
    return JSON.stringify(obj, null, 2);
  }

  importJSON(json) {
    try {
      const data = JSON.parse(json);
      Object.entries(data).forEach(([k, v]) => this.presets.set(k, v));
      return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * 时间同步工具
 * 用于将着色器动画与音频播放位置同步
 */
export class TimeSync {
  audioElement;
  offset = 0;
  speed = 1;

  constructor(audioElement) {
    this.audioElement = audioElement;
  }

  getTime() {
    if (!this.audioElement) return performance.now() / 1000;
    return this.audioElement.currentTime + this.offset;
  }

  getBeatTime(bpm) {
    const t = this.getTime();
    return (t * bpm / 60) % 1;
  }

  setOffset(offset) {
    this.offset = offset;
  }

  setSpeed(speed) {
    this.speed = speed;
  }
}

/**
 * 额外导出：所有类与工具的聚合导出
 */
export {
  ShaderProgram,
  AudioToShaderBridge,
  PostProcessor,
  ShaderRenderer,
  PingPongFBO,
  EffectComposer,
  BasePass,
  BloomPass,
  VignettePass,
  ToneMappingPass,
  ShaderLibrary,
  ShaderDebugger,
  AudioFeatureExtractor,
  ValueAnimator,
  AudioReactiveEaser,
  ShaderPresetManager,
  TimeSync,
  Easing,
  Mat4,
  ColorUtils,
  resizeCanvasToDisplaySize,
  createAudioTexture,
  updateAudioTexture,
  drawFullscreenQuad,
  detectWebGLCapabilities,
  getWebGLExtension,
  createFullscreenQuadUV,
  createFBOTexture
};

// ============================================================================
// 版本与元数据
// ============================================================================

export const QINGLUAN_SHADERS_VERSION = '2.0.0';
export const QINGLUAN_SHADERS_BUILD_DATE = '2026-07-24';
export const QINGLUAN_SHADERS_AUTHOR = 'Qingluan Audio Workstation';

// ============================================================================
// 模块就绪标记
// ============================================================================

if (typeof window !== 'undefined') {
  window.QingluanShaders = QingluanShaders;
  window.QINGLUAN_SHADERS_VERSION = QINGLUAN_SHADERS_VERSION;
}

// ============================================================================
// 追加：音频纹理池与上下文管理
// ============================================================================

/**
 * AudioTexturePool — 音频纹理对象池
 * 避免每帧创建/销毁纹理，提升性能
 */
export class AudioTexturePool {
  gl;
  pool = [];
  maxSize = 8;
  active = new Map();

  constructor(gl, maxSize = 8) {
    this.gl = gl;
    this.maxSize = maxSize;
  }

  acquire(width = 128) {
    if (this.pool.length > 0) {
      const tex = this.pool.pop();
      this.active.set(tex, { width, acquiredAt: performance.now() });
      return tex;
    }
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, 1, 0, gl.LUMINANCE, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.active.set(tex, { width, acquiredAt: performance.now() });
    return tex;
  }

  release(texture) {
    if (!this.active.has(texture)) return;
    this.active.delete(texture);
    if (this.pool.length < this.maxSize) {
      this.pool.push(texture);
    } else {
      this.gl.deleteTexture(texture);
    }
  }

  update(texture, data, width = 128) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, 1, gl.LUMINANCE, gl.FLOAT, data);
  }

  destroy() {
    this.pool.forEach(t => this.gl.deleteTexture(t));
    this.active.forEach((_, t) => this.gl.deleteTexture(t));
    this.pool = [];
    this.active.clear();
  }
}

/**
 * GLContextManager — WebGL 上下文生命周期管理
 * 处理上下文丢失/恢复、多画布协调
 */
export class GLContextManager {
  contexts = new Map();
  handlers = new Map();

  register(canvas, options = {}) {
    const gl = QingluanShaders.initWebGL(canvas);
    if (!gl) return null;
    const id = Math.random().toString(36).slice(2);
    this.contexts.set(id, { canvas, gl, options });
    const onLost = (e) => {
      e.preventDefault();
      if (this.handlers.has(id)) {
        this.handlers.get(id).onLost?.(gl, canvas);
      }
    };
    const onRestored = () => {
      const newGl = QingluanShaders.initWebGL(canvas);
      this.contexts.get(id).gl = newGl;
      if (this.handlers.has(id)) {
        this.handlers.get(id).onRestored?.(newGl, canvas);
      }
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return { id, gl };
  }

  unregister(id) {
    const entry = this.contexts.get(id);
    if (entry) {
      entry.canvas.removeEventListener('webglcontextlost', entry.onLost);
      entry.canvas.removeEventListener('webglcontextrestored', entry.onRestored);
      this.contexts.delete(id);
      this.handlers.delete(id);
    }
  }

  setHandlers(id, handlers) {
    this.handlers.set(id, handlers);
  }

  get(id) {
    return this.contexts.get(id)?.gl || null;
  }

  list() {
    return Array.from(this.contexts.keys());
  }
}

/**
 * 预设 uniform 配置集合
 * 为各类效果提供开箱即用的参数预设
 */
export const ShaderPresets = {
  spectrumBars: {
    'u_time': 0,
    'u_resolution': [1920, 1080],
    'u_audio_loudness': 0.5,
    'u_audio_bass': 0.3,
    'u_audio_mid': 0.4,
    'u_audio_treble': 0.2
  },
  particleExplosion: {
    'u_time': 0,
    'u_resolution': [1920, 1080],
    'u_audio_loudness': 0.8,
    'u_audio_bass': 0.6,
    'u_audio_mid': 0.5,
    'u_audio_treble': 0.7
  },
  deepSpace: {
    'u_time': 0,
    'u_resolution': [1920, 1080],
    'u_audio_loudness': 0.3,
    'u_audio_bass': 0.5,
    'u_audio_mid': 0.2,
    'u_audio_treble': 0.1
  },
  underwater: {
    'u_time': 0,
    'u_resolution': [1920, 1080],
    'u_audio_loudness': 0.4,
    'u_audio_bass': 0.7,
    'u_audio_mid': 0.3,
    'u_audio_treble': 0.15
  },
  cyberGrid: {
    'u_time': 0,
    'u_resolution': [1920, 1080],
    'u_audio_loudness': 0.6,
    'u_audio_bass': 0.4,
    'u_audio_mid': 0.5,
    'u_audio_treble': 0.8
  }
};

/**
 * 预设加载器：将预设批量应用到 ShaderProgram
 * @param {ShaderProgram} shader
 * @param {string} presetName
 */
export function applyShaderPreset(shader, presetName) {
  const preset = ShaderPresets[presetName];
  if (!preset) {
    console.warn(`[Shaders] 未找到预设: ${presetName}`);
    return false;
  }
  Object.entries(preset).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 2) shader.setVec2(key, value[0], value[1]);
      else if (value.length === 3) shader.setVec3(key, value[0], value[1], value[2]);
      else if (value.length === 4) shader.setVec4(key, value[0], value[1], value[2], value[3]);
      else shader.setFloatArray(key, value);
    } else {
      shader.setFloat(key, value);
    }
  });
  return true;
}

/**
 * 批量 uniform 设置器
 * @param {ShaderProgram} shader
 * @param {Object} uniforms
 */
export function setUniformsBulk(shader, uniforms) {
  Object.entries(uniforms).forEach(([key, value]) => {
    if (typeof value === 'number') {
      shader.setFloat(key, value);
    } else if (Array.isArray(value) || value instanceof Float32Array) {
      const len = value.length;
      if (len === 1) shader.setFloat(key, value[0]);
      else if (len === 2) shader.setVec2(key, value[0], value[1]);
      else if (len === 3) shader.setVec3(key, value[0], value[1], value[2]);
      else if (len === 4) shader.setVec4(key, value[0], value[1], value[2], value[3]);
      else shader.setFloatArray(key, value);
    }
  });
}

/**
 * 生成平滑的 FFT 插值数据
 * 将原始 FFT 数据插值为更高分辨率曲线
 * @param {Float32Array} fftData
 * @param {number} outputSize
 * @returns {Float32Array}
 */
export function interpolateFFT(fftData, outputSize = 512) {
  const inputSize = fftData.length;
  const result = new Float32Array(outputSize);
  for (let i = 0; i < outputSize; i++) {
    const t = (i / (outputSize - 1)) * (inputSize - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(i0 + 1, inputSize - 1);
    const f = t - i0;
    result[i] = fftData[i0] * (1 - f) + fftData[i1] * f;
  }
  return result;
}

/**
 * 计算波形对称性（奇偶谐波比）
 * @param {Float32Array} waveform
 * @returns {number} 0-1，越接近1越对称
 */
export function computeWaveformSymmetry(waveform) {
  const n = waveform.length;
  let evenSum = 0;
  let oddSum = 0;
  for (let i = 0; i < n / 2; i++) {
    evenSum += Math.abs(waveform[i] + waveform[n - 1 - i]);
    oddSum += Math.abs(waveform[i] - waveform[n - 1 - i]);
  }
  const total = evenSum + oddSum;
  return total > 0 ? evenSum / total : 0.5;
}

/**
 * 计算瞬时频率估计（基于过零率）
 * @param {Float32Array} waveform
 * @param {number} sampleRate
 * @returns {number}
 */
export function estimateInstantFrequency(waveform, sampleRate = 44100) {
  let crossings = 0;
  for (let i = 1; i < waveform.length; i++) {
    if ((waveform[i] >= 0) !== (waveform[i - 1] >= 0)) crossings++;
  }
  const duration = waveform.length / sampleRate;
  return (crossings / 2) / duration;
}

/**
 * 动态范围压缩器（用于音频可视化）
 * 将宽动态范围映射到 0-1，增强弱信号可见性
 * @param {Float32Array} data
 * @param {number} threshold
 * @param {number} ratio
 * @returns {Float32Array}
 */
export function compressDynamicRange(data, threshold = 0.3, ratio = 4.0) {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const over = Math.max(0, data[i] - threshold);
    out[i] = Math.min(1, data[i] - over * (1 - 1 / ratio));
  }
  return out;
}

/**
 * 频谱平滑器（移动平均）
 * @param {Float32Array} fftData
 * @param {number} windowSize
 * @returns {Float32Array}
 */
export function smoothSpectrum(fftData, windowSize = 3) {
  const result = new Float32Array(fftData.length);
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < fftData.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -half; j <= half; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < fftData.length) {
        sum += fftData[idx];
        count++;
      }
    }
    result[i] = sum / count;
  }
  return result;
}

/**
 * 对数频谱重采样
 * 将线性频谱转为对数坐标，更符合人耳感知
 * @param {Float32Array} fftData
 * @param {number} bands
 * @returns {Float32Array}
 */
export function logResampleSpectrum(fftData, bands = 64) {
  const result = new Float32Array(bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const logT = Math.log(1.0 + t * 9.0) / Math.log(10.0);
    const idx = logT * (fftData.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, fftData.length - 1);
    const f = idx - i0;
    result[i] = fftData[i0] * (1 - f) + fftData[i1] * f;
  }
  return result;
}

/**
 * 音频情绪分类器（简化版）
 * 基于频谱特征推断情绪标签
 * @param {Float32Array} fftData
 * @param {Object} features
 * @returns {string}
 */
export function classifyAudioMood(fftData, features) {
  const bass = fftData.slice(0, Math.floor(fftData.length * 0.1)).reduce((a, b) => a + b, 0);
  const treble = fftData.slice(Math.floor(fftData.length * 0.5)).reduce((a, b) => a + b, 0);
  const centroid = features?.centroid || 64;
  if (bass > treble * 2 && centroid < 30) return 'energetic';
  if (treble > bass && centroid > 80) return 'bright';
  if (features?.flux > 0.5) return 'chaotic';
  if (features?.rms < 0.1) return 'calm';
  return 'balanced';
}

/**
 * 生成着色器 uniform 的动画关键帧序列
 * @param {Object} keyframes - { 0.0: { uniform: value }, 0.5: {...}, 1.0: {...} }
 * @param {number} t - 0-1 时间
 * @returns {Object}
 */
export function interpolateKeyframes(keyframes, t) {
  const times = Object.keys(keyframes).map(Number).sort((a, b) => a - b);
  if (t <= times[0]) return keyframes[times[0]];
  if (t >= times[times.length - 1]) return keyframes[times[times.length - 1]];
  let i = 0;
  while (i < times.length - 1 && times[i + 1] < t) i++;
  const t0 = times[i];
  const t1 = times[i + 1];
  const localT = (t - t0) / (t1 - t0);
  const a = keyframes[t0];
  const b = keyframes[t1];
  const result = {};
  Object.keys(a).forEach(k => {
    const va = a[k];
    const vb = b[k];
    if (typeof va === 'number' && typeof vb === 'number') {
      result[k] = va + (vb - va) * localT;
    } else if (Array.isArray(va) && Array.isArray(vb)) {
      result[k] = va.map((v, i) => v + (vb[i] - v) * localT);
    } else {
      result[k] = localT < 0.5 ? va : vb;
    }
  });
  return result;
}

/**
 * 音频数据历史环形缓冲区
 * 用于需要多帧历史数据的效果（如频谱瀑布、回声）
 */
export class AudioHistoryBuffer {
  size;
  history = [];
  index = 0;

  constructor(size = 60) {
    this.size = size;
  }

  push(data) {
    if (this.history.length < this.size) {
      this.history.push(new Float32Array(data));
    } else {
      this.history[this.index].set(data);
      this.index = (this.index + 1) % this.size;
    }
  }

  get(offset = 0) {
    const idx = (this.index - 1 - offset + this.size) % this.size;
    return this.history[idx] || null;
  }

  getAll() {
    const result = [];
    for (let i = 0; i < this.history.length; i++) {
      const idx = (this.index - 1 - i + this.size) % this.size;
      result.push(this.history[idx]);
    }
    return result;
  }

  clear() {
    this.history = [];
    this.index = 0;
  }
}

/**
 * 画布截图工具
 * @param {HTMLCanvasElement} canvas
 * @param {string} type
 * @param {number} quality
 * @returns {string}
 */
export function captureCanvasSnapshot(canvas, type = 'image/png', quality = 0.95) {
  return canvas.toDataURL(type, quality);
}

/**
 * 将 Float32Array 转为 ImageData（用于 CPU 侧可视化）
 * @param {Float32Array} data
 * @param {number} width
 * @param {number} height
 * @returns {ImageData}
 */
export function floatArrayToImageData(data, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  for (let i = 0; i < data.length && i < width * height; i++) {
    const v = Math.min(255, Math.max(0, Math.floor(data[i] * 255)));
    imgData.data[i * 4] = v;
    imgData.data[i * 4 + 1] = v;
    imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }
  return imgData;
}

/**
 * 性能监视器
 * 简单封装 requestAnimationFrame 计时
 */
export class PerformanceMonitor {
  frames = 0;
  lastTime = 0;
  fps = 0;
  ms = 0;
  history = [];
  maxHistory = 120;

  tick() {
    const now = performance.now();
    this.frames++;
    if (now >= this.lastTime + 1000) {
      this.fps = this.frames;
      this.ms = (now - this.lastTime) / this.frames;
      this.frames = 0;
      this.lastTime = now;
      this.history.push({ fps: this.fps, ms: this.ms, time: now });
      if (this.history.length > this.maxHistory) this.history.shift();
    }
  }

  getFPS() {
    return this.fps;
  }

  getMS() {
    return this.ms;
  }

  getAverageFPS() {
    if (this.history.length === 0) return 0;
    return this.history.reduce((a, b) => a + b.fps, 0) / this.history.length;
  }

  reset() {
    this.frames = 0;
    this.lastTime = performance.now();
    this.history = [];
  }
}

/**
 * 鼠标/触摸交互桥接
 * 将指针位置映射到着色器 uniform
 */
export class PointerBridge {
  x = 0.5;
  y = 0.5;
  isDown = false;
  listeners = [];

  constructor(target = window) {
    this.target = target;
    this._onMove = (e) => {
      if (e.target instanceof HTMLCanvasElement) {
        const rect = e.target.getBoundingClientRect();
        this.x = (e.clientX - rect.left) / rect.width;
        this.y = 1.0 - (e.clientY - rect.top) / rect.height;
      } else {
        this.x = e.clientX / window.innerWidth;
        this.y = 1.0 - e.clientY / window.innerHeight;
      }
    };
    this._onDown = () => { this.isDown = true; };
    this._onUp = () => { this.isDown = false; };
    target.addEventListener('mousemove', this._onMove);
    target.addEventListener('mousedown', this._onDown);
    target.addEventListener('mouseup', this._onUp);
    target.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) this._onMove(e.touches[0]);
    }, { passive: true });
    target.addEventListener('touchstart', this._onDown, { passive: true });
    target.addEventListener('touchend', this._onUp);
  }

  bindToShader(shaderProgram, prefix = 'u_pointer') {
    shaderProgram.setVec2(`${prefix}_xy`, this.x, this.y);
    shaderProgram.setFloat(`${prefix}_down`, this.isDown ? 1.0 : 0.0);
  }

  destroy() {
    this.target.removeEventListener('mousemove', this._onMove);
    this.target.removeEventListener('mousedown', this._onDown);
    this.target.removeEventListener('mouseup', this._onUp);
  }
}

// ============================================================================
// 追加：默认常量与配置
// ============================================================================

export const DEFAULT_FFT_SIZE = 128;
export const DEFAULT_WAVEFORM_SIZE = 128;
export const DEFAULT_CANVAS_WIDTH = 1920;
export const DEFAULT_CANVAS_HEIGHT = 1080;
export const MAX_UNIFORM_ARRAY_SIZE = 128;
export const MAX_POSTPROCESS_PASSES = 8;

export const ShaderEffectNames = {
  SPECTRUM: 'spectrum',
  WAVEFORM: 'waveform',
  PARTICLE: 'particle',
  FRACTAL: 'fractal',
  TERRAIN: 'terrain',
  NEURAL: 'neural',
  GALAXY: 'galaxy',
  FLUID: 'fluid',
  MATRIX: 'matrix',
  FIRE: 'fire',
  AURORA: 'aurora',
  WATER: 'water',
  HOLOGRAM: 'hologram',
  QUANTUM: 'quantum',
  CIRCULAR_SPECTRUM: 'circularSpectrum',
  SPECTRUM_BARS_3D: 'spectrumBars3D',
  CIRCULAR_SPECTRUM_V2: 'circularSpectrumV2',
  PARTICLE_SYSTEM: 'particleSystem',
  WAVEFORM_GRID: 'waveformGrid',
  AUDIO_FRACTAL: 'audioFractal',
  NOISE_TERRAIN_ADVANCED: 'noiseTerrainAdvanced',
  LIQUID_SIMULATION: 'liquidSimulation',
  RAY_MARCHING_SCENE: 'rayMarchingScene',
  HOLOGRAM_PROJECTION: 'hologramProjection',
  GLITCH_ART: 'glitchArt',
  RETRO_CRT: 'retroCRT',
  SCANLINE_STRIPE: 'scanlineStripe',
  BLOOM_POSTPROCESS: 'bloomPostProcess',
  CHROMATIC_ABERRATION: 'chromaticAberration',
  WATER_RIPPLE: 'waterRipple',
  STARFIELD_NEBULA: 'starfieldNebula',
  FIRE_PLASMA: 'firePlasma',
  CRYSTAL_PRISM: 'crystalPrism',
  SPECTRUM_TEXTURE_MAPPING: 'spectrumTextureMapping',
  MULTI_CHANNEL_MIXER: 'multiChannelMixer'
};

export const ShaderEffectTags = {
  FFT: 'fft',
  WAVEFORM: 'waveform',
  PARTICLE: 'particle',
  RAYMARCHING: 'raymarching',
  NOISE: 'noise',
  TERRAIN: 'terrain',
  SPACE: 'space',
  FLUID: 'fluid',
  RETRO: 'retro',
  CYBER: 'cyber',
  NATURE: 'nature',
  FIRE: 'fire',
  WATER: 'water',
  POSTPROCESS: 'postprocess',
  SCI_FI: 'sci-fi',
  FRACTAL: 'fractal',
  ABSTRACT: 'abstract'
};

// ============================================================================
// 追加：类型别名与再导出（确保兼容性）
// ============================================================================

export const ShaderFactory = QingluanShaders;
export const AudioBridge = AudioToShaderBridge;
export const FeatureExtractor = AudioFeatureExtractor;
export const PresetManager = ShaderPresetManager;

/**
 * 快速创建渲染器的工厂函数
 * @param {HTMLCanvasElement} canvas
 * @param {string} effectName
 * @param {AudioToShaderBridge} bridge
 * @returns {ShaderRenderer}
 */
export function createQuickRenderer(canvas, effectName, bridge = null) {
  const gl = QingluanShaders.initWebGL(canvas);
  if (!gl) throw new Error('WebGL 初始化失败');
  const shader = shaderLibrary.create(effectName, gl);
  return new ShaderRenderer(canvas, shader, bridge);
}

/**
 * 快速后处理管线构建器
 * @param {WebGLRenderingContext} gl
 * @param {number} width
 * @param {number} height
 * @returns {EffectComposer}
 */
export function createQuickPostPipeline(gl, width, height) {
  return new EffectComposer(gl, width, height)
    .addPass(new BloomPass(4, 0.6))
    .addPass(new ToneMappingPass(1.2, 2.2))
    .addPass(new VignettePass(0.4, 0.7));
}

// ============================================================================
// 追加：高级着色器工具函数与扩展预设
// ============================================================================

/**
 * 生成伪随机噪声纹理数据
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function generateNoiseTextureData(width = 256, height = 256) {
  const size = width * height * 4;
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i += 4) {
    const v = Math.random() * 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  return data;
}

/**
 * 上传噪声纹理到 GPU
 * @param {WebGLRenderingContext} gl
 * @param {Uint8Array} data
 * @param {number} width
 * @param {number} height
 * @returns {WebGLTexture}
 */
export function uploadNoiseTexture(gl, data, width = 256, height = 256) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

/**
 * 计算音频 BPM 的简易估计器
 * @param {Float32Array} timeDomainData
 * @param {number} sampleRate
 * @returns {number}
 */
export function estimateBPM(timeDomainData, sampleRate = 44100) {
  const len = timeDomainData.length;
  let peaks = 0;
  let lastPeak = -1;
  const threshold = 0.15;
  for (let i = 1; i < len - 1; i++) {
    if (timeDomainData[i] > threshold && timeDomainData[i] > timeDomainData[i - 1] && timeDomainData[i] > timeDomainData[i + 1]) {
      if (lastPeak < 0 || (i - lastPeak) > sampleRate * 0.2) {
        peaks++;
        lastPeak = i;
      }
    }
  }
  const duration = len / sampleRate;
  const bpm = (peaks / duration) * 60;
  return Math.min(Math.max(bpm, 60), 200);
}

/**
 * 频谱质心计算（亮度指标）
 * @param {Float32Array} fftData
 * @param {number} sampleRate
 * @returns {number}
 */
export function spectralCentroid(fftData, sampleRate = 44100) {
  let num = 0;
  let den = 0;
  const binFreq = sampleRate / 2 / fftData.length;
  for (let i = 0; i < fftData.length; i++) {
    const amp = fftData[i];
    const freq = i * binFreq;
    num += freq * amp;
    den += amp;
  }
  return den > 0 ? num / den : 0;
}

/**
 * 频谱平坦度计算（用于区分噪音与 tonal 声音）
 * @param {Float32Array} fftData
 * @returns {number}
 */
export function spectralFlatness(fftData) {
  let geo = 0;
  let arith = 0;
  const n = fftData.length;
  for (let i = 0; i < n; i++) {
    const v = Math.max(fftData[i], 1e-10);
    geo += Math.log(v);
    arith += v;
  }
  geo = Math.exp(geo / n);
  arith = arith / n;
  return arith > 0 ? geo / arith : 0;
}

/**
 * 频谱滚降点计算
 * @param {Float32Array} fftData
 * @returns {number} 归一化滚降点 [0,1]
 */
export function spectralRolloff(fftData) {
  const total = fftData.reduce((a, b) => a + b, 0);
  const threshold = total * 0.85;
  let sum = 0;
  for (let i = 0; i < fftData.length; i++) {
    sum += fftData[i];
    if (sum >= threshold) return i / fftData.length;
  }
  return 1;
}

/**
 * 零穿越率计算（用于区分语音/音乐）
 * @param {Float32Array} timeDomainData
 * @returns {number}
 */
export function zeroCrossingRate(timeDomainData) {
  let zcr = 0;
  for (let i = 1; i < timeDomainData.length; i++) {
    if ((timeDomainData[i] >= 0) !== (timeDomainData[i - 1] >= 0)) zcr++;
  }
  return zcr / timeDomainData.length;
}

/**
 * 音频能量包络检测器
 */
export class AudioEnvelopeDetector {
  constructor(attackMs = 10, releaseMs = 100, sampleRate = 44100) {
    this.attackCoeff = 1 - Math.exp(-1 / (sampleRate * attackMs / 1000));
    this.releaseCoeff = 1 - Math.exp(-1 / (sampleRate * releaseMs / 1000));
    this.envelope = 0;
  }

  process(sample) {
    const abs = Math.abs(sample);
    const coeff = abs > this.envelope ? this.attackCoeff : this.releaseCoeff;
    this.envelope += coeff * (abs - this.envelope);
    return this.envelope;
  }

  reset() {
    this.envelope = 0;
  }
}

/**
 * 音频瞬态检测器
 */
export class TransientDetector {
  constructor(threshold = 0.3, holdSamples = 1000) {
    this.threshold = threshold;
    this.hold = holdSamples;
    this.cooldown = 0;
    this.lastLevel = 0;
  }

  process(level) {
    if (this.cooldown > 0) this.cooldown--;
    const diff = level - this.lastLevel;
    this.lastLevel = level;
    if (diff > this.threshold && this.cooldown === 0) {
      this.cooldown = this.hold;
      return true;
    }
    return false;
  }
}

/**
 * 多频段能量分析器
 */
export class MultiBandAnalyzer {
  constructor(bands = [{ name: 'sub', low: 0, high: 0.06 }, { name: 'bass', low: 0.06, high: 0.25 }, { name: 'mid', low: 0.25, high: 0.5 }, { name: 'treble', low: 0.5, high: 1.0 }]) {
    this.bands = bands;
    this.energies = {};
    bands.forEach(b => this.energies[b.name] = 0);
  }

  analyze(fftData) {
    const n = fftData.length;
    this.bands.forEach(band => {
      let sum = 0;
      let count = 0;
      const i0 = Math.floor(band.low * n);
      const i1 = Math.floor(band.high * n);
      for (let i = i0; i < i1; i++) {
        sum += fftData[i];
        count++;
      }
      this.energies[band.name] = count > 0 ? sum / count : 0;
    });
    return { ...this.energies };
  }
}

/**
 * 着色器 uniform 缓存（减少重复 uniform 查找）
 */
export class UniformCache {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    this.cache = new Map();
  }

  get(name) {
    if (!this.cache.has(name)) {
      this.cache.set(name, this.gl.getUniformLocation(this.program, name));
    }
    return this.cache.get(name);
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * 顶点属性配置器
 */
export class VertexAttribConfig {
  constructor(gl) {
    this.gl = gl;
    this.attribs = [];
  }

  add(name, size, type, normalized = false, stride = 0, offset = 0) {
    this.attribs.push({ name, size, type, normalized, stride, offset });
    return this;
  }

  apply(program) {
    const gl = this.gl;
    this.attribs.forEach(a => {
      const loc = gl.getAttribLocation(program, a.name);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, a.size, a.type, a.normalized, a.stride, a.offset);
      }
    });
  }
}

/**
 * 渲染状态栈
 */
export class RenderStateStack {
  constructor(gl) {
    this.gl = gl;
    this.stack = [];
  }

  push() {
    const gl = this.gl;
    this.stack.push({
      blend: gl.isEnabled(gl.BLEND),
      depth: gl.isEnabled(gl.DEPTH_TEST),
      cull: gl.isEnabled(gl.CULL_FACE),
      blendSrcRGB: gl.getParameter(gl.BLEND_SRC_RGB),
      blendDstRGB: gl.getParameter(gl.BLEND_DST_RGB),
      blendEq: gl.getParameter(gl.BLEND_EQUATION_RGB),
      viewport: gl.getParameter(gl.VIEWPORT)
    });
  }

  pop() {
    const gl = this.gl;
    const s = this.stack.pop();
    if (!s) return;
    s.blend ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
    s.depth ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
    s.cull ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
    gl.blendFunc(s.blendSrcRGB, s.blendDstRGB);
    gl.blendEquation(s.blendEq);
    gl.viewport(s.viewport[0], s.viewport[1], s.viewport[2], s.viewport[3]);
  }
}

/**
 * 矩阵工具（简化版，用于着色器辅助）
 */
export const Mat4 = {
  identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  },
  perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  },
  lookAt(eye, center, up) {
    const z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
    let len = Math.sqrt(z0*z0 + z1*z1 + z2*z2); if (!len) len = 1;
    const zz0 = z0/len, zz1 = z1/len, zz2 = z2/len;
    const x0 = up[1]*zz2 - up[2]*zz1, x1 = up[2]*zz0 - up[0]*zz2, x2 = up[0]*zz1 - up[1]*zz0;
    len = Math.sqrt(x0*x0 + x1*x1 + x2*x2); if (!len) len = 1;
    const xx0 = x0/len, xx1 = x1/len, xx2 = x2/len;
    const y0 = zz1*xx2 - zz2*xx1, y1 = zz2*xx0 - zz0*xx2, y2 = zz0*xx1 - zz1*xx0;
    return new Float32Array([
      xx0, y0, zz0, 0,
      xx1, y1, zz1, 0,
      xx2, y2, zz2, 0,
      -(xx0*eye[0]+xx1*eye[1]+xx2*eye[2]), -(y0*eye[0]+y1*eye[1]+y2*eye[2]), -(zz0*eye[0]+zz1*eye[1]+zz2*eye[2]), 1
    ]);
  }
};

/**
 * 颜色空间转换工具
 */
export const ColorSpace = {
  rgbToHsv(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, s, v];
  },
  hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: return [v, t, p];
      case 1: return [q, v, p];
      case 2: return [p, v, t];
      case 3: return [p, q, v];
      case 4: return [t, p, v];
      case 5: return [v, p, q];
    }
    return [v, t, p];
  },
  rgbToHex(r, g, b) {
    const toHex = (v) => {
      const hex = Math.round(v * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  },
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
  }
};

/**
 * 着色器编译诊断
 * @param {WebGLRenderingContext} gl
 * @param {WebGLShader} shader
 * @returns {string|null}
 */
export function diagnoseShaderCompilation(gl, shader) {
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
  const log = gl.getShaderInfoLog(shader);
  const type = gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
  return `[${type} SHADER ERROR]\n${log}`;
}

/**
 * 程序链接诊断
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @returns {string|null}
 */
export function diagnoseProgramLinking(gl, program) {
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  return `[PROGRAM LINK ERROR]\n${gl.getProgramInfoLog(program)}`;
}

/**
 * 完整诊断着色器程序
 * @param {WebGLRenderingContext} gl
 * @param {string} vsSource
 * @param {string} fsSource
 * @returns {{program?: WebGLProgram, error?: string}}
 */
export function diagnoseAndCreateProgram(gl, vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  const vsErr = diagnoseShaderCompilation(gl, vs);
  if (vsErr) return { error: vsErr };

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  const fsErr = diagnoseShaderCompilation(gl, fs);
  if (fsErr) return { error: fsErr };

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  const linkErr = diagnoseProgramLinking(gl, prog);
  if (linkErr) return { error: linkErr };

  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return { program: prog };
}

/**
 * 生成全屏四边形顶点数据
 * @returns {Float32Array}
 */
export function fullscreenQuad() {
  return new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
}

/**
 * 生成全屏四边形索引数据
 * @returns {Uint16Array}
 */
export function fullscreenQuadIndices() {
  return new Uint16Array([0, 1, 2, 2, 1, 3]);
}

/**
 * 绑定全屏四边形到当前 VAO/缓冲区
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 */
export function bindFullscreenQuad(gl, program) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, fullscreenQuad(), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_position');
  if (aPos >= 0) {
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  }
}

/**
 * 计算 FFT 频带掩码（用于将任意数量频点映射到着色器 uniform 数组）
 * @param {number} sourceBins
 * @param {number} targetBins
 * @returns {Float32Array} 归一化权重矩阵
 */
export function computeFFTBinMapping(sourceBins, targetBins) {
  const mapping = new Float32Array(targetBins * 2);
  for (let t = 0; t < targetBins; t++) {
    const ratio = t / targetBins;
    const srcIdx = ratio * sourceBins;
    const i0 = Math.floor(srcIdx);
    const i1 = Math.min(i0 + 1, sourceBins - 1);
    const f = srcIdx - i0;
    mapping[t * 2] = i0;
    mapping[t * 2 + 1] = f;
  }
  return mapping;
}

/**
 * 音频数据归一化到 [0,1]
 * @param {Float32Array} data
 * @returns {Float32Array}
 */
export function normalizeAudioData(data) {
  const out = new Float32Array(data.length);
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
  const scale = max > 0 ? 1 / max : 1;
  for (let i = 0; i < data.length; i++) out[i] = data[i] * scale;
  return out;
}

/**
 * 应用平滑系数到音频数据
 * @param {Float32Array} current
 * @param {Float32Array} previous
 * @param {number} factor [0,1]
 * @returns {Float32Array}
 */
export function smoothAudioData(current, previous, factor = 0.3) {
  const out = new Float32Array(current.length);
  for (let i = 0; i < current.length; i++) {
    out[i] = previous[i] * factor + current[i] * (1 - factor);
  }
  return out;
}

/**
 * 动态范围压缩（用于可视化更均衡）
 * @param {Float32Array} data
 * @param {number} threshold
 * @param {number} ratio
 * @returns {Float32Array}
 */
export function compressDynamicRange(data, threshold = 0.3, ratio = 4) {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v > threshold) {
      out[i] = threshold + (v - threshold) / ratio;
    } else {
      out[i] = v;
    }
  }
  return out;
}

/**
 * 自动增益控制
 * @param {Float32Array} data
 * @param {number} targetPeak
 * @returns {Float32Array}
 */
export function autoGainControl(data, targetPeak = 0.9) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const gain = peak > 0 ? targetPeak / peak : 1;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] * gain;
  return out;
}

/**
 * 波形对称性计算
 * @param {Float32Array} timeData
 * @returns {number} [-1,1]
 */
export function waveformSymmetry(timeData) {
  let pos = 0, neg = 0;
  for (let i = 0; i < timeData.length; i++) {
    if (timeData[i] >= 0) pos += timeData[i];
    else neg += -timeData[i];
  }
  const total = pos + neg;
  return total > 0 ? (pos - neg) / total : 0;
}

/**
 * 波形峰值因子（crest factor）
 * @param {Float32Array} timeData
 * @returns {number}
 */
export function crestFactor(timeData) {
  let peak = 0;
  let rms = 0;
  for (let i = 0; i < timeData.length; i++) {
    const v = timeData[i];
    peak = Math.max(peak, Math.abs(v));
    rms += v * v;
  }
  rms = Math.sqrt(rms / timeData.length);
  return rms > 0 ? peak / rms : 0;
}

/**
 * 着色器预处理器（简单的 #define 注入）
 * @param {string} source
 * @param {Record<string,string|number>} defines
 * @returns {string}
 */
export function preprocessShader(source, defines = {}) {
  const lines = source.split('\n');
  const inject = Object.entries(defines).map(([k, v]) => `#define ${k} ${v}`);
  let versionIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('#version')) versionIdx = i;
  }
  const insertIdx = versionIdx >= 0 ? versionIdx + 1 : 0;
  lines.splice(insertIdx, 0, ...inject);
  return lines.join('\n');
}

/**
 * 检查 WebGL 扩展支持
 * @param {WebGLRenderingContext} gl
 * @returns {Record<string,boolean>}
 */
export function checkWebGLExtensions(gl) {
  const exts = [
    'OES_texture_float',
    'OES_texture_half_float',
    'WEBGL_color_buffer_float',
    'EXT_color_buffer_half_float',
    'OES_texture_float_linear',
    'OES_texture_half_float_linear',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_debug_renderer_info',
    'EXT_shader_texture_lod',
    'OES_standard_derivatives',
    'WEBGL_depth_texture',
    'EXT_texture_filter_anisotropic'
  ];
  const result = {};
  exts.forEach(name => {
    result[name] = !!gl.getExtension(name);
  });
  return result;
}

/**
 * 获取 WebGL 上下文能力报告
 * @param {WebGLRenderingContext} gl
 * @returns {object}
 */
export function getWebGLCapabilities(gl) {
  return {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
    maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
    extensions: checkWebGLExtensions(gl)
  };
}

/**
 * 生成渐变色彩映射表
 * @param {number} steps
 * @param {Array<[number,number,number]>} stops
 * @returns {Float32Array}
 */
export function generateColorGradient(steps = 256, stops = [[0,0,0], [1,0,0], [1,1,0], [0,1,0], [0,1,1], [0,0,1], [1,0,1], [1,1,1]]) {
  const colors = new Float32Array(steps * 3);
  const band = steps / (stops.length - 1);
  for (let i = 0; i < steps; i++) {
    const idx = i / band;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, stops.length - 1);
    const f = idx - i0;
    colors[i * 3] = stops[i0][0] * (1 - f) + stops[i1][0] * f;
    colors[i * 3 + 1] = stops[i0][1] * (1 - f) + stops[i1][1] * f;
    colors[i * 3 + 2] = stops[i0][2] * (1 - f) + stops[i1][2] * f;
  }
  return colors;
}

/**
 * 上传 1D 颜色查找表纹理
 * @param {WebGLRenderingContext} gl
 * @param {Float32Array} colors
 * @returns {WebGLTexture}
 */
export function uploadColorLUT(gl, colors) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const width = colors.length / 3;
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, 1, 0, gl.RGB, gl.FLOAT, colors);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/**
 * 环形缓冲区（用于音频历史数据）
 */
export class RingBuffer {
  constructor(size) {
    this.size = size;
    this.buffer = new Float32Array(size);
    this.writeIndex = 0;
  }

  write(data) {
    for (let i = 0; i < data.length; i++) {
      this.buffer[this.writeIndex] = data[i];
      this.writeIndex = (this.writeIndex + 1) % this.size;
    }
  }

  read(offset, len) {
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const idx = (this.writeIndex + offset + i) % this.size;
      out[i] = this.buffer[idx];
    }
    return out;
  }

  get latest() {
    return this.buffer[(this.writeIndex - 1 + this.size) % this.size];
  }

  clear() {
    this.buffer.fill(0);
    this.writeIndex = 0;
  }
}

/**
 * 简单的节拍同步器
 */
export class BeatSync {
  constructor() {
    this.lastBeatTime = 0;
    this.bpm = 120;
    this.phase = 0;
  }

  tap() {
    const now = performance.now();
    if (this.lastBeatTime > 0) {
      const dt = now - this.lastBeatTime;
      if (dt > 200 && dt < 2000) {
        const instantBpm = 60000 / dt;
        this.bpm = this.bpm * 0.7 + instantBpm * 0.3;
      }
    }
    this.lastBeatTime = now;
  }

  getBeatPhase() {
    const now = performance.now();
    const beatDuration = 60000 / this.bpm;
    return ((now - this.lastBeatTime) % beatDuration) / beatDuration;
  }

  getMeasurePhase(beatsPerMeasure = 4) {
    return (this.getBeatPhase() + this.phase) % beatsPerMeasure / beatsPerMeasure;
  }
}

/**
 * 后处理链构建器
 */
export class PostProcessChain {
  constructor(gl, width, height) {
    this.gl = gl;
    this.composer = new EffectComposer(gl, width, height);
    this.passes = [];
  }

  addBloom(intensity = 0.5, iterations = 4) {
    this.composer.addPass(new BloomPass(iterations, intensity));
    return this;
  }

  addVignette(intensity = 0.5, smoothness = 0.7) {
    this.composer.addPass(new VignettePass(intensity, smoothness));
    return this;
  }

  addToneMapping(exposure = 1.0, gamma = 2.2) {
    this.composer.addPass(new ToneMappingPass(exposure, gamma));
    return this;
  }

  render(sourceTexture) {
    this.composer.render(sourceTexture);
  }

  resize(width, height) {
    this.composer.resize(width, height);
  }
}

/**
 * 着色器性能剖析器
 */
export class ShaderProfiler {
  constructor() {
    this.frames = [];
    this.maxFrames = 60;
  }

  start() {
    this._start = performance.now();
  }

  end() {
    const dt = performance.now() - this._start;
    this.frames.push(dt);
    if (this.frames.length > this.maxFrames) this.frames.shift();
  }

  get average() {
    if (this.frames.length === 0) return 0;
    return this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
  }

  get fps() {
    const avg = this.average;
    return avg > 0 ? 1000 / avg : 0;
  }

  report() {
    return {
      averageMs: this.average,
      fps: this.fps,
      frames: this.frames.length
    };
  }
}

// ============================================================================
// 着色器预设数据扩展
// ============================================================================

export const ExtendedShaderPresets = {
  neonPulse: {
    name: '霓虹脉冲',
    description: '高频霓虹色彩脉冲',
    uniforms: { u_pulseSpeed: 3.0, u_colorShift: 0.5, u_intensity: 1.2 }
  },
  deepOcean: {
    name: '深海涌动',
    description: '低频深海蓝色涌动',
    uniforms: { u_waveScale: 2.0, u_colorDepth: 0.8, u_caustics: 0.6 }
  },
  solarFlare: {
    name: '太阳耀斑',
    description: '强烈的橙红火焰爆发',
    uniforms: { u_flareIntensity: 1.5, u_turbulence: 0.7, u_colorTemp: 0.3 }
  },
  crystalCave: {
    name: '水晶洞穴',
    description: '棱镜折射与内部反射',
    uniforms: { u_refractIndex: 1.5, u_dispersion: 0.4, u_innerGlow: 0.8 }
  },
  voidSpace: {
    name: '虚空深空',
    description: '极简深空与微弱星光',
    uniforms: { u_starDensity: 0.3, u_nebulaAmount: 0.1, u_depth: 1.0 }
  },
  dataStream: {
    name: '数据流',
    description: '赛博朋克风格的下落数据',
    uniforms: { u_streamSpeed: 2.5, u_matrixDensity: 0.8, u_greenTint: 1.0 }
  },
  auroraBorealis: {
    name: '极光幻境',
    description: '北极光式柔和波动',
    uniforms: { u_auroraSpeed: 0.5, u_bandCount: 3, u_colorBlend: 0.6 }
  },
  glitchCity: {
    name: '故障都市',
    description: '随机故障与数字噪声',
    uniforms: { u_glitchFreq: 0.3, u_blockSize: 8, u_rgbSplit: 0.5 }
  },
  inkWash: {
    name: '水墨晕染',
    description: '传统水墨扩散效果',
    uniforms: { u_inkSpread: 0.4, u_paperGrain: 0.3, u_brushStrokes: 0.6 }
  },
  retroWave: {
    name: '复古波',
    description: '80年代复古霓虹网格',
    uniforms: { u_gridSpeed: 1.0, u_sunSize: 0.3, u_purpleHaze: 0.7 }
  }
};

// ============================================================================
// 模块结束标记
// ============================================================================

/** @type {boolean} */
export const __SHADERS_MODULE_LOADED__ = true;


