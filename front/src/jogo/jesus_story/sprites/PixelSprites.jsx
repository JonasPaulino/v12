import React from "react";

const COLORS = {
  ink: "#2f3437",
  mid: "#777d82",
  soft: "#f6f7f8",
  white: "#ffffff",
};

export const PixelJesus = ({ pose = "walk1", label = "", size = 1, className = "" }) => {
  const legA = pose === "walk2" ? { left: 11, right: 20, h1: 12, h2: 8 } : { left: 9, right: 21, h1: 8, h2: 12 };
  const arm = pose === "blessing" ? { x: 22, y: 22, w: 7, h: 4 } : { x: 6, y: 25, w: 5, h: 13 };
  const jumpY = pose === "jump" ? -5 : 0;

  return (
    <span className={className} style={{ "--sprite-scale": size }}>
      <svg
        width="32"
        height="48"
        viewBox="0 0 32 48"
        role="img"
        aria-label={label || "Jesus"}
        shapeRendering="crispEdges"
      >
        <g transform={`translate(0 ${jumpY})`}>
          <rect x="0" y="0" width="32" height="48" fill="transparent" />
          <rect x="9" y="5" width="14" height="4" fill={COLORS.ink} />
          <rect x="7" y="9" width="18" height="4" fill={COLORS.ink} />
          <rect x="6" y="13" width="18" height="4" fill={COLORS.ink} />
          <rect x="5" y="17" width="8" height="5" fill={COLORS.ink} />
          <rect x="13" y="10" width="10" height="13" fill={COLORS.white} />
          <rect x="20" y="14" width="3" height="5" fill={COLORS.ink} />
          <rect x="15" y="15" width="3" height="5" fill={COLORS.ink} />
          <rect x="22" y="20" width="6" height="4" fill={COLORS.ink} />
          <rect x="21" y="24" width="5" height="3" fill={COLORS.ink} />
          <rect x="10" y="22" width="14" height="22" fill={COLORS.white} />
          <rect x="7" y="24" width="6" height="18" fill={COLORS.white} />
          <rect x="23" y="25" width="4" height="17" fill={COLORS.white} />
          <rect x="7" y="39" width="20" height="4" fill={COLORS.ink} />
          <rect x="8" y="42" width="5" height="2" fill={COLORS.ink} />
          <rect x="22" y="42" width="5" height="2" fill={COLORS.ink} />
          <rect x="8" y="25" width="4" height="16" fill={COLORS.ink} />
          <rect x={arm.x} y={arm.y} width={arm.w} height={arm.h} fill={COLORS.ink} />
          <rect x="12" y="24" width="5" height="5" fill={COLORS.mid} />
          <rect x="14" y="29" width="6" height="5" fill={COLORS.mid} />
          <rect x="16" y="34" width="6" height="5" fill={COLORS.mid} />
          <rect x="18" y="39" width="5" height="5" fill={COLORS.mid} />
          <rect x={legA.left} y="44" width="6" height={legA.h1} fill={COLORS.ink} />
          <rect x={legA.right} y="44" width="6" height={legA.h2} fill={COLORS.ink} />
        </g>
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
};

export const PixelPerson = ({ pose = "stand", label = "", size = 1, className = "" }) => {
  const walk = pose === "walk";

  return (
    <span className={className} style={{ "--sprite-scale": size }}>
      <svg
        width="26"
        height="42"
        viewBox="0 0 26 42"
        role="img"
        aria-label={label || "Pessoa"}
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width="26" height="42" fill="transparent" />
        <rect x="8" y="3" width="10" height="4" fill={COLORS.ink} />
        <rect x="6" y="7" width="14" height="5" fill={COLORS.ink} />
        <rect x="7" y="12" width="12" height="10" fill={COLORS.white} />
        <rect x="15" y="14" width="3" height="4" fill={COLORS.ink} />
        <rect x="11" y="15" width="2" height="3" fill={COLORS.ink} />
        <rect x="6" y="22" width="14" height="16" fill={COLORS.white} />
        <rect x="5" y="24" width="4" height="13" fill={COLORS.ink} />
        <rect x="18" y="24" width="4" height="13" fill={COLORS.ink} />
        <rect x="8" y="25" width="5" height="5" fill={COLORS.mid} />
        <rect x="10" y="30" width="6" height="5" fill={COLORS.mid} />
        <rect x="12" y="35" width="5" height="4" fill={COLORS.mid} />
        <rect x={walk ? "5" : "7"} y="38" width="6" height="3" fill={COLORS.ink} />
        <rect x={walk ? "17" : "15"} y="38" width="6" height="3" fill={COLORS.ink} />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
};

export const PixelViewer = ({ size = 1, className = "" }) => (
  <span className={className} style={{ "--sprite-scale": size }}>
    <svg width="30" height="44" viewBox="0 0 30 44" role="img" aria-label="Você" shapeRendering="crispEdges">
      <rect x="0" y="0" width="30" height="44" fill="transparent" />
      <rect x="9" y="3" width="12" height="4" fill={COLORS.ink} />
      <rect x="7" y="7" width="16" height="5" fill={COLORS.ink} />
      <rect x="9" y="12" width="13" height="10" fill={COLORS.white} />
      <rect x="18" y="14" width="3" height="4" fill={COLORS.ink} />
      <rect x="13" y="15" width="2" height="3" fill={COLORS.ink} />
      <rect x="9" y="23" width="14" height="15" fill={COLORS.soft} />
      <rect x="6" y="24" width="5" height="12" fill={COLORS.ink} />
      <rect x="21" y="24" width="5" height="12" fill={COLORS.ink} />
      <rect x="10" y="38" width="6" height="4" fill={COLORS.ink} />
      <rect x="21" y="38" width="6" height="4" fill={COLORS.ink} />
    </svg>
    <span>Você</span>
  </span>
);

export const PixelCross = ({ small = false, className = "" }) => (
  <svg
    className={className}
    width={small ? "30" : "44"}
    height={small ? "60" : "92"}
    viewBox={small ? "0 0 30 60" : "0 0 44 92"}
    role="img"
    aria-label="Cruz"
    shapeRendering="crispEdges"
  >
    <rect x="0" y="0" width={small ? "30" : "44"} height={small ? "60" : "92"} fill="transparent" />
    <rect x={small ? "13" : "20"} y="4" width={small ? "5" : "7"} height={small ? "54" : "84"} fill={COLORS.ink} />
    <rect x={small ? "4" : "6"} y={small ? "18" : "28"} width={small ? "24" : "34"} height={small ? "6" : "8"} fill={COLORS.ink} />
  </svg>
);

export const PixelTomb = ({ className = "" }) => (
  <svg
    className={className}
    width="96"
    height="58"
    viewBox="0 0 96 58"
    role="img"
    aria-label="Túmulo vazio"
    shapeRendering="crispEdges"
  >
    <rect width="96" height="58" fill="transparent" />
    <rect x="14" y="24" width="58" height="28" fill={COLORS.white} />
    <rect x="14" y="18" width="58" height="6" fill={COLORS.ink} />
    <rect x="8" y="24" width="6" height="28" fill={COLORS.ink} />
    <rect x="72" y="24" width="6" height="28" fill={COLORS.ink} />
    <rect x="20" y="30" width="26" height="22" fill={COLORS.ink} />
    <rect x="64" y="34" width="22" height="22" fill={COLORS.white} />
    <rect x="60" y="30" width="30" height="6" fill={COLORS.ink} />
    <rect x="60" y="36" width="6" height="20" fill={COLORS.ink} />
    <rect x="86" y="36" width="6" height="20" fill={COLORS.ink} />
  </svg>
);

export const PixelStable = ({ className = "" }) => (
  <svg
    className={className}
    width="144"
    height="92"
    viewBox="0 0 144 92"
    role="img"
    aria-label="Belém"
    shapeRendering="crispEdges"
  >
    <rect width="144" height="92" fill="transparent" />
    <rect x="68" y="0" width="8" height="8" fill={COLORS.ink} />
    <rect x="64" y="4" width="16" height="4" fill={COLORS.ink} />
    <rect x="4" y="36" width="6" height="50" fill={COLORS.ink} />
    <rect x="134" y="36" width="6" height="50" fill={COLORS.ink} />
    <rect x="10" y="34" width="124" height="6" fill={COLORS.ink} />
    <rect x="22" y="20" width="6" height="34" fill={COLORS.ink} transform="rotate(-35 22 20)" />
    <rect x="116" y="18" width="6" height="38" fill={COLORS.ink} transform="rotate(35 116 18)" />
    <rect x="54" y="62" width="36" height="16" fill={COLORS.white} />
    <rect x="50" y="58" width="44" height="6" fill={COLORS.ink} />
    <rect x="50" y="78" width="44" height="6" fill={COLORS.ink} />
  </svg>
);
