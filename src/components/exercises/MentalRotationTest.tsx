'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Timer } from '@/lib/core/Timer';
import { Scorer, ScoreData } from '@/lib/core/Scorer';
import { TimerBar } from '@/lib/core/CanvasUI';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import * as THREE from 'three';

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface RotationStep {
  axis: 'X' | 'Y' | 'Z';
  angle: number;
}

interface AnswerChoice {
  rx: number;
  ry: number;
  rz: number;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  hovered: boolean;
  feedback: 'correct' | 'wrong' | null;
}

// Shared Three.js resources
let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedCamera: THREE.OrthographicCamera | null = null;
let offscreenCanvas: HTMLCanvasElement | null = null;

function getSharedRenderer() {
  if (!sharedRenderer) {
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 512;
    offscreenCanvas.height = 512;

    sharedRenderer = new THREE.WebGLRenderer({
      canvas: offscreenCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    sharedRenderer.setSize(512, 512, false);
    sharedRenderer.setClearColor(0xffffff, 0);

    sharedCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 1000);
    sharedCamera.position.set(3, 3, 3);
    sharedCamera.lookAt(0, 0, 0);
  }
  return { renderer: sharedRenderer, camera: sharedCamera!, canvas: offscreenCanvas! };
}

function createCarScene(): { scene: THREE.Scene; carGroup: THREE.Group } {
  const scene = new THREE.Scene();

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(5, 5, 5);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight2.position.set(-5, -5, -5);
  scene.add(directionalLight2);

  // Car group
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  // Fallback car geometry
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0xC83232 });
  const bodyGeom = new THREE.BoxGeometry(2, 0.6, 1);
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = 0.3;
  carGroup.add(body);

  const cabinGeom = new THREE.BoxGeometry(1, 0.5, 0.9);
  const cabinMat = new THREE.MeshPhongMaterial({ color: 0xC83232 });
  const cabinMesh = new THREE.Mesh(cabinGeom, cabinMat);
  cabinMesh.position.set(0.2, 0.85, 0);
  carGroup.add(cabinMesh);

  // Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const wheelPositions = [
    [-0.6, 0.1, 0.55],
    [0.6, 0.1, 0.55],
    [-0.6, 0.1, -0.55],
    [0.6, 0.1, -0.55]
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, y, z);
    carGroup.add(wheel);
  });

  return { scene, carGroup };
}

function drawRotationIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  axis: 'X' | 'Y' | 'Z',
  angle: number,
  highlight: boolean
) {
  // Circle
  ctx.fillStyle = highlight ? '#96FF96' : '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw indicator based on axis
  ctx.fillStyle = '#000000';
  if (axis === 'X') {
    const cursorWidth = 10;
    const cursorHeight = 16;
    if (angle > 0) {
      ctx.beginPath();
      ctx.moveTo(x, y + radius - 5 - cursorHeight);
      ctx.lineTo(x - cursorWidth / 2, y + radius - 5);
      ctx.lineTo(x + cursorWidth / 2, y + radius - 5);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - radius + 5 + cursorHeight);
      ctx.lineTo(x - cursorWidth / 2, y - radius + 5);
      ctx.lineTo(x + cursorWidth / 2, y - radius + 5);
      ctx.fill();
    }
  } else if (axis === 'Y') {
    const cursorWidth = 16;
    const cursorHeight = 10;
    if (angle > 0) {
      ctx.beginPath();
      ctx.moveTo(x - radius + 5 + cursorWidth, y);
      ctx.lineTo(x - radius + 5, y - cursorHeight / 2);
      ctx.lineTo(x - radius + 5, y + cursorHeight / 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + radius - 5 - cursorWidth, y);
      ctx.lineTo(x + radius - 5, y - cursorHeight / 2);
      ctx.lineTo(x + radius - 5, y + cursorHeight / 2);
      ctx.fill();
    }
  } else {
    // Z axis - curved arrow
    const arrowRadius = radius + 10;
    const toRight = angle > 0;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (toRight) {
      ctx.arc(x, y, arrowRadius, Math.PI * 1.5, Math.PI * 1.75);
    } else {
      ctx.arc(x, y, arrowRadius, Math.PI * 1.25, Math.PI * 1.5);
    }
    ctx.stroke();
  }

  // Angle text
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(angle)}°`, x, y);

  // Axis label
  ctx.font = '16px Arial';
  ctx.fillText(`Axe ${axis}`, x, y + radius + 15);
}

export default function MentalRotationTest() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Game state
  const [gameState, setGameState] = useState<GameState>('menu');
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);

  // Settings
  const [numSequences, setNumSequences] = useState(40);
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [showCorrections, setShowCorrections] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(2.0);

  // Game refs
  const timerRef = useRef<Timer | null>(null);
  const scorerRef = useRef<Scorer>(new Scorer());
  const perfSavedRef = useRef(false);
  const timerBarRef = useRef<TimerBar | null>(null);

  const referenceSceneRef = useRef<{ scene: THREE.Scene; carGroup: THREE.Group } | null>(null);
  const answerScenesRef = useRef<{ scene: THREE.Scene; carGroup: THREE.Group }[]>([]);

  const rotationSequenceRef = useRef<RotationStep[]>([]);
  const rotationIndicatorsRef = useRef<{ axis: 'X' | 'Y' | 'Z'; angle: number; highlight: boolean }[]>([]);
  const answerChoicesRef = useRef<AnswerChoice[]>([]);
  const correctIndexRef = useRef(0);
  const correctRxRef = useRef(0);
  const correctRyRef = useRef(0);
  const correctRzRef = useRef(0);

  const scoreRef = useRef(0);
  const totalQuestionsRef = useRef(0);
  const answeredRef = useRef(false);
  const selectedIndexRef = useRef(-1);

  const animatingRef = useRef(false);
  const animationStepRef = useRef(0);
  const animationProgressRef = useRef(0);

  // Generate answer choices
  const generateAnswerChoices = useCallback((canvasWidth: number) => {
    answerChoicesRef.current = [];
    answerScenesRef.current.forEach(s => {
      s.scene.clear();
    });
    answerScenesRef.current = [];

    correctIndexRef.current = Math.floor(Math.random() * 5);

    // Generate decoys
    const decoys: { rx: number; ry: number; rz: number }[] = [];
    const offsetChoices = [0, 45, 90, 135, 180, 225, 270, 315, -45, -90, -135];

    while (decoys.length < 4) {
      const rx = (correctRxRef.current + offsetChoices[Math.floor(Math.random() * offsetChoices.length)]) % 360;
      const ry = (correctRyRef.current + offsetChoices[Math.floor(Math.random() * offsetChoices.length)]) % 360;
      const rz = (correctRzRef.current + offsetChoices[Math.floor(Math.random() * offsetChoices.length)]) % 360;

      const key = `${rx},${ry},${rz}`;
      const correctKey = `${correctRxRef.current},${correctRyRef.current},${correctRzRef.current}`;

      if (key !== correctKey && !decoys.find(d => `${d.rx},${d.ry},${d.rz}` === key)) {
        decoys.push({ rx, ry, rz });
      }
    }

    // Create choices
    const carWidth = 160;
    const carHeight = 130;
    const spacing = 15;
    const totalWidth = 5 * carWidth + 4 * spacing;
    const startX = (canvasWidth - totalWidth) / 2;
    const yPos = 460;

    for (let i = 0; i < 5; i++) {
      const x = startX + i * (carWidth + spacing);
      let rx: number, ry: number, rz: number;

      if (i === correctIndexRef.current) {
        rx = correctRxRef.current;
        ry = correctRyRef.current;
        rz = correctRzRef.current;
      } else {
        const decoyIdx = i < correctIndexRef.current ? i : i - 1;
        ({ rx, ry, rz } = decoys[decoyIdx]);
      }

      const { scene, carGroup } = createCarScene();
      carGroup.rotation.x = THREE.MathUtils.degToRad(rx);
      carGroup.rotation.y = THREE.MathUtils.degToRad(ry);
      carGroup.rotation.z = THREE.MathUtils.degToRad(rz);
      answerScenesRef.current.push({ scene, carGroup });

      answerChoicesRef.current.push({
        rx, ry, rz, x, y: yPos,
        width: carWidth, height: carHeight,
        selected: false, hovered: false, feedback: null
      });
    }
  }, []);

  // Generate question
  const generateQuestion = useCallback((canvasWidth: number, canvasHeight: number) => {
    answeredRef.current = false;
    selectedIndexRef.current = -1;
    animatingRef.current = false;
    animationStepRef.current = 0;
    animationProgressRef.current = 0;

    // Generate 3 random rotations
    rotationSequenceRef.current = [];
    for (let i = 0; i < 3; i++) {
      const axes: ('X' | 'Y' | 'Z')[] = ['X', 'Y', 'Z'];
      const axis = axes[Math.floor(Math.random() * 3)];
      const angles = [-180, -135, -90, -45, 45, 90, 135, 180];
      const angle = angles[Math.floor(Math.random() * angles.length)];
      rotationSequenceRef.current.push({ axis, angle });
    }

    // Calculate final rotation
    correctRxRef.current = 0;
    correctRyRef.current = 0;
    correctRzRef.current = 0;

    rotationSequenceRef.current.forEach(({ axis, angle }) => {
      if (axis === 'X') correctRxRef.current += angle;
      else if (axis === 'Y') correctRyRef.current += angle;
      else correctRzRef.current += angle;
    });

    correctRxRef.current = ((correctRxRef.current % 360) + 360) % 360;
    correctRyRef.current = ((correctRyRef.current % 360) + 360) % 360;
    correctRzRef.current = ((correctRzRef.current % 360) + 360) % 360;

    // Reference car scene
    if (!referenceSceneRef.current) {
      referenceSceneRef.current = createCarScene();
    }
    referenceSceneRef.current.carGroup.rotation.set(0, 0, 0);

    // Rotation indicators
    rotationIndicatorsRef.current = rotationSequenceRef.current.map(({ axis, angle }) => ({
      axis, angle, highlight: false
    }));

    generateAnswerChoices(canvasWidth);
  }, [generateAnswerChoices]);

  // Start animation
  const startAnimation = useCallback(() => {
    animatingRef.current = true;
    animationStepRef.current = 0;
    animationProgressRef.current = 0;
  }, []);

  // Check answer
  const checkAnswer = useCallback((selectedIndex: number) => {
    answeredRef.current = true;
    totalQuestionsRef.current++;

    if (selectedIndex === correctIndexRef.current) {
      scoreRef.current++;
      scorerRef.current.recordAnswer(true);
    } else {
      scorerRef.current.recordAnswer(false);
    }

    if (showCorrections) {
      answerChoicesRef.current.forEach((choice, i) => {
        if (i === correctIndexRef.current) choice.feedback = 'correct';
        else if (i === selectedIndex) choice.feedback = 'wrong';
      });
    }
  }, [showCorrections]);

  // Next question
  const nextQuestion = useCallback((canvasWidth: number, canvasHeight: number) => {
    if (!answeredRef.current && selectedIndexRef.current !== -1) {
      checkAnswer(selectedIndexRef.current);
      if (showCorrections) {
        startAnimation();
      }
    } else if (answeredRef.current) {
      if (animatingRef.current) {
        animatingRef.current = false;
        rotationIndicatorsRef.current.forEach(ind => ind.highlight = false);
      }

      answerChoicesRef.current.forEach(choice => choice.feedback = null);

      if (totalQuestionsRef.current >= numSequences) {
        setScoreData(scorerRef.current.getResults());
        setGameState('results');
        return;
      }

      generateQuestion(canvasWidth, canvasHeight);

      if (timerRef.current) {
        timerRef.current.reset();
        timerRef.current.start();
      }
    }
  }, [numSequences, showCorrections, checkAnswer, startAnimation, generateQuestion]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize
    scorerRef.current.reset();
    perfSavedRef.current = false;
    scoreRef.current = 0;
    totalQuestionsRef.current = 0;

    getSharedRenderer(); // Initialize shared renderer
    referenceSceneRef.current = createCarScene();

    generateQuestion(canvas.width, canvas.height);

    timerRef.current = new Timer(timePerQuestion, () => {
      if (!answeredRef.current) {
        scorerRef.current.recordAnswer(false);
        totalQuestionsRef.current++;
        if (showCorrections) {
          answeredRef.current = true;
          answerChoicesRef.current.forEach((choice, i) => {
            if (i === correctIndexRef.current) choice.feedback = 'correct';
          });
          startAnimation();
        } else {
          nextQuestion(canvas.width, canvas.height);
        }
      }
    });
    timerRef.current.start();

    timerBarRef.current = new TimerBar({
      x: 15,
      y: 50,
      width: 25,
      height: canvas.height - 100,
      orientation: 'vertical',
      direction: 'btt',
      showText: false,
      borderRadius: 12
    });

    lastTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Update timer
      if (timerRef.current && !answeredRef.current && !animatingRef.current) {
        timerRef.current.update(deltaTime);
        if (timerBarRef.current) {
          timerBarRef.current.update(timerRef.current);
        }
      }

      // Update animation
      if (animatingRef.current && referenceSceneRef.current) {
        animationProgressRef.current += animationSpeed;

        const currentRotation = rotationSequenceRef.current[animationStepRef.current];
        if (currentRotation) {
          const targetAngle = Math.abs(currentRotation.angle);

          if (animationProgressRef.current >= targetAngle) {
            const surplus = animationProgressRef.current - targetAngle;
            animationStepRef.current++;
            animationProgressRef.current = surplus;

            if (animationStepRef.current >= rotationSequenceRef.current.length) {
              animatingRef.current = false;
              rotationIndicatorsRef.current[animationStepRef.current - 1].highlight = false;
            } else {
              if (animationStepRef.current > 0) {
                rotationIndicatorsRef.current[animationStepRef.current - 1].highlight = false;
              }
            }
          }

          if (animationStepRef.current < rotationSequenceRef.current.length) {
            rotationIndicatorsRef.current[animationStepRef.current].highlight = true;
          }

          // Calculate current angles
          let currentRx = 0, currentRy = 0, currentRz = 0;

          for (let i = 0; i < animationStepRef.current; i++) {
            const { axis, angle } = rotationSequenceRef.current[i];
            if (axis === 'X') currentRx += angle;
            else if (axis === 'Y') currentRy += angle;
            else currentRz += angle;
          }

          if (animationStepRef.current < rotationSequenceRef.current.length) {
            const { axis, angle } = rotationSequenceRef.current[animationStepRef.current];
            const progressRatio = animationProgressRef.current / Math.abs(angle);
            const currentAngle = angle * progressRatio;

            if (axis === 'X') currentRx += currentAngle;
            else if (axis === 'Y') currentRy += currentAngle;
            else currentRz += currentAngle;
          }

          referenceSceneRef.current.carGroup.rotation.x = THREE.MathUtils.degToRad(currentRx);
          referenceSceneRef.current.carGroup.rotation.y = THREE.MathUtils.degToRad(currentRy);
          referenceSceneRef.current.carGroup.rotation.z = THREE.MathUtils.degToRad(currentRz);
        }
      }

      // Render
      ctx.fillStyle = '#D0D0D0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Main area
      ctx.fillStyle = '#E6E6E6';
      ctx.fillRect(50, 20, canvas.width - 70, canvas.height - 40);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 20, canvas.width - 70, canvas.height - 40);

      // Timer bar
      timerBarRef.current?.draw(ctx);

      // Title
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText('Test de Rotation Mentale 3D', 70, 50);

      // Score
      ctx.font = '20px Arial';
      ctx.fillText(`Score : ${scoreRef.current} / ${totalQuestionsRef.current}`, 70, 80);

      // Progress
      ctx.font = '16px Arial';
      ctx.fillStyle = '#505050';
      ctx.fillText(`Question ${totalQuestionsRef.current + 1} / ${numSequences}`, 250, 83);

      // Instructions
      ctx.font = '16px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('Appliquez mentalement les rotations suivantes :', canvas.width / 2, 140);

      // Reference label
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      const refLabel = animatingRef.current ? 'Animation en cours...' : 'Position de référence';
      ctx.fillText(refLabel, canvas.width - 160, 80);

      // Draw reference car
      if (referenceSceneRef.current) {
        const { renderer, camera, canvas: offCanvas } = getSharedRenderer();
        renderer.render(referenceSceneRef.current.scene, camera);
        ctx.drawImage(offCanvas, 0, 0, 512, 512, canvas.width - 270, 100, 220, 200);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - 270, 100, 220, 200);
      }

      // Draw rotation indicators
      const positions = [canvas.width / 2 - 180, canvas.width / 2, canvas.width / 2 + 180];
      rotationIndicatorsRef.current.forEach((ind, i) => {
        drawRotationIndicator(ctx, positions[i], 230, 60, ind.axis, ind.angle, ind.highlight);
      });

      // Separator line
      ctx.strokeStyle = '#505050';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 380);
      ctx.lineTo(canvas.width - 30, 380);
      ctx.stroke();

      // Question
      ctx.font = '20px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText("Quelle est l'orientation finale ?", canvas.width / 2, 410);

      // Draw answer choices
      const { renderer, camera, canvas: offCanvas } = getSharedRenderer();
      answerChoicesRef.current.forEach((choice, i) => {
        // Background based on feedback
        if (choice.feedback === 'correct') {
          ctx.fillStyle = '#C8FFC8';
          ctx.fillRect(choice.x, choice.y, choice.width, choice.height);
        } else if (choice.feedback === 'wrong') {
          ctx.fillStyle = '#FFC8C8';
          ctx.fillRect(choice.x, choice.y, choice.width, choice.height);
        }

        // Render 3D car
        if (answerScenesRef.current[i]) {
          renderer.render(answerScenesRef.current[i].scene, camera);
          ctx.drawImage(offCanvas, 0, 0, 512, 512, choice.x, choice.y, choice.width, choice.height);
        }

        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(choice.x, choice.y, choice.width, choice.height);

        // Button
        const btnY = choice.y + choice.height + 5;
        let btnColor = '#E6E6E6';
        if (choice.feedback === 'correct') btnColor = '#96FF96';
        else if (choice.feedback === 'wrong') btnColor = '#FF9696';
        else if (choice.selected) btnColor = '#ADD8E6';
        else if (choice.hovered) btnColor = '#C8C8C8';

        ctx.fillStyle = btnColor;
        ctx.fillRect(choice.x, btnY, choice.width, 30);
        ctx.strokeRect(choice.x, btnY, choice.width, 30);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(choice.selected ? `${i + 1} ✓` : `${i + 1}`, choice.x + choice.width / 2, btnY + 15);
      });

      // Next button
      const nextBtnX = canvas.width / 2 - 60;
      const nextBtnY = canvas.height - 60;
      ctx.fillStyle = '#E6E6E6';
      ctx.fillRect(nextBtnX, nextBtnY, 120, 40);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(nextBtnX, nextBtnY, 120, 40);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Suivant', canvas.width / 2, nextBtnY + 20);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      timerRef.current?.stop();
    };
  }, [gameState, numSequences, timePerQuestion, animationSpeed, showCorrections, generateQuestion, nextQuestion, startAnimation]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check answer choice buttons
    if (!answeredRef.current && !animatingRef.current) {
      answerChoicesRef.current.forEach((choice, i) => {
        const btnY = choice.y + choice.height + 5;
        if (x >= choice.x && x <= choice.x + choice.width &&
            y >= btnY && y <= btnY + 30) {
          // Deselect previous
          if (selectedIndexRef.current !== -1) {
            answerChoicesRef.current[selectedIndexRef.current].selected = false;
          }
          selectedIndexRef.current = i;
          choice.selected = true;
        }
      });
    }

    // Check next button
    const nextBtnX = canvas.width / 2 - 60;
    const nextBtnY = canvas.height - 60;
    if (x >= nextBtnX && x <= nextBtnX + 120 && y >= nextBtnY && y <= nextBtnY + 40) {
      nextQuestion(canvas.width, canvas.height);
    }
  }, [nextQuestion]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    answerChoicesRef.current.forEach(choice => {
      const btnY = choice.y + choice.height + 5;
      choice.hovered = x >= choice.x && x <= choice.x + choice.width &&
                       y >= btnY && y <= btnY + 30;
    });
  }, []);

  // Menu screen
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Rotation Mentale 3D</CardTitle>
            <CardDescription className="text-lg">
              Test Psychotechnique - Visualisation spatiale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-gray-600">
              <p>Appliquez mentalement les rotations indiquées</p>
              <p>et trouvez l&apos;orientation finale</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setGameState('playing')}
              >
                Jouer
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setGameState('settings')}
              >
                Paramètres
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => router.push('/')}
              >
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Settings screen
  if (gameState === 'settings') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Nombre de questions: {numSequences}</Label>
              <Slider
                value={[numSequences]}
                onValueChange={([v]) => setNumSequences(v)}
                min={10}
                max={60}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Temps par question: {timePerQuestion}s</Label>
              <Slider
                value={[timePerQuestion]}
                onValueChange={([v]) => setTimePerQuestion(v)}
                min={30}
                max={120}
                step={15}
              />
            </div>

            <div className="space-y-2">
              <Label>Vitesse d&apos;animation: {animationSpeed.toFixed(1)}</Label>
              <Slider
                value={[animationSpeed]}
                onValueChange={([v]) => setAnimationSpeed(v)}
                min={1.0}
                max={5.0}
                step={0.5}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="corrections">Afficher les corrections</Label>
              <Switch
                id="corrections"
                checked={showCorrections}
                onCheckedChange={setShowCorrections}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => setGameState('menu')}
            >
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results screen
  if (gameState === 'results' && scoreData) {
    const percentage = numSequences > 0 ? Math.floor((100 * scoreRef.current) / numSequences) : 0;
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('mental-rotation', percentage, scoreRef.current, numSequences);
    }
    const perfEntries = loadEntries('mental-rotation');

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {percentage}%
              </div>
              <Badge variant={percentage >= 70 ? 'default' : 'destructive'}>
                {scoreRef.current}/{numSequences} réponses correctes
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{scoreRef.current}</div>
                <div className="text-sm text-gray-500">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{numSequences - scoreRef.current}</div>
                <div className="text-sm text-gray-500">Incorrect</div>
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="mental-rotation" />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => setGameState('playing')}
              >
                Réessayer
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setGameState('menu')}
              >
                Menu
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => router.push('/')}
              >
                Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={1000}
        height={650}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        className="border border-gray-400 cursor-pointer"
      />
    </div>
  );
}
