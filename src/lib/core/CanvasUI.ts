/**
 * Canvas UI Components - Buttons, Sliders, etc for canvas rendering
 */

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  onClick?: () => void;
  font?: string;
  bgColor?: string;
  hoverColor?: string;
  textColor?: string;
  borderRadius?: number;
}

export class CanvasButton {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  onClick: (() => void) | null;
  font: string;
  bgColor: string;
  hoverColor: string;
  textColor: string;
  borderRadius: number;
  hovered: boolean = false;
  selected: boolean = false;
  highlight: string | null = null;

  constructor(config: ButtonConfig) {
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.text = config.text;
    this.onClick = config.onClick || null;
    this.font = config.font || '16px Inter, Arial, sans-serif';
    this.bgColor = config.bgColor || '#ffffff';
    this.hoverColor = config.hoverColor || '#e5e5e5';
    this.textColor = config.textColor || '#000000';
    this.borderRadius = config.borderRadius || 8;
  }

  containsPoint(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }

  checkHover(x: number, y: number): boolean {
    this.hovered = this.containsPoint(x, y);
    return this.hovered;
  }

  checkClick(x: number, y: number): boolean {
    if (this.containsPoint(x, y)) {
      if (this.onClick) {
        this.onClick();
      }
      return true;
    }
    return false;
  }

  setSelected(selected: boolean) {
    this.selected = selected;
  }

  setHighlight(color: string | null) {
    this.highlight = color;
  }

  setText(text: string) {
    this.text = text;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Background color
    let bgColor = this.bgColor;
    if (this.highlight) {
      bgColor = this.highlight;
    } else if (this.selected) {
      bgColor = '#a8d4ff';
    } else if (this.hovered) {
      bgColor = this.hoverColor;
    }

    // Draw rounded rectangle
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.font = this.font;
    ctx.fillStyle = this.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
  }
}

export class TimerBar {
  x: number;
  y: number;
  width: number;
  height: number;
  progress: number = 1;
  orientation: 'horizontal' | 'vertical';
  direction: 'ltr' | 'rtl' | 'ttb' | 'btt';
  showText: boolean;
  borderRadius: number;
  colors: {
    background: string;
    fill: string;
    warning: string;
    danger: string;
    border: string;
  };
  remaining: number = 0;
  total: number = 0;

  constructor(config: {
    x: number;
    y: number;
    width: number;
    height: number;
    orientation?: 'horizontal' | 'vertical';
    direction?: 'ltr' | 'rtl' | 'ttb' | 'btt';
    showText?: boolean;
    borderRadius?: number;
    colors?: Partial<TimerBar['colors']>;
  }) {
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.orientation = config.orientation || 'horizontal';
    this.direction = config.direction || 'ltr';
    this.showText = config.showText ?? true;
    this.borderRadius = config.borderRadius || 8;
    this.colors = {
      background: '#2C3E50',
      fill: '#3498DB',
      warning: '#F39C12',
      danger: '#E74C3C',
      border: '#1A252F',
      ...config.colors
    };
  }

  setProgress(progress: number) {
    this.progress = Math.max(0, Math.min(1, progress));
  }

  update(timer: { getProgress: () => number; getTime: () => number; duration: number }) {
    this.progress = timer.getProgress();
    this.remaining = timer.getTime();
    this.total = timer.duration;
  }

  getFillColor(): string {
    if (this.progress > 0.5) return this.colors.fill;
    if (this.progress > 0.2) return this.colors.warning;
    return this.colors.danger;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Background
    ctx.fillStyle = this.colors.background;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();

    // Border
    ctx.strokeStyle = this.colors.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill
    const padding = 4;
    const fillColor = this.getFillColor();
    ctx.fillStyle = fillColor;

    if (this.orientation === 'vertical') {
      const fillHeight = (this.height - padding * 2) * this.progress;
      const fillY = this.direction === 'btt'
        ? this.y + this.height - padding - fillHeight
        : this.y + padding;

      ctx.beginPath();
      ctx.roundRect(
        this.x + padding,
        fillY,
        this.width - padding * 2,
        fillHeight,
        Math.max(0, this.borderRadius - padding)
      );
      ctx.fill();
    } else {
      const fillWidth = (this.width - padding * 2) * this.progress;
      const fillX = this.direction === 'rtl'
        ? this.x + this.width - padding - fillWidth
        : this.x + padding;

      ctx.beginPath();
      ctx.roundRect(
        fillX,
        this.y + padding,
        fillWidth,
        this.height - padding * 2,
        Math.max(0, this.borderRadius - padding)
      );
      ctx.fill();
    }
  }
}
