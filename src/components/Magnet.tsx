import { useEffect, useRef, type ReactNode } from "react";

type MagnetProps = {
  children: ReactNode;
  padding?: number;
  strength?: number;
  maxOffset?: number;
  mobilePinball?: boolean;
};

type AxisBounds = {
  min: number;
  max: number;
};

type PinballBounds = {
  x: AxisBounds;
  y: AxisBounds;
};

type PointerSample = {
  x: number;
  y: number;
  time: number;
};

type PinballDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  lastX: number;
  samples: PointerSample[];
  moved: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const makeBounds = (min: number, max: number): AxisBounds => {
  if (min <= max && min <= 0 && max >= 0) return { min, max };
  return { min: 0, max: 0 };
};

export function Magnet({
  children,
  padding = 150,
  strength = 3,
  maxOffset = 48,
  mobilePinball = false,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const coarsePointer = window.matchMedia("(pointer: coarse)");

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let lastFrameTime = 0;
    let frameId = 0;

    const animate = (time: number) => {
      frameId = 0;
      const elapsed = lastFrameTime
        ? Math.min(time - lastFrameTime, 32)
        : 16;
      lastFrameTime = time;
      const ease = 1 - Math.exp(-elapsed / 80);

      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      if (Math.abs(targetX - currentX) < 0.05) currentX = targetX;
      if (Math.abs(targetY - currentY) < 0.05) currentY = targetY;

      element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

      if (currentX !== targetX || currentY !== targetY) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        lastFrameTime = 0;
      }
    };

    const scheduleAnimation = () => {
      if (!frameId) frameId = window.requestAnimationFrame(animate);
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      scheduleAnimation();
    };

    const handlePointerLeave = (event: PointerEvent) => {
      if (event.pointerType === "touch" && coarsePointer.matches) return;
      reset();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        if (!coarsePointer.matches) reset();
        return;
      }

      const bounds = element.getBoundingClientRect();
      const left = bounds.left - currentX;
      const top = bounds.top - currentY;
      const right = left + bounds.width;
      const bottom = top + bounds.height;
      const isActive =
        event.clientX >= left - padding &&
        event.clientX <= right + padding &&
        event.clientY >= top - padding &&
        event.clientY <= bottom + padding;

      if (!isActive) {
        reset();
        return;
      }

      const centerX = left + bounds.width / 2;
      const centerY = top + bounds.height / 2;
      const clamp = (value: number) =>
        Math.max(-maxOffset, Math.min(maxOffset, value));

      targetX = clamp((event.clientX - centerX) / strength);
      targetY = clamp((event.clientY - centerY) / strength);
      scheduleAnimation();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [maxOffset, padding, strength]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !mobilePinball) return;

    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const hero = element.closest<HTMLElement>(".hero-ambient");
    if (!hero) return;

    let bounds: PinballBounds = {
      x: { min: 0, max: 0 },
      y: { min: 0, max: 0 },
    };
    let positionX = 0;
    let positionY = 0;
    let targetX = 0;
    let targetY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let rotation = 0;
    let targetRotation = 0;
    let renderedY = 0;
    let tapStartedAt = 0;
    let lastFrameTime = 0;
    let frameId = 0;
    let drag: PinballDrag | null = null;

    const measureBounds = (): PinballBounds => {
      const previousTransform = element.style.transform;
      element.style.transform = "none";
      const figureRect = element.getBoundingClientRect();
      element.style.transform = previousTransform;

      const heroRect = hero.getBoundingClientRect();
      const topRect = hero
        .querySelector<HTMLElement>('[data-maze-pinball-obstacle="top"]')
        ?.getBoundingClientRect();
      const bottomRect = hero
        .querySelector<HTMLElement>('[data-maze-pinball-obstacle="bottom"]')
        ?.getBoundingClientRect();
      const edgeGap = 20;
      const textGap = 20;

      return {
        x: makeBounds(
          heroRect.left + edgeGap - figureRect.left,
          heroRect.right - edgeGap - figureRect.right,
        ),
        y: makeBounds(
          (topRect?.bottom ?? heroRect.top) +
            textGap -
            figureRect.top,
          (bottomRect?.top ?? heroRect.bottom) -
            textGap -
            figureRect.bottom,
        ),
      };
    };

    const writeTransform = () => {
      element.style.transform =
        `translate3d(${positionX.toFixed(2)}px, ${renderedY.toFixed(2)}px, 0) ` +
        `rotate(${rotation.toFixed(2)}deg)`;
    };

    const animate = (time: number) => {
      frameId = 0;
      if (!coarsePointer.matches) return;

      const deltaSeconds = lastFrameTime
        ? Math.min(time - lastFrameTime, 32) / 1000
        : 1 / 60;
      lastFrameTime = time;

      if (drag?.moved) {
        const response = reducedMotion.matches
          ? 1
          : 1 - Math.exp(-deltaSeconds * 30);
        positionX += (targetX - positionX) * response;
        positionY += (targetY - positionY) * response;
      } else if (reducedMotion.matches) {
        velocityX = 0;
        velocityY = 0;
        positionX = targetX;
        positionY = targetY;
      } else {
        positionX += velocityX * deltaSeconds;
        positionY += velocityY * deltaSeconds;

        if (positionX < bounds.x.min) {
          positionX = bounds.x.min;
          velocityX = Math.abs(velocityX) * 0.55;
        } else if (positionX > bounds.x.max) {
          positionX = bounds.x.max;
          velocityX = -Math.abs(velocityX) * 0.55;
        }

        if (positionY < bounds.y.min) {
          positionY = bounds.y.min;
          velocityY = Math.abs(velocityY) * 0.55;
        } else if (positionY > bounds.y.max) {
          positionY = bounds.y.max;
          velocityY = -Math.abs(velocityY) * 0.55;
        }

        const friction = Math.exp(-2.8 * deltaSeconds);
        velocityX *= friction;
        velocityY *= friction;

        if (Math.hypot(velocityX, velocityY) < 14) {
          velocityX = 0;
          velocityY = 0;
          targetRotation = 0;
        }
      }

      let jumpOffset = 0;
      if (tapStartedAt && !reducedMotion.matches) {
        const progress = (time - tapStartedAt) / 340;
        if (progress < 1) {
          jumpOffset = -Math.sin(Math.PI * progress) * 9;
        } else {
          tapStartedAt = 0;
        }
      }

      renderedY = clamp(
        positionY + jumpOffset,
        bounds.y.min,
        bounds.y.max,
      );
      const rotationEase = 1 - Math.exp(-deltaSeconds * 14);
      rotation += (targetRotation - rotation) * rotationEase;
      if (Math.abs(rotation) < 0.08 && targetRotation === 0) rotation = 0;
      writeTransform();

      const positionSettling =
        Math.abs(targetX - positionX) > 0.25 ||
        Math.abs(targetY - positionY) > 0.25;
      const keepAnimating =
        (drag?.moved && positionSettling) ||
        Math.hypot(velocityX, velocityY) > 0 ||
        Math.abs(rotation) > 0 ||
        tapStartedAt > 0;

      if (keepAnimating) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        lastFrameTime = 0;
      }
    };

    const scheduleAnimation = () => {
      if (!frameId) frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        !coarsePointer.matches ||
        event.pointerType !== "touch" ||
        !event.isPrimary
      ) {
        return;
      }

      bounds = measureBounds();
      positionX = clamp(positionX, bounds.x.min, bounds.x.max);
      positionY = clamp(renderedY, bounds.y.min, bounds.y.max);
      targetX = positionX;
      targetY = positionY;
      velocityX = 0;
      velocityY = 0;
      tapStartedAt = 0;
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: positionX,
        offsetY: positionY,
        lastX: event.clientX,
        samples: [
          {
            x: event.clientX,
            y: event.clientY,
            time: event.timeStamp || performance.now(),
          },
        ],
        moved: false,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (
        !drag ||
        event.pointerId !== drag.pointerId ||
        event.pointerType !== "touch"
      ) {
        return;
      }

      const time = event.timeStamp || performance.now();
      drag.samples.push({ x: event.clientX, y: event.clientY, time });
      if (drag.samples.length > 8) drag.samples.shift();

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!drag.moved) {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 7) return;
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.25) {
          drag = null;
          return;
        }

        drag.moved = true;
        element.setPointerCapture(event.pointerId);
      }

      targetX = clamp(
        drag.offsetX + deltaX,
        bounds.x.min,
        bounds.x.max,
      );
      targetY = clamp(
        drag.offsetY + deltaY,
        bounds.y.min,
        bounds.y.max,
      );
      targetRotation = reducedMotion.matches
        ? 0
        : clamp((event.clientX - drag.lastX) * 0.24, -7, 7);
      drag.lastX = event.clientX;
      scheduleAnimation();
    };

    const releaseVelocity = (samples: PointerSample[]) => {
      const latest = samples[samples.length - 1];
      const first =
        samples.find((sample) => latest.time - sample.time <= 90) ??
        samples[0];
      const seconds = Math.max((latest.time - first.time) / 1000, 0.016);
      const limitSpeed = (value: number) => clamp(value * 0.38, -600, 600);

      return {
        x: limitSpeed((latest.x - first.x) / seconds),
        y: limitSpeed((latest.y - first.y) / seconds),
      };
    };

    const finishPointer = (event: PointerEvent, cancelled: boolean) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const completedDrag = drag;
      drag = null;

      if (!completedDrag.moved) {
        if (!cancelled && !reducedMotion.matches) {
          tapStartedAt = event.timeStamp || performance.now();
          scheduleAnimation();
        }
        return;
      }

      positionX = targetX;
      positionY = targetY;
      renderedY = positionY;
      if (cancelled || reducedMotion.matches) {
        velocityX = 0;
        velocityY = 0;
        targetRotation = 0;
      } else {
        const velocity = releaseVelocity(completedDrag.samples);
        velocityX = velocity.x;
        velocityY = velocity.y;
        targetRotation = clamp(velocityX * 0.012, -7, 7);
      }
      scheduleAnimation();
    };

    const handlePointerUp = (event: PointerEvent) => {
      finishPointer(event, false);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      finishPointer(event, true);
    };

    const handleResize = () => {
      if (!coarsePointer.matches) return;

      bounds = measureBounds();
      positionX = clamp(positionX, bounds.x.min, bounds.x.max);
      positionY = clamp(positionY, bounds.y.min, bounds.y.max);
      targetX = clamp(targetX, bounds.x.min, bounds.x.max);
      targetY = clamp(targetY, bounds.y.min, bounds.y.max);
      drag = null;
      velocityX = 0;
      velocityY = 0;
      tapStartedAt = 0;
      scheduleAnimation();
    };

    const handlePointerTypeChange = () => {
      if (coarsePointer.matches) {
        handleResize();
        return;
      }

      drag = null;
      positionX = 0;
      positionY = 0;
      targetX = 0;
      targetY = 0;
      renderedY = 0;
      velocityX = 0;
      velocityY = 0;
      rotation = 0;
      targetRotation = 0;
      tapStartedAt = 0;
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrameTime = 0;
      element.style.transform = "translate3d(0, 0, 0)";
    };

    const handleMotionPreferenceChange = () => {
      if (reducedMotion.matches) {
        velocityX = 0;
        velocityY = 0;
        rotation = 0;
        targetRotation = 0;
        tapStartedAt = 0;
        scheduleAnimation();
      }
    };

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize, {
      passive: true,
    });
    coarsePointer.addEventListener("change", handlePointerTypeChange);
    reducedMotion.addEventListener("change", handleMotionPreferenceChange);

    if (coarsePointer.matches) handleResize();

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      coarsePointer.removeEventListener("change", handlePointerTypeChange);
      reducedMotion.removeEventListener("change", handleMotionPreferenceChange);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [mobilePinball]);

  return (
    <div
      ref={ref}
      className={
        mobilePinball
          ? "maze-mobile-pinball will-change-transform"
          : "will-change-transform"
      }
    >
      {children}
    </div>
  );
}
