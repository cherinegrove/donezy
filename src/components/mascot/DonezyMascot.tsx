import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DonezyMascotProps {
  celebrating?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function DonezyMascot({ celebrating = false, onClick, size = 'medium' }: DonezyMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mascotRef = useRef<THREE.Group | null>(null);
  const eyeRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const celebrationRef = useRef(false);

  useEffect(() => {
    celebrationRef.current = celebrating;
  }, [celebrating]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 300;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Create mascot group
    const mascot = new THREE.Group();
    sceneRef.current.add(mascot);
    mascotRef.current = mascot;

    // Body - dark blue cube-based shape
    const bodyGeometry = new THREE.BoxGeometry(2, 2.5, 1.8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x2c3e50 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0;
    body.castShadow = true;
    mascot.add(body);

    // Head - slightly raised box
    const headGeometry = new THREE.BoxGeometry(2, 2, 1.8);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0x34495e });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    head.castShadow = true;
    mascot.add(head);

    // Left horn - green cone
    const hornGeometry = new THREE.ConeGeometry(0.35, 1.2, 8);
    const hornMaterial = new THREE.MeshPhongMaterial({ color: 0x7cb342 });
    const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    leftHorn.position.set(-0.6, 3.3, 0.8);
    leftHorn.rotation.z = 0.3;
    leftHorn.castShadow = true;
    mascot.add(leftHorn);

    // Right horn - green cone
    const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    rightHorn.position.set(0.6, 3.3, 0.8);
    rightHorn.rotation.z = -0.3;
    rightHorn.castShadow = true;
    mascot.add(rightHorn);

    // Eye - large sphere
    const eyeGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(0, 2.2, 1);
    eye.castShadow = true;
    mascot.add(eye);
    eyeRef.current = eye;

    // Pupil
    const pupilGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.position.set(0, 2.2, 1.4);
    mascot.add(pupil);

    // Eye shine
    const shineGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const shineMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const shine = new THREE.Mesh(shineGeometry, shineMaterial);
    shine.position.set(0.15, 2.4, 1.5);
    mascot.add(shine);

    // Mouth - simple curved shape
    const mouthGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.1);
    const mouthMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.5, 1);
    mascot.add(mouth);

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth || 300;
      const newHeight = containerRef.current.clientHeight || 300;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016; // ~60fps

      if (mascot) {
        // Floating animation
        mascot.position.y = Math.sin(timeRef.current * 1.5) * 0.3;

        // Rotation when celebrating
        if (celebrationRef.current) {
          mascot.rotation.y += 0.1;
          mascot.rotation.x += 0.05;
        } else {
          // Gentle bobbing rotation
          mascot.rotation.y = Math.sin(timeRef.current * 0.5) * 0.1;
        }
      }

      // Eye blinking
      if (eye && eyeRef.current) {
        const blink = Math.abs(Math.sin(timeRef.current * 1)) > 0.95 ? 0.1 : 1;
        eye.scale.y = blink;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle clicks
    const handleClick = () => {
      onClick?.();
    };
    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [onClick]);

  const sizeMap = {
    small: { width: '120px', height: '120px' },
    medium: { width: '200px', height: '200px' },
    large: { width: '300px', height: '300px' },
  };

  return (
    <div
      ref={containerRef}
      style={{
        ...sizeMap[size],
        cursor: 'pointer',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
}
